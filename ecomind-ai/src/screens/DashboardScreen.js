import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, RefreshControl, Dimensions, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import { computeKescoBill, estimateMonthlyKwhFromDevices } from '../data/kescoTariff';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SafeAreaSpacer = () => <View style={{ height: Platform.OS === 'ios' ? 50 : 30 }} />;

const QuickAction = ({ icon, label, color, onPress, theme }) => (
  <TouchableOpacity style={styles(theme).actionCard} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles(theme).actionIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles(theme).actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// Energy efficiency class calculator
const getEnergyClass = (kwh) => {
  if (kwh <= 100) return { cls: 'A+++', color: '#10B981' };
  if (kwh <= 150) return { cls: 'A++', color: '#22C55E' };
  if (kwh <= 200) return { cls: 'A+', color: '#84CC16' };
  if (kwh <= 300) return { cls: 'A', color: '#EAB308' };
  if (kwh <= 400) return { cls: 'B', color: '#F97316' };
  if (kwh <= 500) return { cls: 'C', color: '#EF4444' };
  return { cls: 'D', color: '#DC2626' };
};

// Klasifikimi i efiçiencës sipas konsumit mujor (kWh) — për info-point te Dashboard
const ENERGY_CLASSES = [
  { cls: 'A+++', range: '≤ 100 kWh', color: '#10B981' },
  { cls: 'A++', range: '101–150 kWh', color: '#22C55E' },
  { cls: 'A+', range: '151–200 kWh', color: '#84CC16' },
  { cls: 'A', range: '201–300 kWh', color: '#EAB308' },
  { cls: 'B', range: '301–400 kWh', color: '#F97316' },
  { cls: 'C', range: '401–500 kWh', color: '#EF4444' },
  { cls: 'D', range: '> 500 kWh', color: '#DC2626' },
];

export default function DashboardScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [showClassInfo, setShowClassInfo] = useState(false);
  const [stats, setStats] = useState({
    totalUsage: 0,
    monthlyBill: 0,
    dailyAvg: 0,
    activeDevices: 0,
    totalDevices: 0,
    targetKwh: 400,
    targetEuro: 50,
    estimated: false,
    topDevice: null,
    co2Saved: 0,
    euroSaved: 0,
    activeGoal: null,
    activeChallenge: null,
    budgetWarning: false,
    hasData: false,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [uid, name] = await Promise.all([
        AsyncStorage.getItem('user_id'),
        AsyncStorage.getItem('user_name'),
      ]);
      setUserName(name || '');

      if (!uid) {
        navigation.replace('Login');
        return;
      }

      // Marrim TË GJITHA të dhënat njëkohësisht (paralelisht) — jo një nga një.
      // Kjo e shpejton ndjeshëm hapjen e Dashboard-it pas kyçjes: dy pyetjet
      // Supabase (bills + devices) dhe leximet lokale kryhen në të njëjtën kohë,
      // në vend që të presin radhazi (çka e bënte ndjesinë "kyçja është e ngadaltë").
      const [
        billsRes,
        devicesRes,
        houseUid, houseGlobal,
        goalsUid, goalsGlobal,
        inProgressRaw,
        completedRaw,
      ] = await Promise.all([
        supabase.from('bills').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('devices').select('*').eq('user_id', uid),
        AsyncStorage.getItem(`${uid}_house_data`),
        AsyncStorage.getItem('house_data'),
        AsyncStorage.getItem(`${uid}_user_goals`),
        AsyncStorage.getItem('user_goals'),
        AsyncStorage.getItem(`${uid}_in_progress_challenges`),
        AsyncStorage.getItem(`${uid}_completed_challenges`),
      ]);

      // 1. Bills
      const bills = billsRes?.data;

      // 2. Devices (ALL — parse status from type suffix)
      const rawDevices = devicesRes?.data;
      const devices = (rawDevices || []).map(d => {
        const isOn = d.type ? d.type.endsWith('_on') : false;
        const baseType = d.type ? d.type.replace(/_(on|off)$/, '') : d.type;
        return { ...d, isOn, baseType };
      });

      // 3. House data / budget
      const houseDataStr = houseUid || houseGlobal;
      const houseData = houseDataStr ? JSON.parse(houseDataStr) : null;
      const budgetEuro = houseData ? parseInt(houseData.buxheti.replace(/[^0-9]/g, '')) : 50;
      const targetKwh = Math.round(budgetEuro / 0.07) || 400;

      // 4. Consumption
      let lastKwh = 0, lastAmount = 0, estimated = false;
      if (bills && bills.length > 0) {
        lastKwh = bills[0].kwh || 0;
        lastAmount = bills[0].amount || 0;
      } else if (devices.length > 0) {
        lastKwh = estimateMonthlyKwhFromDevices(devices);
        lastAmount = computeKescoBill(lastKwh, 0).total;
        estimated = true;
      }

      // 5. Top consumer device (by avg_consumption, only ON devices preferred)
      const onDevices = devices.filter(d => d.isOn);
      const sortedDevices = [...(onDevices.length > 0 ? onDevices : devices)]
        .sort((a, b) => (b.avg_consumption || 0) - (a.avg_consumption || 0));
      const topDevice = sortedDevices[0] || null;

      // 6. CO2 & Euro saved vs average household (avg Kosovo ~500 kWh/month)
      const avgKwh = 500;
      const co2Saved = Math.max(0, parseFloat(((avgKwh - lastKwh) * 0.4).toFixed(1)));
      const euroSaved = Math.max(0, parseFloat(((avgKwh - lastKwh) * 0.07).toFixed(2)));

      // 7. Active AI goal (newest from user goals)
      const goalsRaw = goalsUid || goalsGlobal;
      const allGoals = goalsRaw ? JSON.parse(goalsRaw) : [];
      const activeGoal = allGoals.length > 0 ? allGoals[allGoals.length - 1] : null;

      // 8. Active challenge
      const inProgress = inProgressRaw ? JSON.parse(inProgressRaw) : [];
      const completed = completedRaw ? JSON.parse(completedRaw) : [];
      // First non-completed in-progress challenge
      const activeChallenge = inProgress.find(c => !completed.includes(c.id)) || null;

      // 9. Budget warning
      const budgetWarning = lastAmount > budgetEuro;

      // A ka dhënë përdoruesi ndonjë të dhënë reale? (faturë ose pajisje)
      // Nëse jo, nuk shfaqet asnjë analizë/parashikim/impakt — vetëm ftesa për të filluar.
      const hasData = (bills && bills.length > 0) || devices.length > 0;

      setStats({
        totalUsage: lastKwh,
        monthlyBill: lastAmount,
        dailyAvg: parseFloat((lastKwh / 30).toFixed(1)),
        activeDevices: onDevices.length,
        totalDevices: devices.length,
        targetKwh,
        targetEuro: budgetEuro,
        estimated,
        topDevice,
        co2Saved,
        euroSaved,
        activeGoal,
        activeChallenge,
        budgetWarning,
        hasData,
      });
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchData(true));
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const { cls: energyClass, color: energyColor } = getEnergyClass(stats.totalUsage);
  const budgetPct = stats.targetKwh > 0 ? Math.min(100, (stats.totalUsage / stats.targetKwh) * 100) : 0;

  if (loading) return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* HERO */}
        <LinearGradient colors={['#059669', '#10B981', '#34D399']} style={s.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <SafeAreaSpacer />
          <View style={s.headerRow}>
            <View>
              <Text style={s.heroGreeting}>Mirë se vini{userName ? `, ${userName}` : ''}</Text>
              <Text style={s.heroBrand}>EcoMind AI+</Text>
            </View>
            <TouchableOpacity style={s.profileBtn} onPress={() => navigation.navigate('More', { screen: 'Settings' })}>
              <Ionicons name="settings-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {stats.hasData ? (
          <Animated.View style={[s.mainCard, { opacity: fadeAnim }]}>
            <View style={s.cardTop}>
              <View>
                <Text style={s.cardLabel}>{stats.estimated ? 'KONSUMI (VLERËSIM)' : 'KONSUMI JUAJ'}</Text>
                <Text style={s.cardValue}>{stats.totalUsage} <Text style={s.cardUnit}>kWh</Text></Text>
              </View>
              <TouchableOpacity
                style={[s.cardBadge, { backgroundColor: energyColor + '25', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                onPress={() => setShowClassInfo(true)}
                activeOpacity={0.7}
              >
                <Text style={[s.badgeText, { color: energyColor }]}>Klasa {energyClass}</Text>
                <Ionicons name="information-circle-outline" size={14} color={energyColor} />
              </TouchableOpacity>
            </View>

            <View style={s.progressBarBase}>
              <LinearGradient
                colors={budgetPct >= 90 ? ['#EF4444', '#DC2626'] : ['#F59E0B', '#FCD34D']}
                style={[s.progressBarFill, { width: `${budgetPct}%` }]}
              />
            </View>
            <View style={s.progressLabels}>
              <Text style={s.progressLabelText}>Buxheti: {stats.targetKwh} kWh ({stats.targetEuro}€)</Text>
              <Text style={[s.progressLabelText, budgetPct >= 90 && { color: '#EF4444', fontWeight: '800' }]}>{Math.round(budgetPct)}%</Text>
            </View>
            {stats.estimated && <Text style={s.estNote}>Vlerësim nga pajisjet — shto faturë për shifra të sakta.</Text>}
          </Animated.View>
          ) : (
          <Animated.View style={[s.mainCard, { opacity: fadeAnim }]}>
            <Text style={s.cardLabel}>MIRË SE VINI</Text>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 8 }}>Ende s'ka të dhëna</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 6, lineHeight: 18 }}>
              Shto faturën ose pajisjet për të parë konsumin, analizat dhe impaktin tuaj.
            </Text>
          </Animated.View>
          )}
        </LinearGradient>

        <View style={s.body}>
          {/* Quick Actions */}
          <View style={s.actionsRow}>
            <QuickAction icon="scan-outline" label="Skano" color="#3B82F6" onPress={() => navigation.navigate('Bills')} theme={theme} />
            <QuickAction icon="hardware-chip-outline" label="Pajisjet" color="#10B981" onPress={() => navigation.navigate('Devices')} theme={theme} />
            <QuickAction icon="stats-chart-outline" label="Analitika" color="#8B5CF6" onPress={() => navigation.navigate('Analytics')} theme={theme} />
            <QuickAction icon="game-controller-outline" label="Luaj" color="#FF3366" onPress={() => navigation.navigate('Gamification')} theme={theme} />
          </View>

          {stats.hasData ? (
          <>
          {/* Stats Grid */}
          <Text style={s.sectionTitle}>Të dhënat tuaja</Text>
          <View style={s.statsGrid}>
            <TouchableOpacity style={s.statBox} onPress={() => navigation.navigate('Bills')} activeOpacity={0.7}>
              <Ionicons name="wallet-outline" size={20} color={stats.budgetWarning ? '#EF4444' : theme.primary} />
              <Text style={[s.statVal, stats.budgetWarning && { color: '#EF4444' }]}>{stats.monthlyBill.toFixed(2)} €</Text>
              <Text style={s.statLbl}>{stats.estimated ? 'Fatura (vlerësim)' : 'Fatura fundit'}</Text>
              {stats.budgetWarning && <Text style={{ color: '#EF4444', fontSize: 9, fontWeight: '700', marginTop: 3 }}>⚠ TEJKALON BUXHETIN</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.statBox} onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
              <Ionicons name="flash-outline" size={20} color="#F59E0B" />
              <Text style={s.statVal}>{stats.dailyAvg}</Text>
              <Text style={s.statLbl}>kWh/ditë mesatare</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.statBox} onPress={() => navigation.navigate('Devices')} activeOpacity={0.7}>
              <Ionicons name="apps-outline" size={20} color="#10B981" />
              <Text style={s.statVal}>{stats.activeDevices}<Text style={{ fontSize: 12, color: theme.textMuted }}>/{stats.totalDevices}</Text></Text>
              <Text style={s.statLbl}>Pajisje aktive</Text>
            </TouchableOpacity>
          </View>

          {/* Budget Warning Banner */}
          {stats.budgetWarning && (
            <View style={[s.warningBanner, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700', marginLeft: 10, flex: 1 }}>
                Fatura juaj ({stats.monthlyBill.toFixed(2)}€) tejkalon buxhetin ({stats.targetEuro}€)!
              </Text>
            </View>
          )}

          {/* Dashboard Insights Card */}
          <Text style={[s.sectionTitle, { marginTop: 20 }]}>Pasqyra e Gjendjes</Text>
          <View style={s.insightCard}>
            {/* Active AI Goal */}
            <TouchableOpacity
              style={s.insightRow}
              onPress={() => navigation.navigate('Goals')}
              activeOpacity={0.7}
            >
              <View style={[s.insightDot, { backgroundColor: '#8B5CF6' + '20' }]}>
                <Ionicons name="sparkles" size={16} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.insightLabel}>Objektivi AI Aktiv</Text>
                <Text style={s.insightValue} numberOfLines={1}>
                  {stats.activeGoal ? stats.activeGoal.title : 'Nuk keni objektiv aktiv'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            <View style={s.divider} />

            {/* Active Challenge */}
            <TouchableOpacity
              style={s.insightRow}
              onPress={() => navigation.navigate('Gamification')}
              activeOpacity={0.7}
            >
              <View style={[s.insightDot, { backgroundColor: '#F59E0B' + '20' }]}>
                <Ionicons name="trophy" size={16} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.insightLabel}>Sfida Aktive</Text>
                <Text style={s.insightValue} numberOfLines={1}>
                  {stats.activeChallenge ? `Sfida në progres (+${stats.activeChallenge.points || '?'} pikë)` : 'Nuk keni sfidë aktive'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>

            <View style={s.divider} />

            {/* Top Consumer */}
            <TouchableOpacity
              style={s.insightRow}
              onPress={() => navigation.navigate('Devices')}
              activeOpacity={0.7}
            >
              <View style={[s.insightDot, { backgroundColor: '#EF4444' + '20' }]}>
                <Ionicons name="flame" size={16} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.insightLabel}>Konsumatori Kryesor</Text>
                <Text style={s.insightValue} numberOfLines={1}>
                  {stats.topDevice ? `${stats.topDevice.name} — ${stats.topDevice.avg_consumption || '?'} W` : 'Nuk keni pajisje të regjistruara'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Efficiency Impact Card */}
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Impakti i Llogarisë</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Analytics')} activeOpacity={0.85}>
            <LinearGradient colors={['#1E293B', '#0F172A']} style={s.impactCard}>
              <View style={s.impactRow}>
                <View style={s.impactItem}>
                  <Text style={[s.impactClass, { color: energyColor }]}>{energyClass}</Text>
                  <Text style={s.impactItemLabel}>Klasa e Energjisë</Text>
                </View>
                <View style={s.impactDivider} />
                <View style={s.impactItem}>
                  <Text style={s.impactStat}>{stats.co2Saved}</Text>
                  <Text style={s.impactStatUnit}>kg CO₂</Text>
                  <Text style={s.impactItemLabel}>CO₂ i Kursyer</Text>
                </View>
                <View style={s.impactDivider} />
                <View style={s.impactItem}>
                  <Text style={s.impactStat}>{stats.euroSaved}</Text>
                  <Text style={s.impactStatUnit}>€</Text>
                  <Text style={s.impactItemLabel}>Kursimet vs Mesatares</Text>
                </View>
              </View>
              <Text style={s.impactDesc}>Krahasuar me mesataren kosovare ~500 kWh/muaj</Text>
              <Ionicons name="earth" size={80} color="rgba(255,255,255,0.05)" style={s.earthIcon} />
            </LinearGradient>
          </TouchableOpacity>
          </>
          ) : (
            <View style={s.emptyStateCard}>
              <Ionicons name="documents-outline" size={40} color={theme.textMuted} />
              <Text style={s.emptyStateTitle}>Ende s'ka të dhëna për të shfaqur</Text>
              <Text style={s.emptyStateSub}>Analizat, parashikimet dhe impakti shfaqen sapo të shtoni faturën ose pajisjet tuaja.</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Bills')} activeOpacity={0.85}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={s.emptyBtnText}>Shto faturë</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.emptyBtn, { backgroundColor: '#10B981' }]} onPress={() => navigation.navigate('Devices')} activeOpacity={0.85}>
                  <Ionicons name="hardware-chip-outline" size={18} color="#fff" />
                  <Text style={s.emptyBtnText}>Shto pajisje</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={{ textAlign: 'center', color: theme.textMuted, fontSize: 10, marginBottom: 20, marginTop: 8 }}>EcoMind AI+ v2.3</Text>
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Info-point: si klasifikohet efiçienca e shtëpisë (A+++…D) */}
      <Modal visible={showClassInfo} transparent animationType="fade" onRequestClose={() => setShowClassInfo(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowClassInfo(false)}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Klasa e energjisë së shtëpisë</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 14, lineHeight: 18 }}>
              Klasa përcaktohet nga konsumi juaj total mujor (kWh): nga A+++ (shumë efiçient) te D (konsum i lartë). Sa më i ulët konsumi, aq më e mirë klasa.
            </Text>
            {ENERGY_CLASSES.map(c => (
              <View key={c.cls} style={s.classRow}>
                <View style={[s.classBadge, { backgroundColor: c.color }]}><Text style={s.classBadgeText}>{c.cls}</Text></View>
                <Text style={s.classRange}>{c.range}</Text>
              </View>
            ))}
            <TouchableOpacity style={[s.classCloseBtn, { marginTop: 16 }]} onPress={() => setShowClassInfo(false)}>
              <Text style={s.classCloseText}>Mbylle</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  hero: { paddingHorizontal: 24, paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  heroGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  heroBrand: { color: '#fff', fontSize: 26, fontWeight: '900' },
  profileBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mainCard: { backgroundColor: theme.card, borderRadius: 30, padding: 25, elevation: 15, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cardValue: { color: theme.textPrimary, fontSize: 38, fontWeight: '900', marginTop: 5 },
  cardUnit: { fontSize: 18, fontWeight: '600' },
  cardBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  progressBarBase: { height: 10, backgroundColor: theme.border, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabelText: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
  estNote: { color: theme.textMuted, fontSize: 10, marginTop: 10, fontStyle: 'italic' },
  body: { paddingHorizontal: 24, marginTop: 25 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionCard: { alignItems: 'center', flex: 1 },
  actionIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { color: theme.textPrimary, fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 15 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  statBox: { flex: 1, backgroundColor: theme.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.border },
  statVal: { color: theme.textPrimary, fontSize: 18, fontWeight: '900', marginVertical: 4 },
  statLbl: { color: theme.textSecondary, fontSize: 10, fontWeight: '600' },
  warningBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 16 },
  insightCard: { backgroundColor: theme.card, borderRadius: 24, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', marginBottom: 8 },
  insightRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  insightDot: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  insightValue: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.border, marginHorizontal: 16 },
  impactCard: { borderRadius: 28, padding: 25, position: 'relative', overflow: 'hidden', marginBottom: 8 },
  impactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  impactItem: { flex: 1, alignItems: 'center' },
  impactClass: { fontSize: 26, fontWeight: '900' },
  impactStat: { fontSize: 22, fontWeight: '900', color: '#fff' },
  impactStatUnit: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: -2 },
  impactItemLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  impactDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.1)' },
  impactDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', marginTop: 4 },
  earthIcon: { position: 'absolute', right: -20, bottom: -20 },
  // Empty state (kur s'ka të dhëna)
  emptyStateCard: { backgroundColor: theme.card, borderRadius: 24, borderWidth: 1, borderColor: theme.border, padding: 28, alignItems: 'center', marginTop: 4 },
  emptyStateTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  emptyStateSub: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  // Info-modal i klasës së energjisë
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: theme.card, borderRadius: 24, padding: 25 },
  modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  classBadge: { width: 46, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  classBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  classRange: { color: theme.textSecondary, fontSize: 13 },
  classCloseBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  classCloseText: { color: '#fff', fontWeight: '800' },
});

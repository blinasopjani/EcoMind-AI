import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, RefreshControl, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import { computeKescoBill, estimateMonthlyKwhFromDevices } from '../data/kescoTariff';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const QuickAction = ({ icon, label, color, onPress, theme }) => (
  <TouchableOpacity style={styles(theme).actionCard} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles(theme).actionIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles(theme).actionLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function DashboardScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  console.log('Dashboard v2.2 active - Netlify Stable Build');


  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    totalUsage: 0,
    monthlyBill: 0,
    dailyAvg: 0,
    projectedBill: 0,
    activeDevices: 0,
    treesSaved: 0
  });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      const name = await AsyncStorage.getItem('user_name');
      setUserName(name || '');

      if (!uid) {
        navigation.replace('Login');
        return;
      }

      // 1. Merr faturat e përdoruesit specifik
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      // 2. Merr pajisjet e përdoruesit specifik
      const { data: devices } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', uid);

      // 3. Merr të dhënat e shtëpisë
      const houseDataStr = await AsyncStorage.getItem('house_data');
      const houseData = houseDataStr ? JSON.parse(houseDataStr) : null;
      const budgetEuro = houseData ? parseInt(houseData.buxheti.replace(/[^0-9]/g, '')) : 50;
      const targetKwh = Math.round(budgetEuro / 0.07) || 400;

      let lastKwh = 0, lastAmount = 0, estimated = false;
      if (bills && bills.length > 0) {
        lastKwh = bills[0].kwh || 0;
        lastAmount = bills[0].amount || 0;
      } else if (devices && devices.length > 0) {
        // Pa faturë: vlerësojmë konsumin/koston nga pajisjet e regjistruara
        lastKwh = estimateMonthlyKwhFromDevices(devices);
        lastAmount = computeKescoBill(lastKwh, 0).total;
        estimated = true;
      }

      setStats({
        totalUsage: lastKwh,
        monthlyBill: lastAmount,
        dailyAvg: (lastKwh / 30).toFixed(1),
        projectedBill: (lastAmount * 0.9).toFixed(2),
        activeDevices: devices ? devices.length : 0,
        treesSaved: Math.floor(lastKwh / 50),
        targetKwh: targetKwh,
        targetEuro: budgetEuro,
        estimated,
      });
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#fff" />}>
        
        <LinearGradient colors={['#059669', '#10B981', '#34D399']} style={s.hero} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
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

          <Animated.View style={[s.mainCard, { opacity: fadeAnim }]}>
            <View style={s.cardTop}>
              <View>
                <Text style={s.cardLabel}>{stats.estimated ? 'KONSUMI (VLERËSIM)' : 'KONSUMI JUAJ'}</Text>
                <Text style={s.cardValue}>{stats.totalUsage} <Text style={s.cardUnit}>kWh</Text></Text>
              </View>
              <View style={s.cardBadge}>
                <Ionicons name="leaf" size={14} color="#059669" />
                <Text style={s.badgeText}>Eko-Llogari</Text>
              </View>
            </View>
            
            <View style={s.progressBarBase}>
              <LinearGradient colors={['#F59E0B', '#FCD34D']} style={[s.progressBarFill, { width: stats.totalUsage > stats.targetKwh ? '100%' : `${(stats.totalUsage / stats.targetKwh) * 100}%` }]} />
            </View>
            <View style={s.progressLabels}>
              <Text style={s.progressLabelText}>Synimi: {stats.targetKwh} kWh ({stats.targetEuro}€)</Text>
              <Text style={s.progressLabelText}>{Math.min(100, Math.round((stats.totalUsage / stats.targetKwh) * 100))}%</Text>
            </View>
            {stats.estimated ? <Text style={s.estNote}>Vlerësim nga pajisjet tuaja — shto një faturë për shifra të sakta.</Text> : null}
          </Animated.View>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.actionsRow}>
            <QuickAction icon="scan-outline" label="Skano" color="#3B82F6" onPress={() => navigation.navigate('Bills')} theme={theme} />
            <QuickAction icon="add-outline" label="Pajisjet" color="#10B981" onPress={() => navigation.navigate('Devices')} theme={theme} />
            <QuickAction icon="stats-chart-outline" label="Analitika" color="#8B5CF6" onPress={() => navigation.navigate('Analytics')} theme={theme} />
            <QuickAction icon="game-controller-outline" label="Luaj" color="#FF3366" onPress={() => navigation.navigate('Gamification')} theme={theme} />
          </View>

          <Text style={s.sectionTitle}>Të dhënat tuaja</Text>
          <View style={s.statsGrid}>
            <View style={s.statBox}>
              <Ionicons name="wallet-outline" size={20} color={theme.primary} />
              <Text style={s.statVal}>{stats.monthlyBill} €</Text>
              <Text style={s.statLbl}>{stats.estimated ? 'Fatura (vlerësim)' : 'Fatura fundit'}</Text>
            </View>
            <View style={s.statBox}>
              <Ionicons name="apps-outline" size={20} color="#10B981" />
              <Text style={s.statVal}>{stats.activeDevices}</Text>
              <Text style={s.statLbl}>Pajisje total</Text>
            </View>
          </View>

          <LinearGradient colors={['#1E293B', '#0F172A']} style={s.impactCard}>
            <View style={s.impactInfo}>
              <Text style={s.impactTitle}>Impakti i Llogarisë</Text>
              <Text style={s.impactDesc}>Secili përdorues kontribuon në kursimin global.</Text>
              <View style={s.treeRow}>
                <Ionicons name="leaf" size={24} color="#10B981" />
                <Text style={s.treeCount}>{stats.treesSaved} Pemë të Kursyera</Text>
              </View>
            </View>
            <Ionicons name="earth" size={80} color="rgba(255,255,255,0.05)" style={s.earthIcon} />
          </LinearGradient>

          <Text style={{ textAlign: 'center', color: theme.textMuted, fontSize: 10, marginBottom: 20 }}>EcoMind AI+ v2.2 (Netlify Stable)</Text>
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    </View>

  );
}

const SafeAreaSpacer = () => <View style={{ height: Platform.OS === 'ios' ? 50 : 30 }} />;

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
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#10B98115', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: '#059669', fontSize: 11, fontWeight: '700' },
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
  statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  statBox: { flex: 1, backgroundColor: theme.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: theme.border },
  statVal: { color: theme.textPrimary, fontSize: 20, fontWeight: '900', marginVertical: 4 },
  statLbl: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  impactCard: { borderRadius: 28, padding: 25, position: 'relative', overflow: 'hidden', marginBottom: 30 },
  impactTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  impactDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18, marginBottom: 15 },
  treeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  treeCount: { color: '#10B981', fontSize: 16, fontWeight: '800' },
  earthIcon: { position: 'absolute', right: -20, bottom: -20 },
});

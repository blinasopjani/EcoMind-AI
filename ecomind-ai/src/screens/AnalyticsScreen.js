import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../data/alertHelper';
import { deviceMonthlyKwh, KG_CO2_PER_KWH } from '../data/kescoTariff';

const { width } = Dimensions.get('window');

const AnalyticsCard = ({ title, value, unit, change, icon, color, theme }) => (
  <View style={styles(theme).analyticsCard}>
    <View style={[styles(theme).iconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles(theme).cardTitle}>{title}</Text>
      <Text style={styles(theme).cardValue}>{value} <Text style={styles(theme).cardUnit}>{unit}</Text></Text>
    </View>
    {change && (
      <View style={[styles(theme).changeBadge, { backgroundColor: change.startsWith('-') ? '#10B98120' : '#EF444420' }]}>
        <Text style={[styles(theme).changeText, { color: change.startsWith('-') ? '#10B981' : '#EF4444' }]}>{change}</Text>
      </View>
    )}
  </View>
);

export default function AnalyticsScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const s = styles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalKwh: 0,
    totalEuro: 0,
    co2: 0,
    devicesDist: [],
    changeKwh: '0%',
    changeEuro: '0%'
  });

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      if (!uid) return;

      // 1. Lexojmë faturat e përdoruesit
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      // 2. Lexojmë pajisjet e përdoruesit
      const { data: devices } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', uid);

      let currentKwh = 0, currentEuro = 0, changeK = '0%', changeE = '0%';

      if (bills && bills.length > 0) {
        currentKwh = bills[0].kwh || 0;
        currentEuro = bills[0].amount || 0;
        if (bills.length > 1) {
          const prevKwh = bills[1].kwh || 1;
          const prevEuro = bills[1].amount || 1;
          const diffK = ((currentKwh - prevKwh) / prevKwh * 100).toFixed(1);
          const diffE = ((currentEuro - prevEuro) / prevEuro * 100).toFixed(1);
          changeK = (diffK > 0 ? '+' : '') + diffK + '%';
          changeE = (diffE > 0 ? '+' : '') + diffE + '%';
        }
      }

      let devDist = [];
      if (devices && devices.length > 0) {
        // Ndarja sipas ENERGJISË së vlerësuar (kWh/muaj), jo vetëm Watt-eve
        const totalKwh = devices.reduce((sum, d) => sum + deviceMonthlyKwh(d), 0) || 1;
        devDist = devices.map(d => ({
          name: d.name,
          percent: Math.round((deviceMonthlyKwh(d) / totalKwh) * 100),
          color: d.type === 'ac' ? theme.primary : theme.info
        })).sort((a, b) => b.percent - a.percent).slice(0, 4);
      }

      setStats({
        totalKwh: currentKwh,
        totalEuro: currentEuro,
        co2: (currentKwh * KG_CO2_PER_KWH).toFixed(1),
        devicesDist: devDist,
        changeKwh: changeK,
        changeEuro: changeE,
        hasBills: !!(bills && bills.length > 0),
        history: (bills || []).slice(0, 6).map(b => ({ id: b.id, date: b.date || '-', kwh: b.kwh || 0, amount: b.amount || 0 })),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(true); };

  const deleteBill = (id) => {
    if (!id) return;
    showAlert(
      'Fshi Faturën',
      'A jeni të sigurt që doni ta fshini këtë faturë? Ky veprim s\'kthehet dhe ndikon te analizat.',
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Fshi', style: 'destructive', onPress: async () => {
            try {
              const uid = await AsyncStorage.getItem('user_id');
              await supabase.from('bills').delete().eq('id', id).eq('user_id', uid);
              fetchData(true);
            } catch (e) {
              showAlert('Gabim', 'Nuk u fshi fatura. Provoni përsëri.');
            }
          }
        },
      ]
    );
  };

  useEffect(() => { fetchData(); }, []);

  // Rifresko sa herë hapet ekrani (që të mos tregojë të dhëna të vjetruara)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchData(true));
    return unsubscribe;
  }, [navigation]);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ marginRight: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Analiza Personale</Text>
            <Text style={s.headerSub}>Të dhënat specifike për llogarinë tuaj</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.body}>
        {!stats.hasBills ? (
          <View style={s.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color={theme.border} />
            <Text style={s.emptyTitle}>Ende s'ka të dhëna</Text>
            <Text style={s.emptyDesc}>Shto një faturë te seksioni "Fatura" që të shohësh analizën reale të konsumit tënd.</Text>
          </View>
        ) : (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Krahasimi i Faturave</Text>
              <AnalyticsCard title="Konsumi Total" value={stats.totalKwh} unit="kWh" change={stats.changeKwh} icon="flash" color={theme.primary} theme={theme} />
              <AnalyticsCard title="Kostoja" value={stats.totalEuro} unit="€" change={stats.changeEuro} icon="card" color={theme.info} theme={theme} />
              <AnalyticsCard title="Gjurma e CO₂" value={stats.co2} unit="kg" icon="leaf" color={theme.success} theme={theme} />
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Pajisjet më Harxhuese</Text>
              {stats.devicesDist.length === 0 ? (
                <Text style={s.emptyText}>Nuk u gjetën pajisje për këtë përdorues.</Text>
              ) : (
                <View style={s.deviceStats}>
                  {stats.devicesDist.map((d, i) => (
                    <View key={i} style={s.deviceRow}>
                      <View style={s.deviceHeader}><Text style={s.deviceName}>{d.name}</Text><Text style={s.devicePercent}>{d.percent}%</Text></View>
                      <View style={s.progressBarBackground}><View style={[s.progressBarFill, { width: `${d.percent}%`, backgroundColor: d.color }]} /></View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Historiku i Faturave</Text>
              <View style={s.deviceStats}>
                {(stats.history || []).map((h, i) => (
                  <View key={h.id || i} style={s.histRow}>
                    <Text style={s.histDate}>{h.date}</Text>
                    <Text style={s.histKwh}>{h.kwh} kWh</Text>
                    <Text style={s.histAmount}>{h.amount} €</Text>
                    {h.id ? (
                      <TouchableOpacity onPress={() => deleteBill(h.id)} style={{ paddingLeft: 12 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Fshi faturën">
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 30 },
  headerTitle: { color: theme.textPrimary, fontSize: 24, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
  body: { padding: 24 },
  section: { marginBottom: 30 },
  sectionTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 15 },
  analyticsCard: { backgroundColor: theme.card, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: theme.border },
  iconContainer: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  cardTitle: { color: theme.textSecondary, fontSize: 12, marginBottom: 2 },
  cardValue: { color: theme.textPrimary, fontSize: 20, fontWeight: '800' },
  cardUnit: { fontSize: 14 },
  changeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  changeText: { fontSize: 11, fontWeight: '700' },
  deviceStats: { backgroundColor: theme.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: theme.border },
  deviceRow: { marginBottom: 15 },
  deviceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  deviceName: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
  devicePercent: { color: theme.textSecondary, fontSize: 12 },
  progressBarBackground: { height: 6, backgroundColor: theme.border, borderRadius: 3 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  emptyText: { color: theme.textMuted, textAlign: 'center', marginTop: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70 },
  emptyTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptyDesc: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 21, paddingHorizontal: 20 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  histDate: { color: theme.textSecondary, fontSize: 13, flex: 1 },
  histKwh: { color: theme.textPrimary, fontSize: 13, fontWeight: '600', width: 90, textAlign: 'right' },
  histAmount: { color: theme.primary, fontSize: 13, fontWeight: '800', width: 70, textAlign: 'right' }
});

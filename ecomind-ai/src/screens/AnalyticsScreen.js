import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../data/alertHelper';
import { deviceMonthlyKwh, KG_CO2_PER_KWH, computeKescoBill } from '../data/kescoTariff';

// Këshillë e rigjeneruar pas editimit të faturës
const editSuggestion = (calc) => {
  if (calc.totalKwh > 800) return `Konsum i lartë (${calc.totalKwh} kWh): keni hyrë në bllokun e dytë tarifor (mbi 800 kWh). Ulja nën 800 kWh do të kursente ndjeshëm.`;
  const dayRatio = calc.totalKwh > 0 ? calc.dayKwh / calc.totalKwh : 0;
  if (dayRatio > 0.8) return 'Pjesa më e madhe e konsumit është gjatë ditës. Zhvendosni pajisjet e rënda pas orës 22:00 për tarifën e natës.';
  return 'Konsumi juaj është brenda bllokut të parë tarifor. Vazhdoni kështu.';
};

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

// Etiketë e shkurtër muaji nga data e faturës
const shortMonth = (d) => {
  const str = String(d || '');
  const m = str.match(/(\d{1,2})[-/]\d{4}/);
  if (m) return m[1].padStart(2, '0');
  return str.slice(0, 3) || '-';
};

// Grafik i thjeshtë me shtylla (View, pa varësi) - i sigurt në web
const BillsBarChart = ({ data, theme, unit = '€' }) => {
  const s = styles(theme);
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={s.chartCard}>
      <View style={s.chartRow}>
        {data.map((d, i) => {
          const h = Math.max(6, Math.round((d.value / max) * 118));
          return (
            <View key={i} style={s.chartCol}>
              <Text style={s.chartVal} numberOfLines={1}>{d.value}</Text>
              <LinearGradient colors={[theme.primary, theme.secondary]} style={[s.chartBar, { height: h }]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
              <Text style={s.chartLbl} numberOfLines={1}>{d.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={s.chartUnit}>Kostoja mujore ({unit})</Text>
    </View>
  );
};

export default function AnalyticsScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const s = styles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Editimi i faturës ---
  const [editBill, setEditBill] = useState(null); // {id, date, dpr}
  const [editDay, setEditDay] = useState('');
  const [editNight, setEditNight] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDpr, setEditDpr] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
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
        history: (bills || []).slice(0, 6).map(b => ({ id: b.id, date: b.date || '-', kwh: b.kwh || 0, amount: b.amount || 0, dpr: b.dpr || '' })),
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

  const openEdit = (h) => {
    setEditBill({ id: h.id, date: h.date, dpr: h.dpr || '' });
    // Parambush ditën me konsumin total (mund të ndahet nga përdoruesi ditë/natë)
    setEditDay(String(h.kwh || ''));
    setEditNight('');
    setEditDate(h.date && h.date !== '-' ? h.date : '');
    setEditDpr(h.dpr || '');
  };

  const saveEdit = async () => {
    if (!editBill) return;
    const d = parseFloat(editDay) || 0;
    const n = parseFloat(editNight) || 0;
    if (d + n <= 0) {
      showAlert('Mungojnë të dhënat', 'Shkruani së paku konsumin e ditës ose të natës (kWh).');
      return;
    }
    setSavingEdit(true);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      const bill = computeKescoBill(d, n);
      const base = {
        amount: bill.total,
        kwh: bill.totalKwh,
        date: editDate.trim() || editBill.date,
        suggestion: editSuggestion(bill),
      };
      const payload = editDpr.trim() ? { ...base, dpr: editDpr.trim() } : base;
      let { error } = await supabase.from('bills').update(payload).eq('id', editBill.id).eq('user_id', uid);
      // Nëse kolona 'dpr' s'ekziston, ruaj pa të
      if (error && /dpr|column/i.test(error.message || '')) {
        ({ error } = await supabase.from('bills').update(base).eq('id', editBill.id).eq('user_id', uid));
      }
      if (error) throw error;
      setEditBill(null);
      fetchData(true);
    } catch (e) {
      showAlert('Gabim', 'Nuk u ruajt ndryshimi. Provoni përsëri.');
    } finally {
      setSavingEdit(false);
    }
  };

  const editCalc = computeKescoBill(parseFloat(editDay) || 0, parseFloat(editNight) || 0);

  useEffect(() => { fetchData(); }, []);

  // Rifresko sa herë hapet ekrani (që të mos tregojë të dhëna të vjetruara)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchData(true));
    return unsubscribe;
  }, [navigation]);

  // Të dhënat për grafik (kronologjike: e vjetra -> e reja)
  const chartData = [...(stats.history || [])].reverse().map(h => ({
    label: shortMonth(h.date),
    value: Math.round(h.amount || 0),
  }));

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
            {chartData.length >= 2 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Trendi i Faturave</Text>
                <BillsBarChart data={chartData} theme={theme} />
              </View>
            )}

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
                      <>
                        <TouchableOpacity onPress={() => openEdit(h)} style={{ paddingLeft: 12 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Edito faturën">
                          <Ionicons name="create-outline" size={16} color={theme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteBill(h.id)} style={{ paddingLeft: 12 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Fshi faturën">
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </View>

      {/* Modal i editimit të faturës */}
      <Modal visible={!!editBill} transparent animationType="fade" onRequestClose={() => setEditBill(null)}>
        <View style={s.editOverlay}>
          <View style={s.editCard}>
            <View style={s.editHeader}>
              <Text style={s.editTitle}>Edito faturën</Text>
              <TouchableOpacity onPress={() => setEditBill(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.editHint}>Rifut konsumin e ditës (A1) dhe natës (A2); shuma llogaritet me tarifat KESCO.</Text>

            <Text style={s.editLabel}>Periudha</Text>
            <TextInput style={s.editInput} value={editDate} onChangeText={setEditDate} placeholder="p.sh. Gusht 2026" placeholderTextColor={theme.textMuted} />

            <Text style={s.editLabel}>Konsumi i ditës - A1 (kWh)</Text>
            <TextInput style={s.editInput} value={editDay} onChangeText={setEditDay} keyboardType="numeric" placeholder="p.sh. 809" placeholderTextColor={theme.textMuted} />

            <Text style={s.editLabel}>Konsumi i natës - A2 (kWh)</Text>
            <TextInput style={s.editInput} value={editNight} onChangeText={setEditNight} keyboardType="numeric" placeholder="p.sh. 149" placeholderTextColor={theme.textMuted} />

            <Text style={s.editLabel}>DPR (opsional)</Text>
            <TextInput style={s.editInput} value={editDpr} onChangeText={setEditDpr} autoCapitalize="characters" placeholder="p.sh. DPR 90050095" placeholderTextColor={theme.textMuted} />

            <View style={s.editPreview}>
              <Text style={s.editPreviewLbl}>Fatura e re</Text>
              <Text style={s.editPreviewVal}>{editCalc.total} €</Text>
              <Text style={s.editPreviewSub}>{editCalc.totalKwh} kWh • Neto {editCalc.neto}€ + TVSH {editCalc.vat}€</Text>
            </View>

            <TouchableOpacity style={s.editSaveBtn} onPress={saveEdit} disabled={savingEdit}>
              {savingEdit ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={s.editSaveText}>Ruaj ndryshimet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  histAmount: { color: theme.primary, fontSize: 13, fontWeight: '800', width: 70, textAlign: 'right' },
  chartCard: { backgroundColor: theme.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: theme.border },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 168 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartVal: { color: theme.textSecondary, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  chartBar: { width: 22, borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 6 },
  chartLbl: { color: theme.textMuted, fontSize: 10, marginTop: 6 },
  chartUnit: { color: theme.textMuted, fontSize: 10, textAlign: 'center', marginTop: 10, fontWeight: '600' },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  editCard: { backgroundColor: theme.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: theme.border },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  editTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800' },
  editHint: { color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 14 },
  editLabel: { color: theme.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  editInput: { backgroundColor: theme.background, borderRadius: 12, padding: 12, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, marginBottom: 6 },
  editPreview: { backgroundColor: theme.primary + '12', borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 14, marginBottom: 16, borderWidth: 1, borderColor: theme.primary + '30' },
  editPreviewLbl: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' },
  editPreviewVal: { color: theme.primary, fontSize: 28, fontWeight: '900', marginTop: 2 },
  editPreviewSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  editSaveBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  editSaveText: { color: '#fff', fontWeight: '700' },
});

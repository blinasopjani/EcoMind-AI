import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Dimensions, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { computeKescoBill, estimateMonthlyKwhFromDevices, deviceMonthlyKwh, KWH_TO_EUR, KESCO } from '../data/kescoTariff';

const { width } = Dimensions.get('window');

// Rregulla kursimi sipas llojit të pajisjes: sa % e kostos mund të kursehet + këshilla
const SAVING_RULES = {
  bojler: { pct: 0.30, tip: 'Ngroh ujin natën (tarifa A2) dhe ul temperaturën në ~55°C.' },
  klime: { pct: 0.20, tip: 'Mbaje në 24°C dhe pastro filtrat - çdo gradë më poshtë shton ~8%.' },
  ac: { pct: 0.20, tip: 'Mbaje në 24°C dhe pastro filtrat.' },
  lavatrice: { pct: 0.30, tip: 'Përdor programin Eco dhe laje pas orës 22:00 (tarifa e natës).' },
  enelarese: { pct: 0.30, tip: 'Përdor programin Eco dhe ndeze natën.' },
  furre: { pct: 0.20, tip: 'Mos e hap derën gjatë pjekjes; shfrytëzo nxehtësinë e mbetur.' },
  mikrovale: { pct: 0.10, tip: 'Përdore për ngrohje të vogla në vend të furrës.' },
  frigorifer: { pct: 0.10, tip: 'Mbaje larg nxehtësisë; temperatura -18°C / +4°C.' },
  ngrirese: { pct: 0.10, tip: 'Shkrij akullin rregullisht dhe mbylle mirë.' },
  drite: { pct: 0.60, tip: 'Kalo te llambat LED - deri 80% më pak konsum.' },
  ngrohese: { pct: 0.25, tip: 'Përdor termostat; ngroh vetëm dhomat në përdorim.' },
  kompjuter: { pct: 0.15, tip: 'Aktivizo "sleep" dhe fike gjatë natës.' },
  tv: { pct: 0.15, tip: 'Fike plotësisht (jo standby) dhe ul ndriçimin e ekranit.' },
  default: { pct: 0.10, tip: 'Fike nga priza kur nuk e përdor.' },
};

export default function SimulatorScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const s = styles(theme);

  const [reduction, setReduction] = useState(20);
  const [currentBill, setCurrentBill] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasBills, setHasBills] = useState(false);
  const [devices, setDevices] = useState([]);
  const [estimated, setEstimated] = useState(false);
  const [shiftKwh, setShiftKwh] = useState('100');
  const [vA1, setVA1] = useState('');
  const [vA2, setVA2] = useState('');
  const [vCharged, setVCharged] = useState('');

  const moneySaved = ((currentBill * reduction) / 100).toFixed(1);
  const newBill = (currentBill - moneySaved).toFixed(1);
  const co2Reduced = (reduction * 1.56).toFixed(0);
  const yearlyProjection = (moneySaved * 12).toFixed(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      const [billsRes, devsRes] = await Promise.all([
        supabase.from('bills').select('amount').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('devices').select('*').eq('user_id', uid),
      ]);
      const bills = billsRes.data || [];
      const devs = (devsRes.data || []).map(d => ({ ...d, baseType: String(d.type || '').replace(/_(on|off)$/, ''), power: d.avg_consumption || d.power || 0 }));
      setDevices(devs);

      if (bills.length > 0 && bills[0].amount) {
        setHasBills(true); setEstimated(false); setCurrentBill(bills[0].amount);
      } else if (devs.length > 0) {
        // Pa faturë, por me pajisje - vlerësojmë nga konsumi i pajisjeve (jo i shpikur)
        const estKwh = estimateMonthlyKwhFromDevices(devs);
        setHasBills(true); setEstimated(true); setCurrentBill(parseFloat(computeKescoBill(estKwh, 0).total.toFixed(1)));
      } else {
        setHasBills(false); setCurrentBill(0);
      }
    } catch (err) {
      console.warn(err);
      setHasBills(false);
      setCurrentBill(0);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  };

  const handleSlider = (val) => {
    setReduction(val);
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!hasBills) {
    return (
      <View style={[s.container, { padding: 24, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={s.emptyCard}>
          <View style={s.emptyIconBox}><Ionicons name="document-text-outline" size={44} color={theme.primary} /></View>
          <Text style={s.emptyTitle}>Asnjë faturë ende</Text>
          <Text style={s.emptyDesc}>Shtoni së paku një faturë te seksioni "Fatura" (manualisht) që simuluesi të llogarisë kursimet mbi konsumin tuaj real.</Text>
          <TouchableOpacity style={s.scanBtn} onPress={() => navigation.navigate('Bills')}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.scanBtnText}>Shto faturë</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }



  // ── Mjetet e kursimit ────────────────────────────────────────────────
  const savingActions = devices
    .map(d => {
      const cost = deviceMonthlyKwh({ avg_consumption: d.power, type: d.baseType }) * KWH_TO_EUR;
      const rule = SAVING_RULES[d.baseType] || SAVING_RULES.default;
      return { name: d.name || 'Pajisje', saving: cost * rule.pct, tip: rule.tip };
    })
    .filter(a => a.saving > 0.1)
    .sort((a, b) => b.saving - a.saving)
    .slice(0, 5);
  const totalSaving = savingActions.reduce((sum, a) => sum + a.saving, 0);

  const perKwhSaving = KESCO.DAY_B1 - KESCO.NIGHT_B1; // €/kWh (bllok 1)
  const shiftSaving = (parseFloat(shiftKwh) || 0) * perKwhSaving;

  const vComputed = computeKescoBill(parseFloat(vA1) || 0, parseFloat(vA2) || 0);
  const vChargedNum = parseFloat(vCharged) || 0;
  const vDiff = vChargedNum - vComputed.total;
  const vHasInput = (parseFloat(vA1) || 0) + (parseFloat(vA2) || 0) > 0;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Simuluesi</Text>
            <Text style={s.headerSub}>{estimated ? `Vlerësim nga pajisjet (~${currentBill}€)` : `Nga fatura e fundit (${currentBill}€)`}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.body}>
        <View style={s.sliderCard}>
          <Text style={s.sliderTitle}>Sa dëshironi të reduktoni konsumin?</Text>
          <Text style={s.sliderValue}>{reduction}%</Text>

          <View style={s.sliderTrack}>
            <View style={[s.sliderFill, { width: `${(reduction / 60) * 100}%` }]} />
          </View>

          <View style={s.sliderBtns}>
            {[10, 20, 30, 40, 50, 60].map(v => (
              <TouchableOpacity key={v}
                onPress={() => handleSlider(v)}
                style={[s.sliderBtn, reduction === v && s.sliderBtnActive]}>
                <Text style={[s.sliderBtnText, reduction === v && s.sliderBtnTextActive]}>{v}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={s.billCompare}>
            <View style={s.billBox}>
              <Text style={s.billBoxLabel}>Fatura Aktuale</Text>
              <Text style={[s.billBoxVal, { color: '#EF4444' }]}>{currentBill}€</Text>
            </View>
            <View style={s.billArrow}>
              <Ionicons name="arrow-forward" size={24} color={theme.primary} />
            </View>
            <LinearGradient colors={['#00C896','#00A87A']} style={s.billBoxNew}>
              <Text style={s.billBoxLabelNew}>Fatura e Re</Text>
              <Text style={s.billBoxValNew}>{newBill}€</Text>
            </LinearGradient>
          </View>

          <View style={s.resultGrid}>
            <LinearGradient colors={['#00C896','#00A87A']} style={s.resultCard}>
              <Ionicons name="cash" size={20} color="#fff" />
              <Text style={s.resultVal}>{moneySaved}€</Text>
              <Text style={s.resultLabel}>Kursim/muaj</Text>
            </LinearGradient>
            <LinearGradient colors={['#1A73E8','#1557B0']} style={s.resultCard}>
              <Ionicons name="leaf" size={20} color="#fff" />
              <Text style={s.resultVal}>{co2Reduced}kg</Text>
              <Text style={s.resultLabel}>CO₂ Reduktuar</Text>
            </LinearGradient>
            <LinearGradient colors={['#7C3AED','#5B21B6']} style={s.resultCard}>
              <Ionicons name="trending-up" size={20} color="#fff" />
              <Text style={s.resultVal}>{yearlyProjection}€</Text>
              <Text style={s.resultLabel}>Kursim Vjetor</Text>
            </LinearGradient>
          </View>

          <View style={s.tipsCard}>
            <Text style={s.tipsTitle}>Si ta arrish {reduction}% reduktim?</Text>
            {[
              `Fikni pajisjet në "Standby" kur nuk i përdorni.`,
              `Përdorni dritën natyrale sa më shumë gjatë ditës.`,
              `Lani rrobat me ujë të ftohtë (30°C).`,
              `Shkurtoni kohën e dushit me ujë të ngrohtë.`,
            ].slice(0, reduction > 30 ? 4 : 2).map((tip, i) => (
              <View key={i} style={s.tip}>
                <View style={s.tipDot} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <LinearGradient colors={isDarkMode ? ['rgba(0,200,150,0.1)','rgba(26,115,232,0.05)'] : ['#fff', '#f0f9ff']} style={s.forecastCard}>
            <Ionicons name="bar-chart" size={26} color={theme.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.forecastTitle}>Parashikimi AI</Text>
              <Text style={s.forecastMsg}>
                Duke u bazuar në shpenzimet tuaja, nëse reduktoni {reduction}% - do të kurseni{' '}
                <Text style={{ color: theme.primary, fontWeight: '800' }}>{yearlyProjection}€</Text> brenda një viti.
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Plani i Kursimit */}
        {savingActions.length > 0 && (
          <View style={s.toolCard}>
            <View style={s.toolHead}><Ionicons name="bulb" size={20} color={theme.primary} /><Text style={s.toolTitle}>Plani i Kursimit</Text></View>
            <Text style={s.toolSub}>Deri ~{totalSaving.toFixed(2)}€/muaj kursim i mundshëm nga pajisjet e tua:</Text>
            {savingActions.map((a, i) => (
              <View key={i} style={s.planRow}>
                <View style={s.planSaveBadge}><Text style={s.planSaveText}>-{a.saving.toFixed(2)}€</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.planName}>{a.name}</Text>
                  <Text style={s.planTip}>{a.tip}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Kalkulator ditë/natë */}
        <View style={s.toolCard}>
          <View style={s.toolHead}><Ionicons name="moon" size={20} color={theme.primary} /><Text style={s.toolTitle}>Kalkulator ditë/natë</Text></View>
          <Text style={s.toolSub}>Sa kWh mund t'i zhvendosësh te tarifa e lirë e natës (A2)?</Text>
          <TextInput style={s.toolInput} value={shiftKwh} onChangeText={setShiftKwh} keyboardType="numeric" placeholder="p.sh. 100" placeholderTextColor={theme.textMuted} />
          <View style={s.toolResult}>
            <Text style={s.toolResultLabel}>Kursim i mundshëm</Text>
            <Text style={s.toolResultVal}>~{shiftSaving.toFixed(2)}€/muaj</Text>
          </View>
          <Text style={s.toolNote}>Për çdo 100 kWh të zhvendosur natën kursen ~{(perKwhSaving * 100).toFixed(2)}€ (bllok 1).</Text>
        </View>

        {/* Verifiko Faturën */}
        <View style={s.toolCard}>
          <View style={s.toolHead}><Ionicons name="shield-checkmark" size={20} color={theme.primary} /><Text style={s.toolTitle}>Verifiko Faturën</Text></View>
          <Text style={s.toolSub}>Fut konsumin dhe shumën që të faturoi KESCO - të themi nëse është e saktë.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput style={[s.toolInput, { flex: 1 }]} value={vA1} onChangeText={setVA1} keyboardType="numeric" placeholder="Ditë A1 (kWh)" placeholderTextColor={theme.textMuted} />
            <TextInput style={[s.toolInput, { flex: 1 }]} value={vA2} onChangeText={setVA2} keyboardType="numeric" placeholder="Natë A2 (kWh)" placeholderTextColor={theme.textMuted} />
          </View>
          <TextInput style={s.toolInput} value={vCharged} onChangeText={setVCharged} keyboardType="numeric" placeholder="Shuma e faturuar (€)" placeholderTextColor={theme.textMuted} />
          {vHasInput && (
            <View style={[s.verifyBox, { borderColor: vChargedNum > 0 && Math.abs(vDiff) < 1 ? theme.success : vChargedNum > 0 ? '#EF4444' : theme.border }]}>
              <Text style={s.verifyLine}>Fatura e saktë (KESCO): <Text style={{ fontWeight: '900', color: theme.textPrimary }}>{vComputed.total}€</Text></Text>
              {vChargedNum > 0 && (
                Math.abs(vDiff) < 1
                  ? <Text style={[s.verifyVerdict, { color: theme.success }]}>Fatura duket e saktë.</Text>
                  : <Text style={[s.verifyVerdict, { color: '#EF4444' }]}>{vDiff > 0 ? `Je faturuar ${vDiff.toFixed(2)}€ më shumë se duhej.` : `Je faturuar ${Math.abs(vDiff).toFixed(2)}€ më pak.`}</Text>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 14 },
  body: { padding: 20 },
  sliderCard: { backgroundColor: theme.card, borderRadius: 24, padding: 20, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  sliderTitle: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  sliderValue: { color: theme.primary, fontSize: 50, fontWeight: '900', marginBottom: 16 },
  sliderTrack: { width: '100%', height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
  sliderFill: { height: 8, backgroundColor: theme.primary, borderRadius: 4 },
  sliderBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  sliderBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.border, minWidth: 50, alignItems: 'center' },
  sliderBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  sliderBtnText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  sliderBtnTextActive: { color: '#fff' },
  billCompare: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  billBox: { flex: 1, backgroundColor: theme.card, borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  billBoxLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' },
  billBoxVal: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  billArrow: { alignItems: 'center' },
  billBoxNew: { flex: 1, borderRadius: 18, padding: 16, alignItems: 'center' },
  billBoxLabelNew: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },
  billBoxValNew: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  resultGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  resultCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 6 },
  resultVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  resultLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9, textAlign: 'center', fontWeight: '600' },
  tipsCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  tipsTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 15 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  tipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginTop: 5 },
  tipText: { color: theme.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },
  forecastCard: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 15, borderWidth: 1, borderColor: theme.border },
  forecastIcon: { fontSize: 28 },
  forecastTitle: { color: theme.textPrimary, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  forecastMsg: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
  emptyCard: { backgroundColor: theme.card, borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: theme.border, width: '100%' },
  emptyIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  emptyDesc: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  scanBtn: { backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 25, paddingVertical: 15, borderRadius: 15, elevation: 5 },
  scanBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Mjetet e kursimit
  toolCard: { backgroundColor: theme.card, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  toolHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  toolTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '800' },
  toolSub: { color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 14 },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  planSaveBadge: { backgroundColor: theme.success + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 62, alignItems: 'center' },
  planSaveText: { color: theme.success, fontSize: 12, fontWeight: '900' },
  planName: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
  planTip: { color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
  toolInput: { backgroundColor: theme.background, borderRadius: 12, padding: 13, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
  toolResult: { backgroundColor: theme.primary + '12', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.primary + '30', marginBottom: 8 },
  toolResultLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' },
  toolResultVal: { color: theme.primary, fontSize: 26, fontWeight: '900', marginTop: 2 },
  toolNote: { color: theme.textMuted, fontSize: 11, lineHeight: 15 },
  verifyBox: { borderRadius: 14, padding: 14, borderWidth: 1.5, marginTop: 4 },
  verifyLine: { color: theme.textSecondary, fontSize: 13 },
  verifyVerdict: { fontSize: 14, fontWeight: '800', marginTop: 8, lineHeight: 19 },
});

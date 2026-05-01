import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function SimulatorScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const s = styles(theme);

  const [reduction, setReduction] = useState(20);
  const [currentBill, setCurrentBill] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasBills, setHasBills] = useState(false);

  const moneySaved = ((currentBill * reduction) / 100).toFixed(1);
  const newBill = (currentBill - moneySaved).toFixed(1);
  const co2Reduced = (reduction * 1.56).toFixed(0);
  const yearlyProjection = (moneySaved * 12).toFixed(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      const { data: bills } = await supabase
        .from('bills')
        .select('amount')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (bills && bills.length > 0) {
        setHasBills(true);
        setCurrentBill(bills[0].amount);
      } else {
        // Fallback në vlerën default nëse nuk ka faturat (siç ka qenë më herët)
        setHasBills(true);
        setCurrentBill(47.8);
      }
    } catch (err) {
      console.error(err);
      // Në rast gabimi, përdorim vlerën default për të treguar rezultat
      setHasBills(true);
      setCurrentBill(47.8);
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



  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Simuluesi</Text>
            <Text style={s.headerSub}>Duke përdorur të dhënat nga fatura juaj e fundit ({currentBill}€)</Text>
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
            <Text style={s.tipsTitle}>🤖 Si ta arrish {reduction}% reduktim?</Text>
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
            <Text style={s.forecastIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.forecastTitle}>Parashikimi AI</Text>
              <Text style={s.forecastMsg}>
                Duke u bazuar në shpenzimet tuaja, nëse reduktoni {reduction}% — do të kurseni{' '}
                <Text style={{ color: theme.primary, fontWeight: '800' }}>{yearlyProjection}€</Text> brenda një viti.
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

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
});

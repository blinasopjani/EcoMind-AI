import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const SLIDER_W = width - 80;

export default function SimulatorScreen() {
  const [reduction, setReduction] = useState(20);
  const currentBill = 47.8;
  const moneySaved = ((currentBill * reduction) / 100).toFixed(1);
  const newBill = (currentBill - moneySaved).toFixed(1);
  const co2Reduced = (reduction * 1.56).toFixed(0);
  const yearlyProjection = (moneySaved * 12).toFixed(0);

  const progress = useRef(new Animated.Value(reduction / 100)).current;

  const handleSlider = (val) => {
    const clamped = Math.max(5, Math.min(60, val));
    setReduction(clamped);
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#0A0F1E', '#111827']} style={styles.header}>
        <Text style={styles.headerTitle}>Simuluesi</Text>
        <Text style={styles.headerSub}>Shih sa do të kursesh para kohe</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Slider Card */}
        <View style={styles.sliderCard}>
          <Text style={styles.sliderTitle}>Sa dëshironi të reduktoni konsumin?</Text>
          <Text style={styles.sliderValue}>{reduction}%</Text>

          {/* Custom Slider */}
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${(reduction / 60) * 100}%` }]} />
          </View>

          <View style={styles.sliderBtns}>
            {[10, 20, 30, 40, 50].map(v => (
              <View key={v}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => handleSlider(v)}
                style={[styles.sliderBtn, reduction === v && styles.sliderBtnActive]}>
                <Text style={[styles.sliderBtnText, reduction === v && styles.sliderBtnTextActive]}>{v}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Results */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Bill Comparison */}
          <View style={styles.billCompare}>
            <View style={styles.billBox}>
              <Text style={styles.billBoxLabel}>Fatura Aktuale</Text>
              <Text style={[styles.billBoxVal, { color: Colors.danger }]}>{currentBill}€</Text>
            </View>
            <View style={styles.billArrow}>
              <Ionicons name="arrow-forward" size={24} color={Colors.primary} />
            </View>
            <LinearGradient colors={['#00C896','#00A87A']} style={styles.billBoxNew}>
              <Text style={styles.billBoxLabelNew}>Fatura e Re</Text>
              <Text style={styles.billBoxValNew}>{newBill}€</Text>
            </LinearGradient>
          </View>

          {/* Stat Cards */}
          <View style={styles.resultGrid}>
            <LinearGradient colors={['#00C896','#00A87A']} style={styles.resultCard}>
              <Ionicons name="cash" size={24} color="#fff" />
              <Text style={styles.resultVal}>{moneySaved}€</Text>
              <Text style={styles.resultLabel}>Kursim/muaj</Text>
            </LinearGradient>
            <LinearGradient colors={['#1A73E8','#1557B0']} style={styles.resultCard}>
              <Ionicons name="leaf" size={24} color="#fff" />
              <Text style={styles.resultVal}>{co2Reduced}kg</Text>
              <Text style={styles.resultLabel}>CO₂ Reduktuar</Text>
            </LinearGradient>
            <LinearGradient colors={['#7C3AED','#5B21B6']} style={styles.resultCard}>
              <Ionicons name="trending-up" size={24} color="#fff" />
              <Text style={styles.resultVal}>{yearlyProjection}€</Text>
              <Text style={styles.resultLabel}>Kursim Vjetor</Text>
            </LinearGradient>
          </View>

          {/* AI Tips for Reduction */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>🤖 Si ta arrish {reduction}% reduktim?</Text>
            {[
              `Fikni AC 30 min para gjumit → kurseni 3€/javë`,
              `Aktivizoni "Eco Mode" në frigorifer → kurseni 1.5€/muaj`,
              `Zëvendësoni drita me LED → kurseni 0.8€/muaj`,
              `Shfrytëzoni lavanderinë natën → tarifa më e ulët`,
            ].slice(0, reduction > 30 ? 4 : 2).map((tip, i) => (
              <View key={i} style={styles.tip}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Forecast Message */}
          <LinearGradient colors={['rgba(0,200,150,0.1)','rgba(26,115,232,0.1)']} style={styles.forecastCard}>
            <Text style={styles.forecastIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.forecastTitle}>Parashikimi AI</Text>
              <Text style={styles.forecastMsg}>
                Nëse reduktoni {reduction}% — fatura e muajit tjetër pritet të jetë{' '}
                <Text style={{ color: Colors.primary, fontWeight: '800' }}>{newBill}€</Text>
                {' '}dhe do të kurseni{' '}
                <Text style={{ color: Colors.warning, fontWeight: '800' }}>{yearlyProjection}€/vit</Text>.
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { color: Colors.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: Colors.textSecondary, fontSize: 14 },
  body: { padding: 20 },
  sliderCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 20, alignItems: 'center' },
  sliderTitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  sliderValue: { color: Colors.primary, fontSize: 56, fontWeight: '900', marginBottom: 16 },
  sliderTrack: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
  sliderFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  sliderBtns: { flexDirection: 'row', gap: 8 },
  sliderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  sliderBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sliderBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  sliderBtnTextActive: { color: '#fff' },
  billCompare: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  billBox: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 16, alignItems: 'center' },
  billBoxLabel: { color: Colors.textSecondary, fontSize: 12 },
  billBoxVal: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  billArrow: { alignItems: 'center' },
  billBoxNew: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  billBoxLabelNew: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  billBoxValNew: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  resultGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  resultCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8 },
  resultVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  resultLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, textAlign: 'center' },
  tipsCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  tipsTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 6 },
  tipText: { color: Colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },
  forecastCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: 'rgba(0,200,150,0.2)' },
  forecastIcon: { fontSize: 24 },
  forecastTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  forecastMsg: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
});

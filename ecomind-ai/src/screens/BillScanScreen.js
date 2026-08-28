import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { EnergyAPI } from '../data/api';
import { supabase } from '../data/supabase';
import { computeKescoBill } from '../data/kescoTariff';
import { scanBillWithOCR } from '../data/ocrService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Krijon një këshillë reale nga rezultati i llogaritur
const genSuggestion = (calc) => {
  if (calc.totalKwh > 800) {
    return `Konsum i lartë (${calc.totalKwh} kWh): keni hyrë në bllokun e dytë tarifor (mbi 800 kWh), ku çmimi është pothuajse 2x më i shtrenjtë. Ulja nën 800 kWh do të kursente ndjeshëm.`;
  }
  const dayRatio = calc.totalKwh > 0 ? calc.dayKwh / calc.totalKwh : 0;
  if (dayRatio > 0.8) {
    return 'Pjesa më e madhe e konsumit është gjatë ditës (tarifë më e shtrenjtë). Zhvendosni pajisjet e rënda pas orës 22:00 për tarifën më të lirë të natës.';
  }
  return 'Konsumi juaj është brenda bllokut të parë tarifor. Vazhdoni kështu për ta mbajtur faturën të ulët.';
};

export default function BillScanScreen() {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [mode, setMode] = useState('manual'); // 'manual' | 'scan'

  // --- Futje manuale ---
  const [month, setMonth] = useState('');
  const [dayKwh, setDayKwh] = useState('');
  const [nightKwh, setNightKwh] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState(null);

  // --- Skanim ---
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  // Llogaritja live e faturës nga inputet
  const calc = useMemo(
    () => computeKescoBill(parseFloat(dayKwh) || 0, parseFloat(nightKwh) || 0),
    [dayKwh, nightKwh]
  );

  const saveManualBill = async () => {
    const d = parseFloat(dayKwh) || 0;
    const n = parseFloat(nightKwh) || 0;
    if (d + n <= 0) {
      Alert.alert('Mungojnë të dhënat', 'Shkruani së paku konsumin e ditës ose të natës (kWh).');
      return;
    }
    const uid = await AsyncStorage.getItem('user_id');
    if (!uid) {
      Alert.alert('Gabim', 'Duhet të kyçeni për të ruajtur faturën.');
      return;
    }
    setSaving(true);
    try {
      const bill = computeKescoBill(d, n);
      const payload = {
        amount: bill.total,
        kwh: bill.totalKwh,
        date: month.trim() || new Date().toLocaleDateString('sq', { month: 'long', year: 'numeric' }),
        provider: 'KESCO',
        suggestion: genSuggestion(bill),
        user_id: uid,
      };
      const { error } = await supabase.from('bills').insert([payload]);
      if (error) throw error;
      setSavedResult({ ...payload, breakdown: bill.breakdown, neto: bill.neto, vat: bill.vat, fixed: bill.fixed });
    } catch (e) {
      Alert.alert('Gabim', 'Nuk u ruajt fatura: ' + (e.message || 'provoni përsëri.'));
    } finally {
      setSaving(false);
    }
  };

  const resetManual = () => {
    setMonth(''); setDayKwh(''); setNightKwh(''); setSavedResult(null);
  };

  // --- Skanim (OCR browser-side me tesseract.js → fallback backend API) ---
  const processBill = async (uri) => {
    setScanning(true);
    setErrorMsg(null);
    setOcrProgress(0);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      if (!uid) { Alert.alert('Gabim', 'Duhet të kyçeni.'); setScanning(false); return; }

      let dayVal = 0, nightVal = 0, dateVal = '';
      let ocrSuccess = false;

      // 1. Provo OCR në browser (tesseract.js) — nuk kërkon server
      try {
        const result = await scanBillWithOCR(uri, (pct) => setOcrProgress(pct));
        if (result.dayKwh > 0 || result.nightKwh > 0) {
          dayVal = result.dayKwh;
          nightVal = result.nightKwh;
          dateVal = result.date;
          ocrSuccess = true;
        }
      } catch (ocrErr) {
        console.warn('OCR browser-side dështoi:', ocrErr.message);
      }

      // 2. Fallback: provo backend API nëse OCR nuk nxori të dhëna
      if (!ocrSuccess) {
        try {
          const response = await EnergyAPI.scanBill(uri);
          if (response && (response.kwh || response.day_kwh)) {
            dayVal = response.day_kwh || response.kwh || 0;
            nightVal = response.night_kwh || 0;
            dateVal = response.date || '';
            ocrSuccess = true;
          }
        } catch (_) {}
      }

      if (ocrSuccess) {
        // Parambush formularin manual — përdoruesi verifikon para se të ruajë
        setMode('manual');
        setDayKwh(String(dayVal || ''));
        setNightKwh(String(nightVal || ''));
        setMonth(dateVal);
        setImage(null);
        setOcrProgress(0);
        Alert.alert('✅ U lexua fatura', `A1: ${dayVal} kWh | A2: ${nightVal} kWh\n\nKontrolloni vlerat dhe shtypni "Ruaj faturën".`);
      } else {
        throw new Error('Nuk u nxorën të dhëna nga fatura.');
      }
    } catch (error) {
      setErrorMsg(
        'Nuk u lexua dot fatura automatikisht. Kontrolloni cilësinë e fotos ose përdorni futjen manuale.'
      );
    } finally {
      setScanning(false);
    }
  };

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!r.canceled) { setImage(r.assets[0].uri); processBill(r.assets[0].uri); }
  };
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!r.canceled) { setImage(r.assets[0].uri); processBill(r.assets[0].uri); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <Text style={s.headerTitle}>Fatura</Text>
          <Text style={s.headerSub}>Fut faturën manualisht ose skanoje</Text>
        </LinearGradient>

        <View style={s.body}>
          {/* Përzgjedhësi i mënyrës */}
          <View style={s.tabRow}>
            <TouchableOpacity style={[s.tab, mode === 'manual' && s.tabActive]} onPress={() => setMode('manual')}>
              <Ionicons name="create-outline" size={18} color={mode === 'manual' ? '#fff' : theme.textSecondary} />
              <Text style={[s.tabText, mode === 'manual' && s.tabTextActive]}>Manualisht</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, mode === 'scan' && s.tabActive]} onPress={() => setMode('scan')}>
              <Ionicons name="camera-outline" size={18} color={mode === 'scan' ? '#fff' : theme.textSecondary} />
              <Text style={[s.tabText, mode === 'scan' && s.tabTextActive]}>Skano foton</Text>
            </TouchableOpacity>
          </View>

          {mode === 'manual' ? (
            savedResult ? (
              <View style={s.card}>
                <View style={s.resultHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={22} color={theme.success} />
                    <Text style={s.resultTitle}>Fatura u ruajt</Text>
                  </View>
                  <TouchableOpacity onPress={resetManual}><Text style={{ color: theme.primary, fontWeight: '700' }}>Shto tjetër</Text></TouchableOpacity>
                </View>
                <View style={s.bigTotal}>
                  <Text style={s.bigTotalVal}>{savedResult.amount} €</Text>
                  <Text style={s.bigTotalLbl}>{savedResult.kwh} kWh • {savedResult.date}</Text>
                </View>
                {savedResult.breakdown.map(r => (
                  <View key={r.key} style={s.resRow}>
                    <Text style={s.resLabel}>{r.label} — {r.kwh} kWh × {r.price}€</Text>
                    <Text style={s.resValue}>{r.amount} €</Text>
                  </View>
                ))}
                <View style={s.resRow}><Text style={s.resLabel}>Tarifa fikse</Text><Text style={s.resValue}>{savedResult.fixed} €</Text></View>
                <View style={s.resRow}><Text style={s.resLabel}>TVSH (8%)</Text><Text style={s.resValue}>{savedResult.vat} €</Text></View>
                <View style={s.suggestionBox}>
                  <Ionicons name="bulb" size={18} color={theme.warning} />
                  <Text style={s.suggestionText}>{savedResult.suggestion}</Text>
                </View>
              </View>
            ) : (
              <View style={s.card}>
                <Text style={s.formHint}>Vlerat i gjeni te fatura KESCO: "Gjendja e tanishme − paraprake" për ditën (A1) dhe natën (A2), ose thjesht konsumi total.</Text>

                <Text style={s.label}>Muaji / Periudha</Text>
                <TextInput style={s.input} placeholder="p.sh. Shkurt 2024" placeholderTextColor={theme.textMuted} value={month} onChangeText={setMonth} />

                <Text style={s.label}>Konsumi i ditës — A1 (kWh)</Text>
                <TextInput style={s.input} placeholder="p.sh. 809" placeholderTextColor={theme.textMuted} value={dayKwh} onChangeText={setDayKwh} keyboardType="numeric" />

                <Text style={s.label}>Konsumi i natës — A2 (kWh)</Text>
                <TextInput style={s.input} placeholder="p.sh. 149" placeholderTextColor={theme.textMuted} value={nightKwh} onChangeText={setNightKwh} keyboardType="numeric" />

                {/* Parashikimi live i faturës */}
                <View style={s.previewBox}>
                  <Text style={s.previewLabel}>Fatura e llogaritur (tarifat KESCO)</Text>
                  <Text style={s.previewTotal}>{calc.total} €</Text>
                  <Text style={s.previewSub}>{calc.totalKwh} kWh • Neto {calc.neto}€ + TVSH {calc.vat}€</Text>
                </View>

                <TouchableOpacity style={s.saveBtn} onPress={saveManualBill} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={s.btnText}>Ruaj faturën</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )
          ) : (
            /* Mënyra e skanimit */
            <View style={s.card}>
              {!image ? (
                <View style={s.scanPlaceholder}>
                  <LinearGradient colors={[theme.primary, theme.secondary]} style={s.scanIconBox}>
                    <Ionicons name="camera" size={44} color="#fff" />
                  </LinearGradient>
                  <Text style={s.scanText}>Zgjidhni një foto të faturës. Vlerat e lexuara do t'i verifikoni te formulari manual.</Text>
                  <View style={s.btnRow}>
                    <TouchableOpacity style={s.pickBtn} onPress={pickImage}><Ionicons name="image" size={20} color="#fff" /><Text style={s.btnText}>Galeria</Text></TouchableOpacity>
                    <TouchableOpacity style={[s.pickBtn, { backgroundColor: '#1E293B' }]} onPress={takePhoto}><Ionicons name="camera" size={20} color="#fff" /><Text style={s.btnText}>Kamera</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Image source={{ uri: image }} style={s.previewImage} />
                  {scanning ? (
                    <View style={s.loadingBox}>
                      <ActivityIndicator size="large" color={theme.primary} />
                      <Text style={s.loadingText}>Duke lexuar faturën… {ocrProgress > 0 ? `${ocrProgress}%` : ''}</Text>
                      {ocrProgress > 0 && (
                        <View style={s.progressBarBg}>
                          <View style={[s.progressBarFill, { width: `${ocrProgress}%` }]} />
                        </View>
                      )}
                    </View>
                  ) : errorMsg ? (
                    <View style={s.errorBox}>
                      <Ionicons name="cloud-offline-outline" size={40} color={theme.warning} />
                      <Text style={s.errorText}>{errorMsg}</Text>
                      <View style={s.btnRow}>
                        <TouchableOpacity style={s.pickBtn} onPress={() => setMode('manual')}><Text style={s.btnText}>Fut manualisht</Text></TouchableOpacity>
                        <TouchableOpacity style={[s.pickBtn, { backgroundColor: '#1E293B' }]} onPress={() => setImage(null)}><Text style={s.btnText}>Foto tjetër</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 30 },
  headerTitle: { color: theme.textPrimary, fontSize: 24, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
  body: { padding: 20 },
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabText: { color: theme.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: theme.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: theme.border },
  formHint: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 16 },
  label: { color: theme.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  input: { backgroundColor: theme.background, borderRadius: 12, padding: 14, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, marginBottom: 6 },
  previewBox: { backgroundColor: theme.primary + '12', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16, marginBottom: 18, borderWidth: 1, borderColor: theme.primary + '30' },
  previewLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' },
  previewTotal: { color: theme.primary, fontSize: 30, fontWeight: '900', marginTop: 4 },
  previewSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 15, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  resultTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800' },
  bigTotal: { alignItems: 'center', marginBottom: 18 },
  bigTotalVal: { color: theme.primary, fontSize: 36, fontWeight: '900' },
  bigTotalLbl: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  resRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8 },
  resLabel: { color: theme.textSecondary, fontSize: 12, flex: 1 },
  resValue: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginLeft: 8 },
  suggestionBox: { backgroundColor: theme.warning + '15', padding: 15, borderRadius: 15, flexDirection: 'row', gap: 10, marginTop: 14 },
  suggestionText: { color: theme.textPrimary, fontSize: 13, flex: 1, lineHeight: 18 },
  scanPlaceholder: { alignItems: 'center', paddingVertical: 20 },
  scanIconBox: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scanText: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 22, paddingHorizontal: 10, lineHeight: 19 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  pickBtn: { backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  previewImage: { width: '100%', height: 220, resizeMode: 'cover', borderRadius: 14 },
  loadingBox: { padding: 24, alignItems: 'center' },
  loadingText: { color: theme.textPrimary, marginTop: 12, fontWeight: '600' },
  progressBarBg: { height: 8, width: '100%', backgroundColor: theme.border + '30', borderRadius: 4, marginTop: 8 },
  progressBarFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 4 },
  errorBox: { padding: 20, alignItems: 'center' },
  errorText: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 19 },
});

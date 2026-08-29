import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Image, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeKescoBill } from '../data/kescoTariff';

const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];

export default function OnboardingScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const { userId } = route.params || {};

  // Step 3: manual bill entry state
  const [billDayKwh, setBillDayKwh] = useState('');
  const [billNightKwh, setBillNightKwh] = useState('');
  const [billMonth, setBillMonth] = useState('');
  const [billSaved, setBillSaved] = useState(false);
  const [billSaving, setBillSaving] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickYear, setPickYear] = useState(new Date().getFullYear());

  const billCalc = useMemo(
    () => computeKescoBill(parseFloat(billDayKwh) || 0, parseFloat(billNightKwh) || 0),
    [billDayKwh, billNightKwh]
  );

  const saveOnboardingBill = async () => {
    const d = parseFloat(billDayKwh) || 0;
    const n = parseFloat(billNightKwh) || 0;
    if (d + n <= 0) {
      Alert.alert('Kujdes', 'Fut të paktën konsumin e ditës (kWh).');
      return;
    }
    if (!userId) { setBillSaved(true); return; }
    setBillSaving(true);
    try {
      const bill = computeKescoBill(d, n);
      await supabase.from('bills').insert([{
        amount: bill.total,
        kwh: bill.totalKwh,
        date: billMonth.trim() || new Date().toLocaleDateString('sq', { month: 'long', year: 'numeric' }),
        provider: 'KESCO',
        suggestion: bill.totalKwh > 800
          ? 'Konsum i lartë: shmangni bllokun e dytë tarifor.'
          : 'Konsum në nivelin e parë tarifor. Vazhdoni kështu!',
        user_id: userId,
      }]);
      setBillSaved(true);
    } catch (e) {
      Alert.alert('Gabim', 'Nuk u ruajt fatura.');
    } finally {
      setBillSaving(false);
    }
  };

  useEffect(() => {
    const getUsername = async () => {
      const name = await AsyncStorage.getItem('user_name');
      if (name) setUserName(name);
    };
    getUsername();
  }, []);

  // Step 1: Personal & House Data
  const [formData, setFormData] = useState({
    fullName: '',
    houseSize: '',
    familyMembers: '',
    monthlyBudget: ''
  });

  // Step 2: Devices list (multi-device)
  const [devices, setDevices] = useState([]);
  const [deviceDraft, setDeviceDraft] = useState({ name: '', power: '' });

  const addDevice = () => {
    if (!deviceDraft.name.trim() || !deviceDraft.power.trim()) {
      Alert.alert('Kujdes', 'Plotëso emrin dhe fuqinë e pajisjes.');
      return;
    }
    setDevices([...devices, { ...deviceDraft }]);
    setDeviceDraft({ name: '', power: '' });
  };

  const removeDevice = (idx) => {
    setDevices(devices.filter((_, i) => i !== idx));
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.houseSize || !formData.familyMembers || !formData.monthlyBudget) {
        Alert.alert('Kujdes', 'Ju lutem plotësoni të gjitha të dhënat e kërkuara.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (devices.length === 0) {
        Alert.alert('Kujdes', 'Shtoni të paktën një pajisje për të vazhduar.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      // 1. Ruajmë të dhënat e shtëpisë në AsyncStorage (për t'u përshtatur me SettingsScreen)
      const houseData = {
        banimi: `${formData.houseSize}m²`,
        personat: `${formData.familyMembers} persona`,
        buxheti: `${formData.monthlyBudget}€`
      };
      await AsyncStorage.setItem('house_data', JSON.stringify(houseData));
      
      // 2. Save all devices to Supabase (batch insert)
      if (devices.length > 0 && userId) {
        const rows = devices.map(d => ({
          name: d.name,
          avg_consumption: parseInt(d.power, 10) || 0,
          user_id: userId,
          type: 'other',
          status: 'on',
        }));
        await supabase.from('devices').insert(rows);
      }

      // 3. Mark Onboarding as Complete
      await AsyncStorage.setItem('onboarding_complete', 'true');
      if (userId) {
        await AsyncStorage.setItem('user_id', userId.toString());
      }

      navigation.replace('Main');
    } catch (err) {
      console.error(err);
      Alert.alert('Gabim', 'Ndodhi një gabim gjatë ruajtjes së të dhënave.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Përshëndetje{userName ? `, ${userName}` : ''}!</Text>
            <Text style={s.stepSub}>Na tregoni pak për veten dhe ambientin ku jetoni.</Text>

            <View style={s.inputGroup}>
              <Text style={s.label}>Madhësia e shtëpisë (m²)</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="home-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
                <TextInput 
                  style={s.input} 
                  placeholder="p.sh. 85" 
                  placeholderTextColor={theme.textMuted} 
                  value={formData.houseSize} 
                  onChangeText={(v) => setFormData({...formData, houseSize: v})}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Anëtarët e familjes</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="people-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
                <TextInput 
                  style={s.input} 
                  placeholder="p.sh. 4" 
                  placeholderTextColor={theme.textMuted} 
                  value={formData.familyMembers} 
                  onChangeText={(v) => setFormData({...formData, familyMembers: v})}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Buxheti i synuar mujor (€)</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="wallet-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
                <TextInput 
                  style={s.input} 
                  placeholder="p.sh. 50" 
                  placeholderTextColor={theme.textMuted} 
                  value={formData.monthlyBudget} 
                  onChangeText={(v) => setFormData({...formData, monthlyBudget: v})}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Pajisjet e Tua</Text>
            <Text style={s.stepSub}>Shto pajisjet që dëshiron t'i monitorosh. Mund të shtosh sa të duash.</Text>

            {/* Lista e pajisjes të shtuara */}
            {devices.map((d, idx) => (
              <View key={idx} style={s.deviceRow}>
                <Ionicons name="flash" size={18} color={theme.primary} />
                <Text style={s.deviceRowText}>{d.name} — {d.power}W</Text>
                <TouchableOpacity onPress={() => removeDevice(idx)}>
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Formular për pajisje të re */}
            <View style={[s.inputGroup, { marginTop: devices.length > 0 ? 16 : 0 }]}>
              <Text style={s.label}>Emri i pajisjes</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="extension-puzzle-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="p.sh. Kondicioneri"
                  placeholderTextColor={theme.textMuted}
                  value={deviceDraft.name}
                  onChangeText={(v) => setDeviceDraft({ ...deviceDraft, name: v })}
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Fuqia (Watt)</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="flash-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="p.sh. 1500"
                  placeholderTextColor={theme.textMuted}
                  value={deviceDraft.power}
                  onChangeText={(v) => setDeviceDraft({ ...deviceDraft, power: v })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity style={s.addDeviceBtn} onPress={addDevice}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={s.addDeviceBtnText}>Shto Pajisjen</Text>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Fatura juaj</Text>
            <Text style={s.stepSub}>Futni faturën tuaj të fundit KESCO, ose mësoni si të skanoni.</Text>

            {/* Udhëzues vizual */}
            <View style={s.guideContainer}>
              <View style={s.guideItem}>
                <View style={s.guideNumber}><Text style={s.guideNumberText}>1</Text></View>
                <Text style={s.guideText}>Gjeni "Gjendja e tanishme − paraprake" në faturën KESCO (A1=ditë, A2=natën).</Text>
              </View>
              <View style={s.guideItem}>
                <View style={s.guideNumber}><Text style={s.guideNumberText}>2</Text></View>
                <Text style={s.guideText}>Skanoni me kamerën te "Fatura" → "Skano", ose futni vlerat manualisht këtu poshtë.</Text>
              </View>
              <View style={s.guideItem}>
                <View style={s.guideNumber}><Text style={s.guideNumberText}>3</Text></View>
                <Text style={s.guideText}>EcoMind do të llogarisë faturën me tarifat zyrtare të KESCO-s.</Text>
              </View>
            </View>

            {/* Futja manuale e faturës */}
            {billSaved ? (
              <View style={[s.billSavedBox, { backgroundColor: (theme.success || '#10B981') + '15', borderColor: theme.success || '#10B981' }]}>
                <Ionicons name="checkmark-circle" size={28} color={theme.success || '#10B981'} />
                <Text style={[s.billSavedText, { color: theme.textPrimary }]}>Fatura u ruajt! ({billCalc.total} € / {billCalc.totalKwh} kWh)</Text>
              </View>
            ) : (
              <View style={s.billFormBox}>
                <Text style={[s.billFormTitle, { color: theme.textPrimary }]}>Fut faturën (opsionale)</Text>

                <Text style={s.label}>Muaji</Text>
                <TouchableOpacity style={s.inputWrapper} onPress={() => setShowMonthPicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color={theme.textMuted} style={s.inputIcon} />
                  <Text style={{ color: billMonth ? theme.textPrimary : theme.textMuted, fontSize: 15, flex: 1 }}>
                    {billMonth || 'Zgjidh muajin…'}
                  </Text>
                </TouchableOpacity>

                <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
                  <TouchableOpacity style={s.mpOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)}>
                    <View style={[s.mpCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <View style={s.mpYearRow}>
                        <TouchableOpacity onPress={() => setPickYear(y => y - 1)}><Ionicons name="chevron-back" size={22} color={theme.textPrimary} /></TouchableOpacity>
                        <Text style={[s.mpYear, { color: theme.textPrimary }]}>{pickYear}</Text>
                        <TouchableOpacity onPress={() => setPickYear(y => y + 1)}><Ionicons name="chevron-forward" size={22} color={theme.textPrimary} /></TouchableOpacity>
                      </View>
                      <View style={s.mpGrid}>
                        {MONTHS_SQ.map((mName, i) => (
                          <TouchableOpacity key={i} style={[s.mpMonth, { backgroundColor: theme.background, borderColor: theme.border }]}
                            onPress={() => { setBillMonth(`${mName} ${pickYear}`); setShowMonthPicker(false); }}>
                            <Text style={[s.mpMonthText, { color: theme.textPrimary }]}>{mName.slice(0, 4)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Modal>

                <Text style={s.label}>Konsumi i Ditës — A1 (kWh)</Text>
                <View style={s.inputWrapper}>
                  <Ionicons name="sunny-outline" size={18} color={theme.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="p.sh. 809"
                    placeholderTextColor={theme.textMuted}
                    value={billDayKwh}
                    onChangeText={setBillDayKwh}
                    keyboardType="numeric"
                  />
                </View>

                <Text style={s.label}>Konsumi i Natës — A2 (kWh)</Text>
                <View style={s.inputWrapper}>
                  <Ionicons name="moon-outline" size={18} color={theme.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="p.sh. 149"
                    placeholderTextColor={theme.textMuted}
                    value={billNightKwh}
                    onChangeText={setBillNightKwh}
                    keyboardType="numeric"
                  />
                </View>

                {(parseFloat(billDayKwh) + parseFloat(billNightKwh) > 0) && (
                  <View style={[s.previewBox, { backgroundColor: (theme.primary) + '12', borderColor: theme.primary + '30' }]}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700' }}>Fatura e llogaritur</Text>
                    <Text style={{ color: theme.primary, fontSize: 28, fontWeight: '900', marginTop: 4 }}>{billCalc.total} €</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{billCalc.totalKwh} kWh • Neto {billCalc.neto}€ + TVSH {billCalc.vat}€</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.addDeviceBtn, { marginTop: 12 }]}
                  onPress={saveOnboardingBill}
                  disabled={billSaving}
                >
                  {billSaving ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
                      <Text style={s.addDeviceBtnText}>Ruaj Faturën</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={{ alignItems: 'center', marginTop: 12 }} onPress={() => setStep(4)}>
                  <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>Anashkalo — do ta shtoj më vonë</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      case 4:
        return (
          <View style={[s.stepContent, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
            <View style={s.successCircle}>
              <Ionicons name="checkmark-circle" size={100} color={theme.primary} />
            </View>
            <Text style={[s.stepTitle, { textAlign: 'center' }]}>Gati!</Text>
            <Text style={[s.stepSub, { textAlign: 'center' }]}>Llogaria juaj është konfiguruar me sukses. Tani mund të filloni kursimin!</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={theme.gradientPrimary} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.progressContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[s.progressLine, i <= step && s.activeLine]} />
          ))}
        </View>
        <Text style={s.headerTitle}>Hapi {step} nga 4</Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={s.footer}>
        {step < 4 && (
          <TouchableOpacity style={s.skipBtn} onPress={finishOnboarding}>
            <Text style={s.skipText}>Anashkalo</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={s.nextBtn} onPress={handleNext} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.nextText}>{step === 4 ? 'Fillo tani' : 'Vazhdo'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
  progressContainer: { flexDirection: 'row', width: '80%', gap: 8, marginBottom: 15 },
  progressLine: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  activeLine: { backgroundColor: '#fff' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', opacity: 0.9 },
  scroll: { padding: 25 },
  stepContent: { marginTop: 10 },
  stepTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 10 },
  stepSub: { color: theme.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 10, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: theme.border, height: 60 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: theme.textPrimary, fontSize: 16 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.card, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.primary + '40' },
  deviceRowText: { flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  addDeviceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 14, height: 50 },
  addDeviceBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  guideContainer: { gap: 15, marginBottom: 30 },
  guideItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: theme.border },
  guideNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  guideNumberText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  guideText: { color: theme.textPrimary, fontSize: 14, flex: 1, lineHeight: 20 },
  illustrationPlaceholder: { height: 180, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  illuGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  illuText: { color: theme.primary, fontWeight: '700', marginTop: 10 },
  successCircle: { marginBottom: 20 },
  footer: { padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
  nextBtn: { flex: 2, backgroundColor: theme.primary, borderRadius: 18, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  nextText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  skipBtn: { flex: 1, height: 60, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: theme.textSecondary, fontWeight: '700', fontSize: 16 },
  // Bill form styles (step 3)
  billFormBox: { backgroundColor: theme.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: theme.border, marginTop: 4 },
  billFormTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  billSavedBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5, marginTop: 8 },
  billSavedText: { fontSize: 14, fontWeight: '700', flex: 1 },
  previewBox: { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 14, borderWidth: 1 },
  // Month picker styles
  mpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 30 },
  mpCard: { borderRadius: 24, padding: 20, borderWidth: 1 },
  mpYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 10 },
  mpYear: { fontSize: 20, fontWeight: '800' },
  mpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  mpMonth: { width: '30%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  mpMonthText: { fontSize: 13, fontWeight: '600' },
});

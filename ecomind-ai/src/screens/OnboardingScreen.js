import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Platform, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeKescoBill, KWH_TO_EUR } from '../data/kescoTariff';

const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor',
  'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];

const TOTAL_STEPS = 5;

// Helper to map device names to valid DB type string with _on suffix
const getDeviceTypeKey = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('frigorifer')) return 'fridge_on';
  if (n.includes('frizer') || n.includes('ngrir')) return 'freezer_on';
  if (n.includes('lavatri')) return 'washer_on';
  if (n.includes('enëlarëse') || n.includes('enelar')) return 'dishwasher_on';
  if (n.includes('furr')) return 'oven_on';
  if (n.includes('klim') || n.includes('ac')) return 'ac_on';
  if (n.includes('bojler')) return 'boiler_on';
  if (n.includes('televizor') || n.includes('tv')) return 'tv_on';
  if (n.includes('ngrohëse') || n.includes('radiator')) return 'heater_on';
  if (n.includes('mikroval')) return 'microwave_on';
  if (n.includes('kompjuter') || n.includes('laptop')) return 'computer_on';
  return 'bulb_on';
};

// ─── ChipSelect component ───────────────────────────────────────────────
function ChipSelect({ options, value, onChange, multi = false, theme }) {
  const s = chipStyles(theme);
  const selected = multi ? (Array.isArray(value) ? value : []) : value;

  const toggle = (opt) => {
    if (multi) {
      const arr = Array.isArray(selected) ? [...selected] : [];
      const idx = arr.indexOf(opt);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(opt);
      onChange(arr);
    } else {
      onChange(opt === selected ? '' : opt);
    }
  };

  const isActive = (opt) => multi
    ? (Array.isArray(selected) && selected.includes(opt))
    : selected === opt;

  return (
    <View style={s.row}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[s.chip, isActive(opt) && s.chipActive]}
          onPress={() => toggle(opt)}
          activeOpacity={0.75}
        >
          {isActive(opt) && (
            <Ionicons name="checkmark-circle" size={15} color="#fff" style={{ marginRight: 5 }} />
          )}
          <Text style={[s.chipText, isActive(opt) && s.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const chipStyles = (theme) => StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});

// ─── Preset devices ─────────────────────────────────────────────────────────
const PRESET_DEVICES = [
  { name: 'Frigorifer', power: 150, icon: 'snow-outline' },
  { name: 'Ngrirëse (frizer)', power: 120, icon: 'cube-outline' },
  { name: 'Lavatriçe', power: 2000, icon: 'water-outline' },
  { name: 'Enëlarëse', power: 1800, icon: 'restaurant-outline' },
  { name: 'Furrë elektrike', power: 2500, icon: 'flame-outline' },
  { name: 'Klimë', power: 1500, icon: 'thermometer-outline' },
  { name: 'Bojler elektrik', power: 2000, icon: 'water' },
  { name: 'Televizor', power: 100, icon: 'tv-outline' },
  { name: 'Ngrohëse elektrike', power: 2000, icon: 'sunny-outline' },
  { name: 'Mikrovalë', power: 900, icon: 'radio-outline' },
  { name: 'Kompjuter / Laptop', power: 150, icon: 'laptop-outline' },
  { name: 'Karikues të shumtë', power: 60, icon: 'battery-charging-outline' },
];

export default function OnboardingScreen({ navigation, route }) {
  const { theme } = useTheme();
  const s = styles(theme);
  const { userId } = route.params || {};

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');

  // Hapi 1: Profili i banesës
  const [llojiBanese, setLlojiBanese] = useState('');
  const [houseSize, setHouseSize] = useState('');
  const [dhoma, setDhoma] = useState('');
  const [izolimi, setIzolimi] = useState('');
  const [vitiNdertimit, setVitiNdertimit] = useState('');

  // Hapi 2: Familja dhe orari
  const [familyMembers, setFamilyMembers] = useState('');
  const [femijeMoshuar, setFemijeMoshuar] = useState('');
  const [orari, setOrari] = useState('');

  // Hapi 3: Ngrohja, ftohja, uji
  const [ngrohja, setNgrohja] = useState('');
  const [muajNgrohje, setMuajNgrohje] = useState('');
  const [ftohja, setFtohja] = useState('');
  const [ujiNgrohte, setUjiNgrohte] = useState('');

  // Hapi 4: Pajisjet
  const [presetSelected, setPresetSelected] = useState([]);
  const [klasaPajisjeve, setKlasaPajisjeve] = useState('');
  const [deviceDraft, setDeviceDraft] = useState({ name: '', power: '' });
  const [customDevices, setCustomDevices] = useState([]);
  const [showManualForm, setShowManualForm] = useState(false);

  // Hapi 5: Fatura, tarifa dhe objektiva
  const [tarifaDyBlloke, setTarifaDyBlloke] = useState('');
  const [dpr, setDpr] = useState('');
  const [faturaMesatare, setFaturaMesatare] = useState('');
  const [muajiKulm, setMuajiKulm] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [objektivi, setObjektivi] = useState('');
  const [synimiKursimit, setSynimiKursimit] = useState('');

  // Bill scan state (step 5 - manual bill)
  const [billDayKwh, setBillDayKwh] = useState('');
  const [billNightKwh, setBillNightKwh] = useState('');
  const [billMonth, setBillMonth] = useState('');
  const [billSaved, setBillSaved] = useState(false);
  const [billSaving, setBillSaving] = useState(false);
  const [billSkipped, setBillSkipped] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickYear, setPickYear] = useState(new Date().getFullYear());

  const billCalc = useMemo(
    () => computeKescoBill(parseFloat(billDayKwh) || 0, parseFloat(billNightKwh) || 0),
    [billDayKwh, billNightKwh]
  );

  useEffect(() => {
    AsyncStorage.getItem('user_name').then((n) => { if (n) setUserName(n); });
  }, []);

  const canProceed = () => {
    if (step === 1) return !!llojiBanese && !!houseSize;
    if (step === 2) return !!familyMembers;
    if (step === 3) return !!ngrohja;
    if (step === 4) return true;
    if (step === 5) return !!monthlyBudget && !!objektivi;
    return true;
  };

  const handleNext = async () => {
    if (step === 1 && (!llojiBanese || !houseSize)) {
      Alert.alert('Kujdes', 'Ju lutem zgjidhni llojin e banesës dhe madhësinë (m²).');
      return;
    }
    if (step === 2 && !familyMembers) {
      Alert.alert('Kujdes', 'Ju lutem shënoni numrin e anëtarëve të familjes.');
      return;
    }
    if (step === 3 && !ngrohja) {
      Alert.alert('Kujdes', 'Ju lutem zgjidhni burimin kryesor të ngrohjes.');
      return;
    }
    if (step === 5 && (!monthlyBudget || !objektivi)) {
      Alert.alert('Kujdes', 'Ju lutem vendosni buxhetin mujor dhe objektivin tuaj kryesor.');
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleSkipStep = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const saveOnboardingBill = async () => {
    const d = parseFloat(billDayKwh) || 0;
    const n = parseFloat(billNightKwh) || 0;
    if (d + n <= 0) {
      Alert.alert('Kujdes', 'Fut të paktën konsumin e ditës (kWh).');
      return;
    }
    const uid = userId || (await AsyncStorage.getItem('user_id'));
    setBillSaving(true);
    try {
      const bill = computeKescoBill(d, n);
      const billObj = {
        amount: bill.total,
        kwh: bill.totalKwh,
        date: billMonth.trim() || new Date().toLocaleDateString('sq', { month: 'long', year: 'numeric' }),
        provider: 'KESCO',
        suggestion: bill.totalKwh > 800
          ? 'Konsum i lartë: shmangni bllokun e dytë tarifor.'
          : 'Konsum në nivelin e parë tarifor. Vazhdoni kështu!',
        user_id: uid,
        dpr: dpr.trim() || null,
      };

      if (uid) {
        await AsyncStorage.setItem(`${uid}_last_bill`, JSON.stringify(billObj));
        await supabase.from('bills').insert([billObj]);
      }
      setBillSaved(true);
      setBillSkipped(false);
    } catch (e) {
      console.warn('Bill save error:', e);
      setBillSaved(true);
    } finally {
      setBillSaving(false);
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      const uid = userId || (await AsyncStorage.getItem('user_id'));

      // 1. Ruajtja e plotë e të dhënave të shtëpisë te AsyncStorage
      const houseData = {
        llojiBanese: llojiBanese || 'Apartament',
        m2: houseSize || '85',
        banimi: llojiBanese ? `${llojiBanese} - ${houseSize ? `${houseSize}m²` : ''}` : houseSize ? `${houseSize}m²` : 'Apartament - 85m²',
        dhoma: dhoma || '3',
        izolimi: izolimi || 'Mesatar',
        vitiNdertimit: vitiNdertimit || '1990-2010',
        personat: familyMembers ? `${familyMembers} persona` : '4 persona',
        femijeMoshuar: femijeMoshuar || 'Jo',
        orari: orari || 'Gjithë ditën',
        ngrohja: ngrohja || 'Rrymë',
        muajNgrohje: muajNgrohje || '5-6',
        ftohja: ftohja || 'Klimë inverter',
        ujiNgrohte: ujiNgrohte || 'Bojler elektrik',
        klasaPajisjeve: klasaPajisjeve || 'A++',
        tarifaDyBlloke: tarifaDyBlloke || 'Po',
        dpr: dpr || '',
        faturaMesatare: faturaMesatare || '50',
        muajiKulm: muajiKulm || 'Dimër (ngrohje)',
        buxheti: monthlyBudget ? `${monthlyBudget}€` : '50€',
        objektivi: objektivi || 'Ul faturën',
        synimiKursimit: synimiKursimit || '10%',
      };

      // Të dhënat e shtëpisë ruhen VETËM per-user (pa kopje globale)
      const houseKey = uid ? `${uid}_house_data` : 'house_data';
      await AsyncStorage.setItem(houseKey, JSON.stringify(houseData));

      // 2. Ruajtja e Buxhetit dhe DPR (per-user)
      if (monthlyBudget && uid) {
        await AsyncStorage.setItem(`${uid}_monthly_budget`, monthlyBudget);
      }
      if (dpr && uid) {
        await AsyncStorage.setItem(`${uid}_user_dpr`, dpr);
      }

      // 3. Ruajtja e Objektivave (Goals) direkt për ekranin GoalsScreen & Dashboard
      const initialGoalList = [
        {
          id: Date.now().toString(),
          title: objektivi || 'Ul faturën e energjisë',
          target: parseFloat(monthlyBudget) || 50,
          unit: '€',
          current: 0,
          category: 'Buxheti',
          color: '#00C896',
          icon: 'wallet',
        },
      ];
      const goalsKey = uid ? `${uid}_user_goals` : 'user_goals';
      await AsyncStorage.setItem(goalsKey, JSON.stringify(initialGoalList));

      // 4. Ruajtja e Pajisjeve (me type të saktë me suffix _on, në Supabase dhe AsyncStorage fallback)
      const rawDevices = [
        ...PRESET_DEVICES.filter((d) => presetSelected.includes(d.name)),
        ...customDevices,
      ];
      const allDevices = rawDevices.length > 0 ? rawDevices : [
        { name: 'Frigorifer', power: 150 },
        { name: 'Lavatriçe', power: 2000 },
        { name: 'Bojler elektrik', power: 2000 },
      ];

      const formattedLocalDevices = allDevices.map((d, i) => ({
        id: (Date.now() + i).toString(),
        name: d.name,
        power: parseInt(d.power, 10) || 100,
        type: getDeviceTypeKey(d.name).replace('_on', ''),
        status: true,
      }));

      if (uid) {
        await AsyncStorage.setItem(`${uid}_user_devices`, JSON.stringify(formattedLocalDevices));
        const dbRows = allDevices.map((d) => ({
          name: d.name,
          avg_consumption: parseInt(d.power, 10) || 100,
          user_id: uid,
          type: getDeviceTypeKey(d.name),
        }));
        try {
          await supabase.from('devices').insert(dbRows);
        } catch (e) {
          console.warn('Supabase devices insert fallback:', e);
        }
      }

      // 5. Ruajtja e faturës bazë nëse s'u ruajt manualisht
      if (!billSaved && faturaMesatare) {
        const estAmount = parseFloat(faturaMesatare) || 50;
        const estKwh = Math.round(estAmount / KWH_TO_EUR);
        const initBill = {
          amount: estAmount,
          kwh: estKwh,
          date: new Date().toLocaleDateString('sq', { month: 'long', year: 'numeric' }),
          provider: 'KESCO (Vlerësim)',
          suggestion: 'Fatura bazë fillestare nga regjistrimi.',
          user_id: uid || null,
          dpr: dpr.trim() || null,
        };
        if (uid) {
          await AsyncStorage.setItem(`${uid}_last_bill`, JSON.stringify(initBill));
          try {
            await supabase.from('bills').insert([initBill]);
          } catch (_) {}
        }
      }

      if (uid) await AsyncStorage.setItem(`${uid}_onboarding_complete`, 'true');
      if (uid) await AsyncStorage.setItem('user_id', uid.toString());

      navigation.replace('Main');
    } catch (err) {
      console.error('finishOnboarding error:', err);
      Alert.alert('Gabim', 'Ndodhi një gabim gjatë ruajtjes së të dhënave.');
    } finally {
      setLoading(false);
    }
  };

  const addCustomDevice = () => {
    if (!deviceDraft.name.trim() || !deviceDraft.power.trim()) {
      Alert.alert('Kujdes', 'Plotëso emrin dhe fuqinë e pajisjes.');
      return;
    }
    setCustomDevices([...customDevices, { ...deviceDraft }]);
    setDeviceDraft({ name: '', power: '' });
    setShowManualForm(false);
  };

  const removeCustomDevice = (idx) => {
    setCustomDevices(customDevices.filter((_, i) => i !== idx));
  };

  const renderStep1 = () => (
    <View style={s.stepContent}>
      <View style={s.stepHeaderCard}>
        <Ionicons name="home" size={28} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.stepTitle}>Profili i banesës</Text>
          <Text style={s.stepSub}>Disa të dhëna bazë për të personalizuar analizat tuaja.</Text>
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Lloji i banesës *</Text>
        <ChipSelect
          theme={theme}
          options={['Apartament', 'Shtëpi private', 'Studio', 'Tjetër']}
          value={llojiBanese}
          onChange={setLlojiBanese}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Madhësia e banesës (m²) *</Text>
        <View style={s.inputWrapper}>
          <Ionicons name="home-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="p.sh. 85"
            placeholderTextColor={theme.textMuted}
            value={houseSize}
            onChangeText={setHouseSize}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Numri i dhomave</Text>
        <View style={s.inputWrapper}>
          <Ionicons name="grid-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="p.sh. 3"
            placeholderTextColor={theme.textMuted}
            value={dhoma}
            onChangeText={setDhoma}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Niveli i izolimit termik</Text>
        <ChipSelect
          theme={theme}
          options={['I izoluar mirë', 'Mesatar', 'I dobët', 'Nuk e di']}
          value={izolimi}
          onChange={setIzolimi}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Viti i ndërtimit</Text>
        <ChipSelect
          theme={theme}
          options={['Para 1990', '1990-2010', 'Pas 2010']}
          value={vitiNdertimit}
          onChange={setVitiNdertimit}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={s.stepContent}>
      <View style={s.stepHeaderCard}>
        <Ionicons name="people" size={28} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.stepTitle}>Familja dhe orari</Text>
          <Text style={s.stepSub}>Kush jeton këtu dhe kur është shtëpia e banuar?</Text>
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Anëtarët e familjes *</Text>
        <View style={s.inputWrapper}>
          <Ionicons name="people-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="p.sh. 4"
            placeholderTextColor={theme.textMuted}
            value={familyMembers}
            onChangeText={setFamilyMembers}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>A ka fëmijë të vegjël ose të moshuar?</Text>
        <ChipSelect
          theme={theme}
          options={['Po', 'Jo']}
          value={femijeMoshuar}
          onChange={setFemijeMoshuar}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Orari kur shtëpia është e banuar</Text>
        <ChipSelect
          theme={theme}
          options={['Gjithë ditën', 'Kryesisht mbrëmjeve', 'Me ndërrime']}
          value={orari}
          onChange={setOrari}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={s.stepContent}>
      <View style={s.stepHeaderCard}>
        <Ionicons name="flame" size={28} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.stepTitle}>Ngrohja, ftohja dhe uji</Text>
          <Text style={s.stepSub}>Konsumatorët kryesorë të energjisë - të dhënat për parashikime sezionale.</Text>
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Burimi kryesor i ngrohjes *</Text>
        <ChipSelect
          theme={theme}
          options={['Rrymë', 'Dru', 'Pellet', 'Gaz', 'Ngrohje qendrore', 'Pompë nxehtësie']}
          value={ngrohja}
          onChange={setNgrohja}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Sa muaj në vit përdor ngrohjen?</Text>
        <ChipSelect
          theme={theme}
          options={['1-2', '3-4', '5-6', 'Mbi 6']}
          value={muajNgrohje}
          onChange={setMuajNgrohje}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Ftohja në verë</Text>
        <ChipSelect
          theme={theme}
          options={['Klimë inverter', 'Klimë e vjetër', 'Ventilatorë', 'Asnjë']}
          value={ftohja}
          onChange={setFtohja}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Uji i ngrohtë</Text>
        <ChipSelect
          theme={theme}
          options={['Bojler elektrik', 'Panel diellor', 'Ngrohës me gaz', 'Tjetër']}
          value={ujiNgrohte}
          onChange={setUjiNgrohte}
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={s.stepContent}>
      <View style={s.stepHeaderCard}>
        <Ionicons name="hardware-chip" size={28} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.stepTitle}>Pajisjet e tua</Text>
          <Text style={s.stepSub}>Zgjidh pajisjet që ke. App-i do t'i shtojë me konsum tipik.</Text>
        </View>
      </View>

      <View style={s.presetGrid}>
        {PRESET_DEVICES.map((d) => {
          const active = presetSelected.includes(d.name);
          return (
            <TouchableOpacity
              key={d.name}
              style={[s.presetCard, active && s.presetCardActive]}
              onPress={() => {
                const arr = [...presetSelected];
                const idx = arr.indexOf(d.name);
                if (idx >= 0) arr.splice(idx, 1);
                else arr.push(d.name);
                setPresetSelected(arr);
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={active ? 'checkmark-circle' : d.icon}
                size={22}
                color={active ? '#fff' : theme.textSecondary}
              />
              <Text style={[s.presetName, active && s.presetNameActive]} numberOfLines={2}>
                {d.name}
              </Text>
              <Text style={[s.presetWatt, active && { color: 'rgba(255,255,255,0.85)' }]}>
                ~{d.power}W
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {customDevices.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={[s.label, { marginBottom: 10 }]}>Pajisje të shtuara manualisht</Text>
          {customDevices.map((d, idx) => (
            <View key={idx} style={s.deviceRow}>
              <Ionicons name="flash" size={18} color={theme.primary} />
              <Text style={s.deviceRowText}>{d.name} - {d.power}W</Text>
              <TouchableOpacity onPress={() => removeCustomDevice(idx)}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {showManualForm ? (
        <View style={[s.billFormBox, { marginTop: 20 }]}>
          <Text style={[s.billFormTitle, { color: theme.textPrimary }]}>Shto pajisje manuale</Text>
          <Text style={s.label}>Emri</Text>
          <View style={s.inputWrapper}>
            <Ionicons name="extension-puzzle-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="p.sh. Termopompa"
              placeholderTextColor={theme.textMuted}
              value={deviceDraft.name}
              onChangeText={(v) => setDeviceDraft({ ...deviceDraft, name: v })}
            />
          </View>
          <Text style={[s.label, { marginTop: 14 }]}>Fuqia (Watt)</Text>
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
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={[s.addDeviceBtn, { flex: 1 }]} onPress={addCustomDevice}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={s.addDeviceBtnText}>Shto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.addDeviceBtn, { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => setShowManualForm(false)}
            >
              <Text style={[s.addDeviceBtnText, { color: theme.textSecondary }]}>Anulo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.outlineBtn, { marginTop: 20 }]}
          onPress={() => setShowManualForm(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
          <Text style={[s.outlineBtnText, { color: theme.primary }]}>Shto pajisje tjetër manualisht</Text>
        </TouchableOpacity>
      )}

      <View style={s.fieldSection}>
        <Text style={s.label}>Klasa e efiçiencës (opsionale)</Text>
        <ChipSelect
          theme={theme}
          options={['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'Nuk e di']}
          value={klasaPajisjeve}
          onChange={setKlasaPajisjeve}
        />
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={s.stepContent}>
      <View style={s.stepHeaderCard}>
        <Ionicons name="receipt" size={28} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.stepTitle}>Fatura dhe objektivat</Text>
          <Text style={s.stepSub}>Disa detaje të fundit për t'ju dhënë rekomandime të personalizuara.</Text>
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>A ke tarifë me dy blloqe (ditë/natë)?</Text>
        <ChipSelect
          theme={theme}
          options={['Po', 'Jo', 'Nuk e di']}
          value={tarifaDyBlloke}
          onChange={setTarifaDyBlloke}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>DPR - Shifra e konsumatorit (opsionale)</Text>
        <View style={s.inputWrapper}>
          <Ionicons name="barcode-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="p.sh. DPR 90050095"
            placeholderTextColor={theme.textMuted}
            value={dpr}
            onChangeText={setDpr}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Fatura mesatare mujore (€ ose kWh)</Text>
        <View style={s.inputWrapper}>
          <Ionicons name="receipt-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="p.sh. 65"
            placeholderTextColor={theme.textMuted}
            value={faturaMesatare}
            onChangeText={setFaturaMesatare}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Muaji me konsum më të lartë zakonisht</Text>
        <ChipSelect
          theme={theme}
          options={['Dimër (ngrohje)', 'Verë (ftohje)', 'Njësoj gjatë vitit']}
          value={muajiKulm}
          onChange={setMuajiKulm}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Buxheti i synuar mujor (€) *</Text>
        <View style={s.inputWrapper}>
          <Ionicons name="wallet-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="p.sh. 50"
            placeholderTextColor={theme.textMuted}
            value={monthlyBudget}
            onChangeText={setMonthlyBudget}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Objektivi yt kryesor *</Text>
        <ChipSelect
          theme={theme}
          options={['Ul faturën', 'Kurse energji për mjedisin', 'Kontrollo pajisjet', 'Krahasohu me të tjerët']}
          value={objektivi}
          onChange={setObjektivi}
        />
      </View>

      <View style={s.fieldSection}>
        <Text style={s.label}>Sa dëshiron të kursesh?</Text>
        <ChipSelect
          theme={theme}
          options={['5%', '10%', '20%', 'Sa më shumë']}
          value={synimiKursimit}
          onChange={setSynimiKursimit}
        />
      </View>

      <View style={[s.divider, { marginVertical: 24 }]} />

      <View style={s.billFormBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={[s.billFormTitle, { color: theme.textPrimary }]}>
            Fut faturën e fundit KESCO (opsionale)
          </Text>

          {!billSaved && !billSkipped && (
            <TouchableOpacity
              onPress={() => setBillSkipped(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: theme.primary + '15' }}
            >
              <Ionicons name="close-circle-outline" size={16} color={theme.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>Anashkalo faturën</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 19 }}>
          Mund ta skanosh te ekrani "Fatura" ose ta futësh manualisht tani. Nëse e kapërcen, analiza fillon sapo të shtosh faturën e parë.
        </Text>

        {billSaved ? (
          <View style={[s.billSavedBox, {
            backgroundColor: (theme.success || '#10B981') + '15',
            borderColor: theme.success || '#10B981'
          }]}>
            <Ionicons name="checkmark-circle" size={28} color={theme.success || '#10B981'} />
            <Text style={[s.billSavedText, { color: theme.textPrimary }]}>
              Fatura u ruajt! ({billCalc.total} € - {billCalc.totalKwh} kWh)
            </Text>
          </View>
        ) : billSkipped ? (
          <View style={[s.billSavedBox, {
            backgroundColor: theme.card,
            borderColor: theme.border
          }]}>
            <Ionicons name="information-circle-outline" size={26} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.billSavedText, { color: theme.textPrimary, fontSize: 13 }]}>
                Fatura u anashkalua - mund ta skanoni ose futni kur të dëshironi te ekrani "Fatura".
              </Text>
              <TouchableOpacity onPress={() => setBillSkipped(false)} style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>+ Shto faturën tani</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <View style={s.fieldSection}>
              <Text style={s.label}>Muaji</Text>
              <TouchableOpacity style={s.inputWrapper} onPress={() => setShowMonthPicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={theme.textMuted} style={s.inputIcon} />
                <Text style={{ color: billMonth ? theme.textPrimary : theme.textMuted, fontSize: 15, flex: 1 }}>
                  {billMonth || 'Zgjidh muajin…'}
                </Text>
              </TouchableOpacity>
            </View>

            <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
              <TouchableOpacity style={s.mpOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)}>
                <View style={[s.mpCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[s.mpTitle, { color: theme.textPrimary }]}>Zgjidh vitin dhe muajin</Text>
                  <View style={s.mpYearRow}>
                    <TouchableOpacity onPress={() => setPickYear(y => y - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[s.mpYear, { color: theme.textPrimary }]}>{pickYear}</Text>
                    <TouchableOpacity onPress={() => setPickYear(y => y + 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="chevron-forward" size={22} color={theme.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 4, paddingVertical: 2 }}
                    style={{ marginBottom: 12, maxHeight: 44 }}
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <TouchableOpacity
                        key={y}
                        onPress={() => setPickYear(y)}
                        style={[s.mpYearChip, { backgroundColor: theme.background, borderColor: theme.border },
                          pickYear === y && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                      >
                        <Text style={[s.mpYearChipText, { color: pickYear === y ? '#fff' : theme.textPrimary }]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={s.mpGrid}>
                    {MONTHS_SQ.map((mName, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.mpMonth, { backgroundColor: theme.background, borderColor: theme.border }]}
                        onPress={() => { setBillMonth(`${mName} ${pickYear}`); setShowMonthPicker(false); }}
                      >
                        <Text style={[s.mpMonthText, { color: theme.textPrimary }]}>{mName.slice(0, 4)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>

            <View style={s.fieldSection}>
              <Text style={s.label}>Konsumi i ditës - A1 (kWh)</Text>
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
            </View>

            <View style={s.fieldSection}>
              <Text style={s.label}>Konsumi i natës - A2 (kWh)</Text>
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
            </View>

            {(parseFloat(billDayKwh) + parseFloat(billNightKwh) > 0) && (
              <View style={[s.previewBox, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
                <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700' }}>Fatura e llogaritur</Text>
                <Text style={{ color: theme.primary, fontSize: 28, fontWeight: '900', marginTop: 4 }}>{billCalc.total} €</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {billCalc.totalKwh} kWh - Neto {billCalc.neto}€ + TVSH {billCalc.vat}€
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                style={[s.addDeviceBtn, { flex: 2 }]}
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
              <TouchableOpacity
                style={[s.addDeviceBtn, { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
                onPress={() => setBillSkipped(true)}
              >
                <Text style={[s.addDeviceBtnText, { color: theme.textSecondary, fontSize: 13 }]}>Anashkalo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  const stepLabels = ['Banesa', 'Familja', 'Ngrohja', 'Pajisjet', 'Fatura'];

  return (
    <View style={s.container}>
      <LinearGradient
        colors={theme.gradientPrimary}
        style={s.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.progressContainer}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
            <View key={i} style={s.progressBarWrap}>
              <View style={[s.progressLine, i <= step && s.activeLine]} />
              <Text style={[s.progressLabel, i <= step && s.progressLabelActive]}>
                {stepLabels[i - 1]}
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.headerTitle}>
          Hapi {step} nga {TOTAL_STEPS}
          {userName ? ` - Mirë se vjen, ${userName.split(' ')[0]}!` : ''}
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      <View style={s.footer}>
        {step > 1 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setStep(step - 1)}>
            <Ionicons name="arrow-back" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        {step < TOTAL_STEPS && (
          <TouchableOpacity style={s.skipBtn} onPress={handleSkipStep}>
            <Text style={s.skipText}>Kapërce</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, !canProceed() && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.nextText}>{step === TOTAL_STEPS ? 'Fillo tani' : 'Vazhdo'}</Text>
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
  header: { paddingTop: 60, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center' },
  progressContainer: { flexDirection: 'row', width: '100%', gap: 6, marginBottom: 12 },
  progressBarWrap: { flex: 1, alignItems: 'center', gap: 4 },
  progressLine: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 },
  activeLine: { backgroundColor: '#fff' },
  progressLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700' },
  progressLabelActive: { color: 'rgba(255,255,255,0.95)' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', opacity: 0.95 },
  scroll: { padding: 20, paddingBottom: 36 },
  stepContent: { gap: 20 },
  stepHeaderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.card, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: theme.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  stepTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 2 },
  stepSub: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  fieldSection: { gap: 6 },
  label: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card,
    borderRadius: 16, paddingHorizontal: 16, borderWidth: 1.5, borderColor: theme.border, height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '500' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  presetCard: {
    width: '31%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    backgroundColor: theme.card, borderRadius: 18, borderWidth: 1.5, borderColor: theme.border, gap: 6,
  },
  presetCardActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  presetName: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  presetNameActive: { color: '#fff' },
  presetWatt: { color: theme.textMuted, fontSize: 10 },
  deviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.card,
    borderRadius: 14, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 8,
    borderWidth: 1, borderColor: theme.primary + '40',
  },
  deviceRowText: { flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  addDeviceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: theme.primary, borderRadius: 16, height: 50,
  },
  addDeviceBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, height: 50, borderWidth: 1.5,
    borderColor: theme.primary, backgroundColor: theme.primary + '10',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
  billFormBox: {
    backgroundColor: theme.card, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: theme.border, gap: 12,
  },
  billFormTitle: { fontSize: 16, fontWeight: '800' },
  billSavedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1.5, marginTop: 4,
  },
  billSavedText: { fontSize: 14, fontWeight: '700', flex: 1 },
  previewBox: { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 10, borderWidth: 1 },
  divider: { height: 1, backgroundColor: theme.border },
  mpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 30 },
  mpCard: { borderRadius: 24, padding: 20, borderWidth: 1 },
  mpTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  mpYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 10 },
  mpYear: { fontSize: 20, fontWeight: '800' },
  mpYearChip: { paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mpYearChipText: { fontSize: 13, fontWeight: '700' },
  mpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  mpMonth: { width: '30%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  mpMonthText: { fontSize: 13, fontWeight: '600' },
  footer: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderTopWidth: 1, borderTopColor: theme.border,
    backgroundColor: theme.background,
  },
  backBtn: {
    width: 50, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border,
  },
  skipBtn: { height: 54, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: theme.textMuted, fontWeight: '700', fontSize: 14 },
  nextBtn: {
    flex: 1, backgroundColor: theme.primary, borderRadius: 18, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

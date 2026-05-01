import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const { userId } = route.params || {};

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

  // Step 2: Device Data
  const [device, setDevice] = useState({
    name: '',
    power: ''
  });

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.houseSize || !formData.familyMembers || !formData.monthlyBudget) {
        Alert.alert('Kujdes', 'Ju lutem plotësoni të gjitha të dhënat e kërkuara.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!device.name || !device.power) {
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
      
      // 2. Save Device to Supabase
      if (device.name && device.power) {
        await supabase.from('devices').insert([
          { 
            name: device.name, 
            avg_consumption: parseInt(device.power), 
            user_id: userId,
            status: 'on'
          }
        ]);
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
            <Text style={s.stepTitle}>👤 Përshëndetje{userName ? `, ${userName}` : ''}!</Text>
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
            <Text style={s.stepTitle}>🔌 Pajisja e Parë</Text>
            <Text style={s.stepSub}>Shtoni një pajisje që dëshironi ta monitoroni (p.sh. Frigoriferi).</Text>

            <View style={s.inputGroup}>
              <Text style={s.label}>Emri i pajisjes</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="extension-puzzle-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
                <TextInput 
                  style={s.input} 
                  placeholder="p.sh. Kondicioneri" 
                  placeholderTextColor={theme.textMuted} 
                  value={device.name} 
                  onChangeText={(v) => setDevice({...device, name: v})}
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
                  value={device.power} 
                  onChangeText={(v) => setDevice({...device, power: v})}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>📸 Si të skanoni faturën?</Text>
            <Text style={s.stepSub}>Mësoni si të përdorni skanerin tonë inteligjent për faturat e KESCO-s.</Text>
            
            <View style={s.guideContainer}>
              <View style={s.guideItem}>
                <View style={s.guideNumber}><Text style={s.guideNumberText}>1</Text></View>
                <Text style={s.guideText}>Gjeni pjesën ku shkruhet "Konsumi total" në faturë.</Text>
              </View>
              <View style={s.guideItem}>
                <View style={s.guideNumber}><Text style={s.guideNumberText}>2</Text></View>
                <Text style={s.guideText}>Mbajeni telefonin drejt dhe sigurohuni që ka dritë të mjaftueshme.</Text>
              </View>
              <View style={s.guideItem}>
                <View style={s.guideNumber}><Text style={s.guideNumberText}>3</Text></View>
                <Text style={s.guideText}>AI do të lexojë automatikisht vlerën dhe kWh.</Text>
              </View>
            </View>

            <View style={s.illustrationPlaceholder}>
              <LinearGradient colors={['rgba(0,200,150,0.1)', 'rgba(0,200,150,0.05)']} style={s.illuGradient}>
                <Ionicons name="scan-circle" size={80} color={theme.primary} />
                <Text style={s.illuText}>Skanimi me AI</Text>
              </LinearGradient>
            </View>
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

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
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
});

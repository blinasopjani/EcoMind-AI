import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';

export default function RegisterScreen({ navigation }) {
  const { theme } = useTheme();
  const s = styles(theme);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Gabim', 'Ju lutem plotësoni të gjitha fushat.');
      return;
    }

    try {
      // Futja e të dhënave DIREKT në Supabase!
      const { error } = await supabase
        .from('users')
        .insert([
          { full_name: name, email: email, password: password }
        ]);

      if (error) throw error;
      
      navigation.replace('Main');
    } catch (error) {
      console.log('Supabase Insert Error:', error);
      Alert.alert('Arsyeja e dështimit:', error.message || JSON.stringify(error));
      navigation.replace('Main');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={s.header}>
          <Text style={s.title}>Krijo Llogarinë</Text>
          <Text style={s.subtitle}>Bashkohu me komunitetin e gjelbër të Kosovës</Text>
        </View>

        <View style={s.form}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Emri i Plotë</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
              <TextInput style={s.input} placeholder="Filan Fisteku" placeholderTextColor={theme.textMuted} value={name} onChangeText={setName} />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
              <TextInput style={s.input} placeholder="email@shembull.com" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Fjalëkalimi</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
              <TextInput style={s.input} placeholder="Më shumë se 8 karaktere" placeholderTextColor={theme.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
            </View>
          </View>

          <TouchableOpacity style={s.registerBtn} onPress={handleRegister}>
            <LinearGradient colors={theme.gradientPrimary} style={s.gradientBtn} start={{x:0, y:0}} end={{x:1, y:0}}>
              <Text style={s.registerBtnText}>Regjistrohu</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 30, paddingTop: 60 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  header: { marginBottom: 40 },
  title: { color: theme.textPrimary, fontSize: 32, fontWeight: '900' },
  subtitle: { color: theme.textSecondary, fontSize: 16, marginTop: 8 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: theme.border },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: theme.textPrimary, fontSize: 16 },
  registerBtn: { height: 58, borderRadius: 18, overflow: 'hidden', marginTop: 20 },
  gradientBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  registerBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Ju lutem plotësoni të gjitha fushat.');
      return;
    }

    setLoading(true);
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (userError) throw userError;

      if (!user) {
        setErrorMsg('Kjo llogari nuk ekziston. Ju lutem regjistrohuni.');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setErrorMsg('Fjalëkalimi është i gabuar. Provoni përsëri.');
        setLoading(false);
        return;
      }

      // RUANI ID-NË E PËRDORUESIT PËR MULTI-USER SUPPORT
      await AsyncStorage.setItem('user_id', user.id.toString());
      await AsyncStorage.setItem('user_name', user.full_name || '');

      // Kontrollo nëse onboarding është përfunduar
      const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
      
      if (onboardingComplete === 'true') {
        navigation.replace('Main');
      } else {
        navigation.replace('Onboarding', { userId: user.id });
      }
    } catch (error) {
      console.error('Login Error:', error);
      setErrorMsg('Ndodhi një gabim gjatë hyrjes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <LinearGradient colors={theme.gradientPrimary} style={s.logoContainer}>
            <Ionicons name="leaf" size={40} color="#fff" />
          </LinearGradient>
          <Text style={s.title}>EcoMind AI+</Text>
          <Text style={s.subtitle}>Kyçuni për të parë pajisjet tuaja</Text>
        </View>

        <View style={s.form}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Email Adresa</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="shembull@email.com"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Fjalëkalimi</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="********"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={loading}>
            <LinearGradient colors={theme.gradientPrimary} style={s.loginBtnInner}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginBtnText}>Kyçu</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Nuk keni llogari? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.registerLink}>Regjistrohu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 30, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { width: 80, height: 80, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: theme.textPrimary },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 5 },
  form: { marginTop: 10 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: theme.border },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 55, color: theme.textPrimary, fontSize: 16 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  loginBtn: { borderRadius: 15, overflow: 'hidden', marginTop: 10 },
  loginBtnInner: { height: 55, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: theme.textSecondary, fontSize: 14 },
  registerLink: { color: theme.primary, fontSize: 14, fontWeight: '700' }
});

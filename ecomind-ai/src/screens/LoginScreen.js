import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <LinearGradient colors={theme.gradientPrimary} style={s.logoContainer}>
            <Ionicons name="leaf" size={40} color="#fff" />
          </LinearGradient>
          <Text style={s.title}>EcoMind AI+</Text>
          <Text style={s.subtitle}>Mirë se vini në të ardhmen e energjisë</Text>
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

          <TouchableOpacity style={s.forgotBtn}>
            <Text style={s.forgotText}>Keni harruar fjalëkalimin?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.loginBtn} onPress={() => navigation.replace('Main')}>
            <LinearGradient colors={theme.gradientPrimary} style={s.gradientBtn} start={{x:0, y:0}} end={{x:1, y:0}}>
              <Text style={s.loginBtnText}>Kyçu Tani</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Nuk keni llogari? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.footerLink}>Regjistrohu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { flexGrow: 1, padding: 30, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: theme.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  title: { color: theme.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: theme.textSecondary, fontSize: 16, marginTop: 8, textAlign: 'center' },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: theme.border },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: theme.textPrimary, fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 30 },
  forgotText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
  loginBtn: { height: 58, borderRadius: 18, overflow: 'hidden', marginBottom: 20, shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  gradientBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  footerText: { color: theme.textSecondary, fontSize: 15 },
  footerLink: { color: theme.primary, fontSize: 15, fontWeight: '800' },
});

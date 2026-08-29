import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase, toEmail } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }) {
  const { theme } = useTheme();
  const s = styles(theme);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    setErrorMsg('');
    if (!name || !email || !password) {
      setErrorMsg('Ju lutem plotësoni të gjitha fushat.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Fjalëkalimi duhet të jetë të paktën 6 karaktere.');
      return;
    }

    setLoading(true);
    try {
      // ✅ SIGURT: Supabase Auth menaxhon fjalëkalimin server-side.
      // Nuk ruajmë asnjë hash në tabelën users — kolona password nuk nevojitet më.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: toEmail(email),
        password,
        options: {
          data: { full_name: name }, // ruhet si user_metadata në Supabase Auth
        },
      });

      if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
          setErrorMsg('Ky email është i regjistruar. Provoni të kyçeni.');
        } else {
          setErrorMsg(signUpError.message || 'Ndodhi një gabim gjatë regjistrimit.');
        }
        return;
      }

      const user = data?.user;
      if (!user) {
        setErrorMsg('Ndodhi një gabim gjatë regjistrimit. Provoni përsëri.');
        return;
      }

      // Ruajmë ID-në lokalisht — i shpejtë (localStorage në web)
      await AsyncStorage.setItem('user_id', user.id);
      await AsyncStorage.setItem('user_name', name);

      // Kalojmë MENJËHERË te Onboarding — nuk e presim upsert-in.
      // Rreshti në tabelën users krijohet automatikisht nga trigger-i
      // on_auth_user_created; ky upsert vetëm plotëson full_name/email dhe
      // kryhet në sfond, pa e bllokuar UI-në (regjistrimi ndihet i menjëhershëm).
      navigation.replace('Onboarding', { userId: user.id });

      supabase.from('users').upsert([{
        id: user.id,           // e njëjtë me auth.uid() — RLS do ta mbrojë
        full_name: name,
        email: toEmail(email),
        created_at: new Date().toISOString(),
      }]).then(({ error }) => {
        if (error) console.log('users upsert (sfond):', error.message);
      });

    } catch (error) {
      console.log('Register Error:', error);
      setErrorMsg(error.message || 'Ndodhi një gabim gjatë regjistrimit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={s.title}>Krijo Llogarinë</Text>
            <Text style={s.subtitle}>Hapi i parë drejt kursimit të energjisë</Text>
          </View>
        </View>

        <View style={s.form}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Emri i Plotë</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
              <TextInput 
                style={s.input} 
                placeholder="Filan Fisteku" 
                placeholderTextColor={theme.textMuted} 
                value={name} 
                onChangeText={setName} 
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={s.inputIcon} />
              <TextInput 
                style={s.input} 
                placeholder="email@shembull.com" 
                placeholderTextColor={theme.textMuted} 
                value={email} 
                onChangeText={setEmail} 
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
                secureTextEntry 
              />
            </View>
          </View>

          {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity style={s.regBtn} onPress={handleRegister} disabled={loading}>
            <LinearGradient colors={theme.gradientPrimary} style={s.regBtnInner}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.regBtnText}>Regjistrohu</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.footer} onPress={() => navigation.navigate('Login')}>
            <Text style={s.footerText}>Keni llogari? <Text style={s.loginLink}>Kyçuni</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 30, paddingTop: 60 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  header: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', color: theme.textPrimary },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 5 },
  form: { marginTop: 10 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: theme.border },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 55, color: theme.textPrimary, fontSize: 16 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  regBtn: { borderRadius: 15, overflow: 'hidden', marginTop: 10 },
  regBtnInner: { height: 60, alignItems: 'center', justifyContent: 'center' },
  regBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  footer: { marginTop: 30, alignItems: 'center' },
  footerText: { color: theme.textSecondary, fontSize: 14 },
  loginLink: { color: theme.primary, fontWeight: '700' }
});

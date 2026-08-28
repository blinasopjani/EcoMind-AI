import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingRow = ({ icon, label, sub, value, onToggle, onPress, type = 'arrow', color, theme }) => (
  <TouchableOpacity onPress={onPress} style={styles(theme).settingRow} activeOpacity={0.7}>
    <View style={[styles(theme).settingIcon, { backgroundColor: `${color}18` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles(theme).settingInfo}>
      <Text style={styles(theme).settingLabel}>{label}</Text>
      {sub && <Text style={styles(theme).settingSub}>{sub}</Text>}
    </View>
    {type === 'toggle' ? (
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: 'rgba(0,200,150,0.4)' }}
        thumbColor={value ? theme.primary : theme.textMuted}
      />
    ) : (
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    )}
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const s = styles(theme);

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [userData, setUserData] = useState({
    emri: '...',
    email: '...',
    banimi: 'Papërcaktuar',
    personat: '1 person',
    buxheti: '50€'
  });
  const [stats, setStats] = useState({ deviceCount: 0, lastBill: null });
  const [redeemedRewards, setRedeemedRewards] = useState([]);
  const [budgetEdit, setBudgetEdit] = useState(false);
  const [budgetVal, setBudgetVal] = useState('');

  const [editModal, setEditModal] = useState(false);
  const [editType, setEditType] = useState('profil');
  const [formData, setFormData] = useState({ ...userData });

  useEffect(() => {
    const loadProfile = async () => {
      const uid = await AsyncStorage.getItem('user_id');
      if (!uid) {
        navigation.replace('Login');
        return;
      }

      // 1. Merr emrin nga tabela users
      const { data: user } = await supabase.from('users').select('full_name, email').eq('id', uid).single();

      // 2. Merr email-in real nga Supabase Auth (i konfirmuar)
      let authEmail = user?.email || '';
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email) authEmail = authData.user.email;
      } catch (_) {}

      // 3. Merr të dhënat e shtëpisë
      const houseData = await AsyncStorage.getItem('house_data');
      const parsedHouse = houseData ? JSON.parse(houseData) : null;

      // 4. Statistika: nr. pajisjesh + fatura e fundit
      const { data: devicesData } = await supabase.from('devices').select('id').eq('user_id', uid);
      const { data: billsData } = await supabase.from('bills').select('amount, kwh, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);

      // 5. Shpërblimet e fituara
      const redeemed = JSON.parse((await AsyncStorage.getItem('redeemed_rewards')) || '[]');
      setRedeemedRewards(redeemed);

      setStats({
        deviceCount: devicesData?.length || 0,
        lastBill: billsData?.[0] || null,
      });

      const buxheti = parsedHouse?.buxheti || '50€';
      setBudgetVal(buxheti.replace(/[^0-9]/g, ''));

      if (user) {
        setUserData({
          emri: user.full_name || 'Pa emër',
          email: authEmail || 'Pa email',
          banimi: parsedHouse?.banimi || 'Apartament — 85m²',
          personat: parsedHouse?.personat || '4 persona',
          buxheti,
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const ruajNdryshimet = async () => {
    setLoading(true);
    try {
      if (editType === 'profil') {
        const uid = await AsyncStorage.getItem('user_id');
        await supabase.from('users').update({ full_name: formData.emri }).eq('id', uid);
        await AsyncStorage.setItem('user_name', formData.emri);
      } else {
        // Ruajmë të dhënat e shtëpisë
        const houseData = { 
          banimi: formData.banimi, 
          personat: formData.personat, 
          buxheti: formData.buxheti 
        };
        await AsyncStorage.setItem('house_data', JSON.stringify(houseData));
      }
      setUserData({ ...formData });
      setEditModal(false);
      Alert.alert('Sukses', 'Të dhënat u ruajtën!');
    } catch (e) {
      Alert.alert('Gabim', 'Dështoi ruajtja.');
    } finally {
      setLoading(false);
    }
  };

  const ruajBuxhetin = async () => {
    try {
      const houseData = JSON.parse((await AsyncStorage.getItem('house_data')) || '{}');
      houseData.buxheti = `${budgetVal}€`;
      await AsyncStorage.setItem('house_data', JSON.stringify(houseData));
      setUserData(prev => ({ ...prev, buxheti: `${budgetVal}€` }));
      setBudgetEdit(false);
      Alert.alert('Sukses', 'Buxheti u ruajt!');
    } catch (e) {
      Alert.alert('Gabim', 'Dështoi ruajtja e buxhetit.');
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  if (loading && userData.emri === '...') {
    return <View style={[s.container, {justifyContent:'center'}]}><ActivityIndicator color={theme.primary} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25 }}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={{ marginRight: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { marginBottom: 0 }]}>Profili & Cilësimet</Text>
          </View>

          <LinearGradient colors={theme.gradientPrimary} style={s.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{userData.emri.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName}>{userData.emri}</Text>
              <Text style={s.profileEmail}>{userData.email}</Text>
            </View>
            <TouchableOpacity style={s.editBtn} onPress={() => { setEditType('profil'); setFormData({...userData}); setEditModal(true); }}>
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </LinearGradient>

          <View style={s.body}>
          
          {/* Statistika përmbledhëse */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Ionicons name="hardware-chip-outline" size={22} color={theme.primary} />
              <Text style={s.statNum}>{stats.deviceCount}</Text>
              <Text style={s.statLblSm}>Pajisje</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="wallet-outline" size={22} color="#F59E0B" />
              <Text style={s.statNum}>{stats.lastBill ? `${stats.lastBill.amount}€` : '—'}</Text>
              <Text style={s.statLblSm}>Fatura e fundit</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="gift-outline" size={22} color="#8B5CF6" />
              <Text style={s.statNum}>{redeemedRewards.length}</Text>
              <Text style={s.statLblSm}>Shpërblime</Text>
            </View>
          </View>

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Shtëpia Ime</Text>
              <TouchableOpacity onPress={() => { setEditType('shtepi'); setFormData({...userData}); setEditModal(true); }}>
                <Text style={s.editLink}>Ndrysho</Text>
              </TouchableOpacity>
            </View>
            <View style={s.card}>
              <SettingRow icon="home" label="Lloji & Madhësia" sub={userData.banimi} color={theme.info} theme={theme} />
              <SettingRow icon="people" label="Familja" sub={userData.personat} color={theme.primary} theme={theme} />
              {/* Buxheti i editueshëm inline */}
              <View style={s.settingRow}>
                <View style={[s.settingIcon, { backgroundColor: theme.warning + '18' }]}>
                  <Ionicons name="cash" size={20} color={theme.warning} />
                </View>
                <View style={s.settingInfo}>
                  <Text style={s.settingLabel}>Buxheti i Synuar</Text>
                  {budgetEdit ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <TextInput
                        style={[s.budgetInput]}
                        value={budgetVal}
                        onChangeText={setBudgetVal}
                        keyboardType="numeric"
                        autoFocus
                      />
                      <Text style={{ color: theme.textSecondary }}>€/muaj</Text>
                      <TouchableOpacity onPress={ruajBuxhetin} style={s.budgetSaveBtn}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Ruaj</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={s.settingSub}>{userData.buxheti}/muaj</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setBudgetEdit(!budgetEdit)}>
                  <Ionicons name={budgetEdit ? 'close' : 'pencil-outline'} size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Shpërblimet e fituara */}
          {redeemedRewards.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Shpërblimet e Fituara</Text>
              <View style={s.card}>
                {redeemedRewards.slice(-3).reverse().map((r, i) => (
                  <View key={i} style={[s.settingRow, { borderBottomWidth: i < Math.min(redeemedRewards.length, 3) - 1 ? 1 : 0, borderBottomColor: theme.border }]}>
                    <View style={[s.settingIcon, { backgroundColor: '#8B5CF618' }]}>
                      <Ionicons name="gift" size={20} color="#8B5CF6" />
                    </View>
                    <View style={s.settingInfo}>
                      <Text style={s.settingLabel}>{r.title}</Text>
                      <Text style={s.settingSub}>Kodi: {r.code}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={s.section}>
            <Text style={s.sectionTitle}>Preferencat</Text>
            <View style={s.card}>
              <SettingRow icon="moon" label="Mënyra e Errët" type="toggle" value={isDarkMode} onToggle={toggleTheme} color={theme.accent3} theme={theme} />
              <SettingRow icon="notifications" label="Njoftimet" type="toggle" value={notifications} onToggle={setNotifications} color={theme.primary} theme={theme} />
            </View>
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={s.logoutText}>Shkyçu</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {editModal && (
        <Modal visible={editModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>{editType === 'profil' ? 'Edito Profilin' : 'Të dhënat e Shtëpisë'}</Text>
              
              {editType === 'profil' ? (
                <TextInput style={s.input} value={formData.emri} onChangeText={(v) => setFormData({...formData, emri: v})} placeholder="Emri i Plotë" placeholderTextColor={theme.textMuted} />
              ) : (
                <>
                  <TextInput style={s.input} value={formData.banimi} onChangeText={(v) => setFormData({...formData, banimi: v})} placeholder="Lloji (Shtëpi/Apartament)" placeholderTextColor={theme.textMuted} />
                  <TextInput style={s.input} value={formData.personat} onChangeText={(v) => setFormData({...formData, personat: v})} placeholder="Sa persona jeni?" placeholderTextColor={theme.textMuted} />
                  <TextInput style={s.input} value={formData.buxheti} onChangeText={(v) => setFormData({...formData, buxheti: v})} placeholder="Buxheti mujor (€)" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
                </>
              )}

              <View style={s.modalActions}>
                <TouchableOpacity style={[s.modalBtn, {backgroundColor: theme.border}]} onPress={() => setEditModal(false)}><Text style={{color: theme.textPrimary}}>Anulo</Text></TouchableOpacity>
                <TouchableOpacity style={[s.modalBtn, {backgroundColor: theme.primary}]} onPress={ruajNdryshimet}><Text style={{color: '#fff'}}>Ruaj</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );

}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 30 },
  headerTitle: { color: theme.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 25 },
  profileCard: { borderRadius: 28, padding: 25, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  profileInfo: { marginLeft: 18, flex: 1 },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  profileEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: theme.card, borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statNum: { color: theme.textPrimary, fontSize: 18, fontWeight: '900', marginVertical: 4 },
  statLblSm: { color: theme.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  editLink: { color: theme.primary, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: theme.card, borderRadius: 24, paddingVertical: 10, borderWidth: 1, borderColor: theme.border },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  settingInfo: { flex: 1 },
  settingLabel: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  settingSub: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  budgetInput: { borderWidth: 1, borderColor: theme.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, color: theme.textPrimary, fontSize: 14, minWidth: 60 },
  budgetSaveBtn: { backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#EF444420' },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: theme.card, borderRadius: 24, padding: 25 },
  modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  input: { backgroundColor: theme.background, borderRadius: 12, padding: 14, color: theme.textPrimary, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
});

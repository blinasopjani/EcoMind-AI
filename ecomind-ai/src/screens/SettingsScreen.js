import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

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

  const [notifications, setNotifications] = useState(true);
  const [userData, setUserData] = useState({
    emri: 'Arben Kelmendi',
    email: 'arben@ecomind.ks',
    banimi: 'Apartament — 85m²',
    personat: '4 persona',
    buxheti: '60€'
  });

  const [editModal, setEditModal] = useState(false);
  const [editType, setEditType] = useState('profil'); // 'profil' ose 'shtepi'
  const [formData, setFormData] = useState({ ...userData });

  const hapEditimin = (type) => {
    setEditType(type);
    setFormData({ ...userData });
    setEditModal(true);
  };

  const ruajNdryshimet = () => {
    setUserData({ ...formData });
    setEditModal(false);
    Alert.alert('Sukses', 'Të dhënat u përditësuan me sukses!');
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <Text style={s.headerTitle}>Profili & Cilësimet</Text>

        <LinearGradient colors={theme.gradientPrimary} style={s.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{userData.emri.charAt(0)}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{userData.emri}</Text>
            <Text style={s.profileEmail}>{userData.email}</Text>
            <View style={s.planBadge}>
              <Ionicons name="diamond" size={12} color="#F59E0B" />
              <Text style={s.planText}>Anëtar Premium</Text>
            </View>
          </View>
          <TouchableOpacity style={s.editBtn} onPress={() => hapEditimin('profil')}>
            <Ionicons name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      </LinearGradient>

      <View style={s.body}>
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>🏠 Shtëpia Ime</Text>
            <TouchableOpacity onPress={() => hapEditimin('shtepi')}>
              <Text style={s.editLink}>Ndrysho</Text>
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            <SettingRow icon="people" label="Madhësia e Familjes" sub={userData.personat} color={theme.primary} theme={theme} />
            <SettingRow icon="home" label="Lloji i Shtëpisë" sub={userData.banimi} color={theme.info} theme={theme} />
            <SettingRow icon="cash" label="Buxheti Mujor" sub={userData.buxheti + " / muaj"} color={theme.warning} theme={theme} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>⚙️ Preferencat</Text>
          <View style={s.card}>
            <SettingRow icon="moon" label="Mënyra e Errët" type="toggle" value={isDarkMode} onToggle={toggleTheme} color={theme.accent3} theme={theme} />
            <SettingRow icon="notifications" label="Njoftimet" type="toggle" value={notifications} onToggle={setNotifications} color={theme.primary} theme={theme} />
            <SettingRow icon="language" label="Gjuha" sub="Shqip" color={theme.success} theme={theme} />
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.replace('Login')} style={s.logoutBtn}>
          <LinearGradient colors={['#EF4444', '#DC2626']} style={s.logoutInner} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Ionicons name="log-out" size={20} color="#fff" />
            <Text style={s.logoutText}>Dil nga Aplikacioni</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.version}>EcoMind AI+ Kosovo v1.0.0</Text>
        <View style={{ height: 100 }} />
      </View>

      {/* Modal për Editim */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editType === 'profil' ? 'Edito Profilin' : 'Edito Shtëpinë'}</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {editType === 'profil' ? (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.label}>Emri i Plotë</Text>
                  <TextInput style={s.input} value={formData.emri} onChangeText={(t) => setFormData({...formData, emri: t})} />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.label}>Email Adresa</Text>
                  <TextInput style={s.input} value={formData.email} onChangeText={(t) => setFormData({...formData, email: t})} keyboardType="email-address" />
                </View>
              </>
            ) : (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.label}>Lloji i Shtëpisë</Text>
                  <TextInput style={s.input} value={formData.banimi} onChangeText={(t) => setFormData({...formData, banimi: t})} />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.label}>Madhësia e Familjes</Text>
                  <TextInput style={s.input} value={formData.personat} onChangeText={(t) => setFormData({...formData, personat: t})} />
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.label}>Buxheti (p.sh. 60€)</Text>
                  <TextInput style={s.input} value={formData.buxheti} onChangeText={(t) => setFormData({...formData, buxheti: t})} />
                </View>
              </>
            )}

            <TouchableOpacity style={s.saveBtn} onPress={ruajNdryshimet}>
              <LinearGradient colors={theme.gradientPrimary} style={s.saveBtnInner}>
                <Text style={s.saveBtnText}>Ruaj Ndryshimet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800', marginBottom: 16 },
  profileCard: { borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  profileEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  planText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  editBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '800' },
  editLink: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: theme.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  settingInfo: { flex: 1 },
  settingLabel: { color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  settingSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  logoutBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 10 },
  logoutInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 10 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  version: { color: theme.textMuted, fontSize: 12, textAlign: 'center', marginTop: 24 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '800' },
  inputGroup: { marginBottom: 20 },
  label: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input: { backgroundColor: theme.background, borderRadius: 16, padding: 16, color: theme.textPrimary, fontSize: 16, borderWidth: 1, borderColor: theme.border },
  saveBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 10 },
  saveBtnInner: { padding: 18, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DeviceItem = ({ id, name, type, power, status, onToggle, onEdit, onDelete, theme }) => (
  <View style={styles(theme).deviceCard}>
    <View style={styles(theme).deviceIconContainer}>
      <Ionicons name={type === 'ac' ? 'snow' : type === 'tv' ? 'tv' : 'bulb'} size={24} color={theme.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles(theme).deviceName}>{name}</Text>
      <Text style={styles(theme).deviceSub}>{power} W • {status ? 'Ndezur' : 'Fikur'}</Text>
    </View>
    <View style={styles(theme).deviceActions}>
      <TouchableOpacity onPress={() => onEdit({ id, name, power, type })} style={styles(theme).actionBtn}>
        <Ionicons name="pencil" size={16} color={theme.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(id)} style={styles(theme).actionBtn}>
        <Ionicons name="trash" size={16} color="#FF4D4D" />
      </TouchableOpacity>
      <Switch
        value={status}
        onValueChange={() => onToggle(id, !status)}
        trackColor={{ false: theme.border, true: theme.primary + '60' }}
        thumbColor={status ? theme.primary : theme.textMuted}
      />
    </View>
  </View>
);

export default function DevicesScreen() {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newPower, setNewPower] = useState('');
  const [userId, setUserId] = useState(null);
  const [debugLog, setDebugLog] = useState('');

  useEffect(() => {
    const getUserId = async () => {
      const id = await AsyncStorage.getItem('user_id');
      if (id) {
        setUserId(id);
        fetchDevices(id);
      }
    };
    getUserId();
  }, []);

  const fetchDevices = async (uid) => {
    setLoading(true);
    setDebugLog('Duke kërkuar pajisjet tuaja...');
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', uid); // FILTER BY USER ID

      if (error) throw error;
      if (data) {
        setDevices(data.map(d => ({
          id: d.id,
          name: d.name || 'Pa emër',
          type: d.type || 'bulb',
          power: d.avg_consumption || d.power || 0,
          status: false
        })));
        setDebugLog(`Gjeta ${data.length} pajisje për llogarinë tuaj.`);
      }
    } catch (err) {
      setDebugLog('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const ruajPajisje = async () => {
    if (!newName.trim() || !newPower.trim() || !userId) return;
    setLoading(true);
    try {
      const payload = { 
        name: newName.trim(), 
        avg_consumption: parseInt(newPower),
        user_id: userId // SAVE USER ID
      };

      if (editingId) {
        await supabase.from('devices').update(payload).eq('id', editingId);
      } else {
        await supabase.from('devices').insert([payload]);
      }
      setModalVisible(false);
      fetchDevices(userId);
    } catch (err) {
      Alert.alert('Gabim', err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDevice = async (id) => {
    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) throw error;
      fetchDevices(userId);
    } catch (err) {
      Alert.alert('Gabim', err.message);
    }
  };

  const activeDevices = devices.filter(d => d.status);
  const totalW = activeDevices.reduce((sum, d) => sum + d.power, 0);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <Text style={s.headerTitle}>Pajisjet Tuaja</Text>
          <Text style={s.headerSub}>Secili account sheh pajisjet e veta</Text>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.consumptionCard}>
            <LinearGradient colors={[theme.primary, theme.secondary]} style={s.consumptionGradient}>
              <Text style={s.consLabel}>AKTIVE: {activeDevices.length}</Text>
              <Text style={s.consValue}>{totalW} W</Text>
            </LinearGradient>
          </View>

          {loading && devices.length === 0 ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <>
              {devices.length === 0 && <Text style={s.emptyText}>Nuk keni asnjë pajisje në këtë llogari.</Text>}
              {devices.map(device => (
                <DeviceItem 
                  key={device.id} 
                  {...device} 
                  onToggle={(id, st) => setDevices(devices.map(d => d.id === id ? {...d, status: st} : d))}
                  onEdit={(d) => { setEditingId(d.id); setNewName(d.name); setNewPower(d.power.toString()); setModalVisible(true); }}
                  onDelete={deleteDevice}
                  theme={theme} 
                />
              ))}
              <TouchableOpacity style={s.addBtn} onPress={() => { setEditingId(null); setNewName(''); setNewPower(''); setModalVisible(true); }}>
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={s.addBtnText}>Shto Pajisje</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={s.debugPanel}>
            <Text style={s.debugText}>{debugLog}</Text>
          </View>
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{editingId ? 'Edito' : 'Shto'}</Text>
            <TextInput style={s.input} value={newName} onChangeText={setNewName} placeholder="Emri" placeholderTextColor={theme.textMuted} />
            <TextInput style={s.input} value={newPower} onChangeText={setNewPower} placeholder="Fuqia (W)" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
            <TouchableOpacity style={s.saveBtn} onPress={ruajPajisje}><Text style={s.saveBtnText}>Ruaj</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => setModalVisible(false)}><Text style={{ color: theme.textSecondary }}>Anulo</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 25 },
  headerTitle: { color: theme.textPrimary, fontSize: 24, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
  body: { padding: 20 },
  consumptionCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  consumptionGradient: { padding: 20, alignItems: 'center' },
  consLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  consValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 5 },
  deviceCard: { backgroundColor: theme.card, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  deviceIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.primary + '10', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  deviceName: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  deviceSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  deviceActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { padding: 5 },
  addBtn: { backgroundColor: theme.primary, borderRadius: 15, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 15 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyText: { color: theme.textMuted, textAlign: 'center', marginVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: theme.card, borderRadius: 24, padding: 25 },
  modalTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  input: { backgroundColor: theme.background, borderRadius: 12, padding: 14, color: theme.textPrimary, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800' },
  debugPanel: { marginTop: 30, padding: 10, backgroundColor: '#000', borderRadius: 8 },
  debugText: { color: '#0f0', fontSize: 10, fontFamily: 'monospace' },
});

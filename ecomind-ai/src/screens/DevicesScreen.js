import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../data/alertHelper';


// Pajisje "smart" të gatshme me konsum tipik (W) — për shtim me një prekje
const SMART_PRESETS = [
  { name: 'Klimë', power: 1200, type: 'ac' },
  { name: 'Bojler', power: 2000, type: 'bulb' },
  { name: 'Frigorifer', power: 150, type: 'bulb' },
  { name: 'Televizor', power: 120, type: 'tv' },
  { name: 'Lavatriçe', power: 2000, type: 'bulb' },
  { name: 'Mikrovalë', power: 1000, type: 'bulb' },
];

// Klasifikimi i efiçiencës sipas konsumit mujor (kWh) — për info-point
const ENERGY_CLASSES = [
  { cls: 'A+++', range: '≤ 100 kWh', color: '#10B981' },
  { cls: 'A++', range: '101–150 kWh', color: '#22C55E' },
  { cls: 'A+', range: '151–200 kWh', color: '#84CC16' },
  { cls: 'A', range: '201–300 kWh', color: '#EAB308' },
  { cls: 'B', range: '301–400 kWh', color: '#F97316' },
  { cls: 'C', range: '401–500 kWh', color: '#EF4444' },
  { cls: 'D', range: '> 500 kWh', color: '#DC2626' },
];

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
  const navigation = useNavigation();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newPower, setNewPower] = useState('');
  const [newType, setNewType] = useState('bulb');
  const [addMode, setAddMode] = useState('manual'); // 'manual' | 'smart'
  const [showClassInfo, setShowClassInfo] = useState(false);
  const [userId, setUserId] = useState(null);

  const getUserId = async () => {
    const id = await AsyncStorage.getItem('user_id');
    if (id) {
      setUserId(id);
      fetchDevices(id);
    }
  };

  useEffect(() => {
    getUserId();
  }, []);

  // Add focus listener for real-time synchronization when user enters the screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getUserId();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchDevices = async (uid) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', uid);

      if (error) throw error;
      if (data) {
        setDevices(data.map(d => {
          const dbType = d.type || 'bulb_off';
          const isOn = dbType.endsWith('_on');
          const baseType = dbType.replace(/_(on|off)$/, '');
          return {
            id: d.id,
            name: d.name || 'Pa emër',
            type: baseType || 'bulb',
            power: d.avg_consumption || d.power || 0,
            status: isOn
          };
        }));
      }
    } catch (err) {
      showAlert('Gabim', 'Nuk u arritën të ngarkohen pajisjet. Provoni përsëri.');
    } finally {
      setLoading(false);
    }
  };

  const onToggle = async (id, st) => {
    const dev = devices.find(d => d.id === id);
    if (!dev) return;

    // Toggle local state immediately
    setDevices(devices.map(d => d.id === id ? { ...d, status: st } : d));

    try {
      const dbType = `${dev.type}_${st ? 'on' : 'off'}`;
      const { error } = await supabase
        .from('devices')
        .update({ type: dbType })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn("Toggle error:", err);
      // Rollback on failure
      setDevices(devices.map(d => d.id === id ? { ...d, status: !st } : d));
      showAlert('Gabim', 'Nuk u arrit të ndryshohej statusi i pajisjes.');
    }
  };

  const ruajPajisje = async () => {
    if (!newName.trim() || !newPower.trim() || !userId) return;

    const power = parseInt(newPower, 10);
    if (isNaN(power) || power < 0) {
      showAlert('Gabim', 'Fuqia duhet të jetë një numër i vlefshëm (W).');
      return;
    }

    setLoading(true);
    try {
      let dbTypeFinal = `${newType}_off`;
      if (editingId) {
        const existing = devices.find(d => d.id === editingId);
        const status = existing ? existing.status : false;
        dbTypeFinal = `${newType}_${status ? 'on' : 'off'}`;
      }

      const payload = {
        name: newName.trim(),
        avg_consumption: power,
        type: dbTypeFinal,
        user_id: userId
      };

      if (editingId) {
        await supabase.from('devices').update(payload).eq('id', editingId);
      } else {
        await supabase.from('devices').insert([payload]);
      }
      setModalVisible(false);
      fetchDevices(userId);
    } catch (err) {
      showAlert('Gabim', err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDevice = async (id) => {
    showAlert(
      'Fshi Pajisjen',
      'A jeni të sigurt që dëshironi ta fshini këtë pajisje?',
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Fshi',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('devices').delete().eq('id', id);
              if (error) throw error;
              fetchDevices(userId);
            } catch (err) {
              showAlert('Gabim', err.message);
            }
          }
        }
      ]
    );
  };

  const activeDevices = devices.filter(d => d.status);
  const totalW = activeDevices.reduce((sum, d) => sum + d.power, 0);

  return (
    <View style={s.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Pajisjet Tuaja</Text>
              <Text style={s.headerSub}>Menaxho pajisjet smart dhe normale</Text>
            </View>
            <TouchableOpacity onPress={() => setShowClassInfo(true)} style={s.infoBtn}>
              <Ionicons name="information-circle-outline" size={26} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
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
                  onToggle={onToggle}
                  onEdit={(d) => { setEditingId(d.id); setNewName(d.name); setNewPower(d.power.toString()); setNewType(d.type); setModalVisible(true); }}
                  onDelete={deleteDevice}
                  theme={theme} 
                />
              ))}
              <TouchableOpacity style={s.addBtn} onPress={() => { setEditingId(null); setNewName(''); setNewPower(''); setNewType('bulb'); setAddMode('manual'); setModalVisible(true); }}>
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={s.addBtnText}>Shto Pajisje</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{editingId ? 'Edito Pajisjen' : 'Shto Pajisje'}</Text>
            
            {!editingId && (
              <>
                <Text style={s.label}>Mënyra e lidhjes</Text>
                <View style={s.typeSelector}>
                  <TouchableOpacity style={[s.typeOption, addMode === 'manual' && s.typeOptionActive]} onPress={() => setAddMode('manual')}>
                    <Ionicons name="create-outline" size={16} color={addMode === 'manual' ? '#fff' : theme.textPrimary} />
                    <Text style={[s.typeOptionText, addMode === 'manual' && s.typeOptionTextActive]}>Normale</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.typeOption, addMode === 'smart' && s.typeOptionActive]} onPress={() => setAddMode('smart')}>
                    <Ionicons name="hardware-chip-outline" size={16} color={addMode === 'smart' ? '#fff' : theme.textPrimary} />
                    <Text style={[s.typeOptionText, addMode === 'smart' && s.typeOptionTextActive]}>Smart</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {(!editingId && addMode === 'smart') ? (
              <>
                <Text style={s.label}>Zgjidh pajisjen smart (konsum tipik)</Text>
                <View style={s.presetGrid}>
                  {SMART_PRESETS.map(p => {
                    const sel = newName === p.name && newPower === String(p.power);
                    return (
                      <TouchableOpacity key={p.name} style={[s.presetItem, sel && s.typeOptionActive]} onPress={() => { setNewName(p.name); setNewPower(String(p.power)); setNewType(p.type); }}>
                        <Text style={[s.presetName, sel && { color: '#fff' }]}>{p.name}</Text>
                        <Text style={[s.presetW, sel && { color: '#fff' }]}>{p.power} W</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={s.label}>Emri i Pajisjes</Text>
                <TextInput style={s.input} value={newName} onChangeText={setNewName} placeholder="p.sh. Bojleri, Klima" placeholderTextColor={theme.textMuted} />

                <Text style={s.label}>Fuqia (Watt)</Text>
                <TextInput style={s.input} value={newPower} onChangeText={setNewPower} placeholder="p.sh. 2000" placeholderTextColor={theme.textMuted} keyboardType="numeric" />

                <Text style={s.label}>Lloji i Pajisjes</Text>
                <View style={s.typeSelector}>
                  {[
                    { key: 'bulb', label: 'Dritë', icon: 'bulb-outline' },
                    { key: 'ac', label: 'Klimë', icon: 'snow' },
                    { key: 'tv', label: 'TV', icon: 'tv-outline' }
                  ].map(item => (
                    <TouchableOpacity
                      key={item.key}
                      style={[s.typeOption, newType === item.key && s.typeOptionActive]}
                      onPress={() => setNewType(item.key)}
                    >
                      <Ionicons name={item.icon} size={16} color={newType === item.key ? '#fff' : theme.textPrimary} />
                      <Text style={[s.typeOptionText, newType === item.key && s.typeOptionTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={s.saveBtn} onPress={ruajPajisje}><Text style={s.saveBtnText}>Ruaj</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 15, alignItems: 'center' }} onPress={() => setModalVisible(false)}><Text style={{ color: theme.textSecondary }}>Anulo</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showClassInfo} transparent animationType="fade" onRequestClose={() => setShowClassInfo(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowClassInfo(false)}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Klasifikimi i efiçiencës</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 14, lineHeight: 18 }}>
              Sipas konsumit total mujor (kWh), efiçienca vlerësohet nga A+++ (shumë e mirë) te D (e dobët).
            </Text>
            {ENERGY_CLASSES.map(c => (
              <View key={c.cls} style={s.classRow}>
                <View style={[s.classBadge, { backgroundColor: c.color }]}><Text style={s.classBadgeText}>{c.cls}</Text></View>
                <Text style={s.classRange}>{c.range}</Text>
              </View>
            ))}
            <TouchableOpacity style={[s.saveBtn, { marginTop: 16 }]} onPress={() => setShowClassInfo(false)}><Text style={s.saveBtnText}>Mbylle</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  typeOptionActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  typeOptionText: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
  typeOptionTextActive: { color: '#fff' },
  label: { color: theme.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  infoBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  presetItem: { width: '30%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, alignItems: 'center' },
  presetName: { color: theme.textPrimary, fontSize: 12, fontWeight: '700' },
  presetW: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  classBadge: { width: 46, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  classBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  classRange: { color: theme.textSecondary, fontSize: 13 },
});

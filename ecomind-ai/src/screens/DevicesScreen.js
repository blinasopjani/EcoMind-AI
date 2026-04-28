import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const DeviceItem = ({ name, type, power, status, onToggle, theme }) => (
  <View style={styles(theme).deviceCard}>
    <View style={styles(theme).deviceIconContainer}>
      <Ionicons name={type === 'ac' ? 'snow' : type === 'tv' ? 'tv' : 'bulb'} size={24} color={theme.primary} />
    </View>
    <View style={styles(theme).deviceInfo}>
      <Text style={styles(theme).deviceName}>{name}</Text>
      <Text style={styles(theme).deviceSub}>{power} W • {status ? 'Ndezur' : 'Fikur'}</Text>
    </View>
    <Switch
      value={status}
      onValueChange={onToggle}
      trackColor={{ false: theme.border, true: 'rgba(0,200,150,0.4)' }}
      thumbColor={status ? theme.primary : theme.textMuted}
    />
  </View>
);

export default function DevicesScreen() {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [devices, setDevices] = useState([
    { id: 1, name: 'Kondicioneri - Dhoma', type: 'ac', power: 1200, status: true },
    { id: 2, name: 'Smart TV', type: 'tv', power: 150, status: false },
    { id: 3, name: 'Ndriçimi - Salloni', type: 'bulb', power: 40, status: true },
    { id: 4, name: 'Frigoriferi', type: 'bulb', power: 200, status: true },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPower, setNewPower] = useState('');

  const toggleDevice = (id) => {
    setDevices(devices.map(d => d.id === id ? { ...d, status: !d.status } : d));
  };

  const shtoPajisje = () => {
    if (newName.trim() === '' || newPower.trim() === '') {
      Alert.alert('Gabim', 'Ju lutem plotësoni të gjitha fushat.');
      return;
    }
    const newDevice = {
      id: Date.now(),
      name: newName,
      type: 'bulb',
      power: parseInt(newPower),
      status: false
    };
    setDevices([...devices, newDevice]);
    setNewName('');
    setNewPower('');
    setModalVisible(false);
    Alert.alert('Sukses', 'Pajisja u shtua me sukses!');
  };

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <Text style={s.headerTitle}>Pajisjet</Text>
          <Text style={s.headerSub}>Menaxho pajisjet tuaja smart</Text>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.summaryCard}>
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{devices.filter(d => d.status).length}</Text>
              <Text style={s.summaryLbl}>Aktive</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>1.59</Text>
              <Text style={s.summaryLbl}>kW Aktual</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Pajisjet e Lidhura</Text>
          {devices.map(device => (
            <DeviceItem 
              key={device.id} 
              {...device} 
              onToggle={() => toggleDevice(device.id)} 
              theme={theme} 
            />
          ))}

          <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={22} color="#fff" />
            <Text style={s.addBtnText}>Shto Pajisje të Re</Text>
          </TouchableOpacity>
          
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Modal për shtimin e pajisjes */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Shto Pajisje</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Emri i Pajisjes</Text>
              <TextInput 
                style={s.input} 
                placeholder="p.sh. Lavatriçja" 
                placeholderTextColor={theme.textMuted}
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Fuqia (W)</Text>
              <TextInput 
                style={s.input} 
                placeholder="p.sh. 2000" 
                placeholderTextColor={theme.textMuted}
                value={newPower}
                onChangeText={setNewPower}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={shtoPajisje}>
              <LinearGradient colors={theme.gradientPrimary} style={s.saveBtnInner}>
                <Text style={s.saveBtnText}>Konfirmo Shtimin</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
  body: { padding: 20 },
  summaryCard: { backgroundColor: theme.card, borderRadius: 24, padding: 20, flexDirection: 'row', marginBottom: 24, borderWidth: 1, borderColor: theme.border },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { color: theme.textPrimary, fontSize: 22, fontWeight: '800' },
  summaryLbl: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  summaryDivider: { width: 1, height: '100%', backgroundColor: theme.border },
  sectionTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 16 },
  deviceCard: { backgroundColor: theme.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  deviceIconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  deviceInfo: { flex: 1 },
  deviceName: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  deviceSub: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, borderRadius: 18, padding: 18, marginTop: 12, gap: 10, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

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

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, TextInput, ActivityIndicator, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../data/alertHelper';
import { deviceMonthlyKwh, KWH_TO_EUR } from '../data/kescoTariff';


// Katalog pajisjesh specifike me konsum tipik (W) - për shtim profesional me një prekje
const DEVICE_CATALOG = [
  { name: 'Frigorifer', power: 150, type: 'frigorifer' },
  { name: 'Ngrirëse', power: 200, type: 'ngrirese' },
  { name: 'Lavatriçe', power: 2000, type: 'lavatrice' },
  { name: 'Enëlarëse', power: 1800, type: 'enelarese' },
  { name: 'Klimë', power: 1200, type: 'klime' },
  { name: 'Bojler', power: 2000, type: 'bojler' },
  { name: 'Furrë elektrike', power: 2500, type: 'furre' },
  { name: 'Mikrovalë', power: 1000, type: 'mikrovale' },
  { name: 'Televizor', power: 120, type: 'tv' },
  { name: 'Kompjuter', power: 200, type: 'kompjuter' },
  { name: 'Ngrohëse', power: 2000, type: 'ngrohese' },
  { name: 'Ndriçim', power: 60, type: 'drite' },
];

// Ikona specifike sipas llojit të pajisjes
const TYPE_ICONS = {
  frigorifer: 'snow-outline', ngrirese: 'cube-outline', lavatrice: 'shirt-outline',
  enelarese: 'restaurant-outline', klime: 'snow', ac: 'snow', bojler: 'water-outline',
  furre: 'flame-outline', mikrovale: 'radio-outline', tv: 'tv-outline', kompjuter: 'desktop-outline',
  ngrohese: 'thermometer-outline', drite: 'bulb-outline', bulb: 'bulb-outline',
};
const typeIcon = (t) => TYPE_ICONS[String(t || '').toLowerCase()] || 'flash-outline';

// Ekran skanimi QR: në web hap KAMERËN reale (feed live) me kornizë skaneri sipër.
// Nuk e lexon vërtet QR-in (vetëm pamje). Nëse kamera refuzohet, tregon kornizën e errët.
const QrScanMock = ({ theme, onClose }) => {
  const s = styles(theme);
  const scan = useRef(new Animated.Value(0)).current;
  const camRef = useRef(null);
  const [camDenied, setCamDenied] = useState(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices || typeof document === 'undefined') {
      return;
    }
    let stream = null;
    let videoEl = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        videoEl = document.createElement('video');
        videoEl.setAttribute('autoplay', '');
        videoEl.setAttribute('playsinline', '');
        videoEl.muted = true;
        Object.assign(videoEl.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px' });
        videoEl.srcObject = stream;
        try { await videoEl.play(); } catch (_) {}
        const node = camRef.current;
        if (node && node.appendChild) node.insertBefore(videoEl, node.firstChild);
        else setCamDenied(true);
      } catch (e) {
        setCamDenied(true);
      }
    })();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (videoEl && videoEl.remove) videoEl.remove();
    };
  }, []);

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [6, 190] });
  return (
    <View style={s.qrBox}>
      <TouchableOpacity style={s.searchClose} onPress={onClose}>
        <Ionicons name="close" size={22} color={theme.textSecondary} />
      </TouchableOpacity>
      <View ref={camRef} style={s.qrViewfinder}>
        <View style={[s.qrCorner, s.qrTL]} />
        <View style={[s.qrCorner, s.qrTR]} />
        <View style={[s.qrCorner, s.qrBL]} />
        <View style={[s.qrCorner, s.qrBR]} />
        {camDenied && <Ionicons name="qr-code-outline" size={72} color="rgba(255,255,255,0.12)" />}
        <Animated.View style={[s.qrScanLine, { transform: [{ translateY }] }]} />
      </View>
      <Text style={s.searchTitle}>Po skanohet QR-i…</Text>
      <Text style={s.searchSub}>
        {camDenied ? 'Kamera nuk u lejua. Mund të shtosh pajisjen manualisht te "Normale".' : 'Drejtoje kamerën nga kodi QR i pajisjes smart.'}
      </Text>
    </View>
  );
};

// Klasifikimi i efiçiencës sipas konsumit mujor (kWh) - për info-point
const ENERGY_CLASSES = [
  { cls: 'A+++', range: '≤ 100 kWh', color: '#10B981' },
  { cls: 'A++', range: '101-150 kWh', color: '#22C55E' },
  { cls: 'A+', range: '151-200 kWh', color: '#84CC16' },
  { cls: 'A', range: '201-300 kWh', color: '#EAB308' },
  { cls: 'B', range: '301-400 kWh', color: '#F97316' },
  { cls: 'C', range: '401-500 kWh', color: '#EF4444' },
  { cls: 'D', range: '> 500 kWh', color: '#DC2626' },
];

const DeviceItem = ({ id, name, type, power, status, onToggle, onEdit, onDelete, theme }) => {
  const s = styles(theme);
  const kwh = deviceMonthlyKwh({ avg_consumption: power, type });
  const eur = (kwh * KWH_TO_EUR).toFixed(2);
  return (
    <View style={[s.deviceCard, status && s.deviceCardOn]}>
      <View style={[s.deviceIconContainer, status && { backgroundColor: theme.primary + '22' }]}>
        <Ionicons name={typeIcon(type)} size={22} color={status ? theme.primary : theme.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.deviceName} numberOfLines={1}>{name}</Text>
        <Text style={s.deviceSub}>{power} W · ~{kwh} kWh/muaj · ~{eur}€</Text>
      </View>
      <View style={s.deviceActions}>
        <TouchableOpacity onPress={() => onEdit({ id, name, power, type })} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil" size={15} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(id)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash" size={15} color="#FF4D4D" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onToggle(id, !status)}
          activeOpacity={0.8}
          style={[s.statusPill, { backgroundColor: status ? theme.primary : theme.background, borderColor: status ? theme.primary : theme.border }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: status }}
        >
          <Ionicons name={status ? 'power' : 'power-outline'} size={13} color={status ? '#fff' : theme.textMuted} />
          <Text style={[s.statusPillText, { color: status ? '#fff' : theme.textMuted }]}>{status ? 'Ndezur' : 'Fikur'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  const [smartSearching, setSmartSearching] = useState(false); // simulim i lidhjes smart
  const [smartMethod, setSmartMethod] = useState(null); // 'qr' | 'net'
  const [smartNotFound, setSmartNotFound] = useState(false);
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

  // Simulimi i lidhjes smart: pas disa sekondash përfundon me "nuk u gjet"
  // (që të mos duket sikur app-i ngeci). Nuk lidh pajisje reale.
  useEffect(() => {
    if (!smartSearching || smartMethod === 'qr') return; // QR-i mban kamerën hapur derisa ta mbyllë useri
    const t = setTimeout(() => { setSmartSearching(false); setSmartNotFound(true); }, 5000);
    return () => clearTimeout(t);
  }, [smartSearching, smartMethod]);

  const fetchDevices = async (uid) => {
    setLoading(true);
    try {
      let dbDevices = [];
      if (uid) {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .eq('user_id', uid);
        if (!error && data && data.length > 0) {
          dbDevices = data;
        }
      }

      if (dbDevices.length === 0) {
        const localRaw = uid ? await AsyncStorage.getItem(`${uid}_user_devices`) : null;
        if (localRaw) {
          const parsedLocal = JSON.parse(localRaw);
          if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
            setDevices(parsedLocal.map(d => ({
              id: d.id || Math.random().toString(),
              name: d.name || 'Pa emër',
              type: d.type || 'bulb',
              power: parseInt(d.power, 10) || 100,
              status: d.status !== undefined ? d.status : true,
            })));
            setLoading(false);
            return;
          }
        }
      }

      setDevices(dbDevices.map(d => {
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
    } catch (err) {
      console.warn('Devices fetch error:', err);
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
  const activeMonthlyKwh = activeDevices.reduce((sum, d) => sum + deviceMonthlyKwh({ avg_consumption: d.power, type: d.type }), 0);
  const activeMonthlyEur = (activeMonthlyKwh * KWH_TO_EUR).toFixed(2);

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
            <LinearGradient colors={[theme.primary, theme.secondary]} style={s.consumptionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryVal} numberOfLines={1} adjustsFontSizeToFit>{activeDevices.length}/{devices.length}</Text>
                  <Text style={s.summaryLabel}>Aktive</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryVal} numberOfLines={1} adjustsFontSizeToFit>{totalW} W</Text>
                  <Text style={s.summaryLabel}>Fuqia</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryVal} numberOfLines={1} adjustsFontSizeToFit>~{activeMonthlyEur}€</Text>
                  <Text style={s.summaryLabel}>Kosto/muaj</Text>
                </View>
              </View>
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
              <TouchableOpacity style={s.addBtn} onPress={() => { setEditingId(null); setNewName(''); setNewPower(''); setNewType('bulb'); setAddMode('manual'); setSmartSearching(false); setSmartNotFound(false); setModalVisible(true); }}>
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
                  <TouchableOpacity style={[s.typeOption, addMode === 'manual' && s.typeOptionActive]} onPress={() => { setAddMode('manual'); setSmartSearching(false); setSmartNotFound(false); }}>
                    <Ionicons name="create-outline" size={16} color={addMode === 'manual' ? '#fff' : theme.textPrimary} />
                    <Text style={[s.typeOptionText, addMode === 'manual' && s.typeOptionTextActive]}>Normale</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.typeOption, addMode === 'smart' && s.typeOptionActive]} onPress={() => { setAddMode('smart'); setSmartSearching(false); setSmartNotFound(false); }}>
                    <Ionicons name="hardware-chip-outline" size={16} color={addMode === 'smart' ? '#fff' : theme.textPrimary} />
                    <Text style={[s.typeOptionText, addMode === 'smart' && s.typeOptionTextActive]}>Smart</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {(!editingId && addMode === 'smart') ? (
              smartSearching ? (
                smartMethod === 'qr' ? (
                  <QrScanMock theme={theme} onClose={() => setSmartSearching(false)} />
                ) : (
                <View style={s.searchBox}>
                  <TouchableOpacity style={s.searchClose} onPress={() => setSmartSearching(false)}>
                    <Ionicons name="close" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={s.searchTitle}>Po kërkojmë pajisjen…</Text>
                  <Text style={s.searchSub}>Duke u lidhur përmes internetit. Siguro që pajisja të jetë e ndezur dhe afër.</Text>
                </View>
                )
              ) : smartNotFound ? (
                <View style={s.searchBox}>
                  <TouchableOpacity style={s.searchClose} onPress={() => setSmartNotFound(false)}>
                    <Ionicons name="close" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <Ionicons name="cloud-offline-outline" size={40} color={theme.textMuted} />
                  <Text style={s.searchTitle}>Nuk u gjet asnjë pajisje</Text>
                  <Text style={s.searchSub}>Sigurohu që pajisja të jetë e ndezur dhe afër, ose shtoje manualisht.</Text>
                  <TouchableOpacity style={[s.saveBtn, { marginTop: 16, alignSelf: 'stretch' }]} onPress={() => { setSmartNotFound(false); setAddMode('manual'); }}>
                    <Text style={s.saveBtnText}>Shto manualisht</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setSmartNotFound(false)}>
                    <Text style={{ color: theme.textSecondary }}>Provo prapë</Text>
                  </TouchableOpacity>
                </View>
              ) : (
              <>
                <Text style={s.label}>Lidh pajisjen smart</Text>
                <View style={s.smartMethodRow}>
                  <TouchableOpacity style={s.smartMethodCard} onPress={() => { setSmartMethod('qr'); setSmartNotFound(false); setSmartSearching(true); }} activeOpacity={0.8}>
                    <Ionicons name="qr-code-outline" size={26} color={theme.primary} />
                    <Text style={s.smartMethodText}>Skano QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.smartMethodCard} onPress={() => { setSmartMethod('net'); setSmartNotFound(false); setSmartSearching(true); }} activeOpacity={0.8}>
                    <Ionicons name="wifi-outline" size={26} color={theme.primary} />
                    <Text style={s.smartMethodText}>Përmes internetit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.searchSub}>Zgjidh mënyrën e lidhjes më lart. Nëse pajisja nuk gjendet, mund ta shtosh manualisht te mënyra "Normale".</Text>
              </>
              )
            ) : (
              <>
                {!editingId && (
                  <>
                    <Text style={s.label}>Zgjidh pajisjen</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                      {DEVICE_CATALOG.map(p => {
                        const sel = newName === p.name && String(newPower) === String(p.power);
                        return (
                          <TouchableOpacity key={p.type} style={[s.catalogItem, sel && s.catalogItemActive]} onPress={() => { setNewName(p.name); setNewPower(String(p.power)); setNewType(p.type); }}>
                            <Ionicons name={typeIcon(p.type)} size={20} color={sel ? '#fff' : theme.primary} />
                            <Text style={[s.catalogName, sel && { color: '#fff' }]} numberOfLines={1}>{p.name}</Text>
                            <Text style={[s.catalogW, sel && { color: 'rgba(255,255,255,0.85)' }]}>{p.power}W</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <Text style={s.smartDividerText}>ose fut/rregullo manualisht</Text>
                  </>
                )}

                <Text style={s.label}>Emri i Pajisjes</Text>
                <TextInput style={s.input} value={newName} onChangeText={setNewName} placeholder="p.sh. Bojleri, Klima" placeholderTextColor={theme.textMuted} />

                <Text style={s.label}>Fuqia (Watt)</Text>
                <TextInput style={s.input} value={newPower} onChangeText={setNewPower} placeholder="p.sh. 2000" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
              </>
            )}

            {!(addMode === 'smart' && (smartSearching || smartNotFound)) && (
              <TouchableOpacity style={s.saveBtn} onPress={ruajPajisje}><Text style={s.saveBtnText}>Ruaj</Text></TouchableOpacity>
            )}
            <TouchableOpacity style={{ marginTop: 15, alignItems: 'center' }} onPress={() => { setSmartSearching(false); setSmartNotFound(false); setModalVisible(false); }}><Text style={{ color: theme.textSecondary }}>Anulo</Text></TouchableOpacity>
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
  consumptionGradient: { paddingVertical: 22, paddingHorizontal: 12 },
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
  smartMethodRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  smartMethodCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.primary + '40', backgroundColor: theme.primary + '10' },
  smartMethodText: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
  smartDividerText: { color: theme.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  searchBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, paddingHorizontal: 10 },
  searchClose: { position: 'absolute', top: 0, right: 0, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border },
  searchTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 16 },
  searchSub: { color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  qrBox: { alignItems: 'center', paddingVertical: 18 },
  qrViewfinder: { width: 220, height: 220, borderRadius: 20, backgroundColor: '#0A0F1E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 8, marginBottom: 16 },
  qrCorner: { position: 'absolute', width: 34, height: 34, borderColor: theme.primary },
  qrTL: { top: 14, left: 14, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  qrTR: { top: 14, right: 14, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  qrBL: { bottom: 14, left: 14, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  qrBR: { bottom: 14, right: 14, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  qrScanLine: { position: 'absolute', top: 0, left: 18, width: 184, height: 3, backgroundColor: theme.primary, borderRadius: 2 },
  presetItem: { width: '30%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, alignItems: 'center' },
  presetName: { color: theme.textPrimary, fontSize: 12, fontWeight: '700' },
  presetW: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  classBadge: { width: 46, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  classBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  classRange: { color: theme.textSecondary, fontSize: 13 },
  // Përmbledhja lart
  summaryRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  summaryItem: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  summaryVal: { color: '#fff', fontSize: 19, fontWeight: '900' },
  summaryLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '700', marginTop: 6, letterSpacing: 0.3 },
  summaryDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.25)' },
  // Karta e pajisjes: gjendja ON
  deviceCardOn: { borderColor: theme.primary },
  // Kontrolli i qartë Ndezur/Fikur
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1 },
  statusPillText: { fontSize: 12, fontWeight: '800' },
  // Katalogu i pajisjeve
  catalogItem: { width: 92, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, alignItems: 'center', gap: 4 },
  catalogItemActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  catalogName: { color: theme.textPrimary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  catalogW: { color: theme.textSecondary, fontSize: 10 },
});

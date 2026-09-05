import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, FlatList, ActivityIndicator, Platform, RefreshControl, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const InsightCard = ({ title, desc, icon, color, theme }) => (
  <View style={styles(theme).insightCard}>
    <View style={[styles(theme).iconBox, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles(theme).cardTitle}>{title}</Text>
      <Text style={styles(theme).cardDesc}>{desc}</Text>
    </View>
  </View>
);

export default function AIInsightsScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const s = styles(theme);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ bills: [], devices: [] });
  const [insights, setInsights] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ title: 'Duke analizuar...', sub: 'Po mbledhim të dhënat tuaja.' });

  const [chatVisible, setChatVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { id: 1, text: 'Përshëndetje! Unë jam EcoMind AI. Si mund t\'ju ndihmoj sot?', sender: 'ai' }
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      const { data: bills } = await supabase.from('bills').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      const { data: devices } = await supabase.from('devices').select('*').eq('user_id', uid);
      // Vetëm çelësat e këtij përdoruesi (pa fallback global - që një user të mos shohë të dhënat e tjetrit)
      const houseStr = uid ? await AsyncStorage.getItem(`${uid}_house_data`) : null;
      const localDevsStr = uid ? await AsyncStorage.getItem(`${uid}_user_devices`) : null;
      const lastBillStr = uid ? await AsyncStorage.getItem(`${uid}_last_bill`) : null;

      let finalBills = bills || [];
      if (finalBills.length === 0 && lastBillStr) {
        try { finalBills = [JSON.parse(lastBillStr)]; } catch (_) {}
      }

      let finalDevices = devices || [];
      if (finalDevices.length === 0 && localDevsStr) {
        try { finalDevices = JSON.parse(localDevsStr); } catch (_) {}
      }

      const houseData = houseStr ? JSON.parse(houseStr) : null;

      setData({ bills: finalBills, devices: finalDevices, house: houseData });
      setHasData(finalBills.length > 0 || finalDevices.length > 0 || !!houseData);
      generateInsights(finalBills, finalDevices, houseData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (bills, devices, houseData) => {
    let newInsights = [];
    const lastBill = bills.length > 0 ? bills[0] : null;
    const hasBojler = devices.some(d => (d.name || '').toLowerCase().includes('bojler')) || houseData?.ujiNgrohte?.includes('Bojler');
    const hasAC = devices.some(d => {
      const n = (d.name || '').toLowerCase();
      return n.includes('ac') || n.includes('kondicioner') || n.includes('klimë');
    }) || houseData?.ftohja?.includes('Klimë');

    if (houseData) {
      newInsights.push({
        title: `Profilizimi i Shtëpisë (${houseData.banimi || 'Banesë'})`,
        desc: `Shtëpia juaj përdor ${houseData.ngrohja || 'energji'} për ngrohje dhe ka ${houseData.personat || 'anëtarë'}. Rekomandimet janë të përshtatura sipas këtij profili.`,
        icon: 'home',
        color: '#3B82F6',
      });
    }

    if (lastBill) {
      if (lastBill.kwh > 500) {
        setStatusMsg({ title: 'Konsum i Lartë!', sub: `Keni shpenzuar ${lastBill.kwh}kWh. AI sugjeron reduktim menjëherë.` });
        newInsights.push({
          title: 'Redukto Ngarkesën',
          desc: 'Konsumi juaj është 30% mbi mesataren e zonës. Shmangni përdorimin e pajisjeve të rënda mes orës 18:00 - 22:00.',
          icon: 'warning',
          color: '#EF4444'
        });
      } else {
        setStatusMsg({ title: 'Sistemi është Optimal', sub: 'Konsumi juaj është brenda normave të efiçiencës.' });
      }

      if (lastBill.amount > 60) {
        newInsights.push({
          title: 'Tarifa e Lirë',
          desc: 'Fatura juaj ka kaluar 60€. Përdorni rrobëlarësen pas orës 22:00 për të kursyer rreth 15% të kostos.',
          icon: 'time',
          color: '#F59E0B'
        });
      }
    }

    if (hasBojler) {
      newInsights.push({
        title: 'Kursimi i Bojlerit',
        desc: 'Bojleri juaj harxhon më shumë. Sugjerojmë ta mbani në 55°C për balancën më të mirë mes nxehtësisë dhe kursimit.',
        icon: 'water',
        color: '#3B82F6'
      });
    }

    if (hasAC) {
      newInsights.push({
        title: 'Efiçienca e AC',
        desc: 'Gjatë verës, mbani AC në 24°C. Çdo gradë më pak rrit faturën tuaj për 5-7%.',
        icon: 'thermometer',
        color: '#10B981'
      });
    }

    if (newInsights.length === 0) {
      newInsights.push({
        title: 'Vazhdoni Kursimin',
        desc: 'Nuk kemi gjetur anomali. Sugjerojmë të fikni pajisjet në "Standby" për të kursyer 5€ shtesë këtë muaj.',
        icon: 'checkmark-circle',
        color: theme.success
      });
    }

    setInsights(newInsights);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Asistent i thjeshtë rregull-bazuar që përgjigjet nga të dhënat REALE të përdoruesit
  const getAiReply = (qRaw) => {
    const q = (qRaw || '').toLowerCase();
    const bills = data.bills || [];
    const devices = data.devices || [];
    const last = bills[0];
    const topDevice = devices
      .map(d => ({ name: d.name || 'Pajisje', w: d.avg_consumption || 0 }))
      .sort((a, b) => b.w - a.w)[0];

    if (q.includes('konsum') || q.includes('harxh') || q.includes('kwh') || q.includes('sa ')) {
      if (last) return `Fatura juaj e fundit ishte ${last.kwh || 0} kWh (${last.amount || 0}€).` + (bills.length > 1 ? ` Faturën e mëparshme e kishit ${bills[1].kwh || 0} kWh.` : '');
      return 'Ende s\'keni shtuar një faturë. Shtoni një që të analizoj konsumin tuaj real.';
    }
    if (q.includes('fatur') || q.includes('kosto') || q.includes('para') || q.includes('euro') || q.includes('€')) {
      if (last) {
        let t = `Fatura e fundit: ${last.amount || 0}€ për ${last.kwh || 0} kWh.`;
        if (bills.length > 1 && bills[1].amount) {
          const diff = Math.round(((last.amount - bills[1].amount) / bills[1].amount) * 100);
          t += diff > 0 ? ` Kjo është ${diff}% më shumë se e mëparshmja.` : ` Kjo është ${Math.abs(diff)}% më pak se e mëparshmja - bravo!`;
        }
        return t;
      }
      return 'S\'kam ende një faturë për të treguar. Shtoni faturën tuaj të parë.';
    }
    if (q.includes('kurs') || q.includes('reduk') || q.includes('ul ') || q.includes('si t')) {
      if (topDevice && topDevice.w > 0) return `Pajisja juaj më harxhuese është "${topDevice.name}" (${topDevice.w} W). Shmangeni në orët e pikut 18:00-22:00 - mund të kurseni 10-15%.`;
      return 'Shtoni pajisjet tuaja që t\'ju them saktësisht cila harxhon më shumë dhe si të kurseni.';
    }
    if (q.includes('pajisje') || q.includes('device')) {
      if (devices.length === 0) return 'Ende s\'keni shtuar pajisje. Shkoni te "Pajisjet" për t\'i regjistruar.';
      return `Keni ${devices.length} pajisje të regjistruara.` + (topDevice && topDevice.w > 0 ? ` Më harxhuesja: "${topDevice.name}" (${topDevice.w} W).` : '');
    }
    if (q.includes('përsh') || q.includes('tung') || q.includes('hello') || q.includes('hi')) {
      return 'Përshëndetje! Pyetni për konsumin, faturën, pajisjet ose si të kurseni - përgjigjem nga të dhënat tuaja reale.';
    }
    if (last || devices.length > 0) {
      return `Ja çka di për ju: ${last ? `fatura e fundit ${last.amount || 0}€ / ${last.kwh || 0} kWh` : 'ende pa faturë'}, ${devices.length} pajisje. Provoni: "si të kursej?" ose "sa harxhoj?".`;
    }
    return 'Shtoni faturat dhe pajisjet tuaja që të mund t\'ju jap këshilla reale bazuar në to.';
  };

  const sendMessage = () => {
    if (message.trim() === '') return;
    const q = message;
    const userMsg = { id: Date.now(), text: q, sender: 'user' };
    setChatHistory(prev => [...prev, userMsg]);
    setMessage('');

    setTimeout(() => {
      const aiResponse = { id: Date.now() + 1, text: getAiReply(q), sender: 'ai' };
      setChatHistory(prev => [...prev, aiResponse]);
    }, 600);
  };

  return (
    <View style={s.container}>
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} colors={[theme.primary]} />}
      >
        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={{ marginRight: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <View>
              <Text style={s.headerTitle}>Këshillat AI</Text>
              <Text style={s.headerSub}>Analizë bazuar në shpenzimet reale</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.body}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 30 }} />
          ) : !hasData ? (
            <View style={s.emptyBox}>
              <Ionicons name="sparkles-outline" size={56} color={theme.border} />
              <Text style={s.emptyTitle}>Ende s'ka të dhëna për analizë</Text>
              <Text style={s.emptySub}>Shto një faturë ose pajisje që AI të gjenerojë këshilla reale bazuar në konsumin tënd.</Text>
            </View>
          ) : (
            <>
              <View style={s.statusCard}>
                <Ionicons name="sparkles" size={32} color="#F59E0B" />
                <Text style={s.statusTitle}>{statusMsg.title}</Text>
                <Text style={s.statusSub}>{statusMsg.sub}</Text>
              </View>

              <Text style={s.sectionTitle}>Sugjerimet e Personalizuara</Text>
              {insights.map((insight, index) => (
                <InsightCard key={index} {...insight} theme={theme} />
              ))}
            </>
          )}

          <TouchableOpacity style={s.chatBtn} onPress={() => setChatVisible(true)}>
            <LinearGradient colors={theme.gradientPrimary} style={s.chatInner} start={{x:0, y:0}} end={{x:1, y:0}}>
              <Ionicons name="chatbubbles" size={22} color="#fff" />
              <Text style={s.chatText}>Bisedo me AI për Kursim</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      <Modal visible={chatVisible} animationType="slide">
        <View style={[s.chatContainer, { backgroundColor: theme.background }]}>
          <View style={s.chatHeader}>
            <TouchableOpacity onPress={() => setChatVisible(false)}>
              <Ionicons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={s.chatHeaderTitle}>EcoMind AI Chat</Text>
            <View style={{ width: 28 }} />
          </View>

          <FlatList
            data={chatHistory}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[s.messageWrapper, item.sender === 'user' ? s.userWrapper : s.aiWrapper]}>
                <View style={[s.messageBubble, item.sender === 'user' ? s.userBubble : s.aiBubble]}>
                  <Text style={[s.messageText, item.sender === 'user' ? s.userMessageText : s.aiMessageText]}>{item.text}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ padding: 20 }}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.inputContainer}>
              <TextInput
                style={s.chatInput}
                placeholder="Pyet diçka..."
                placeholderTextColor={theme.textMuted}
                value={message}
                onChangeText={setMessage}
              />
              <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  emptySub: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 20 },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 30 },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
  body: { padding: 24 },
  statusCard: { backgroundColor: theme.card, borderRadius: 28, padding: 25, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statusTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 12 },
  statusSub: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  sectionTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 18 },
  insightCard: { backgroundColor: theme.card, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
  chatBtn: { marginTop: 20 },
  chatInner: { borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  chatText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chatContainer: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
  chatHeaderTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '800' },
  messageWrapper: { marginBottom: 15, flexDirection: 'row' },
  userWrapper: { justifyContent: 'flex-end' },
  aiWrapper: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 15, borderRadius: 20 },
  userBubble: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: theme.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
  messageText: { fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#fff' },
  aiMessageText: { color: theme.textPrimary },
  inputContainer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: theme.border, gap: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  chatInput: { flex: 1, backgroundColor: theme.card, borderRadius: 15, paddingHorizontal: 15, height: 50, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
  sendBtn: { width: 50, height: 50, borderRadius: 15, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }
});

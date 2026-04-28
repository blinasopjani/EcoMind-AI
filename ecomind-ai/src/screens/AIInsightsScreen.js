import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

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
  const s = styles(theme);

  const [chatVisible, setChatVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { id: 1, text: 'Përshëndetje! Unë jam EcoMind AI. Si mund t\'ju ndihmoj sot për të kursyer energji?', sender: 'ai' }
  ]);

  const sendMessage = () => {
    if (message.trim() === '') return;
    
    const userMsg = { id: Date.now(), text: message, sender: 'user' };
    setChatHistory([...chatHistory, userMsg]);
    setMessage('');

    setTimeout(() => {
      const aiResponse = { 
        id: Date.now() + 1, 
        text: 'Duke u bazuar në konsumin tuaj të djeshëm, ju sugjeroj të fikni dritat në korridor pasi ato kanë qëndruar ndezur për 8 orë pa nevojë.', 
        sender: 'ai' 
      };
      setChatHistory(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <Text style={s.headerTitle}>Këshillat AI</Text>
          <Text style={s.headerSub}>Inteligjenca Artificiale për kursim maksimal</Text>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.statusCard}>
            <Ionicons name="sparkles" size={32} color="#F59E0B" />
            <Text style={s.statusTitle}>Sistemi është Optimal</Text>
            <Text style={s.statusSub}>AI ka analizuar 12 pajisje dhe sugjeron 3 ndryshime sot.</Text>
          </View>

          <Text style={s.sectionTitle}>Sugjerimet e Sotme</Text>
          
          <InsightCard 
            title="Optimizo Bojlerin" 
            desc="Nisni bojlerin pas orës 22:00 kur tarifa është më e lirë për të kursyer rreth 12€/muaj." 
            icon="water" 
            color="#3B82F6" 
            theme={theme} 
          />

          <InsightCard 
            title="Temperatura e AC" 
            desc="Rritja e temperaturës së kondicionerit për vetëm 2 gradë redukton konsumin ditor për 15%." 
            icon="thermometer" 
            color="#10B981" 
            theme={theme} 
          />

          <TouchableOpacity style={s.chatBtn} onPress={() => setChatVisible(true)}>
            <LinearGradient colors={theme.gradientPrimary} style={s.chatInner} start={{x:0, y:0}} end={{x:1, y:0}}>
              <Ionicons name="chatbubbles" size={22} color="#fff" />
              <Text style={s.chatText}>Pyet EcoMind AI</Text>
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
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <View style={[
                s.messageBubble, 
                item.sender === 'user' ? s.userBubble : s.aiBubble,
                { backgroundColor: item.sender === 'user' ? theme.primary : theme.card }
              ]}>
                <Text style={[s.messageText, { color: item.sender === 'user' ? '#fff' : theme.textPrimary }]}>
                  {item.text}
                </Text>
              </View>
            )}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
            <View style={[s.inputArea, { borderTopColor: theme.border }]}>
              <TextInput
                style={[s.chatInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
                placeholder="Shkruaj një mesazh..."
                placeholderTextColor={theme.textMuted}
                value={message}
                onChangeText={setMessage}
              />
              <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
                <Ionicons name="send" size={22} color="#fff" />
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
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
  body: { padding: 20 },
  statusCard: { backgroundColor: theme.card, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: theme.border },
  statusTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 12 },
  statusSub: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  sectionTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 16 },
  insightCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: theme.border, gap: 16 },
  iconBox: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  chatBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 20, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  chatInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 12 },
  chatText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  chatContainer: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  chatHeaderTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary },
  messageBubble: { padding: 15, borderRadius: 20, marginBottom: 15, maxWidth: '80%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  messageText: { fontSize: 15, lineHeight: 22 },
  inputArea: { flexDirection: 'row', padding: 15, alignItems: 'center', gap: 10, borderTopWidth: 1 },
  chatInput: { flex: 1, height: 50, borderRadius: 25, paddingHorizontal: 20, fontSize: 15 },
  sendBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
});

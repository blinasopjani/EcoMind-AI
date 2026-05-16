import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const NotifItem = ({ title, body, time, icon, color, isNew, theme }) => {
  const s = styles(theme);
  return (
    <TouchableOpacity style={[s.notifItem, isNew && s.notifUnread]}>
      <View style={[s.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.row}>
          <Text style={s.notifTitle}>{title}</Text>
          {isNew && <View style={s.unreadDot} />}
        </View>
        <Text style={s.notifBody}>{body}</Text>
        <Text style={s.notifTime}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Njoftimet</Text>
            <Text style={s.headerSub}>Qëndro i informuar për kursimet e tua</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.body}>
        <Text style={s.sectionTitle}>Sot</Text>
        <NotifItem 
          title="Faturë e Re e Skanuar" 
          body="Skanimi i faturës së Prillit u krye me sukses. Kursimi juaj është 12% më i lartë." 
          time="Para 2 orëve" 
          icon="receipt" 
          color={theme.primary} 
          isNew={true} 
          theme={theme} 
        />
        <NotifItem 
          title="Sfidë e Përfunduar!" 
          body="Urime! Ke fituar 500 pikë nga sfida 'Shkyçja'." 
          time="Para 5 orëve" 
          icon="trophy" 
          color={theme.warning} 
          isNew={true} 
          theme={theme} 
        />

        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Dje</Text>
        <NotifItem 
          title="Paralajmërim Konsumi" 
          body="Kondicioneri ka punuar mbi 10 orë sot. Konsideroni uljen e temperaturës." 
          time="Dje, 21:00" 
          icon="warning" 
          color={theme.danger} 
          isNew={false} 
          theme={theme} 
        />
        
        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
  body: { paddingHorizontal: 20 },
  sectionTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginVertical: 15, opacity: 0.7 },
  notifItem: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border, gap: 15 },
  notifUnread: { borderColor: theme.primary, borderWidth: 1.5 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  notifBody: { color: theme.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  notifTime: { color: theme.textMuted, fontSize: 11, marginTop: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
});

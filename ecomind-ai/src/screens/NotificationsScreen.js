import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotifItem = ({ title, body, time, icon, color, isNew, theme }) => {
  const s = styles(theme);
  return (
    <View style={[s.notifItem, isNew && s.notifUnread]}>
      <View style={[s.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.row}>
          <Text style={s.notifTitle}>{title}</Text>
          {isNew && <View style={s.unreadDot} />}
        </View>
        <Text style={s.notifBody}>{body}</Text>
        {time ? <Text style={s.notifTime}>{time}</Text> : null}
      </View>
    </View>
  );
};

// Formaton datën e krijimit të një fature në tekst të lexueshëm
const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('sq', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function NotificationsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const buildNotifications = async () => {
    setLoading(true);
    const list = [];
    try {
      // Të dhënat reale: faturat dhe pajisjet (RLS i kufizon te përdoruesi aktual)
      const { data: bills } = await supabase.from('bills').select('*').order('created_at', { ascending: false });
      const { data: devices } = await supabase.from('devices').select('*');

      const b = bills || [];
      const d = devices || [];

      // 1) Fatura e fundit + krahasimi me të mëparshmen
      if (b.length > 0) {
        const last = b[0];
        list.push({
          key: 'last-bill',
          title: 'Fatura e fundit',
          body: `${(last.amount ?? 0)}€ • ${(last.kwh ?? 0)} kWh${last.provider ? ` • ${last.provider}` : ''}.`,
          time: formatWhen(last.created_at),
          icon: 'receipt-outline',
          color: theme.primary,
          isNew: true,
        });

        if (b.length > 1) {
          const prev = b[1];
          const prevKwh = prev.kwh || 0;
          if (prevKwh > 0 && last.kwh != null) {
            const diff = ((last.kwh - prevKwh) / prevKwh) * 100;
            const rounded = Math.round(Math.abs(diff));
            if (diff > 3) {
              list.push({
                key: 'trend-up',
                title: 'Konsumi u rrit',
                body: `Fatura e fundit është ${rounded}% më e lartë se e mëparshmja (${prevKwh} → ${last.kwh} kWh).`,
                icon: 'trending-up-outline',
                color: theme.danger,
                isNew: true,
              });
            } else if (diff < -3) {
              list.push({
                key: 'trend-down',
                title: 'Bravo, po kurseni!',
                body: `Konsumi ra me ${rounded}% krahasuar me faturën e mëparshme.`,
                icon: 'trending-down-outline',
                color: theme.success,
                isNew: true,
              });
            }
          }
        }

        // 2) Krahasimi me buxhetin e synuar (nga onboarding-u, ruajtur lokalisht)
        try {
          const houseStr = await AsyncStorage.getItem('house_data');
          const house = houseStr ? JSON.parse(houseStr) : null;
          const budget = house?.buxheti ? parseInt(String(house.buxheti).replace(/[^0-9]/g, ''), 10) : null;
          if (budget && last.amount != null) {
            if (last.amount > budget) {
              list.push({
                key: 'budget-over',
                title: 'Tejkalim i buxhetit',
                body: `Fatura (${last.amount}€) e kaloi buxhetin tuaj të synuar prej ${budget}€.`,
                icon: 'alert-circle-outline',
                color: theme.warning,
                isNew: true,
              });
            } else {
              list.push({
                key: 'budget-ok',
                title: 'Brenda buxhetit',
                body: `Fatura (${last.amount}€) është brenda buxhetit tuaj prej ${budget}€.`,
                icon: 'checkmark-circle-outline',
                color: theme.success,
                isNew: false,
              });
            }
          }
        } catch (e) { /* buxheti opsional */ }
      }

      // 3) Pajisja më harxhuese
      if (d.length > 0) {
        const withConsumption = d
          .map(x => ({ name: x.name || 'Pajisje', w: x.avg_consumption || 0 }))
          .sort((a, b2) => b2.w - a.w);
        const top = withConsumption[0];
        if (top && top.w > 0) {
          list.push({
            key: 'top-device',
            title: 'Pajisja më harxhuese',
            body: `"${top.name}" ka fuqinë më të lartë (${top.w} W). Shmangni përdorimin në orët e pikut (18:00–22:00).`,
            icon: 'flash-outline',
            color: theme.danger,
            isNew: false,
          });
        }
      }

      // 4) Progresi i lojës (pikët/niveli, ruajtur lokalisht)
      try {
        const pts = await AsyncStorage.getItem('user_points');
        if (pts && parseInt(pts, 10) > 0) {
          const p = parseInt(pts, 10);
          const level = Math.floor(p / 1000) + 1;
          list.push({
            key: 'points',
            title: 'Pikët tuaja',
            body: `Keni ${p} pikë (Niveli ${level}). Vazhdoni sfidat për të fituar shpërblime.`,
            icon: 'trophy-outline',
            color: theme.warning,
            isNew: false,
          });
        }
      } catch (e) { /* pikët opsionale */ }

      // 5) Nxitje për të shtuar të dhëna, nëse mungojnë
      if (b.length === 0) {
        list.push({
          key: 'no-bills',
          title: 'Shtoni faturën tuaj të parë',
          body: 'Sapo të shtoni një faturë, do të merrni analiza dhe njoftime reale për konsumin tuaj.',
          icon: 'document-text-outline',
          color: theme.info,
          isNew: true,
        });
      }
      if (d.length === 0) {
        list.push({
          key: 'no-devices',
          title: 'Shtoni pajisjet tuaja',
          body: 'Regjistroni pajisjet shtëpiake për të parë cilat harxhojnë më shumë energji.',
          icon: 'add-circle-outline',
          color: theme.primary,
          isNew: true,
        });
      }

      setItems(list);
    } catch (err) {
      console.warn('Notifications error:', err?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buildNotifications();
  }, []);

  const newOnes = items.filter(i => i.isNew);
  const older = items.filter(i => !i.isNew);

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={buildNotifications} colors={[theme.primary]} />}
    >
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
            <Text style={s.headerSub}>Bazuar në të dhënat tuaja reale</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.body}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={70} color={theme.border} />
            <Text style={s.emptyText}>Nuk ka njoftime për momentin.</Text>
          </View>
        ) : (
          <>
            {newOnes.length > 0 && <Text style={s.sectionTitle}>Të reja</Text>}
            {newOnes.map(n => <NotifItem key={n.key} {...n} theme={theme} />)}

            {older.length > 0 && <Text style={[s.sectionTitle, { marginTop: 20 }]}>Më herët</Text>}
            {older.map(n => <NotifItem key={n.key} {...n} theme={theme} />)}
          </>
        )}
        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
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
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70 },
  emptyText: { color: theme.textMuted, fontSize: 14, marginTop: 16 },
});

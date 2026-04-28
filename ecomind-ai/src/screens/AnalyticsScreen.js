import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

const AnalyticsCard = ({ title, value, unit, change, icon, color, theme }) => (
  <View style={styles(theme).analyticsCard}>
    <View style={[styles(theme).iconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles(theme).cardTitle}>{title}</Text>
      <Text style={styles(theme).cardValue}>{value} <Text style={styles(theme).cardUnit}>{unit}</Text></Text>
    </View>
    <View style={[styles(theme).changeBadge, { backgroundColor: change.startsWith('-') ? '#10B98120' : '#EF444420' }]}>
      <Text style={[styles(theme).changeText, { color: change.startsWith('-') ? '#10B981' : '#EF4444' }]}>{change}</Text>
    </View>
  </View>
);

export default function AnalyticsScreen() {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <Text style={s.headerTitle}>Analitika</Text>
        <Text style={s.headerSub}>Pasqyra e detajuar e konsumit tuaj</Text>
      </LinearGradient>

      <View style={s.body}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Krahasimi me Muajin e Kaluar</Text>
          <AnalyticsCard 
            title="Konsumi Total" 
            value="342" 
            unit="kWh" 
            change="-12%" 
            icon="flash" 
            color={theme.primary} 
            theme={theme} 
          />
          <AnalyticsCard 
            title="Kostoja e Faturës" 
            value="47.85" 
            unit="€" 
            change="-8.5%" 
            icon="card" 
            color={theme.info} 
            theme={theme} 
          />
          <AnalyticsCard 
            title="Emetimet CO₂" 
            value="156" 
            unit="kg" 
            change="-15%" 
            icon="leaf" 
            color={theme.success} 
            theme={theme} 
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Pajisjet më Harxhuese</Text>
          <View style={s.deviceStats}>
            {[
              { name: 'Kondicioneri', percent: 42, color: theme.primary },
              { name: 'Frigoriferi', percent: 18, color: theme.info },
              { name: 'Bojleri', percent: 15, color: theme.warning },
              { name: 'Të tjera', percent: 25, color: theme.textMuted },
            ].map((d, i) => (
              <View key={i} style={s.deviceRow}>
                <View style={s.deviceHeader}>
                  <Text style={s.deviceName}>{d.name}</Text>
                  <Text style={s.devicePercent}>{d.percent}%</Text>
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${d.percent}%`, backgroundColor: d.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s.infoBox}>
          <Ionicons name="information-circle" size={20} color={theme.primary} />
          <Text style={s.infoText}>Analitika juaj bazohet në leximet e faturave dhe sensorët e pajisjeve smart të lidhura.</Text>
        </View>
        
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
  body: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 16 },
  analyticsCard: { backgroundColor: theme.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  iconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardTitle: { color: theme.textSecondary, fontSize: 12, marginBottom: 2 },
  cardValue: { color: theme.textPrimary, fontSize: 18, fontWeight: '800' },
  cardUnit: { fontSize: 13, fontWeight: '400' },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  changeText: { fontSize: 12, fontWeight: '700' },
  deviceStats: { backgroundColor: theme.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: theme.border },
  deviceRow: { marginBottom: 16 },
  deviceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  deviceName: { color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  devicePercent: { color: theme.textSecondary, fontSize: 14, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  infoBox: { flexDirection: 'row', padding: 16, backgroundColor: theme.primary + '10', borderRadius: 16, gap: 12, alignItems: 'center' },
  infoText: { color: theme.primary, fontSize: 12, flex: 1, lineHeight: 18 },
});

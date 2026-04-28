import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const GoalCard = ({ title, current, target, unit, color, icon, theme }) => {
  const progress = (current / target) * 100;
  return (
    <View style={styles(theme).goalCard}>
      <View style={styles(theme).goalHeader}>
        <View style={[styles(theme).goalIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles(theme).goalTitle}>{title}</Text>
        <Text style={styles(theme).goalProgressText}>{progress.toFixed(0)}%</Text>
      </View>
      <View style={styles(theme).progressContainer}>
        <View style={[styles(theme).progressBg, { backgroundColor: theme.border }]}>
          <View style={[styles(theme).progressFill, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
      </View>
      <View style={styles(theme).goalFooter}>
        <Text style={styles(theme).goalMeta}>{current} {unit} aktual</Text>
        <Text style={styles(theme).goalMeta}>Objektivi: {target} {unit}</Text>
      </View>
    </View>
  );
};

export default function GoalsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Objektivat</Text>
        <Text style={s.headerSub}>Sfidoni veten për të kursyer më shumë</Text>
      </LinearGradient>

      <View style={s.body}>
        <GoalCard 
          title="Kursimi mujor i energjisë" 
          current={210} 
          target={300} 
          unit="kWh" 
          color={theme.primary} 
          icon="flash" 
          theme={theme} 
        />
        <GoalCard 
          title="Reduktimi i CO₂" 
          current={45} 
          target={100} 
          unit="kg" 
          color={theme.success} 
          icon="leaf" 
          theme={theme} 
        />
        <GoalCard 
          title="Buxheti i shpenzimeve" 
          current={38} 
          target={50} 
          unit="€" 
          color={theme.warning} 
          icon="wallet" 
          theme={theme} 
        />

        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={s.addBtnText}>Shto Objektiv të Ri</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 20 },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
  body: { padding: 20 },
  goalCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  goalIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  goalTitle: { flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  goalProgressText: { color: theme.textPrimary, fontSize: 14, fontWeight: '800' },
  progressContainer: { marginBottom: 12 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  goalMeta: { color: theme.textSecondary, fontSize: 11 },
  addBtn: { backgroundColor: theme.primary, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeContext';
import { dashboardData } from '../data/mockData';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, unit, icon, gradient, theme }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };
  const s = styles(theme);
  return (
    <TouchableOpacity onPress={press} activeOpacity={0.9}>
      <Animated.View style={[s.statCard, { transform: [{ scale }] }]}>
        <LinearGradient colors={gradient} style={s.statGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={s.statIcon}>
            <Ionicons name={icon} size={22} color="#fff" />
          </View>
          <Text style={s.statValue}>{value}<Text style={s.statUnit}> {unit}</Text></Text>
          <Text style={s.statTitle}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const MiniBar = ({ value, max, color, theme }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: (value / max) * (width * 0.55), duration: 800, useNativeDriver: false }).start();
  }, []);
  const s = styles(theme);
  return (
    <View style={s.barBg}>
      <Animated.View style={[s.barFill, { width: anim, backgroundColor: color }]} />
    </View>
  );
};

export default function DashboardScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);
  const { weeklyUsage, weeklyLabels } = dashboardData;
  const maxUsage = Math.max(...weeklyUsage);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.greeting}>Mirëmëngjes! 👋</Text>
              <Text style={s.headerTitle}>EcoMind AI+</Text>
            </View>
            <TouchableOpacity 
              style={s.notifBtn} 
              onPress={() => navigation.navigate('More', { screen: 'Notifications' })}
            >
              <Ionicons name="notifications" size={22} color={theme.primary} />
              <View style={s.notifDot} />
            </TouchableOpacity>
          </View>

          <LinearGradient colors={theme.gradientPrimary} style={s.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={s.heroLabel}>Konsumi Mujor</Text>
            <Text style={s.heroValue}>{dashboardData.totalUsage} <Text style={s.heroUnit}>kWh</Text></Text>
            <View style={s.heroRow}>
              <View>
                <Text style={s.heroSubLabel}>Fatura Estimuar</Text>
                <Text style={s.heroSub}>{dashboardData.monthlyBill}€</Text>
              </View>
              <View>
                <Text style={s.heroSubLabel}>Kursim</Text>
                <Text style={s.heroSub}>+{dashboardData.savingsThisMonth}€</Text>
              </View>
              <View>
                <Text style={s.heroSubLabel}>CO₂</Text>
                <Text style={s.heroSub}>{dashboardData.co2Emissions}kg</Text>
              </View>
            </View>
            <View style={s.ecoScoreRow}>
              <Text style={s.ecoLabel}>Eco Score</Text>
              <View style={s.ecoBar}>
                <View style={[s.ecoFill, { width: `${dashboardData.ecoScore}%` }]} />
              </View>
              <Text style={s.ecoNum}>{dashboardData.ecoScore}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </LinearGradient>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Statistikat</Text>
        <View style={s.statGrid}>
          <StatCard title="Konsumi" value={dashboardData.totalUsage} unit="kWh" icon="flash" gradient={['#00C896','#00A87A']} theme={theme} />
          <StatCard title="Fatura" value={dashboardData.monthlyBill} unit="€" icon="card" gradient={['#1A73E8','#1557B0']} theme={theme} />
          <StatCard title="CO₂" value={dashboardData.co2Emissions} unit="kg" gradient={['#7C3AED','#5B21B6']} icon="leaf" theme={theme} />
          <StatCard title="Kursim" value={dashboardData.savingsThisMonth} unit="€" icon="trending-down" gradient={['#F59E0B','#D97706']} theme={theme} />
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Konsumi Javor</Text>
        <View style={s.chartCard}>
          {weeklyUsage.map((val, i) => (
            <View key={i} style={s.barCol}>
              <Text style={s.barValue}>{val}</Text>
              <View style={s.barContainer}>
                <View style={[s.barItem, {
                  height: (val / maxUsage) * 80,
                  backgroundColor: i === 3 ? theme.danger : theme.primary,
                }]} />
              </View>
              <Text style={s.barLabel}>{weeklyLabels[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Pajisja më Harxhuese</Text>
        <LinearGradient colors={theme.gradientCard} style={s.consumerCard}>
          <View style={s.consumerRow}>
            <View style={s.consumerIcon}>
              <Ionicons name="snow" size={28} color={theme.secondary} />
            </View>
            <View style={s.consumerInfo}>
              <Text style={s.consumerName}>{dashboardData.topConsumer}</Text>
              <Text style={s.consumerSub}>12 kWh/ditë • 35% e konsumit total</Text>
              <MiniBar value={35} max={100} color={theme.secondary} theme={theme} />
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={[s.section, { marginBottom: 100 }]}>
        <Text style={s.sectionTitle}>Sugjerim AI</Text>
        <LinearGradient colors={theme.gradientPrimary} style={s.aiCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="bulb" size={24} color="#fff" style={{ marginRight: 12 }} />
          <Text style={s.aiText}>{dashboardData.aiSuggestion}</Text>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: theme.textSecondary, fontSize: 14 },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.danger },
  heroCard: { borderRadius: 24, padding: 20, shadowColor: theme.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroValue: { color: '#fff', fontSize: 48, fontWeight: '900', marginVertical: 4 },
  heroUnit: { fontSize: 20, fontWeight: '400' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 16 },
  heroSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  heroSub: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ecoScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ecoLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, width: 70 },
  ecoBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  ecoFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  ecoNum: { color: '#fff', fontSize: 14, fontWeight: '700', width: 28, textAlign: 'right' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: (width - 52) / 2, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statGradient: { padding: 16 },
  statIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statUnit: { fontSize: 13, fontWeight: '400' },
  statTitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },
  chartCard: { backgroundColor: theme.card, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderWidth: 1, borderColor: theme.border },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { color: theme.textSecondary, fontSize: 9, marginBottom: 4 },
  barContainer: { height: 90, justifyContent: 'flex-end' },
  barItem: { width: 10, borderRadius: 5, minHeight: 6 },
  barLabel: { color: theme.textSecondary, fontSize: 10, marginTop: 6 },
  consumerCard: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.border },
  consumerRow: { flexDirection: 'row', alignItems: 'center' },
  consumerIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(26,115,232,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  consumerInfo: { flex: 1 },
  consumerName: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  consumerSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 8 },
  barBg: { height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  aiCard: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  aiText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },
});

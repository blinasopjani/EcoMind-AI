import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../data/supabase';
import { showAlert } from '../data/alertHelper';
import { KG_CO2_PER_KWH } from '../data/kescoTariff';

const GoalCard = ({ title, current, target, unit, color, icon, theme, onDelete }) => {
  const progress = current > 0 && target > 0 ? Math.min(100, (target / current) * 100) : 0;
  return (
    <View style={styles(theme).goalCard}>
      <View style={styles(theme).goalHeader}>
        <View style={[styles(theme).goalIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles(theme).goalTitle}>{title}</Text>
        <Text style={styles(theme).goalProgressText}>{progress.toFixed(0)}%</Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={{ marginLeft: 8 }}>
            <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles(theme).progressContainer}>
        <View style={[styles(theme).progressBg, { backgroundColor: theme.border }]}>
          <View style={[styles(theme).progressFill, { width: `${Math.min(100, progress)}%`, backgroundColor: color }]} />
        </View>
      </View>
      <View style={styles(theme).goalFooter}>
        <Text style={styles(theme).goalMeta}>{current} {unit} aktual</Text>
        <Text style={styles(theme).goalMeta}>Objektivi: {target} {unit}</Text>
      </View>
    </View>
  );
};

// Diverse AI goal templates keyed by category
const AI_GOAL_TEMPLATES = [
  { key: 'kwh_15', label: (kwh) => `Redukto konsumin me 15%`, target: (kwh) => Math.round(kwh * 0.85), unit: 'kWh', icon: 'flash', color: '#8B5CF6' },
  { key: 'kwh_20', label: () => `Arrij konsumin nën 200 kWh`, target: () => 200, unit: 'kWh', icon: 'analytics', color: '#0EA5E9' },
  { key: 'eur_budget', label: (kwh, amount) => `Kufizo faturën mujore në 30€`, target: () => 30, unit: '€', icon: 'wallet', color: '#F59E0B' },
  { key: 'eur_15', label: (kwh, amount) => `Kurseje 15% të faturës`, target: (kwh, amount) => Math.round(amount * 0.85), unit: '€', icon: 'cash', color: '#10B981' },
  { key: 'kwh_night', label: () => `Objektiv: Natë e ulët - 150 kWh`, target: () => 150, unit: 'kWh', icon: 'moon', color: '#6366F1' },
  { key: 'co2_reduction', label: () => `CO₂: nën 100 kg CO₂ ekuivalent`, target: () => 100, unit: 'kg CO₂', icon: 'leaf', color: '#22C55E' },
];

export default function GoalsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', unit: 'kWh' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [consumption, setConsumption] = useState({ kwh: 0, amount: 0 });
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadGoals();
  }, []);

  // Refresh when screen gets focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadGoals);
    return unsubscribe;
  }, [navigation]);

  const getGoalsKey = (uid) => `${uid}_user_goals`;

  const applyCurrent = (list, cons) => list.map(g => ({
    ...g,
    current: g.unit === '€' ? cons.amount : g.unit === 'kg CO₂' ? parseFloat((cons.kwh * KG_CO2_PER_KWH).toFixed(1)) : cons.kwh,
  }));

  const loadGoals = async () => {
    try {
      const uid = await AsyncStorage.getItem('user_id');
      setUserId(uid);

      let cons = { kwh: 0, amount: 0 };
      if (uid) {
        const { data: bills } = await supabase
          .from('bills')
          .select('kwh, amount')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(1);
        if (bills && bills.length > 0) {
          cons = { kwh: bills[0].kwh || 0, amount: bills[0].amount || 0 };
        }
      }
      setConsumption(cons);

      const key = uid ? getGoalsKey(uid) : 'user_goals';
      const savedGoals = await AsyncStorage.getItem(key);
      let parsed = savedGoals ? JSON.parse(savedGoals) : [];
      setGoals(applyCurrent(parsed, cons));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const saveGoals = async (updatedGoals) => {
    setGoals(updatedGoals);
    const key = userId ? getGoalsKey(userId) : 'user_goals';
    await AsyncStorage.setItem(key, JSON.stringify(updatedGoals));
  };

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.target) {
      showAlert("Gabim", "Plotësoni të gjitha fushat.");
      return;
    }
    const goal = {
      id: Date.now(),
      title: newGoal.title,
      target: parseFloat(newGoal.target),
      current: newGoal.unit === '€' ? consumption.amount : newGoal.unit === 'kg CO₂' ? parseFloat((consumption.kwh * KG_CO2_PER_KWH).toFixed(1)) : consumption.kwh,
      unit: newGoal.unit,
      color: theme.primary,
      icon: 'star'
    };
    saveGoals([...goals, goal]);
    setModalVisible(false);
    setNewGoal({ title: '', target: '', unit: 'kWh' });
  };

  const handleDeleteGoal = (id) => {
    showAlert(
      'Fshi Objektivin',
      'A jeni i sigurt që doni ta fshini këtë objektiv?',
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Fshi',
          style: 'destructive',
          onPress: () => saveGoals(goals.filter(g => g.id !== id))
        }
      ]
    );
  };

  const generateAiGoal = async () => {
    setAiGenerating(true);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!bills || bills.length === 0) {
        showAlert('Mungojnë të dhënat', 'Shtoni së paku një faturë që AI të krijojë një objektiv real bazuar në konsumin tuaj.');
        setAiGenerating(false);
        return;
      }

      const lastBill = bills[0];
      const lastKwh = lastBill.kwh || 0;
      const lastAmount = lastBill.amount || 0;

      // Find which templates are not already in goals list
      const existingKeys = goals.map(g => g._aiKey).filter(Boolean);
      const available = AI_GOAL_TEMPLATES.filter(t => !existingKeys.includes(t.key));

      if (available.length === 0) {
        showAlert('Të gjitha sugjerimet u shtuan', 'Keni shtuar të gjitha llojet e objektivave të AI-t. Fshini ndonjërin për të gjeneruar sërish.');
        setAiGenerating(false);
        return;
      }

      // Pick a random one from remaining
      const tpl = available[Math.floor(Math.random() * available.length)];
      const target = tpl.target(lastKwh, lastAmount);
      const current = tpl.unit === '€' ? lastAmount : tpl.unit === 'kg CO₂' ? parseFloat((lastKwh * KG_CO2_PER_KWH).toFixed(1)) : lastKwh;

      const aiGoal = {
        id: Date.now(),
        _aiKey: tpl.key,
        title: tpl.label(lastKwh, lastAmount),
        target,
        current,
        unit: tpl.unit,
        color: tpl.color,
        icon: tpl.icon
      };

      const updated = [...goals, aiGoal];
      await saveGoals(updated);
      showAlert(
        "✅ AI Sugjerim u Shtua",
        `Bazuar në faturën tuaj (${lastKwh} kWh / ${lastAmount}€), krijuam: "${aiGoal.title}"\nTarget: ${target} ${tpl.unit}`
      );
    } catch (e) {
      showAlert("Gabim", "Dështoi gjenerimi me AI.");
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) return (
    <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );

  return (
    <View style={s.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Objektivat</Text>
              <Text style={s.headerSub}>Sfidoni veten për të kursyer më shumë</Text>
            </View>
            <View style={{ backgroundColor: theme.primary + '15', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: theme.primary + '30' }}>
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>{goals.length} Aktive</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.body}>
          {/* Summary strip */}
          {consumption.kwh > 0 && (
            <View style={[s.infoStrip, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="flash" size={16} color={theme.primary} />
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8 }}>
                Konsumi i fundit: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{consumption.kwh} kWh</Text>
                {consumption.amount > 0 && <Text> • <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{consumption.amount.toFixed(2)} €</Text></Text>}
              </Text>
            </View>
          )}

          {goals.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="flag-outline" size={80} color={theme.border} />
              <Text style={s.emptyTitle}>Nuk keni asnjë objektiv</Text>
              <Text style={s.emptySub}>Shtoni një objektiv manualisht ose përdorni AI për të gjeneruar një të tillë bazuar në shpenzimet tuaja.</Text>
            </View>
          ) : (
            goals.map(goal => (
              <GoalCard
                key={goal.id}
                {...goal}
                theme={theme}
                onDelete={() => handleDeleteGoal(goal.id)}
              />
            ))
          )}

          <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={s.addBtnText}>Shto Objektiv</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: '#8B5CF6', marginTop: 12 }]}
            onPress={generateAiGoal}
            disabled={aiGenerating}
          >
            {aiGenerating ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={s.addBtnText}>Gjeneroni Objektiv me AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Shto Objektiv të Ri</Text>

            <Text style={s.label}>Titulli</Text>
            <TextInput
              style={s.input}
              placeholder="p.sh. Kursimi i muajit"
              placeholderTextColor={theme.textMuted}
              value={newGoal.title}
              onChangeText={v => setNewGoal({ ...newGoal, title: v })}
            />

            <Text style={s.label}>Objektivi (Target)</Text>
            <TextInput
              style={s.input}
              placeholder="p.sh. 250"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={newGoal.target}
              onChangeText={v => setNewGoal({ ...newGoal, target: v })}
            />

            <Text style={s.label}>Njësia</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {['kWh', '€', 'kg CO₂'].map(u => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setNewGoal({ ...newGoal, unit: u })}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: newGoal.unit === u ? theme.primary : theme.border }}
                >
                  <Text style={{ color: newGoal.unit === u ? '#fff' : theme.textSecondary, fontWeight: '700' }}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.border }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.primary }]} onPress={handleAddGoal}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Ruaj</Text>
              </TouchableOpacity>
            </View>
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
  infoStrip: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 20 },
  emptySub: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 20 },
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
  addBtn: { backgroundColor: theme.primary, borderRadius: 18, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: theme.card, borderRadius: 28, padding: 25 },
  modalTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 25, textAlign: 'center' },
  label: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: theme.background, borderRadius: 15, padding: 16, color: theme.textPrimary, marginBottom: 20, borderWidth: 1, borderColor: theme.border },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalBtn: { flex: 1, height: 55, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});

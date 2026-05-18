import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../data/supabase';

const GoalCard = ({ title, current, target, unit, color, icon, theme }) => {
  const progress = Math.min(100, (current / target) * 100);
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

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', unit: 'kWh' });
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const savedGoals = await AsyncStorage.getItem('user_goals');
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveGoals = async (updatedGoals) => {
    setGoals(updatedGoals);
    await AsyncStorage.setItem('user_goals', JSON.stringify(updatedGoals));
  };

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.target) {
      Alert.alert("Gabim", "Plotësoni të gjitha fushat.");
      return;
    }

    const goal = {
      id: Date.now(),
      title: newGoal.title,
      target: parseFloat(newGoal.target),
      current: 0,
      unit: newGoal.unit,
      color: theme.primary,
      icon: 'star'
    };

    saveGoals([...goals, goal]);
    setModalVisible(false);
    setNewGoal({ title: '', target: '', unit: 'kWh' });
  };

  const generateAiGoal = async () => {
    setAiGenerating(true);
    try {
      const uid = await AsyncStorage.getItem('user_id');
      const { data: bills } = await supabase.from('bills').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);
      
      let lastKwh = 300;
      if (bills && bills.length > 0) lastKwh = bills[0].kwh;

      const suggestedTarget = Math.round(lastKwh * 0.85); // 15% reduction
      
      const aiGoal = {
        id: Date.now(),
        title: `Reduktimi i konsumit (AI Sugjerim)`,
        target: suggestedTarget,
        current: 0,
        unit: 'kWh',
        color: '#8B5CF6',
        icon: 'bulb'
      };

      saveGoals([...goals, aiGoal]);
      Alert.alert("AI Sugjerim", `Bazuar në shpenzimet tuaja, kemi krijuar një objektiv për të reduktuar konsumin në ${suggestedTarget} kWh.`);
    } catch (e) {
      Alert.alert("Gabim", "Dështoi gjenerimi me AI.");
    } finally {
      setAiGenerating(false);
    }
  };

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
            <View>
              <Text style={s.headerTitle}>Objektivat</Text>
              <Text style={s.headerSub}>Sfidoni veten për të kursyer më shumë</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.body}>
          {goals.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="flag-outline" size={80} color={theme.border} />
              <Text style={s.emptyTitle}>Nuk keni asnjë objektiv</Text>
              <Text style={s.emptySub}>Shtoni një objektiv manualisht ose përdorni AI për të gjeneruar një të tillë bazuar në shpenzimet tuaja.</Text>
            </View>
          ) : (
            goals.map(goal => (
              <GoalCard key={goal.id} {...goal} theme={theme} />
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
                <Ionicons name="bulb" size={20} color="#fff" />
                <Text style={s.addBtnText}>Gjenero me AI</Text>
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
              onChangeText={v => setNewGoal({...newGoal, title: v})}
            />

            <Text style={s.label}>Objektivi (Target)</Text>
            <TextInput 
              style={s.input} 
              placeholder="p.sh. 250" 
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={newGoal.target}
              onChangeText={v => setNewGoal({...newGoal, target: v})}
            />

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
  backBtn: { marginBottom: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
  body: { padding: 20 },
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

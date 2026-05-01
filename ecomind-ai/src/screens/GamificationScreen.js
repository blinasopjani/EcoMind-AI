import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const PrizeCard = ({ title, company, points, icon, gradient, theme, userPoints, onRedeem }) => {
  const canAfford = userPoints >= points;
  return (
    <View style={[styles(theme).prizeCard, !canAfford && { opacity: 0.6 }]}>
      <LinearGradient colors={gradient} style={styles(theme).prizeIcon}>
        <Ionicons name={icon} size={28} color="#fff" />
      </LinearGradient>
      <View style={styles(theme).prizeInfo}>
        <Text style={styles(theme).prizeTitle}>{title}</Text>
        <Text style={styles(theme).prizeCompany}>{company}</Text>
      </View>
      <TouchableOpacity 
        style={[styles(theme).pointsBadge, canAfford && { backgroundColor: theme.primary }]}
        onPress={() => canAfford && onRedeem(title, points)}
      >
        <Text style={[styles(theme).pointsText, canAfford && { color: '#fff' }]}>{points} pts</Text>
      </TouchableOpacity>
    </View>
  );
};

const ChallengeCard = ({ id, title, sub, points, time, icon, color, theme, onStart, isCompleted }) => (
  <View style={[styles(theme).challengeCard, isCompleted && { borderColor: theme.success, borderWidth: 1.5 }]}>
    <View style={[styles(theme).challengeIcon, { backgroundColor: isCompleted ? theme.success + '20' : `${color}15` }]}>
      <Ionicons name={isCompleted ? "checkmark" : icon} size={24} color={isCompleted ? theme.success : color} />
    </View>
    <View style={{ flex: 1, marginLeft: 15 }}>
      <Text style={styles(theme).challengeTitle}>{title}</Text>
      <Text style={styles(theme).challengeSub}>{sub}</Text>
      <View style={styles(theme).challengeMeta}>
        <Ionicons name="time-outline" size={12} color={theme.textMuted} />
        <Text style={styles(theme).challengeMetaText}>{time}</Text>
        <Ionicons name="star" size={12} color="#F59E0B" style={{ marginLeft: 10 }} />
        <Text style={styles(theme).challengeMetaText}>+{points} Pikë</Text>
      </View>
    </View>
    <TouchableOpacity 
      disabled={isCompleted}
      onPress={() => onStart(id, points)}
      style={[styles(theme).startBtn, { backgroundColor: isCompleted ? theme.success : color }]}
    >
      <Text style={styles(theme).startBtnText}>{isCompleted ? 'E kryer' : 'Nisja'}</Text>
    </TouchableOpacity>
  </View>
);

export default function GamificationScreen() {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);

  const [activeTab, setActiveTab] = useState('sfidat');
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const savedPoints = await AsyncStorage.getItem('user_points');
      const savedLevel = await AsyncStorage.getItem('user_level');
      const savedChallenges = await AsyncStorage.getItem('completed_challenges');
      
      if (savedPoints) setPoints(parseInt(savedPoints));
      if (savedLevel) setLevel(parseInt(savedLevel));
      if (savedChallenges) setCompletedChallenges(JSON.parse(savedChallenges));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChallenge = async (id, challengePoints) => {
    if (completedChallenges.includes(id)) return;

    Alert.alert(
      "Sfidë e Re",
      `A dëshiron të fillosh këtë sfidë për ${challengePoints} pikë?`,
      [
        { text: "Anulo", style: "cancel" },
        { 
          text: "Fillo", 
          onPress: async () => {
            // Simulojmë përfundimin për këtë demo, ose mund të shtohet timer
            const newPoints = points + challengePoints;
            const newChallenges = [...completedChallenges, id];
            const newLevel = Math.floor(newPoints / 1000) + 1;

            setPoints(newPoints);
            setCompletedChallenges(newChallenges);
            setLevel(newLevel);

            await AsyncStorage.setItem('user_points', newPoints.toString());
            await AsyncStorage.setItem('user_level', newLevel.toString());
            await AsyncStorage.setItem('completed_challenges', JSON.stringify(newChallenges));

            Alert.alert("Urime!", `Fitove ${challengePoints} pikë!`);
          } 
        }
      ]
    );
  };

  const handleRedeem = (title, cost) => {
    Alert.alert(
      "Përdor Pikët",
      `A dëshiron të shkëmbesh ${cost} pikë për "${title}"?`,
      [
        { text: "Jo", style: "cancel" },
        { 
          text: "Po", 
          onPress: async () => {
            const newPoints = points - cost;
            setPoints(newPoints);
            await AsyncStorage.setItem('user_points', newPoints.toString());
            Alert.alert("Sukses!", "Kodi juaj për shpërblimin u dërgua në email.");
          } 
        }
      ]
    );
  };

  const nextLevelXp = level * 1000;
  const currentLevelXp = points % 1000;
  const progress = (currentLevelXp / 1000) * 100;

  if (loading) return <View style={[s.container, {justifyContent:'center'}]}><ActivityIndicator color={theme.primary} /></View>;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Eco Mind Play 🎮</Text>
            <Text style={s.headerSub}>Luaj dhe fito shpërblime reale</Text>
          </View>
          <View style={s.rankBadge}>
            <Text style={s.rankText}>#{(10000 / (points + 1)).toFixed(0)} në Kosovë</Text>
          </View>
        </View>

        <LinearGradient colors={['#7C3AED', '#5B21B6']} style={s.statsCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{points.toLocaleString()}</Text>
              <Text style={s.statLbl}>Pikët Totale</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>Lvl {level}</Text>
              <Text style={s.statLbl}>{level > 5 ? 'Eco Master' : 'Eco Warrior'}</Text>
            </View>
          </View>
          <View style={s.xpBarBg}>
            <View style={[s.xpBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.xpText}>Edhe {1000 - currentLevelXp} pikë për Lvl {level + 1}</Text>
        </LinearGradient>

        <View style={s.tabBar}>
          {['Sfidat', 'Shpërblimet'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab.toLowerCase())}
              style={[s.tabItem, activeTab === tab.toLowerCase() && s.tabActive]}
            >
              <Text style={[s.tabText, activeTab === tab.toLowerCase() && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={s.body}>
        {activeTab === 'sfidat' && (
          <>
            <Text style={s.sectionTitle}>Sfidat Javore</Text>
            <ChallengeCard 
              id="c1"
              title="Shkyçja (Blackout)" 
              sub="Fikni të gjitha pajisjet për 1 orë." 
              points={500} 
              time="1 orë" 
              icon="power" 
              color="#EF4444" 
              theme={theme} 
              onStart={handleStartChallenge}
              isCompleted={completedChallenges.includes('c1')}
            />
            <ChallengeCard 
              id="c2"
              title="Eco Mode Only" 
              sub="Përdorni rrobëlarësen vetëm në Eco." 
              points={200} 
              time="7 ditë" 
              icon="leaf" 
              color="#00C896" 
              theme={theme} 
              onStart={handleStartChallenge}
              isCompleted={completedChallenges.includes('c2')}
            />
            <ChallengeCard 
              id="c3"
              title="Gatimi i Mençur" 
              sub="Mos hapni furrën gjatë pjekjes." 
              points={100} 
              time="Sot" 
              icon="restaurant" 
              color="#F59E0B" 
              theme={theme} 
              onStart={handleStartChallenge}
              isCompleted={completedChallenges.includes('c3')}
            />
          </>
        )}

        {activeTab === 'shpërblimet' && (
          <>
            <Text style={s.sectionTitle}>Shpërblime nga Partnerët</Text>
            <PrizeCard 
              title="Kupon -15% Zbritje" 
              company="NEPTUN" 
              points={1200} 
              icon="cart" 
              gradient={['#00C896', '#00A87A']} 
              theme={theme} 
              userPoints={points}
              onRedeem={handleRedeem}
            />
            <PrizeCard 
              title="Internet 100GB Gratis" 
              company="IPKO" 
              points={800} 
              icon="globe" 
              gradient={['#1A73E8', '#1557B0']} 
              theme={theme} 
              userPoints={points}
              onRedeem={handleRedeem}
            />
            <PrizeCard 
              title="Paketa Sportive - 1 Muaj" 
              company="ARTMOTION" 
              points={1500} 
              icon="tv" 
              gradient={['#EF4444', '#DC2626']} 
              theme={theme} 
              userPoints={points}
              onRedeem={handleRedeem}
            />
          </>
        )}

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
  rankBadge: { backgroundColor: theme.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: theme.primary + '40' },
  rankText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  statsCard: { borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 24, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  xpBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  xpBarFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  xpText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 8, textAlign: 'center' },
  tabBar: { flexDirection: 'row', marginTop: 24, gap: 10 },
  tabItem: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: theme.primary },
  tabText: { color: theme.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  body: { padding: 20 },
  sectionTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  challengeCard: { backgroundColor: theme.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  challengeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  challengeSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 8 },
  challengeMeta: { flexDirection: 'row', alignItems: 'center' },
  challengeMetaText: { color: theme.textMuted, fontSize: 11, marginLeft: 4 },
  startBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  prizeCard: { backgroundColor: theme.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  prizeIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  prizeInfo: { flex: 1, marginLeft: 15 },
  prizeTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  prizeCompany: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  pointsBadge: { backgroundColor: theme.warning + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pointsText: { color: theme.warning, fontSize: 12, fontWeight: '800' },
});

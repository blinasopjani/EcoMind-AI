import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ─── In-App Info Modal (zëvendëson Alert) ──────────────────────────────────
const InfoModal = ({ visible, title, message, actions, onClose, theme }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={infoStyles.overlay}>
      <View style={[infoStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={infoStyles.iconRow}>
          <Ionicons name="information-circle" size={36} color={theme.primary} />
        </View>
        <Text style={[infoStyles.title, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[infoStyles.msg, { color: theme.textSecondary }]}>{message}</Text>
        <View style={infoStyles.btnRow}>
          {actions && actions.length > 0 ? (
            actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  infoStyles.btn,
                  { backgroundColor: a.style === 'cancel' ? theme.border : theme.primary },
                ]}
                onPress={() => { onClose(); a.onPress && a.onPress(); }}
                activeOpacity={0.8}
              >
                <Text style={[infoStyles.btnText, { color: a.style === 'cancel' ? theme.textSecondary : '#fff' }]}>
                  {a.text}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              style={[infoStyles.btn, { backgroundColor: theme.primary, flex: 1 }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[infoStyles.btnText, { color: '#fff' }]}>OK</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  </Modal>
);

const infoStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 30 },
  card: { borderRadius: 24, padding: 24, borderWidth: 1 },
  iconRow: { alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  msg: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
});

// ─── Prize Card ─────────────────────────────────────────────────────────────
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
        {canAfford ? (
          <Text style={{ color: theme.success, fontSize: 10, fontWeight: '800', marginTop: 3 }}>Gati për shkëmbim</Text>
        ) : (
          <Text style={{ color: theme.warning, fontSize: 10, fontWeight: '700', marginTop: 3 }}>Të mungojnë {(points - userPoints).toLocaleString()} pikë</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles(theme).pointsBadge, canAfford && { backgroundColor: theme.primary }]}
        onPress={onRedeem}
        activeOpacity={canAfford ? 0.7 : 1}
      >
        <Text style={[styles(theme).pointsText, canAfford && { color: '#fff' }]}>{points} pts</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Challenge Card ──────────────────────────────────────────────────────────
const ChallengeCard = ({ id, title, sub, desc, points, time, durationMs, icon, color, theme, onStart, onComplete, onInfo, isCompleted, isInProgress, timeLeft }) => (
  <View style={[styles(theme).challengeCard,
    isCompleted && { borderColor: theme.success, borderWidth: 1.5 },
    isInProgress && !isCompleted && { borderColor: color, borderWidth: 1.5 }
  ]}>
    <View style={[styles(theme).challengeIcon, { backgroundColor: isCompleted ? theme.success + '20' : isInProgress ? `${color}25` : `${color}15` }]}>
      <Ionicons name={isCompleted ? 'checkmark' : isInProgress ? 'timer-outline' : icon} size={24} color={isCompleted ? theme.success : color} />
    </View>
    <View style={{ flex: 1, marginLeft: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles(theme).challengeTitle}>{title}</Text>
        {desc && (
          <TouchableOpacity onPress={() => onInfo(title, desc)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={16} color={color} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles(theme).challengeSub}>{sub}</Text>
      <View style={styles(theme).challengeMeta}>
        <Ionicons name="time-outline" size={12} color={theme.textMuted} />
        <Text style={styles(theme).challengeMetaText}>{isInProgress && timeLeft ? timeLeft : time}</Text>
        <Ionicons name="star" size={12} color="#F59E0B" style={{ marginLeft: 10 }} />
        <Text style={styles(theme).challengeMetaText}>+{points} Pikë</Text>
      </View>
      {isInProgress && !isCompleted && (
        <Text style={{ color: color, fontSize: 10, fontWeight: '700', marginTop: 3 }}>NË PROGRES — kthehu dhe shtyp "Mërr pikët"</Text>
      )}
    </View>
    {isCompleted ? (
      <View style={[styles(theme).startBtn, { backgroundColor: theme.success }]}>
        <Text style={styles(theme).startBtnText}>E kryer</Text>
      </View>
    ) : isInProgress ? (
      <TouchableOpacity onPress={() => onComplete(id, points)} style={[styles(theme).startBtn, { backgroundColor: color }]} activeOpacity={0.7}>
        <Text style={styles(theme).startBtnText}>Mërr pikët</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity onPress={() => onStart(id, points, durationMs, title, desc)} style={[styles(theme).startBtn, { backgroundColor: color }]} activeOpacity={0.7}>
        <Text style={styles(theme).startBtnText}>Fillo</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Rewards Catalog ─────────────────────────────────────────────────────────
const REWARDS_CATALOG = [
  { id: 'r1', title: 'Kupon -15% Zbritje', company: 'NEPTUN', points: 1200, icon: 'cart', gradient: ['#00C896', '#00A87A'] },
  { id: 'r2', title: 'Internet 100GB Gratis', company: 'IPKO', points: 800, icon: 'globe', gradient: ['#1A73E8', '#1557B0'] },
  { id: 'r3', title: 'Paketa Sportive 1 Muaj', company: 'ARTMOTION', points: 1500, icon: 'tv', gradient: ['#EF4444', '#DC2626'] },
  { id: 'r4', title: 'Kafe Falas', company: 'Coffee House', points: 200, icon: 'cafe', gradient: ['#92400e', '#78350f'] },
  { id: 'r5', title: 'Zbritje 20% Karburant', company: 'Kosova Petrol', points: 1000, icon: 'car', gradient: ['#0EA5E9', '#0369A1'] },
  { id: 'r6', title: 'Biletë Kinemaje', company: 'Cineplexx', points: 600, icon: 'film', gradient: ['#7C3AED', '#5B21B6'] },
  { id: 'r7', title: 'Kupon Ushqimi 5€', company: 'Viva Fresh', points: 500, icon: 'fast-food', gradient: ['#F59E0B', '#B45309'] },
  { id: 'r8', title: 'Abonim Muzikë 1 Muaj', company: 'Spotify', points: 900, icon: 'musical-notes', gradient: ['#22C55E', '#15803D'] },
];

// ─── Challenges List ──────────────────────────────────────────────────────────
const ALL_CHALLENGES = [
  {
    id: 'c1', title: 'Shkyçja (Blackout)', sub: 'Fikni të gjitha pajisjet për 1 orë.',
    desc: 'Fikni plotësisht kondicionerin, televizorin dhe çdo pajisje tjetër për 1 orë të plotë. Pas kohës, kthehuni dhe merrni pikët tuaja.',
    points: 500, time: '1 orë', durationMs: 3600000, icon: 'power', color: '#EF4444',
  },
  {
    id: 'c2', title: 'Eco Mode Only', sub: 'Rrobëlarësen vetëm në Eco.',
    desc: 'Sot, nëse keni nevojë të lani rrobat, përdorni VETËM programin Eco. Ky program kursen deri 40% energji krahasuar me programin normal.',
    points: 200, time: '7 ditë', durationMs: 604800000, icon: 'leaf', color: '#00C896',
  },
  {
    id: 'c3', title: 'Gatimi i Mençur', sub: 'Mos hapni furrën gjatë pjekjes.',
    desc: 'Çdo herë që hapni furrën gjatë gatimit, humbisni 25°C dhe rritni konsumin. Sot mos e hapni aspak derisa ushqimi të jetë gati.',
    points: 100, time: 'Sot', durationMs: 86400000, icon: 'restaurant', color: '#F59E0B',
  },
  {
    id: 'c4', title: 'Nata e Errësirës', sub: 'Fikni dritat 2 orë para gjumit.',
    desc: 'Dy orë para se të flini, fikni të gjitha dritat dhe kaloni vetëm me dritën e natës ose qirinjtë. Kursen energji dhe përmirëson gjumin.',
    points: 150, time: '2 orë', durationMs: 7200000, icon: 'moon', color: '#6366F1',
  },
  {
    id: 'c5', title: 'Dushi i Shpejtë', sub: 'Bëni dush nën 5 minuta.',
    desc: 'Uji i ngrohtë konsumon shumë energji. Provoni të mbyllni dushin brenda 5 minutash — kurseni rreth 20 litra ujë dhe energji për ngrohje.',
    points: 80, time: '5 min', durationMs: 300000, icon: 'water', color: '#0EA5E9',
  },
  {
    id: 'c6', title: 'Çkyç Karikuesit', sub: 'Hiqni nga priza karikuesit e papërdorur.',
    desc: 'Karikuesit e lënë në prizë vazhdojnë të konsumojnë rrymë edhe kur s\'po karikojnë asgjë ("vampire energy"). Sot, hiqni të gjithë karikuesit e papërdorur.',
    points: 60, time: 'Sot', durationMs: 86400000, icon: 'battery-charging', color: '#10B981',
  },
  {
    id: 'c7', title: 'Ora e Tokës (Personal)', sub: '30 minuta pa pajisje elektronike.',
    desc: 'Fikni televizorin, laptopin dhe telefonin për 30 minuta. Lexoni një libër, bisedoni me familjen ose bëni shëtitje. Kurse energji dhe çlodhuni.',
    points: 120, time: '30 min', durationMs: 1800000, icon: 'earth', color: '#8B5CF6',
  },
  {
    id: 'c8', title: 'Kondicioneri në 24°C', sub: 'Mos zbrisni nën 24°C sot.',
    desc: 'Çdo gradë nën 24°C rrit konsumin e kondicionerit me ~8%. Mbani kondicionerin mbi 24°C gjatë gjithë ditës dhe kurseni deri 30% të konsumit të tij.',
    points: 250, time: '24 orë', durationMs: 86400000, icon: 'thermometer', color: '#F97316',
  },
  {
    id: 'c9', title: 'Dita Diellore', sub: 'Asnjë pajisje ndriçimi gjatë ditës.',
    desc: 'Shfrytëzoni dritën natyrale të diellit gjatë gjithë ditës. Mos ndizni asnjë llambë deri në perëndim të diellit. Kurseni deri 1 kWh/ditë.',
    points: 180, time: '1 ditë', durationMs: 43200000, icon: 'sunny', color: '#EAB308',
  },
  {
    id: 'c_test', title: 'Sfida Provuese 10 Sekondash', sub: 'Provo sistemin e sfidave!',
    desc: 'Kjo sfidë është vetëm për testim. Prit 10 sekonda, kthehu dhe shtyp "Mërr pikët" për të fituar 50 pikë falas.',
    points: 50, time: '10 sekonda', durationMs: 10000, icon: 'flash', color: '#8B5CF6',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GamificationScreen() {
  const { theme, isDarkMode } = useTheme();
  const s = styles(theme);
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState('sfidat');
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [inProgressChallenges, setInProgressChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [userId, setUserId] = useState(null);
  const [rewards, setRewards] = useState(REWARDS_CATALOG.slice(0, 4));
  const [rewardCursor, setRewardCursor] = useState(4);

  // In-app modal state (zëvendëson Alert)
  const [modal, setModal] = useState({ visible: false, title: '', message: '', actions: null });

  const showModal = (title, message, actions = null) => {
    setModal({ visible: true, title, message, actions });
  };
  const closeModal = () => setModal(m => ({ ...m, visible: false }));

  // Tick every 10s so timeLeft labels refresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { loadStats(); }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { loadStats(); });
    return unsubscribe;
  }, [navigation]);

  const getKeys = (uid) => ({
    points: `${uid}_points`,
    level: `${uid}_level`,
    completed: `${uid}_completed_challenges`,
    inProgress: `${uid}_in_progress_challenges`,
  });

  const loadStats = async () => {
    try {
      const uid = await AsyncStorage.getItem('user_id');
      setUserId(uid);
      if (!uid) { setLoading(false); return; }
      const keys = getKeys(uid);
      const [savedPoints, savedLevel, savedChallenges, savedInProgress] = await Promise.all([
        AsyncStorage.getItem(keys.points),
        AsyncStorage.getItem(keys.level),
        AsyncStorage.getItem(keys.completed),
        AsyncStorage.getItem(keys.inProgress),
      ]);
      if (savedPoints) setPoints(parseInt(savedPoints));
      if (savedLevel) setLevel(parseInt(savedLevel));
      if (savedChallenges) setCompletedChallenges(JSON.parse(savedChallenges));
      if (savedInProgress) setInProgressChallenges(JSON.parse(savedInProgress));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleStartChallenge = (id, challengePoints, durationMs, title, desc) => {
    if (!userId) return;
    if (completedChallenges.includes(id)) return;
    if (inProgressChallenges.find(c => c.id === id)) return;

    showModal(
      title || 'Sfidë e Re',
      (desc ? `${desc}\n\n` : '') + `Pas përfundimit të kohës do të fitoni +${challengePoints} pikë!`,
      [
        { text: 'Anulo', style: 'cancel' },
        {
          text: 'Fillo Sfidën',
          onPress: async () => {
            const deadline = new Date(Date.now() + (durationMs || 60000)).toISOString();
            const updated = [...inProgressChallenges, { id, deadline, points: challengePoints }];
            setInProgressChallenges(updated);
            const keys = getKeys(userId);
            await AsyncStorage.setItem(keys.inProgress, JSON.stringify(updated));
            showModal('Sfida filloi!', 'Kur të përfundojë koha, kthehu dhe shtyp "Mërr pikët"!');
          },
        },
      ]
    );
  };

  const handleCompleteChallenge = async (id, challengePoints) => {
    if (!userId) return;
    const entry = inProgressChallenges.find(c => c.id === id);
    if (!entry) return;

    const newPoints = points + challengePoints;
    const newChallenges = [...completedChallenges, id];
    const newLevel = Math.floor(newPoints / 1000) + 1;
    const updatedInProgress = inProgressChallenges.filter(c => c.id !== id);

    setPoints(newPoints);
    setCompletedChallenges(newChallenges);
    setLevel(newLevel);
    setInProgressChallenges(updatedInProgress);

    const keys = getKeys(userId);
    await AsyncStorage.setItem(keys.points, newPoints.toString());
    await AsyncStorage.setItem(keys.level, newLevel.toString());
    await AsyncStorage.setItem(keys.completed, JSON.stringify(newChallenges));
    await AsyncStorage.setItem(keys.inProgress, JSON.stringify(updatedInProgress));

    showModal('Urime!', `Fituat +${challengePoints} pikë!\nTotali: ${newPoints} pikë.`);
  };

  const handleChallengeInfo = (title, desc) => {
    showModal(title, desc);
  };

  const getTimeLeft = (deadline) => {
    const ms = new Date(deadline).getTime() - now;
    if (ms <= 0) return 'Gati — mërr pikët!';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m mbetur`;
    if (m > 0) return `${m}m mbetur`;
    return `${sec}s mbetur`;
  };

  const handleRedeem = (reward) => {
    const { title, points: cost } = reward;
    if (points < cost) {
      showModal('Pikë të Pamjaftueshme', `Keni ${points} pikë. Ju nevojiten ${cost} pikë për "${title}".`);
      return;
    }
    showModal(
      'Shkëmbe Shpërblimin',
      `A dëshiron të shkëmbesh ${cost} pikë për "${title}"?`,
      [
        { text: 'Jo', style: 'cancel' },
        {
          text: 'Po, shkëmbe',
          onPress: async () => {
            const newPoints = points - cost;
            const code = 'ECO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
            setPoints(newPoints);
            if (userId) {
              const keys = getKeys(userId);
              await AsyncStorage.setItem(keys.points, newPoints.toString());
            }
            const redeemed = JSON.parse((await AsyncStorage.getItem('redeemed_rewards')) || '[]');
            redeemed.push({ title, code, at: new Date().toISOString() });
            await AsyncStorage.setItem('redeemed_rewards', JSON.stringify(redeemed));

            const nextIdx = rewardCursor % REWARDS_CATALOG.length;
            const replacement = { ...REWARDS_CATALOG[nextIdx], id: `${REWARDS_CATALOG[nextIdx].id}_${Date.now()}` };
            setRewards(prev => prev.map(r => r.id === reward.id ? replacement : r));
            setRewardCursor(c => c + 1);

            showModal('Kodi juaj', `${code}\n\nRuajeni këtë kod për "${title}". U shtua një shpërblim i ri!`);
          },
        },
      ]
    );
  };

  const nextLevelXp = level * 1000;
  const currentLevelXp = points % 1000;
  const progress = (currentLevelXp / 1000) * 100;

  if (loading) return <View style={[s.container, { justifyContent: 'center' }]}><ActivityIndicator color={theme.primary} /></View>;

  // Split challenges into weekly & test sections
  const weeklyChallenges = ALL_CHALLENGES.filter(c => c.id !== 'c_test');
  const testChallenge = ALL_CHALLENGES.find(c => c.id === 'c_test');

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* In-App Modal (replaces all Alert/showAlert calls) */}
      <InfoModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        actions={modal.actions}
        onClose={closeModal}
        theme={theme}
      />

      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isDarkMode ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.headerTitle}>Eco Mind Play</Text>
              <Text style={s.headerSub}>Luaj, kurse energji dhe fito pikë</Text>
            </View>
            <View style={s.rankBadge}>
              <Text style={s.rankText}>{points >= 5000 ? 'Eco Master' : points >= 1000 ? 'Eco Warrior' : 'Fillestar'}</Text>
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
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statVal}>{completedChallenges.length}</Text>
                <Text style={s.statLbl}>Të Kryera</Text>
              </View>
            </View>
            <View style={s.xpBarBg}>
              <View style={[s.xpBarFill, { width: `${Math.min(100, progress)}%` }]} />
            </View>
            <Text style={s.xpText}>Edhe {1000 - currentLevelXp} pikë për Lvl {level + 1}</Text>
          </LinearGradient>

          <View style={s.tabBar}>
            {['Sfidat', 'Shpërblimet'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab.toLowerCase())}
                style={[s.tabItem, activeTab === tab.toLowerCase() && s.tabActive]}
                activeOpacity={0.7}
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
              {weeklyChallenges.map(ch => (
                <ChallengeCard
                  key={ch.id}
                  {...ch}
                  theme={theme}
                  onStart={handleStartChallenge}
                  onComplete={handleCompleteChallenge}
                  onInfo={handleChallengeInfo}
                  isCompleted={completedChallenges.includes(ch.id)}
                  isInProgress={!!inProgressChallenges.find(c => c.id === ch.id)}
                  timeLeft={inProgressChallenges.find(c => c.id === ch.id) ? getTimeLeft(inProgressChallenges.find(c => c.id === ch.id).deadline) : null}
                />
              ))}

              {testChallenge && (
                <>
                  <Text style={[s.sectionTitle, { marginTop: 20 }]}>Sfida Provuese</Text>
                  <ChallengeCard
                    {...testChallenge}
                    theme={theme}
                    onStart={handleStartChallenge}
                    onComplete={handleCompleteChallenge}
                    onInfo={handleChallengeInfo}
                    isCompleted={completedChallenges.includes(testChallenge.id)}
                    isInProgress={!!inProgressChallenges.find(c => c.id === testChallenge.id)}
                    timeLeft={inProgressChallenges.find(c => c.id === testChallenge.id) ? getTimeLeft(inProgressChallenges.find(c => c.id === testChallenge.id).deadline) : null}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'shpërblimet' && (
            <>
              <Text style={s.sectionTitle}>Shpërblimet nga Partnerët</Text>
              {rewards.map(r => (
                <PrizeCard
                  key={r.id}
                  {...r}
                  theme={theme}
                  userPoints={points}
                  onRedeem={() => handleRedeem(r)}
                />
              ))}
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
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
  statVal: { color: '#fff', fontSize: 22, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4, textAlign: 'center' },
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
  startBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  prizeCard: { backgroundColor: theme.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  prizeIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  prizeInfo: { flex: 1, marginLeft: 15 },
  prizeTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  prizeCompany: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  pointsBadge: { backgroundColor: theme.warning + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pointsText: { color: theme.warning, fontSize: 12, fontWeight: '800' },
});

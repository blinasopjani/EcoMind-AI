import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DevicesScreen from '../screens/DevicesScreen';
import BillScanScreen from '../screens/BillScanScreen';
import AIInsightsScreen from '../screens/AIInsightsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SimulatorScreen from '../screens/SimulatorScreen';
import GamificationScreen from '../screens/GamificationScreen';
import GoalsScreen from '../screens/GoalsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import CustomTabBar from './TabBar';
import { useTheme } from '../theme/ThemeContext';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMain" component={MoreScreen} />
      <Stack.Screen name="Simulator" component={SimulatorScreen} />
      <Stack.Screen name="Gamification" component={GamificationScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function MoreScreen({ navigation }) {

  const { theme } = useTheme();
  const s = styles(theme);

  const menuItems = [
    { label: 'Simuluesi', sub: 'Shih sa kursen para kohe', icon: 'calculator', screen: 'Simulator', gradient: ['#7C3AED','#5B21B6'] },
    { label: 'Gamification', sub: 'Badges, sfidat & leaderboard', icon: 'game-controller', screen: 'Gamification', gradient: ['#F59E0B','#D97706'] },
    { label: 'Objektivat', sub: 'Cakto dhe arritë qëllimet', icon: 'flag', screen: 'Goals', gradient: ['#00C896','#00A87A'] },
    { label: 'Njoftimet', sub: 'Shqyrto të gjitha njoftimet', icon: 'notifications', screen: 'Notifications', gradient: ['#1A73E8','#1557B0'] },
    { label: 'Profili & Cilësimet', sub: 'Ndrysho preferencat tuaja', icon: 'settings', screen: 'Settings', gradient: ['#EF4444','#DC2626'] },
  ];

  const handlePress = (item) => {
    navigation.navigate(item.screen);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={theme.background === '#0A0F1E' ? ['#0A0F1E', '#111827'] : ['#F8FAFC', '#F1F5F9']} style={s.header}>

        <Text style={s.headerTitle}>Të Tjera</Text>
        <Text style={s.headerSub}>Shfleto të gjitha funksionet</Text>
      </LinearGradient>

      <View style={s.body}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => handlePress(item)} style={s.menuCard} activeOpacity={0.85}>
            <LinearGradient colors={item.gradient} style={s.menuIcon}>
              <Ionicons name={item.icon} size={24} color="#fff" />
            </LinearGradient>
            <View style={s.menuInfo}>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
    </View>

  );
}


const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { color: theme.textPrimary, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.textSecondary, fontSize: 14 },
  body: { padding: 20 },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  menuIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1, marginLeft: 15 },
  menuLabel: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  menuSub: { color: theme.textSecondary, fontSize: 12, marginTop: 3 },
});

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Bills" component={BillScanScreen} />
      <Tab.Screen name="AI" component={AIInsightsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

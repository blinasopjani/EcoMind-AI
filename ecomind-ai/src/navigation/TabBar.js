import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

export default function CustomTabBar({ state, descriptors, navigation }) {
  const { theme } = useTheme();
  const s = styles(theme);

  return (
    <View style={s.tabBarContainer}>
      <View style={s.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const getIcon = (name) => {
            switch (name) {
              case 'Dashboard': return 'home';
              case 'Devices': return 'flash';
              case 'Bills': return 'scan';
              case 'AI': return 'sparkles';
              case 'Analytics': return 'stats-chart';
              case 'More': return 'grid';
              default: return 'help-circle';
            }
          };

          const getLabel = (name) => {
            switch (name) {
              case 'Dashboard': return 'Fillimi';
              case 'Devices': return 'Pajisjet';
              case 'Bills': return 'Skano';
              case 'AI': return 'AI';
              case 'Analytics': return 'Analiza';
              case 'More': return 'Më shumë';
              default: return name;
            }
          };

          if (route.name === 'Bills') {
            return (
              <TouchableOpacity key={index} onPress={onPress} style={s.tabItem} activeOpacity={0.7}>
                <View style={s.specialIconWrapper}>
                  <LinearGradient 
                    colors={[theme.primary, theme.secondary || '#00A87A']} 
                    style={s.specialCircle}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="scan" size={24} color="#fff" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={index} onPress={onPress} style={s.tabItem} activeOpacity={0.7}>
              <Ionicons 
                name={isFocused ? getIcon(route.name) : `${getIcon(route.name)}-outline`} 
                size={22} 
                color={isFocused ? theme.primary : theme.textMuted} 
              />
              <Text style={[s.tabLabel, { color: isFocused ? theme.primary : theme.textMuted }]}>
                {getLabel(route.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  tabBarContainer: { 
    position: 'absolute', 
    bottom: 20, 
    left: 20, 
    right: 20,
  },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: theme.card, 
    height: 70, 
    borderRadius: 25, 
    alignItems: 'center', 
    justifyContent: 'space-around', 
    paddingHorizontal: 10, 
    borderWidth: 1, 
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' },
  tabLabel: { fontSize: 9, marginTop: 4, fontWeight: '700' },
  specialIconWrapper: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialCircle: {
    width: 48,
    height: 48,
    borderRadius: 18, // Pakëz i zbutur
    alignItems: 'center', 
    justifyContent: 'center',
  }
});

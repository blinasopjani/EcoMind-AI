import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme/ThemeContext';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';

export default function App() {
  const isWeb = Platform.OS === 'web';
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        // Përdorim emrat/asetet standarde të @expo/vector-icons për të gjitha
        // platformat. Bundler-i i zgjidh vetë rrugët e fontave (pa rrugë të ngurta),
        // dhe emrat e familjeve janë të saktë si për web ashtu edhe për native.
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialCommunityIcons.font,
          ...FontAwesome.font,
        });
      } catch (e) {
        console.warn('Font loading error:', e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) return null;

  const content = (
    <View style={styles.appContainer}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </ThemeProvider>
    </View>
  );

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        <View style={styles.responsiveWrapper}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    width: '100%',
  },
  webContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0F1E',
    alignItems: 'center',
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 500,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
});

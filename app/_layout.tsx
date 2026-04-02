import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAppStore } from '@/src/stores/useAppStore';
import { ThemeProvider, useTheme } from '@/src/config/ThemeContext';

SplashScreen.preventAutoHideAsync();

function RootNav() {
  const { colors } = useTheme();

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="downloads"
        options={{
          title: 'Slovníky',
          headerBackTitle: 'Nastavení',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          presentation: 'modal',
          title: 'SlovníQ PRO',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const initializeApp = useAppStore((s) => s.initializeApp);

  useEffect(() => {
    async function init() {
      try {
        await initializeApp();
      } catch {
        // App musí fungovat i když inicializace selže
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, [initializeApp]);

  return (
    <ThemeProvider>
      <RootNav />
    </ThemeProvider>
  );
}

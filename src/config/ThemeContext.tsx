import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from './theme';
import { useAppStore } from '@/src/stores/useAppStore';

const ThemeContext = createContext<{ colors: ThemeColors; isDark: boolean }>({
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useAppStore((s) => s.themeMode);
  const systemScheme = useColorScheme();

  const { colors, isDark } = useMemo(() => {
    let dark = false;
    if (themeMode === 'dark') dark = true;
    else if (themeMode === 'system') dark = systemScheme === 'dark';
    return { colors: dark ? darkColors : lightColors, isDark: dark };
  }, [themeMode, systemScheme]);

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

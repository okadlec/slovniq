export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  error: string;
  warning: string;
}

export const lightColors: ThemeColors = {
  primary: '#4A6CF7',
  primaryDark: '#3B4FBF',
  primaryLight: '#EEF1FF',
  accent: '#F97316',
  background: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F9',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
};

export const darkColors: ThemeColors = {
  primary: '#6B8AFF',
  primaryDark: '#4A6CF7',
  primaryLight: '#1E2A4A',
  accent: '#FB923C',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#273548',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  success: '#4ADE80',
  error: '#F87171',
  warning: '#FBBF24',
};

// Zpětná kompatibilita — defaultní export pro světlý režim
export const colors = lightColors;

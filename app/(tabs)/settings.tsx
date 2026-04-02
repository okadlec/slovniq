import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from '@/src/stores/useAppStore';
import { useTheme } from '@/src/config/ThemeContext';
import { ThemeMode } from '@/src/config/theme';

function SettingRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {description && <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Světlý' },
  { mode: 'dark', label: 'Tmavý' },
  { mode: 'system', label: 'Systém' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const proStatus = useAppStore((s) => s.proStatus);
  const showDescriptions = useAppStore((s) => s.showDescriptions);
  const showPartOfSpeech = useAppStore((s) => s.showPartOfSpeech);
  const showPronunciation = useAppStore((s) => s.showPronunciation);
  const themeMode = useAppStore((s) => s.themeMode);
  const setShowDescriptions = useAppStore((s) => s.setShowDescriptions);
  const setShowPartOfSpeech = useAppStore((s) => s.setShowPartOfSpeech);
  const setShowPronunciation = useAppStore((s) => s.setShowPronunciation);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {proStatus === 'free' && (
        <TouchableOpacity
          style={[styles.proCard, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/paywall' as any)}
        >
          <View style={styles.proCardContent}>
            <Ionicons name="diamond" size={24} color="#FFD600" />
            <View style={styles.proCardText}>
              <Text style={styles.proCardTitle}>SlovníQ PRO</Text>
              <Text style={styles.proCardDesc}>Všechny slovníky bez reklam</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: proStatus === 'pro' ? 24 : 0 }]}>
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/downloads' as any)}
        >
          <Ionicons name="library" size={20} color={colors.primary} />
          <Text style={[styles.rowLabel, { color: colors.text, flex: 1, marginLeft: 12 }]}>Slovníky</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Zobrazení</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingRow
          label="Popisy slov"
          description="Zobrazit podrobný popis a poznámky u překladu"
          value={showDescriptions}
          onValueChange={setShowDescriptions}
        />
        <SettingRow
          label="Slovní druh"
          description="Zobrazit typ slova (podstatné jm., sloveso, ...)"
          value={showPartOfSpeech}
          onValueChange={setShowPartOfSpeech}
        />
        <SettingRow
          label="Výslovnost"
          description="Zobrazit fonetický přepis (IPA)"
          value={showPronunciation}
          onValueChange={setShowPronunciation}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Vzhled</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.mode}
              style={[
                styles.themeOption,
                { borderColor: colors.border },
                themeMode === opt.mode && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ]}
              onPress={() => setThemeMode(opt.mode)}
            >
              <Text style={[
                styles.themeLabel,
                { color: colors.text },
                themeMode === opt.mode && { color: colors.primary, fontWeight: '700' },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>O aplikaci</Text>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Verze</Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 16,
  },
  themeRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  proCard: {
    marginHorizontal: 12,
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
  },
  proCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proCardText: {
    flex: 1,
  },
  proCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  proCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});

import React from 'react';
import { View, FlatList, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from '@/src/stores/useAppStore';
import { LANGUAGE_PAIRS } from '@/src/config/languages';
import { LanguageRow } from '@/src/components/LanguageRow';
import { useTheme } from '@/src/config/ThemeContext';

export default function DownloadsScreen() {
  const downloadStates = useAppStore((s) => s.downloadStates);
  const proStatus = useAppStore((s) => s.proStatus);
  const downloadDictionary = useAppStore((s) => s.downloadDictionary);
  const deleteDictionary = useAppStore((s) => s.deleteDictionary);
  const { colors } = useTheme();
  const router = useRouter();

  const downloadedCount = Object.values(downloadStates).filter(
    (d) => d.status === 'downloaded'
  ).length;

  const handleDownload = async (code: string) => {
    try {
      await downloadDictionary(code);
    } catch (error: any) {
      if (error.message === 'FREE_LIMIT_REACHED') {
        router.push('/paywall');
      } else {
        Alert.alert(
          'Chyba',
          'Nepodařilo se stáhnout slovník. Zkontrolujte připojení k internetu.'
        );
      }
    }
  };

  const handleDelete = (code: string) => {
    const lp = LANGUAGE_PAIRS.find((l) => l.code === code);
    Alert.alert(
      'Smazat slovník',
      `Opravdu chcete smazat slovník ${lp?.nameCs}?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: () => deleteDictionary(code),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {proStatus === 'free' && (
        <View style={[styles.banner, { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
            Zdarma: {downloadedCount}/1 slovník stažen
          </Text>
        </View>
      )}
      <FlatList
        data={[...LANGUAGE_PAIRS].sort((a, b) => {
          const aDown = downloadStates[a.code]?.status === 'downloaded' ? 0 : 1;
          const bDown = downloadStates[b.code]?.status === 'downloaded' ? 0 : 1;
          return aDown - bDown;
        })}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <LanguageRow
            language={item}
            downloadState={
              downloadStates[item.code] ?? {
                code: item.code,
                status: 'not_downloaded',
              }
            }
            isPro={proStatus === 'pro'}
            onDownload={() => handleDownload(item.code)}
            onDelete={() => handleDelete(item.code)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderBottomWidth: 1,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
  },
});

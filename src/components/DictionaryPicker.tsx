import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppStore } from '@/src/stores/useAppStore';
import { LANGUAGE_PAIRS } from '@/src/config/languages';

export const DictionaryPicker: React.FC = () => {
  const activeDictCode = useAppStore((s) => s.activeDictCode);
  const downloadStates = useAppStore((s) => s.downloadStates);
  const setActiveDictCode = useAppStore((s) => s.setActiveDictCode);

  const downloadedPairs = LANGUAGE_PAIRS.filter(
    (lp) => downloadStates[lp.code]?.status === 'downloaded'
  );

  if (downloadedPairs.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {downloadedPairs.map((lp) => {
        const isActive = lp.code === activeDictCode;
        return (
          <TouchableOpacity
            key={lp.code}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => setActiveDictCode(lp.code)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {lp.flag} {lp.nameCs}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 52,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#1e88e5',
  },
  chipText: {
    fontSize: 14,
    color: '#424242',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

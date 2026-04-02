import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/src/stores/useAppStore';
import { LANGUAGE_PAIRS } from '@/src/config/languages';
import { WordCard } from '@/src/components/WordCard';
import { useTheme } from '@/src/config/ThemeContext';

export default function SearchScreen() {
  const activeDictCode = useAppStore((s) => s.activeDictCode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const searchResults = useAppStore((s) => s.searchResults);
  const searchDirection = useAppStore((s) => s.searchDirection);
  const displaySwapped = useAppStore((s) => s.displaySwapped);
  const downloadStates = useAppStore((s) => s.downloadStates);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setSearchDirection = useAppStore((s) => s.setSearchDirection);
  const performSearch = useAppStore((s) => s.performSearch);
  const setActiveDictCode = useAppStore((s) => s.setActiveDictCode);
  const loadMoreResults = useAppStore((s) => s.loadMoreResults);

  const { colors } = useTheme();
  const router = useRouter();
  const [pickerVisible, setPickerVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Při prvním načtení s aktivním slovníkem načíst slova
  useEffect(() => {
    if (activeDictCode && searchResults.length === 0 && searchQuery === '') {
      performSearch('');
    }
  }, [activeDictCode]);

  const handleQueryChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        performSearch(text);
      }, 250);
    },
    [setSearchQuery, performSearch]
  );

  const handleToggleDirection = () => {
    const newDir = searchDirection === 'source' ? 'target' : 'source';
    setSearchDirection(newDir);
  };

  const downloadedPairs = LANGUAGE_PAIRS.filter(
    (lp) => downloadStates[lp.code]?.status === 'downloaded'
  );

  const activeLang = LANGUAGE_PAIRS.find((lp) => lp.code === activeDictCode);

  const placeholderText = searchDirection === 'source'
    ? 'Hledat české slovo...'
    : `Hledat ${activeLang?.adjectiveCs ?? 'cizojazyčné'} slovo...`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primary }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header: jazyk + směr */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerRow}>
            {/* Výběr jazyka */}
            <TouchableOpacity
              style={styles.langSelector}
              onPress={() => downloadedPairs.length > 0 && setPickerVisible(true)}
            >
              {activeLang ? (
                <>
                  <Text style={styles.langFlag}>{activeLang.flag}</Text>
                  <Text style={styles.langName}>{activeLang.nameCs}</Text>
                </>
              ) : (
                <Text style={styles.langName}>Vyberte slovník</Text>
              )}
              {downloadedPairs.length > 1 && (
                <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" />
              )}
            </TouchableOpacity>

            {/* Přepínač směru */}
            {activeDictCode && (
              <TouchableOpacity
                style={styles.directionBtn}
                onPress={handleToggleDirection}
              >
                <Text style={styles.directionLabel}>
                  {searchDirection === 'source' ? '🇨🇿' : activeLang?.flag}
                </Text>
                <Ionicons name="swap-horizontal" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.directionLabel}>
                  {searchDirection === 'source' ? activeLang?.flag : '🇨🇿'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Vyhledávací pole */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={placeholderText}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Výsledky */}
        {!activeDictCode ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Žádný slovník</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Stáhněte si slovník pro začátek
            </Text>
            <TouchableOpacity
              style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/downloads' as any)}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              <Text style={styles.downloadBtnText}>Stáhnout slovník</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <WordCard entry={item} swapped={displaySwapped} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              searchQuery.length > 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Žádné výsledky</Text>
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
            onEndReached={loadMoreResults}
            onEndReachedThreshold={0.5}
          />
        )}

        {/* Language picker modal */}
        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setPickerVisible(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Vyberte slovník</Text>
              {downloadedPairs.map((lp) => (
                <TouchableOpacity
                  key={lp.code}
                  style={[
                    styles.modalOption,
                    lp.code === activeDictCode && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    setActiveDictCode(lp.code);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.modalFlag}>{lp.flag}</Text>
                  <Text style={[
                    styles.modalLangName, { color: colors.text },
                    lp.code === activeDictCode && { fontWeight: '600', color: colors.primary },
                  ]}>
                    {lp.nameCs}
                  </Text>
                  {lp.code === activeDictCode && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langFlag: {
    fontSize: 22,
  },
  langName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  directionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  modalFlag: {
    fontSize: 24,
  },
  modalLangName: {
    flex: 1,
    fontSize: 16,
  },
});

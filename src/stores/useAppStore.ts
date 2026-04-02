import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WordEntry, DownloadState, ProStatus } from '@/src/types';
import { ThemeMode } from '@/src/config/theme';
import { LANGUAGE_PAIRS, FREE_DOWNLOAD_LIMIT } from '@/src/config/languages';
import * as DatabaseManager from '@/src/services/DatabaseManager';
import * as IAPManager from '@/src/services/IAPManager';

interface AppState {
  // Stav slovníku
  activeDictCode: string | null;
  downloadStates: Record<string, DownloadState>;

  // Stav vyhledávání
  searchQuery: string;
  searchResults: WordEntry[];
  isSearching: boolean;
  searchDirection: 'source' | 'target';
  /** true když hledáme v target_words ces-xxx DB (swap headword/translation) */
  displaySwapped: boolean;
  /** true když headword v datech je české slovo (ces-xxx DB) */
  sourceIsCzech: boolean;

  // Nastavení zobrazení
  showDescriptions: boolean;
  showPartOfSpeech: boolean;
  showPronunciation: boolean;
  themeMode: ThemeMode;

  // Stav monetizace
  proStatus: ProStatus;

  // Pomocné funkce
  downloadedCount: () => number;
  canDownloadFree: () => boolean;
  isDownloaded: (code: string) => boolean;

  // Akce
  setActiveDictCode: (code: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchDirection: (dir: 'source' | 'target') => void;
  performSearch: (query: string) => Promise<void>;
  loadMoreResults: () => Promise<void>;
  hasMoreResults: boolean;
  clearSearch: () => void;

  downloadDictionary: (code: string) => Promise<void>;
  deleteDictionary: (code: string) => Promise<void>;

  initializeProStatus: () => Promise<void>;
  purchasePro: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;

  setShowDescriptions: (val: boolean) => void;
  setShowPartOfSpeech: (val: boolean) => void;
  setShowPronunciation: (val: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;

  toggleDevPro: () => void;
  initializeApp: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeDictCode: null,
      downloadStates: {},
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      searchDirection: 'source' as 'source' | 'target',
      displaySwapped: false,
      sourceIsCzech: true,
      showDescriptions: false,
      showPartOfSpeech: true,
      showPronunciation: false,
      themeMode: 'system' as ThemeMode,
      hasMoreResults: false,
      proStatus: 'free' as ProStatus,

      downloadedCount: () => {
        return Object.values(get().downloadStates).filter(
          (d) => d.status === 'downloaded'
        ).length;
      },

      canDownloadFree: () => {
        return (
          get().proStatus === 'pro' ||
          get().downloadedCount() < FREE_DOWNLOAD_LIMIT
        );
      },

      isDownloaded: (code: string) => {
        return get().downloadStates[code]?.status === 'downloaded';
      },

      setActiveDictCode: (code: string) => {
        set({ activeDictCode: code, searchResults: [] });
        setTimeout(() => get().performSearch(get().searchQuery), 0);
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      setSearchDirection: (dir: 'source' | 'target') => {
        set({ searchDirection: dir, searchResults: [] });
        setTimeout(() => get().performSearch(get().searchQuery), 0);
      },

      performSearch: async (query: string) => {
        const { activeDictCode, searchDirection } = get();
        if (!activeDictCode) {
          set({ searchResults: [], isSearching: false });
          return;
        }

        // Najít správnou databázi podle jazyka a směru
        const langPair = LANGUAGE_PAIRS.find((lp) => lp.code === activeDictCode);
        if (!langPair) {
          set({ searchResults: [], isSearching: false });
          return;
        }

        // Preferovat dedikovanou DB pro daný směr, fallback na druhou
        let dbCode: string | undefined;
        let effectiveDirection: 'source' | 'target' = searchDirection;
        let swapped = false; // true = hledáme v target_words, headword/translation swap

        if (searchDirection === 'source') {
          dbCode = langPair.sourceDb?.dbCode;
          if (!dbCode && langPair.targetDb) {
            dbCode = langPair.targetDb.dbCode;
            effectiveDirection = 'target';
            swapped = true;
          }
        } else {
          if (langPair.targetDb) {
            // Dedikovaná xxx-ces DB: source_word = cizí slovo, žádný swap
            dbCode = langPair.targetDb.dbCode;
            effectiveDirection = 'source';
            swapped = false;
          } else if (langPair.sourceDb) {
            // Fallback: ces-xxx DB, hledáme v target_words, swap potřeba
            dbCode = langPair.sourceDb.dbCode;
            effectiveDirection = 'target';
            swapped = true;
          }
        }

        if (!dbCode) {
          set({ searchResults: [], isSearching: false });
          return;
        }

        // sourceIsCzech: ces-xxx DB má české source_word, xxx-ces má cizí
        const isCzechSource = dbCode.startsWith('ces-');
        set({ isSearching: true, searchQuery: query, displaySwapped: swapped, sourceIsCzech: isCzechSource });
        try {
          let results = await DatabaseManager.searchWords(
            dbCode,
            query,
            effectiveDirection
          );

          // Sloučit duplicity při target search (ces-xxx DB)
          // Mnoho CZ slov může mít stejný cizí překlad → sloučit do jedné karty
          if (effectiveDirection === 'target' && query.trim()) {
            const groups = new Map<string, WordEntry>();
            for (const entry of results) {
              const lines = entry.translation.split('\n').filter(l => l.length > 0);
              const foreignLine = lines.length > 1
                ? lines[1].replace(/^\d+\.\s*/, '').replace(/\s+\d+\.\s*$/, '').split(',')[0].trim().toLowerCase()
                : '';
              const key = foreignLine || entry.source_word;

              if (groups.has(key)) {
                const existing = groups.get(key)!;
                existing.translation += '\n' + entry.source_word;
              } else {
                groups.set(key, { ...entry });
              }
            }
            results = Array.from(groups.values());
          }

          if (get().searchQuery === query) {
            set({
              searchResults: results,
              isSearching: false,
              hasMoreResults: !query.trim() && results.length >= 100,
            });
          }
        } catch {
          set({ searchResults: [], isSearching: false, hasMoreResults: false });
        }
      },

      loadMoreResults: async () => {
        const { activeDictCode, searchQuery, searchResults, searchDirection, hasMoreResults } = get();
        if (!activeDictCode || searchQuery.trim() || !hasMoreResults) return;

        const langPair = LANGUAGE_PAIRS.find((lp) => lp.code === activeDictCode);
        if (!langPair) return;

        let dbCode: string | undefined;
        let effectiveDirection: 'source' | 'target' = searchDirection;

        if (searchDirection === 'source') {
          dbCode = langPair.sourceDb?.dbCode;
          if (!dbCode && langPair.targetDb) {
            dbCode = langPair.targetDb.dbCode;
            effectiveDirection = 'target';
          }
        } else {
          if (langPair.targetDb) {
            dbCode = langPair.targetDb.dbCode;
            effectiveDirection = 'source';
          } else if (langPair.sourceDb) {
            dbCode = langPair.sourceDb.dbCode;
            effectiveDirection = 'target';
          }
        }
        if (!dbCode) return;

        const moreResults = await DatabaseManager.searchWords(
          dbCode,
          '',
          effectiveDirection,
          100,
          searchResults.length
        );

        set({
          searchResults: [...searchResults, ...moreResults],
          hasMoreResults: moreResults.length >= 100,
        });
      },

      clearSearch: () => {
        set({ searchQuery: '', searchResults: [], hasMoreResults: false });
      },

      downloadDictionary: async (code: string) => {
        const state = get();
        if (
          state.proStatus !== 'pro' &&
          state.downloadedCount() >= FREE_DOWNLOAD_LIMIT
        ) {
          throw new Error('FREE_LIMIT_REACHED');
        }

        const langPair = LANGUAGE_PAIRS.find((lp) => lp.code === code);
        if (!langPair) throw new Error('Neznámý slovník');

        set((s) => ({
          downloadStates: {
            ...s.downloadStates,
            [code]: { code, status: 'downloading', progress: 0 },
          },
        }));

        try {
          // Stáhnout oba směry pokud existují
          if (langPair.sourceDb) {
            await DatabaseManager.downloadDatabase(
              langPair.sourceDb.dbCode,
              langPair.sourceDb.dbUrl
            );
          }
          if (langPair.targetDb) {
            await DatabaseManager.downloadDatabase(
              langPair.targetDb.dbCode,
              langPair.targetDb.dbUrl
            );
          }

          set((s) => ({
            downloadStates: {
              ...s.downloadStates,
              [code]: { code, status: 'downloaded' },
            },
            activeDictCode: s.activeDictCode ?? code,
          }));
        } catch (error) {
          set((s) => ({
            downloadStates: {
              ...s.downloadStates,
              [code]: { code, status: 'not_downloaded' },
            },
          }));
          throw error;
        }
      },

      deleteDictionary: async (code: string) => {
        const langPair = LANGUAGE_PAIRS.find((lp) => lp.code === code);
        if (langPair?.sourceDb) await DatabaseManager.deleteDatabase(langPair.sourceDb.dbCode);
        if (langPair?.targetDb) await DatabaseManager.deleteDatabase(langPair.targetDb.dbCode);
        set((s) => {
          const newDownloads = { ...s.downloadStates };
          delete newDownloads[code];
          return {
            downloadStates: newDownloads,
            activeDictCode:
              s.activeDictCode === code ? null : s.activeDictCode,
            searchResults:
              s.activeDictCode === code ? [] : s.searchResults,
          };
        });
      },

      initializeProStatus: async () => {
        const isPro = await IAPManager.checkProStatus();
        set({ proStatus: isPro ? 'pro' : 'free' });
      },

      purchasePro: async () => {
        const success = await IAPManager.purchasePro();
        if (success) {
          set({ proStatus: 'pro' });
        }
        return success;
      },

      restorePurchases: async () => {
        const success = await IAPManager.restorePurchases();
        if (success) {
          set({ proStatus: 'pro' });
        }
        return success;
      },

      setShowDescriptions: (val: boolean) => {
        set({ showDescriptions: val });
      },

      setShowPartOfSpeech: (val: boolean) => {
        set({ showPartOfSpeech: val });
      },

      setShowPronunciation: (val: boolean) => {
        set({ showPronunciation: val });
      },

      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode });
      },

      toggleDevPro: () => {
        set((s) => ({
          proStatus: s.proStatus === 'pro' ? 'free' : 'pro',
        }));
      },

      initializeApp: async () => {
        try {
          await IAPManager.initIAP();
          await get().initializeProStatus();
        } catch {
          // RevenueCat nemusí být dostupný
        }

        try {
          DatabaseManager.ensureDbDirectory();

          const states = get().downloadStates;
          const verified: Record<string, DownloadState> = {};
          for (const [code, ds] of Object.entries(states)) {
            if (ds.status === 'downloaded') {
              const langPair = LANGUAGE_PAIRS.find((lp) => lp.code === code);
              const sourceExists = langPair?.sourceDb
                ? DatabaseManager.isDatabaseDownloaded(langPair.sourceDb.dbCode)
                : true;
              const targetExists = langPair?.targetDb
                ? DatabaseManager.isDatabaseDownloaded(langPair.targetDb.dbCode)
                : true;
              const hasAnyDb = langPair?.sourceDb || langPair?.targetDb;
              const exists = hasAnyDb && (sourceExists || targetExists);
              verified[code] = exists
                ? ds
                : { code, status: 'not_downloaded' };
            } else if (ds.status === 'downloading') {
              verified[code] = { code, status: 'not_downloaded' };
            }
          }
          set({ downloadStates: verified });
        } catch {
          // Filesystem ověření selhalo — pokračovat s persistovaným stavem
        }
      },
    }),
    {
      name: 'slovniq-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeDictCode: state.activeDictCode,
        downloadStates: state.downloadStates,
        showDescriptions: state.showDescriptions,
        showPartOfSpeech: state.showPartOfSpeech,
        showPronunciation: state.showPronunciation,
        themeMode: state.themeMode,
      }),
    }
  )
);

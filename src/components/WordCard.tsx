import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WordEntry } from '@/src/types';
import { useTheme } from '@/src/config/ThemeContext';
import { useAppStore } from '@/src/stores/useAppStore';

interface WordCardProps {
  entry: WordEntry;
  swapped?: boolean;
}

const POS_MAP: Record<string, string> = {
  'n': 'podstatné jm.',
  'noun': 'podstatné jm.',
  'v': 'sloveso',
  'verb': 'sloveso',
  'adj': 'přídavné jm.',
  'adjective': 'přídavné jm.',
  'adv': 'příslovce',
  'adverb': 'příslovce',
  'prep': 'předložka',
  'preposition': 'předložka',
  'conjunction': 'spojka',
  'conj': 'spojka',
  'pronoun': 'zájmeno',
  'pron': 'zájmeno',
  'interjection': 'citoslovce',
  'interj': 'citoslovce',
  'particle': 'částice',
  'numeral': 'číslovka',
  'num': 'číslovka',
  'article': 'člen',
  'art': 'člen',
  'proverb': 'přísloví',
  'phrase': 'fráze',
  'prefix': 'předpona',
  'suffix': 'přípona',
};

function translatePos(pos: string): string {
  const key = pos.toLowerCase().trim();
  return POS_MAP[key] ?? pos;
}

/** Odstraní HTML tagy */
function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

/** Odstraní wiki markup [[link|text]] → text, [[text]] → text */
function stripWikiMarkup(text: string): string {
  return text.replace(/\[\[([^\]|]*?\|)?([^\]]*?)\]\]/g, '$2');
}

/** Odstraní úvodní číslování ("1. ", "2. ") */
function stripNumbering(text: string): string {
  return text.replace(/^\d+\.\s*/, '');
}

/** Vyčistí text — HTML tagy, wiki markup, Modèle: značky */
function cleanLine(text: string): string {
  let cleaned = stripWikiMarkup(stripHtml(text)).trim();
  if (cleaned.startsWith('Modèle:') || cleaned.startsWith('{{')) return '';
  return cleaned;
}

function parseEntry(raw: string): {
  headword: string;
  pronunciation: string | null;
  pos: string | null;
  translations: string[];
} {
  const lines = raw.split('\n').filter((l) => l.length > 0);
  if (lines.length === 0)
    return { headword: '', pronunciation: null, pos: null, translations: [] };

  const firstLine = stripWikiMarkup(stripHtml(lines[0]));
  const ipaMatch = firstLine.match(/\/(.*?)\//);
  const posMatch = firstLine.match(/<(.*?)>/);
  let headword = firstLine.split('/')[0].trim();
  headword = stripNumbering(headword);
  const pronunciation = ipaMatch ? ipaMatch[1] : null;
  const pos = posMatch ? translatePos(posMatch[1]) : null;
  const translations = lines.slice(1)
    .map(cleanLine)
    .filter((l) => l.length > 0)
    .map(stripNumbering);

  return { headword, pronunciation, pos, translations };
}

const MAX_VISIBLE_LINES = 2;

export const WordCard: React.FC<WordCardProps> = ({ entry, swapped = false }) => {
  const parsed = parseEntry(entry.translation);
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();
  const showDescriptions = useAppStore((s) => s.showDescriptions);
  const showPartOfSpeech = useAppStore((s) => s.showPartOfSpeech);
  const showPronunciation = useAppStore((s) => s.showPronunciation);
  const sourceIsCzech = useAppStore((s) => s.sourceIsCzech);

  // Hlavní slovo (tučné nahoře) a překlad (pod ním)
  // swapped = true jen při fallbacku na target_words v ces-xxx DB
  let mainWord: string;
  let translateLine: string | null = null;
  let extraLines: string[];

  if (swapped && parsed.translations.length > 0) {
    mainWord = parsed.translations[0];
    translateLine = parsed.headword;
    extraLines = parsed.translations.slice(1);
  } else {
    mainWord = parsed.headword;
    translateLine = parsed.translations.length > 0 ? parsed.translations[0] : null;
    extraLines = parsed.translations.slice(1);
  }

  // Vyčistit trailing číslovky (např. "manusia, orang 2.", "mengemudi(kan) 2.")
  mainWord = mainWord.replace(/\s+\d+\.\s*$/, '').trim();
  if (translateLine) {
    translateLine = translateLine.replace(/\s+\d+\.\s*$/, '').trim();
  }

  const hasMore = extraLines.length > MAX_VISIBLE_LINES;
  const visibleExtra = expanded
    ? extraLines
    : extraLines.slice(0, MAX_VISIBLE_LINES);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headword, { color: colors.text }]}>{mainWord}</Text>
        {showPartOfSpeech && parsed.pos && <Text style={[styles.pos, { color: colors.primary, backgroundColor: colors.primaryLight }]}>{parsed.pos}</Text>}
      </View>
      {showPronunciation && parsed.pronunciation && !sourceIsCzech && (
        <Text style={[styles.pronunciation, { color: colors.textSecondary }]}>/{parsed.pronunciation}/</Text>
      )}
      {translateLine && (
        <Text style={[styles.translateLine, { color: colors.textSecondary }]}>{translateLine}</Text>
      )}
      {showDescriptions && visibleExtra.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {visibleExtra.map((t, i) => (
            <Text key={i} style={[styles.translation, { color: colors.text }]}>
              {t}
            </Text>
          ))}
          {hasMore && (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => setExpanded(!expanded)}
            >
              <Text style={[styles.moreBtnText, { color: colors.primary }]}>
                {expanded ? 'Skrýt' : 'Zobrazit více'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  headword: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  pos: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  pronunciation: {
    fontSize: 14,
    marginTop: 2,
  },
  translateLine: {
    fontSize: 16,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  translation: {
    fontSize: 15,
    marginTop: 2,
    lineHeight: 22,
  },
  moreBtn: {
    marginTop: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  moreBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

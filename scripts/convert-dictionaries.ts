/**
 * Konverzni skript: FreeDict (.dict.dz + .index) -> SQLite (.db)
 *
 * Spusteni: npx ts-node scripts/convert-dictionaries.ts
 *
 * Cte FreeDict slovniky z data/ a vytvari SQLite databaze v assets/databases/.
 * Kazda databaze obsahuje tabulku `words` s indexem pro rychle vyhledavani.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dictd base64 abeceda pro dekodovani offsetu v .index souborech
const DICTD_BASE64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Dekoduje dictd base64 retezec na cislo.
 * Kazdy znak reprezentuje 6 bitu, big-endian.
 */
function decodeDictdBase64(encoded: string): number {
  let result = 0;
  for (const ch of encoded) {
    const val = DICTD_BASE64.indexOf(ch);
    if (val === -1) throw new Error(`Neplatny dictd base64 znak: ${ch}`);
    result = result * 64 + val;
  }
  return result;
}

interface IndexEntry {
  headword: string;
  offset: number;
  length: number;
}

/**
 * Parsuje .index soubor. Kazdy radek: headword\toffset\tlength
 * Preskakuje metadata zaznamy (prefix 00database).
 */
function parseIndex(indexPath: string): IndexEntry[] {
  const content = fs.readFileSync(indexPath, 'utf-8');
  const entries: IndexEntry[] = [];

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const [headword, offsetStr, lengthStr] = parts;

    if (headword.startsWith('00database')) continue;

    entries.push({
      headword,
      offset: decodeDictdBase64(offsetStr),
      length: decodeDictdBase64(lengthStr),
    });
  }

  return entries;
}

/**
 * Dekomprimuje .dict.dz soubor (gzip kompatibilni format dictzip).
 */
function decompressDict(dictDzPath: string): Buffer {
  const compressed = fs.readFileSync(dictDzPath);
  return zlib.gunzipSync(compressed);
}

/**
 * Prevede jeden slovnik z FreeDict formatu do SQLite databaze.
 */
function convertDictionary(
  dictCode: string,
  inputDir: string,
  outputDir: string
): void {
  const indexPath = path.join(inputDir, dictCode + '.index');
  const dictPath = path.join(inputDir, dictCode + '.dict.dz');
  const dbPath = path.join(outputDir, dictCode + '.db');

  console.log('Konvertuji ' + dictCode + '...');

  if (!fs.existsSync(indexPath)) {
    console.error('  Index soubor nenalezen: ' + indexPath);
    return;
  }
  if (!fs.existsSync(dictPath)) {
    console.error('  Dict soubor nenalezen: ' + dictPath);
    return;
  }

  const entries = parseIndex(indexPath);
  const dictData = decompressDict(dictPath);

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');

  db.prepare(`
    CREATE TABLE words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_word TEXT NOT NULL,
      target_words TEXT NOT NULL DEFAULT '',
      translation TEXT NOT NULL
    )
  `).run();

  db.prepare(
    'CREATE INDEX idx_source_word ON words(source_word COLLATE NOCASE)'
  ).run();

  db.prepare(
    'CREATE INDEX idx_target_words ON words(target_words COLLATE NOCASE)'
  ).run();

  const insertStmt = db.prepare(
    'INSERT INTO words (source_word, target_words, translation) VALUES (?, ?, ?)'
  );

  const insertMany = db.transaction((items: IndexEntry[]) => {
    for (const entry of items) {
      const raw = dictData
        .subarray(entry.offset, entry.offset + entry.length)
        .toString('utf-8');
      const trimmed = raw.trim();

      // Extrakce cizojazyčných slov z překladu.
      // Formát: 1. řádek = české slovo /IPA/ <pos>, další řádky = cizí překlady
      const lines = trimmed.split('\n');
      // Extrakce pouze hlavního cizojazyčného překladu (řádek 2).
      // Popisy a další české významy se neindexují — slouží jen k zobrazení.
      let targetWords = '';
      if (lines.length > 1) {
        targetWords = lines[1]
          .replace(/^\d+\.\s*/, '')
          .replace(/\s+\d+\.\s*$/, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\[\[([^\]|]*?\|)?([^\]]*?)\]\]/g, '$2')
          .trim();
        if (targetWords.startsWith('Modèle:') || targetWords.startsWith('{{')) {
          targetWords = '';
        }
      }

      insertStmt.run(entry.headword, targetWords, trimmed);
    }
  });

  insertMany(entries);
  db.close();

  const stats = fs.statSync(dbPath);
  console.log(
    '  -> ' + dbPath + ' (' + entries.length + ' hesel, ' +
    (stats.size / 1024).toFixed(0) + ' KB)'
  );
}

// --- Main ---

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'assets', 'databases');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Automaticky najít všechny slovníky v data/ adresáři
const allDirs = fs.readdirSync(DATA_DIR).filter(d => {
  const dir = path.join(DATA_DIR, d);
  return fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, d + '.index'));
});

console.log('=== SlovniQ: Konverze FreeDict -> SQLite ===');
console.log('Nalezeno ' + allDirs.length + ' slovniku\n');

for (const code of allDirs) {
  convertDictionary(code, path.join(DATA_DIR, code), OUTPUT_DIR);
}

console.log('\nVsechny slovniky uspesne prevedeny.');

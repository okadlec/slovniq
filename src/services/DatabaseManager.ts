import { Paths, File, Directory } from 'expo-file-system';
import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { WordEntry } from '@/src/types';

// Lazy inicializace — nevolat Paths.document při importu modulu
let _dbDir: Directory | null = null;
function getDbDir(): Directory {
  if (!_dbDir) {
    _dbDir = new Directory(Paths.document, 'dictionaries');
  }
  return _dbDir;
}

const openDatabases: Map<string, SQLiteDatabase> = new Map();

export function ensureDbDirectory(): void {
  try {
    const dir = getDbDir();
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
  } catch {
    // Ignorovat při startu pokud nativní modul není ready
  }
}

function getDbFile(dictCode: string): File {
  return new File(getDbDir(), dictCode + '.db');
}

export function isDatabaseDownloaded(dictCode: string): boolean {
  try {
    return getDbFile(dictCode).exists;
  } catch {
    return false;
  }
}

export async function downloadDatabase(
  dictCode: string,
  remoteUrl: string,
  _onProgress?: (progress: number) => void
): Promise<void> {
  ensureDbDirectory();
  const destFile = getDbFile(dictCode);
  await File.downloadFileAsync(remoteUrl, destFile, { idempotent: true });
}

export async function deleteDatabase(dictCode: string): Promise<void> {
  const db = openDatabases.get(dictCode);
  if (db) {
    await db.closeAsync();
    openDatabases.delete(dictCode);
  }
  try {
    const dbFile = getDbFile(dictCode);
    if (dbFile.exists) {
      dbFile.delete();
    }
  } catch {
    // Soubor neexistuje nebo nelze smazat
  }
}

export async function openDatabase(dictCode: string): Promise<SQLiteDatabase> {
  if (openDatabases.has(dictCode)) {
    return openDatabases.get(dictCode)!;
  }

  const db = await openDatabaseAsync(
    dictCode + '.db',
    {},
    getDbDir().uri
  );
  openDatabases.set(dictCode, db);
  return db;
}

async function hasTargetWords(db: SQLiteDatabase): Promise<boolean> {
  try {
    const result = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(words)"
    );
    return result.some(col => col.name === 'target_words');
  } catch {
    return false;
  }
}

/**
 * Vyhledávání slov — buď CZ→cizí (source_word) nebo cizí→CZ (target_words).
 * Při prázdném dotazu vrátí všechna slova (pro procházení slovníku).
 */
export async function searchWords(
  dictCode: string,
  query: string,
  direction: 'source' | 'target' = 'source',
  limit: number = 100,
  offset: number = 0
): Promise<WordEntry[]> {
  const db = await openDatabase(dictCode);
  const trimmed = query.trim();

  // Prázdný dotaz — vrátit slova pro scrollování (bez čísel a spec. znaků)
  if (!trimmed) {
    if (direction === 'target') {
      const hasTarget = await hasTargetWords(db);
      if (hasTarget) {
        return db.getAllAsync<WordEntry>(
          `SELECT id, source_word, translation
           FROM words
           WHERE target_words != ''
             AND target_words NOT GLOB '[0-9]*'
             AND target_words NOT GLOB '[-_"(]*'
           ORDER BY target_words COLLATE NOCASE
           LIMIT ? OFFSET ?`,
          [limit, offset]
        );
      }
    }
    return db.getAllAsync<WordEntry>(
      `SELECT id, source_word, translation
       FROM words
       WHERE source_word NOT GLOB '[0-9]*'
         AND source_word NOT GLOB '[-_"(]*'
       ORDER BY source_word COLLATE NOCASE
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  const sanitized = trimmed.replace(/[%_]/g, '\\$&');

  if (direction === 'target') {
    const hasTarget = await hasTargetWords(db);
    if (hasTarget) {
      // Řazení: přesná/samostatná shoda první, pak složeniny
      return db.getAllAsync<WordEntry>(
        `SELECT id, source_word, translation
         FROM words
         WHERE target_words LIKE ? ESCAPE '\\'
         ORDER BY
           CASE
             WHEN target_words LIKE ? ESCAPE '\\' THEN 0
             WHEN target_words LIKE ? ESCAPE '\\' THEN 0
             WHEN target_words LIKE ? ESCAPE '\\' THEN 1
             WHEN target_words LIKE ? ESCAPE '\\' THEN 1
             WHEN target_words LIKE ? ESCAPE '\\' THEN 1
             ELSE 2
           END,
           LENGTH(target_words),
           target_words COLLATE NOCASE
         LIMIT ?`,
        [
          `%${sanitized}%`,
          `${sanitized}`,
          `${sanitized},%`,
          `%, ${sanitized},%`,
          `%, ${sanitized}`,
          `%, ${sanitized} %`,
          limit,
        ]
      );
    }
    return db.getAllAsync<WordEntry>(
      `SELECT id, source_word, translation
       FROM words
       WHERE translation LIKE ? ESCAPE '\\'
       ORDER BY source_word COLLATE NOCASE
       LIMIT ?`,
      [`%${sanitized}%`, limit]
    );
  }

  // direction === 'source' — hledat české slovo
  return db.getAllAsync<WordEntry>(
    `SELECT id, source_word, translation
     FROM words
     WHERE source_word LIKE ? ESCAPE '\\'
     ORDER BY source_word COLLATE NOCASE
     LIMIT ?`,
    [`${sanitized}%`, limit]
  );
}

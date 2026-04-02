export interface LanguagePair {
  code: string;
  nameCs: string;
  nameNative: string;
  adjectiveCs: string;
  flag: string;
  /** ces→foreign slovník (source_word = čeština) */
  sourceDb?: {
    dbCode: string;
    headwordCount: number;
    dbSizeBytes: number;
    dbUrl: string;
  };
  /** foreign→ces slovník (source_word = cizí jazyk) */
  targetDb?: {
    dbCode: string;
    headwordCount: number;
    dbSizeBytes: number;
    dbUrl: string;
  };
}

export interface WordEntry {
  id: number;
  source_word: string;
  translation: string;
}

export interface DownloadState {
  code: string;
  status: 'not_downloaded' | 'downloading' | 'downloaded';
  progress?: number;
}

export type ProStatus = 'free' | 'pro';

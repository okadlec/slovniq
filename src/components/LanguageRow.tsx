import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LanguagePair, DownloadState } from '@/src/types';
import { useTheme } from '@/src/config/ThemeContext';

interface LanguageRowProps {
  language: LanguagePair;
  downloadState: DownloadState;
  isPro: boolean;
  onDownload: () => void;
  onDelete: () => void;
}

export const LanguageRow: React.FC<LanguageRowProps> = ({
  language,
  downloadState,
  onDownload,
  onDelete,
}) => {
  const { colors } = useTheme();
  const isDownloaded = downloadState.status === 'downloaded';
  const isDownloading = downloadState.status === 'downloading';

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.flag}>{language.flag}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{language.nameCs}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {(() => {
            const size = (language.sourceDb?.dbSizeBytes ?? 0) + (language.targetDb?.dbSizeBytes ?? 0);
            const sizeStr = size >= 1_000_000
              ? (size / 1_000_000).toFixed(1) + ' MB'
              : Math.round(size / 1_000) + ' KB';
            return sizeStr;
          })()}
        </Text>
        {isDownloading && downloadState.progress !== undefined && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(downloadState.progress * 100)}%` },
              ]}
            />
          </View>
        )}
      </View>
      <View style={styles.action}>
        {isDownloaded ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        ) : isDownloading ? (
          <ActivityIndicator size="small" color="#4A6CF7" />
        ) : (
          <TouchableOpacity style={styles.downloadBtn} onPress={onDownload}>
            <Ionicons name="cloud-download-outline" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  flag: {
    fontSize: 28,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  action: {
    marginLeft: 12,
  },
  actionBtn: {
    padding: 6,
  },
  downloadBtn: {
    backgroundColor: '#4A6CF7',
    borderRadius: 8,
    padding: 8,
  },
});

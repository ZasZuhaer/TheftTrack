import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DriveUploadManager from '../utils/DriveUploadManager';

export function DriveUploadBanner() {
  const [uploadState, setUploadState] = useState(DriveUploadManager.getState);

  useEffect(() => {
    return DriveUploadManager.subscribe(setUploadState);
  }, []);

  if (!uploadState.isUploading && uploadState.statusMsg === null) return null;

  const bg = uploadState.statusIsError
    ? '#B71C1C'
    : uploadState.isUploading
    ? '#1A73E8'
    : '#1B5E20';

  return (
    <View style={[styles.banner, { backgroundColor: bg, top: StatusBar.currentHeight ?? 0 }]}>
      {uploadState.isUploading && (
        <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
      )}
      <Text style={styles.text} numberOfLines={1}>{uploadState.statusMsg}</Text>
      {!uploadState.isUploading && (
        <TouchableOpacity onPress={DriveUploadManager.dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    zIndex: 9999,
    elevation: 20,
  },
  spinner: { marginRight: 8 },
  text: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '500' },
  dismiss: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginLeft: 8 },
});

import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Video from 'react-native-video';

export type MediaItem =
  | { type: 'photo'; uri: string; label: string }
  | { type: 'video'; path: string };

const { width: W, height: H } = Dimensions.get('window');

export function MediaViewerModal({
  items,
  initialIndex,
  onClose,
}: {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<MediaItem>>(null);
  const statusBarH = StatusBar.currentHeight ?? 24;

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: W, offset: W * index, index }),
    []
  );

  const currentItem = items[currentIndex];

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: statusBarH + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.counter}>{currentIndex + 1} / {items.length}</Text>
          <View style={styles.closeBtn} />
        </View>

        {/* Paged media */}
        <View style={styles.mediaContainer}>
          <FlatList
            ref={listRef}
            data={items}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={getItemLayout}
            extraData={currentIndex}
            onMomentumScrollEnd={e => {
              setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / W));
            }}
            renderItem={({ item, index }) => (
              <View style={styles.page}>
                {item.type === 'photo' ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.media}
                    resizeMode="contain"
                  />
                ) : (
                  <Video
                    source={{ uri: `file://${item.path}` }}
                    style={styles.media}
                    resizeMode="contain"
                    controls
                    paused={currentIndex !== index}
                  />
                )}
              </View>
            )}
            keyExtractor={(_, i) => String(i)}
            style={styles.list}
          />

          {/* Label overlay */}
          {currentItem?.type === 'photo' && (
            <View style={styles.labelWrap} pointerEvents="none">
              <Text style={styles.labelText}>{currentItem.label}</Text>
            </View>
          )}

          {/* Page dots overlay */}
          {items.length > 1 && (
            <View style={styles.dots} pointerEvents="none">
              {items.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 22, fontWeight: '300' },
  counter: { color: '#aaa', fontSize: 14 },
  mediaContainer: { flex: 1 },
  list: { flex: 1 },
  page: { width: W, flex: 1, justifyContent: 'center', alignItems: 'center' },
  media: { width: W, height: H * 0.72 },
  labelWrap: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  labelText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { backgroundColor: '#fff', width: 16, borderRadius: 3 },
});

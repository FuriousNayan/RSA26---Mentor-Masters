import { Image } from 'expo-image';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScanHistory, type ScannedItem } from '@/contexts/scan-history-context';

function formatScannedAt(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function SensitivityAllergyPlaceholder({ item }: { item: ScannedItem }) {
  const hasSensitivityFeature = item.sensitivityStatus !== null;
  const hasAllergyFeature = item.allergyStatus !== null;

  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusBadge, styles.statusPlaceholder]}>
        <Ionicons name="alert-circle-outline" size={14} color="#888" />
        <ThemedText style={styles.statusPlaceholderText}>
          Sensitivity: {hasSensitivityFeature ? 'Check' : 'Not configured'}
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, styles.statusPlaceholder]}>
        <Ionicons name="medical-outline" size={14} color="#888" />
        <ThemedText style={styles.statusPlaceholderText}>
          Allergy: {hasAllergyFeature ? 'Check' : 'Not configured'}
        </ThemedText>
      </View>
    </View>
  );
}

function HistoryItemCard({
  item,
  onRemove,
}: {
  item: ScannedItem;
  onRemove: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="nutrition-outline" size={32} color="#999" />
          </View>
        )}
        <View style={styles.cardContent}>
          <ThemedText type="defaultSemiBold" style={styles.productName} numberOfLines={2}>
            {item.productName || 'Unknown Product'}
          </ThemedText>
          <ThemedText style={styles.brand} numberOfLines={1}>
            {item.brand || 'Unknown Brand'}
          </ThemedText>
          <ThemedText style={styles.timestamp}>{formatScannedAt(item.scannedAt)}</ThemedText>
          <SensitivityAllergyPlaceholder item={item} />
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton} hitSlop={12}>
          <Ionicons name="close-circle-outline" size={24} color="#999" />
        </TouchableOpacity>
      </View>
      <View style={styles.allergensSection}>
        <ThemedText style={styles.allergensLabel}>Allergens:</ThemedText>
        <ThemedText style={styles.allergensText} numberOfLines={2}>
          {item.allergens}
        </ThemedText>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { items, clearHistory, removeItem } = useScanHistory();

  const [fontsLoaded] = useFonts({
    OpenDyslexic: require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Remove all recently scanned items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Scan History
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Recently scanned items. Sensitivity and allergy checks coming soon.
        </ThemedText>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            <ThemedText style={styles.clearButtonText}>Clear History</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barcode-outline" size={64} color="#CCC" />
          <ThemedText style={styles.emptyTitle}>No scans yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Scan items on the Home tab to see them here. Each item will show sensitivity and allergy
            status once those features are enabled.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => (
            <HistoryItemCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1, marginLeft: 14, justifyContent: 'center', minWidth: 0 },
  productName: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 16,
    marginBottom: 2,
  },
  brand: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
  timestamp: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 6,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusPlaceholder: {
    backgroundColor: '#F5F5F5',
  },
  statusPlaceholderText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  removeButton: { padding: 4 },
  allergensSection: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
  },
  allergensLabel: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
  allergensText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    opacity: 0.9,
  },
});

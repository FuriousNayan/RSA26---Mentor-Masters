import { Image } from 'expo-image';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useScanHistory, type ScannedItem } from '@/contexts/scan-history-context';
import {
  useUserPreferences,
  productMatchesUserRestrictions,
} from '@/contexts/user-preferences-context';

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

function SensitivityAllergyStatus({ item }: { item: ScannedItem }) {
  const { allergies, sensitivities } = useUserPreferences();
  const { hasAllergyConflict, hasSensitivityConflict } = productMatchesUserRestrictions(
    item.allergens,
    allergies,
    sensitivities
  );
  const iconColor = useThemeColor({}, 'icon');
  const statusBg = useThemeColor({ light: '#E8EAED', dark: '#2A2D31' }, 'background');
  const warningColor = '#E74C3C';

  const sensitivityConfigured = sensitivities.length > 0;
  const allergyConfigured = allergies.length > 0;

  const sensitivityLabel = sensitivityConfigured
    ? hasSensitivityConflict
      ? 'Sensitivity: May affect'
      : 'Sensitivity: Clear'
    : 'Sensitivity: Not configured';
  const allergyLabel = allergyConfigured
    ? hasAllergyConflict
      ? 'Allergy: May affect'
      : 'Allergy: Clear'
    : 'Allergy: Not configured';

  const sensitivityIconColor = sensitivityConfigured && hasSensitivityConflict ? warningColor : iconColor;
  const allergyIconColor = allergyConfigured && hasAllergyConflict ? warningColor : iconColor;

  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
        <Ionicons name="alert-circle-outline" size={14} color={sensitivityIconColor} />
        <ThemedText style={[styles.statusPlaceholderText, hasSensitivityConflict && { color: warningColor }]}>
          {sensitivityLabel}
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
        <Ionicons name="medical-outline" size={14} color={allergyIconColor} />
        <ThemedText style={[styles.statusPlaceholderText, hasAllergyConflict && { color: warningColor }]}>
          {allergyLabel}
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
  const colorScheme = useColorScheme();
  const iconColor = Colors[colorScheme ?? 'light'].icon;

  return (
    <ThemedView lightColor="#F0F2F5" darkColor="#1E2124" style={styles.card}>
      <View style={styles.cardHeader}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} contentFit="contain" />
        ) : (
          <ThemedView lightColor="#E8EAED" darkColor="#2A2D31" style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="nutrition-outline" size={32} color={iconColor} />
          </ThemedView>
        )}
        <View style={styles.cardContent}>
          <ThemedText type="defaultSemiBold" style={styles.productName} numberOfLines={2}>
            {item.productName || 'Unknown Product'}
          </ThemedText>
          <ThemedText style={styles.brand} numberOfLines={1}>
            {item.brand || 'Unknown Brand'}
          </ThemedText>
          <ThemedText style={styles.timestamp}>{formatScannedAt(item.scannedAt)}</ThemedText>
          <SensitivityAllergyStatus item={item} />
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton} hitSlop={12}>
          <Ionicons name="close-circle-outline" size={24} color={iconColor} />
        </TouchableOpacity>
      </View>
      <View style={styles.allergensSection}>
        <ThemedText style={styles.allergensLabel}>Allergens:</ThemedText>
        <ThemedText style={styles.allergensText} numberOfLines={2}>
          {item.allergens}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function HistoryScreen() {
  const { items, clearHistory, removeItem } = useScanHistory();
  const colorScheme = useColorScheme();

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

  const backgroundColor = useThemeColor({}, 'background');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Scan History
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Recently scanned items with sensitivity and allergy status based on your preferences.
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
          <Ionicons name="barcode-outline" size={64} color={Colors[colorScheme ?? 'light'].icon} />
          <ThemedText style={styles.emptyTitle}>No scans yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Scan items on the Home tab to see them here. Configure your allergies and sensitivities in
            Preferences to see status for each product.
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
  title: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 28,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 16,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  clearButtonText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
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
    lineHeight: 28,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.75,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 14 },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1, marginLeft: 16, justifyContent: 'center', minWidth: 0 },
  productName: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  brand: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 6,
  },
  timestamp: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    opacity: 0.65,
    marginBottom: 8,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusPlaceholderText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 11,
    opacity: 0.85,
    marginLeft: 6,
  },
  removeButton: { padding: 6 },
  allergensSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: 14,
    marginTop: 2,
  },
  allergensLabel: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.85,
    marginBottom: 6,
  },
  allergensText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
});

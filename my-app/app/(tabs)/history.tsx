import { useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useScanHistory, type ScannedItem } from '@/contexts/scan-history-context';
import {
  useUserPreferences,
  productMatchesUserRestrictions,
} from '@/contexts/user-preferences-context';
import { useLanguage } from '@/contexts/language-context';

function formatScannedAt(date: Date, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('history.justNow');
  if (diffMins < 60) return t('history.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('history.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('history.daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}

function SensitivityAllergyStatus({ item }: { item: ScannedItem }) {
  const { allergies, sensitivities } = useUserPreferences();
  const { t } = useLanguage();
  const { hasAllergyConflict, hasSensitivityConflict } = productMatchesUserRestrictions(
    item.allergens,
    allergies,
    sensitivities
  );
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const sensitivityConfigured = sensitivities.length > 0;
  const allergyConfigured = allergies.length > 0;

  const sensitivityLabel = sensitivityConfigured
    ? hasSensitivityConflict
      ? t('history.sensitivityMayAffect')
      : t('history.sensitivityClear')
    : t('history.sensitivityNotConfigured');
  const allergyLabel = allergyConfigured
    ? hasAllergyConflict
      ? t('history.allergyMayAffect')
      : t('history.allergyClear')
    : t('history.allergyNotConfigured');

  const safeBg = isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)';
  const safeText = isDark ? '#6EE7B7' : '#047857';
  const warnBg = isDark ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.12)';
  const warnText = isDark ? '#FCA5A5' : '#B91C1C';
  const neutralBg = isDark ? 'rgba(242,248,255,0.08)' : 'rgba(9,25,107,0.06)';
  const neutralText = isDark ? '#A8B3D8' : '#3B4682';

  const sensitivityBg = !sensitivityConfigured
    ? neutralBg
    : hasSensitivityConflict
    ? warnBg
    : safeBg;
  const sensitivityFg = !sensitivityConfigured
    ? neutralText
    : hasSensitivityConflict
    ? warnText
    : safeText;
  const allergyBg = !allergyConfigured ? neutralBg : hasAllergyConflict ? warnBg : safeBg;
  const allergyFg = !allergyConfigured ? neutralText : hasAllergyConflict ? warnText : safeText;

  const sensitivityIcon = !sensitivityConfigured
    ? 'help-circle-outline'
    : hasSensitivityConflict
    ? 'alert-circle'
    : 'checkmark-circle';
  const allergyIcon = !allergyConfigured
    ? 'help-circle-outline'
    : hasAllergyConflict
    ? 'warning'
    : 'shield-checkmark';

  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusBadge, { backgroundColor: sensitivityBg }]}>
        <Ionicons name={sensitivityIcon as any} size={13} color={sensitivityFg} />
        <ThemedText style={[styles.statusPlaceholderText, { color: sensitivityFg }]}>
          {sensitivityLabel}
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: allergyBg }]}>
        <Ionicons name={allergyIcon as any} size={13} color={allergyFg} />
        <ThemedText style={[styles.statusPlaceholderText, { color: allergyFg }]}>
          {allergyLabel}
        </ThemedText>
      </View>
    </View>
  );
}

function HistoryItemCard({
  item,
  onRemove,
  t,
}: {
  item: ScannedItem;
  onRemove: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const colorScheme = useColorScheme();
  const iconColor = Colors[colorScheme ?? 'light'].icon;
  const isDark = colorScheme === 'dark';

  return (
    <ThemedView
      lightColor="#FFFFFF"
      darkColor="#0B1654"
      style={[
        styles.card,
        {
          borderColor: isDark ? 'rgba(242,248,255,0.08)' : 'rgba(9,25,107,0.10)',
        },
      ]}
    >
      <View style={styles.cardHeader}>
        {item.imageUrl ? (
          <View style={[styles.thumbnailWrap, { backgroundColor: isDark ? '#04081E' : '#F2F8FF' }]}>
            <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} contentFit="contain" />
          </View>
        ) : (
          <ThemedView
            lightColor="#E8F1F4"
            darkColor="#04081E"
            style={[styles.thumbnailWrap, styles.thumbnailPlaceholder]}
          >
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
          <View style={styles.timestampRow}>
            <Ionicons name="time-outline" size={11} color={iconColor} />
            <ThemedText style={styles.timestamp}>{formatScannedAt(item.scannedAt, t)}</ThemedText>
          </View>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton} hitSlop={12}>
          <Ionicons name="close" size={18} color={iconColor} />
        </TouchableOpacity>
      </View>
      <SensitivityAllergyStatus item={item} />
      <View style={[styles.allergensSection, { borderTopColor: isDark ? 'rgba(242,248,255,0.08)' : 'rgba(9,25,107,0.10)' }]}>
        <ThemedText style={styles.allergensLabel}>{t('history.allergens')}</ThemedText>
        <ThemedText style={styles.allergensText} numberOfLines={2}>
          {item.allergens}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function HistoryScreen() {
  const { items, clearHistory, removeItem } = useScanHistory();
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [, setRefresh] = useState(0);

  const emptyIconBg = useThemeColor(
    { light: 'rgba(156,214,189,0.22)', dark: 'rgba(156,214,189,0.18)' },
    'background'
  );

  // Force re-render when tab gains focus so we always show current language
  useFocusEffect(
    useCallback(() => {
      setRefresh((n) => n + 1);
    }, [])
  );

  const [fontsLoaded] = useFonts({
    OpenDyslexic: require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  const handleClearHistory = () => {
    Alert.alert(
      t('history.clearHistory'),
      t('history.clearHistoryConfirm'),
      [
        { text: t('history.cancel'), style: 'cancel' },
        { text: t('history.clear'), style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ThemedView lightColor="transparent" darkColor="transparent" style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <ThemedText type="title" style={styles.title}>
                  {t('history.title')}
                </ThemedText>
                <ThemedText style={styles.subtitle}>
                  {t('history.subtitle')}
                </ThemedText>
              </View>
              {items.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearHistory}
                  style={[
                    styles.clearButton,
                    {
                      backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.10)',
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color={Palette.rose} />
                  <ThemedText style={styles.clearButtonText}>{t('history.clearHistory')}</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: emptyIconBg }]}>
                <Ionicons name="barcode-outline" size={48} color={Palette.navy} />
              </View>
              <ThemedText style={styles.emptyTitle}>{t('history.emptyTitle')}</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {t('history.emptySubtitle')}
              </ThemedText>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item) => (
                <HistoryItemCard key={item.id} item={item} onRemove={() => removeItem(item.id)} t={t} />
              ))}
            </ScrollView>
          )}
        </ThemedView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
  title: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 30,
    lineHeight: 38,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.75,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginLeft: 12,
    marginTop: 4,
  },
  clearButtonText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 12,
    color: Palette.rose,
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  emptyTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    opacity: 0.72,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 22, paddingBottom: 120, paddingTop: 4 },
  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  thumbnailWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  cardContent: { flex: 1, marginLeft: 14, justifyContent: 'center', minWidth: 0 },
  productName: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  brand: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 6,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    fontFamily: 'OpenDyslexic',
    fontSize: 11,
    opacity: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 5,
  },
  statusPlaceholderText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 11,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.10)',
  },
  allergensSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  allergensLabel: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.7,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  allergensText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.92,
  },
});

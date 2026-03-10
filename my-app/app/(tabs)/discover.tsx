import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useScanHistory, type ScannedItem } from '@/contexts/scan-history-context';
import {
  useUserPreferences,
  productMatchesUserRestrictions,
  type UserPreferences,
} from '@/contexts/user-preferences-context';
import { useLanguage } from '@/contexts/language-context';
import { searchSimilarProducts, type DiscoverProduct } from '@/services/discover-api';

type RecommendationSection = {
  title: string;
  subtitle?: string;
  items: ScannedItem[];
  isSafe: boolean;
};

type AlternativeSection = {
  originalItem: ScannedItem;
  alternatives: DiscoverProduct[];
  reason: string;
};

function useRecommendations(
  historyItems: ScannedItem[],
  preferences: UserPreferences
): {
  safeForYou: RecommendationSection;
  notSafeForYou: RecommendationSection;
  alternativeSections: AlternativeSection[];
} {
  const { t, locale } = useLanguage();
  return useMemo(() => {
    const safe: ScannedItem[] = [];
    const notSafe: ScannedItem[] = [];

    historyItems.forEach((item) => {
      const { hasAllergyConflict, hasSensitivityConflict } = productMatchesUserRestrictions(
        item.allergens,
        preferences.allergies,
        preferences.sensitivities
      );
      if (hasAllergyConflict || hasSensitivityConflict) {
        notSafe.push(item);
      } else {
        safe.push(item);
      }
    });

    return {
      safeForYou: {
        title: t('discover.safeForYou'),
        subtitle: t('discover.safeForYouSubtitle'),
        items: safe,
        isSafe: true,
      },
      notSafeForYou: {
        title: t('discover.mayNotSuitYou'),
        subtitle: t('discover.mayNotSuitYouSubtitle'),
        items: notSafe,
        isSafe: false,
      },
      alternativeSections: [] as AlternativeSection[],
    };
  }, [historyItems, preferences, t, locale]);
}

function ProductCard({
  item,
  onPressAlternative,
  showAlternatives,
}: {
  item: ScannedItem;
  onPressAlternative?: (item: ScannedItem) => void;
  showAlternatives?: boolean;
}) {
  const colorScheme = useColorScheme();
  const iconColor = Colors[colorScheme ?? 'light'].icon;

  return (
    <ThemedView lightColor="#F0F2F5" darkColor="#1E2124" style={styles.card}>
      <View style={styles.cardRow}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} contentFit="contain" />
        ) : (
          <ThemedView
            lightColor="#E8EAED"
            darkColor="#2A2D31"
            style={[styles.thumbnail, styles.thumbnailPlaceholder]}
          >
            <Ionicons name="nutrition-outline" size={28} color={iconColor} />
          </ThemedView>
        )}
        <View style={styles.cardContent}>
          <ThemedText type="defaultSemiBold" style={styles.productName} numberOfLines={2}>
            {item.productName || 'Unknown Product'}
          </ThemedText>
          <ThemedText style={styles.brand} numberOfLines={1}>
            {item.brand || 'Unknown Brand'}
          </ThemedText>
          <ThemedText style={styles.allergensHint} numberOfLines={2}>
            {item.allergens}
          </ThemedText>
          {showAlternatives && onPressAlternative && (
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={() => onPressAlternative(item)}
            >
              <Ionicons name="swap-horizontal" size={16} color="#0a7ea4" />
              <ThemedText style={styles.alternativeButtonText}>Find alternatives</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

function AlternativeCard({ product }: { product: DiscoverProduct }) {
  const colorScheme = useColorScheme();
  const iconColor = Colors[colorScheme ?? 'light'].icon;

  const openProduct = () => {
    Linking.openURL(`https://world.openfoodfacts.org/product/${product.code}`);
  };

  return (
    <TouchableOpacity onPress={openProduct} activeOpacity={0.8}>
      <ThemedView lightColor="#E8F5E9" darkColor="#1B3D1F" style={styles.altCard}>
        <View style={styles.cardRow}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.altThumbnail} contentFit="contain" />
          ) : (
            <ThemedView
              lightColor="#C8E6C9"
              darkColor="#2E5C31"
              style={[styles.altThumbnail, styles.thumbnailPlaceholder]}
            >
              <Ionicons name="nutrition-outline" size={24} color={iconColor} />
            </ThemedView>
          )}
          <View style={styles.cardContent}>
            <ThemedText type="defaultSemiBold" style={styles.altProductName} numberOfLines={2}>
              {product.productName}
            </ThemedText>
            <ThemedText style={styles.brand} numberOfLines={1}>
              {product.brand}
            </ThemedText>
            <ThemedText style={styles.allergensHint} numberOfLines={2}>
              {product.allergens}
            </ThemedText>
            <ThemedText style={styles.tapHint}>Tap to view on Open Food Facts</ThemedText>
          </View>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const { items } = useScanHistory();
  const preferences = useUserPreferences();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAlternativesFor, setLoadingAlternativesFor] = useState<string | null>(null);
  const alternativesCacheRef = useRef<Record<string, DiscoverProduct[]>>({});

  const { t } = useLanguage();
  const { safeForYou, notSafeForYou } = useRecommendations(items, preferences);

  const [fontsLoaded] = useFonts({
    OpenDyslexic: require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  const fetchAlternatives = useCallback(async (item: ScannedItem) => {
    const prefKey = [...preferences.allergies, ...preferences.sensitivities].sort().join('|');
    const key = `${item.id}:${prefKey}`;
    const cached = alternativesCacheRef.current[key];
    if (cached) return cached;
    setLoadingAlternativesFor(item.id);
    try {
      const searchTerm = item.productName || item.brand || 'food';
      const results = await searchSimilarProducts(searchTerm, 12);
      const filtered = results.filter(
        (p) =>
          p.code !== item.barcode &&
          p.productName.toLowerCase() !== (item.productName || '').toLowerCase()
      );
      const safeAlternatives = filtered.filter((p) => {
        const { hasAllergyConflict: ac, hasSensitivityConflict: sc } = productMatchesUserRestrictions(
          p.allergens,
          preferences.allergies,
          preferences.sensitivities
        );
        return !ac && !sc;
      });
      const toShow = (safeAlternatives.length > 0 ? safeAlternatives : filtered.slice(0, 6)).slice(0, 3);
      alternativesCacheRef.current[key] = toShow;
      return toShow;
    } catch (err) {
      console.warn('Find alternatives failed:', err);
      return [];
    } finally {
      setLoadingAlternativesFor(null);
    }
  }, [preferences]);

  const [expandedAlternatives, setExpandedAlternatives] = useState<string | null>(null);
  const [alternativesData, setAlternativesData] = useState<Record<string, DiscoverProduct[]>>({});

  useEffect(() => {
    alternativesCacheRef.current = {};
  }, [preferences.allergies, preferences.sensitivities]);

  const handleFindAlternatives = useCallback(
    async (item: ScannedItem) => {
      if (expandedAlternatives === item.id) {
        setExpandedAlternatives(null);
        return;
      }
      setExpandedAlternatives(item.id);
      const alts = await fetchAlternatives(item);
      setAlternativesData((prev) => ({ ...prev, [item.id]: alts }));
    },
    [expandedAlternatives, fetchAlternatives]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 400));
    setRefreshing(false);
  }, []);

  const colorScheme = useColorScheme();

  if (!fontsLoaded) return null;

  return (
    <AppBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ThemedView lightColor="transparent" darkColor="transparent" style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {t('discover.title')}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {t('discover.subtitle')}
          </ThemedText>
          <TouchableOpacity
            style={styles.preferencesButton}
            onPress={() => router.push('/preferences' as any)}
          >
            <Ionicons name="settings-outline" size={20} color="#0a7ea4" />
            <ThemedText style={styles.preferencesButtonText}>
              {preferences.hasPreferences ? t('discover.editPreferences') : t('discover.setPreferences')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a7ea4" />
          }
        >
          {!preferences.hasPreferences && (
            <ThemedView lightColor="#FFF8E1" darkColor="#3D3500" style={styles.banner}>
              <Ionicons name="information-circle" size={24} color="#F57C00" />
              <ThemedText style={styles.bannerText}>
                {t('discover.addPreferencesBanner')}
              </ThemedText>
            </ThemedView>
          )}

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="sparkles-outline" size={64} color={Colors[colorScheme ?? 'light'].icon} />
              <ThemedText style={styles.emptyTitle}>{t('discover.noHistoryYet')}</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {t('discover.noHistorySubtitle')}
              </ThemedText>
            </View>
          ) : (
            <>
              {safeForYou.items.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    {safeForYou.title}
                  </ThemedText>
                  {safeForYou.subtitle && (
                    <ThemedText style={styles.sectionSubtitle}>{safeForYou.subtitle}</ThemedText>
                  )}
                  {safeForYou.items.map((item) => (
                    <ProductCard key={item.id} item={item} />
                  ))}
                </View>
              )}

              {notSafeForYou.items.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="subtitle" style={[styles.sectionTitle, styles.warningTitle]}>
                    {notSafeForYou.title}
                  </ThemedText>
                  {notSafeForYou.subtitle && (
                    <ThemedText style={styles.sectionSubtitle}>{notSafeForYou.subtitle}</ThemedText>
                  )}
                  {notSafeForYou.items.map((item) => (
                    <View key={item.id}>
                      <ProductCard
                        item={item}
                        showAlternatives
                        onPressAlternative={handleFindAlternatives}
                      />
                      {expandedAlternatives === item.id && (
                        <View style={styles.alternativesContainer}>
                          {loadingAlternativesFor === item.id ? (
                            <ActivityIndicator size="small" color="#0a7ea4" style={styles.loader} />
                          ) : (
                            <>
                              <ThemedText style={styles.alternativesLabel}>
                                {t('discover.saferAlternatives')}
                              </ThemedText>
                              {(alternativesData[item.id] ?? []).map((alt) => (
                                <AlternativeCard key={alt.code} product={alt} />
                              ))}
                              {(alternativesData[item.id] ?? []).length === 0 && (
                                <ThemedText style={styles.noAlternatives}>
                                  {t('discover.noAlternatives')}
                                </ThemedText>
                              )}
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {safeForYou.items.length === 0 && notSafeForYou.items.length === 0 && (
                <ThemedText style={styles.emptySubtitle}>
                  {t('discover.allInHistory')}
                </ThemedText>
              )}
            </>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
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
  preferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  preferencesButtonText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    color: '#0a7ea4',
    marginLeft: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    marginHorizontal: 24,
    marginBottom: 20,
    gap: 14,
  },
  bannerText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 18,
    marginBottom: 6,
  },
  warningTitle: { color: '#D32F2F' },
  sectionSubtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 14,
  },
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
  altCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.35)',
  },
  cardRow: { flexDirection: 'row' },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
  },
  altThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1, marginLeft: 14, justifyContent: 'center', minWidth: 0 },
  productName: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },
  altProductName: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  brand: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 6,
  },
  allergensHint: {
    fontFamily: 'OpenDyslexic',
    fontSize: 11,
    opacity: 0.8,
    marginBottom: 8,
  },
  tapHint: {
    fontFamily: 'OpenDyslexic',
    fontSize: 10,
    opacity: 0.65,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  alternativeButtonText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    color: '#0a7ea4',
    marginLeft: 8,
  },
  alternativesContainer: {
    marginLeft: 20,
    marginBottom: 18,
    paddingLeft: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    borderRadius: 2,
  },
  alternativesLabel: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 13,
    marginBottom: 10,
  },
  loader: { marginVertical: 20 },
  noAlternatives: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    opacity: 0.75,
    marginBottom: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
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
});

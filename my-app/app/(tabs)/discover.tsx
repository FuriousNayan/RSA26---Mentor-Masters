import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

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
  variant = 'safe',
}: {
  item: ScannedItem;
  onPressAlternative?: (item: ScannedItem) => void;
  showAlternatives?: boolean;
  variant?: 'safe' | 'warn';
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = Colors[colorScheme ?? 'light'].icon;

  const accentColor = variant === 'safe'
    ? (isDark ? Palette.mint : Palette.navy)
    : Palette.amber;
  const accentStripe = variant === 'safe' ? Palette.mint : Palette.amber;
  const accentTintBg = variant === 'safe'
    ? (isDark ? 'rgba(156,214,189,0.22)' : 'rgba(156,214,189,0.32)')
    : (isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)');

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
      <View style={[styles.cardAccent, { backgroundColor: accentStripe }]} />
      <View style={styles.cardRow}>
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
            <Ionicons name="nutrition-outline" size={28} color={iconColor} />
          </ThemedView>
        )}
        <View style={styles.cardContent}>
          <View style={[styles.statusPill, { backgroundColor: accentTintBg }]}>
            <Ionicons
              name={variant === 'safe' ? 'checkmark-circle' : 'warning'}
              size={11}
              color={accentColor}
            />
            <ThemedText style={[styles.statusPillText, { color: accentColor }]}>
              {variant === 'safe' ? 'Safe' : 'Caution'}
            </ThemedText>
          </View>
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
              style={[
                styles.alternativeButton,
                { backgroundColor: isDark ? 'rgba(156,214,189,0.20)' : 'rgba(9,25,107,0.08)' },
              ]}
              onPress={() => onPressAlternative(item)}
              activeOpacity={0.85}
            >
              <Ionicons name="swap-horizontal" size={15} color={Palette.navy} />
              <ThemedText style={[styles.alternativeButtonText, { color: Palette.navy }]}>
                Find alternatives
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

function AlternativeCard({ product }: { product: DiscoverProduct }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = Colors[colorScheme ?? 'light'].icon;

  const openProduct = () => {
    Linking.openURL(`https://world.openfoodfacts.org/product/${product.code}`);
  };

  return (
    <TouchableOpacity onPress={openProduct} activeOpacity={0.85}>
      <ThemedView
        lightColor="#EAF6F1"
        darkColor="#0E2A20"
        style={[
          styles.altCard,
          {
            borderColor: isDark ? 'rgba(156,214,189,0.35)' : 'rgba(156,214,189,0.55)',
          },
        ]}
      >
        <View style={styles.cardRow}>
          {product.imageUrl ? (
            <View style={[styles.altThumbnailWrap, { backgroundColor: isDark ? '#04081E' : '#FFFFFF' }]}>
              <Image source={{ uri: product.imageUrl }} style={styles.altThumbnail} contentFit="contain" />
            </View>
          ) : (
            <ThemedView
              lightColor="#DDF0E5"
              darkColor="#04081E"
              style={[styles.altThumbnailWrap, styles.thumbnailPlaceholder]}
            >
              <Ionicons name="nutrition-outline" size={22} color={iconColor} />
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
            <View style={styles.tapHintRow}>
              <Ionicons name="open-outline" size={11} color={Palette.emerald} />
              <ThemedText style={styles.tapHint}>View on Open Food Facts</ThemedText>
            </View>
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const emptyIconBg = useThemeColor(
    { light: 'rgba(156,214,189,0.30)', dark: 'rgba(156,214,189,0.18)' },
    'background'
  );

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
              style={[
                styles.preferencesButton,
                { backgroundColor: isDark ? 'rgba(156,214,189,0.20)' : 'rgba(9,25,107,0.08)' },
              ]}
              onPress={() => router.push('/preferences' as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="options-outline" size={18} color={Palette.indigo} />
              <ThemedText style={styles.preferencesButtonText}>
                {preferences.hasPreferences ? t('discover.editPreferences') : t('discover.setPreferences')}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={Palette.indigo} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.indigo} />
            }
          >
            {!preferences.hasPreferences && (
              <ThemedView
                lightColor="#FFFBEB"
                darkColor="#3B2E0A"
                style={[
                  styles.banner,
                  { borderColor: isDark ? 'rgba(245,158,11,0.30)' : 'rgba(245,158,11,0.35)' },
                ]}
              >
                <View style={[styles.bannerIconWrap, { backgroundColor: 'rgba(245,158,11,0.18)' }]}>
                  <Ionicons name="information-circle" size={22} color={Palette.amber} />
                </View>
                <ThemedText style={styles.bannerText}>
                  {t('discover.addPreferencesBanner')}
                </ThemedText>
              </ThemedView>
            )}

            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: emptyIconBg }]}>
                  <Ionicons name="sparkles" size={48} color={Palette.indigo} />
                </View>
                <ThemedText style={styles.emptyTitle}>{t('discover.noHistoryYet')}</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  {t('discover.noHistorySubtitle')}
                </ThemedText>
              </View>
            ) : (
              <>
                {safeForYou.items.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionIcon, { backgroundColor: 'rgba(156,214,189,0.30)' }]}>
                        <Ionicons name="shield-checkmark" size={18} color={Palette.navy} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>
                          {safeForYou.title}
                        </ThemedText>
                        {safeForYou.subtitle && (
                          <ThemedText style={styles.sectionSubtitle}>{safeForYou.subtitle}</ThemedText>
                        )}
                      </View>
                    </View>
                    {safeForYou.items.map((item) => (
                      <ProductCard key={item.id} item={item} variant="safe" />
                    ))}
                  </View>
                )}

                {notSafeForYou.items.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245,158,11,0.18)' }]}>
                        <Ionicons name="warning" size={18} color={Palette.amber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="subtitle" style={[styles.sectionTitle, styles.warningTitle]}>
                          {notSafeForYou.title}
                        </ThemedText>
                        {notSafeForYou.subtitle && (
                          <ThemedText style={styles.sectionSubtitle}>{notSafeForYou.subtitle}</ThemedText>
                        )}
                      </View>
                    </View>
                    {notSafeForYou.items.map((item) => (
                      <View key={item.id}>
                        <ProductCard
                          item={item}
                          showAlternatives
                          onPressAlternative={handleFindAlternatives}
                          variant="warn"
                        />
                        {expandedAlternatives === item.id && (
                          <View
                            style={[
                              styles.alternativesContainer,
                              { borderLeftColor: Palette.emerald },
                            ]}
                          >
                            {loadingAlternativesFor === item.id ? (
                              <ActivityIndicator
                                size="small"
                                color={Palette.emerald}
                                style={styles.loader}
                              />
                            ) : (
                              <>
                                <View style={styles.alternativesLabelRow}>
                                  <Ionicons name="leaf" size={14} color={Palette.emerald} />
                                  <ThemedText style={styles.alternativesLabel}>
                                    {t('discover.saferAlternatives')}
                                  </ThemedText>
                                </View>
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
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12 },
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
    marginBottom: 14,
  },
  preferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 8,
  },
  preferencesButtonText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 13,
    color: Palette.indigo,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginHorizontal: 22,
    marginBottom: 18,
    gap: 12,
    borderWidth: 1,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 18,
    marginBottom: 2,
  },
  warningTitle: { color: Palette.amber },
  sectionSubtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    opacity: 0.72,
    lineHeight: 18,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    paddingLeft: 22,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
      },
      android: { elevation: 3 },
    }),
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  altCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardRow: { flexDirection: 'row' },
  thumbnailWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 6,
  },
  altThumbnailWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    padding: 5,
  },
  thumbnail: { width: '100%', height: '100%' },
  altThumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  cardContent: { flex: 1, marginLeft: 14, justifyContent: 'center', minWidth: 0 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  statusPillText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
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
    opacity: 0.7,
    marginBottom: 6,
  },
  allergensHint: {
    fontFamily: 'OpenDyslexic',
    fontSize: 11,
    opacity: 0.78,
    marginBottom: 6,
    lineHeight: 16,
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapHint: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 10,
    color: Palette.navy,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  alternativeButtonText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 12,
  },
  alternativesContainer: {
    marginLeft: 12,
    marginBottom: 16,
    paddingLeft: 14,
    borderLeftWidth: 3,
    borderRadius: 2,
  },
  alternativesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  alternativesLabel: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 12,
    color: Palette.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loader: { marginVertical: 18 },
  noAlternatives: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    opacity: 0.72,
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
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
});

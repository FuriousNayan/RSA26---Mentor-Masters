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
import { Colors, Palette, getAllergySensitivityBranch } from '@/constants/theme';
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

function normalizeBarcode(code: string): string {
  const digits = String(code || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(13, '0');
}

function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectHistoryExclusions(scanItems: ScannedItem[], sourceItem: ScannedItem) {
  const codes = new Set<string>();
  const nameKeys = new Set<string>();
  for (const it of scanItems) {
    const bc = normalizeBarcode(it.barcode);
    if (bc) codes.add(bc);
    const nk = normalizeNameKey(it.productName || '');
    if (nk.length > 2) nameKeys.add(nk);
  }
  const sb = normalizeBarcode(sourceItem.barcode);
  if (sb) codes.add(sb);
  const snk = normalizeNameKey(sourceItem.productName || '');
  if (snk.length > 2) nameKeys.add(snk);
  return { codes, nameKeys };
}

function isAlternativeExcluded(
  p: DiscoverProduct,
  exclusions: { codes: Set<string>; nameKeys: Set<string> },
  sourceItem: ScannedItem
): boolean {
  const pc = normalizeBarcode(p.code);
  if (pc && exclusions.codes.has(pc)) return true;
  const pnk = normalizeNameKey(p.productName || '');
  if (pnk.length > 2 && exclusions.nameKeys.has(pnk)) return true;
  const srcNk = normalizeNameKey(sourceItem.productName || '');
  if (srcNk.length > 2 && pnk === srcNk) return true;
  return false;
}

function dedupeByCode(products: DiscoverProduct[]): DiscoverProduct[] {
  const seen = new Set<string>();
  const out: DiscoverProduct[] = [];
  for (const p of products) {
    const c = normalizeBarcode(p.code);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(p);
  }
  return out;
}

async function fetchAlternativesPool(
  item: ScannedItem,
  scanItems: ScannedItem[],
  preferences: UserPreferences
): Promise<DiscoverProduct[]> {
  const exclusions = collectHistoryExclusions(scanItems, item);
  const primary = item.productName || item.brand || 'food';
  let results = await searchSimilarProducts(primary, 48);
  const brand = (item.brand || '').trim();
  if (brand.length > 0) {
    const extra = await searchSimilarProducts(brand, 48);
    results = dedupeByCode([...results, ...extra]);
  }
  results = dedupeByCode(results);

  const safe: DiscoverProduct[] = [];
  const seenSafe = new Set<string>();

  for (const p of results) {
    if (isAlternativeExcluded(p, exclusions, item)) continue;
    const c = normalizeBarcode(p.code);
    if (!c || seenSafe.has(c)) continue;
    const { hasAllergyConflict, hasSensitivityConflict } = productMatchesUserRestrictions(
      p.allergens,
      preferences.allergies,
      preferences.sensitivities
    );
    if (hasAllergyConflict || hasSensitivityConflict) continue;
    seenSafe.add(c);
    safe.push(p);
  }

  return safe;
}

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

  const sensTok = getAllergySensitivityBranch(isDark ? 'dark' : 'light', 'sensitivity');

  const accentColor = variant === 'safe'
    ? (isDark ? Palette.mint : Palette.navy)
    : sensTok.chipText;
  const accentStripe = variant === 'safe' ? Palette.mint : sensTok.accent;
  const accentTintBg = variant === 'safe'
    ? (isDark ? 'rgba(156,214,189,0.22)' : 'rgba(156,214,189,0.32)')
    : sensTok.chipBg;

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
  const alternativesPoolRef = useRef<Record<string, DiscoverProduct[]>>({});
  const [alternativesData, setAlternativesData] = useState<Record<string, DiscoverProduct[]>>({});
  const [alternativesPoolTotal, setAlternativesPoolTotal] = useState<Record<string, number>>({});
  const { t } = useLanguage();
  const { safeForYou, notSafeForYou } = useRecommendations(items, preferences);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const sensUi = getAllergySensitivityBranch(isDark ? 'dark' : 'light', 'sensitivity');

  const emptyIconBg = useThemeColor(
    { light: 'rgba(156,214,189,0.30)', dark: 'rgba(156,214,189,0.18)' },
    'background'
  );

  const [fontsLoaded] = useFonts({
    OpenDyslexic: require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  useEffect(() => {
    alternativesPoolRef.current = {};
    setAlternativesData({});
    setAlternativesPoolTotal({});
  }, [preferences.allergies, preferences.sensitivities]);

  const [expandedAlternatives, setExpandedAlternatives] = useState<string | null>(null);

  const handleLoadMoreAlternatives = useCallback(
    (item: ScannedItem) => {
      const prefKey = [...preferences.allergies, ...preferences.sensitivities].sort().join('|');
      const poolKey = `${item.id}:${prefKey}`;
      const pool = alternativesPoolRef.current[poolKey];
      if (!pool?.length) return;
      setAlternativesData((prev) => {
        const shown = prev[item.id] ?? [];
        const nextLen = Math.min(shown.length + 3, pool.length);
        return { ...prev, [item.id]: pool.slice(0, nextLen) };
      });
    },
    [preferences.allergies, preferences.sensitivities]
  );

  const handleFindAlternatives = useCallback(
    async (item: ScannedItem) => {
      if (expandedAlternatives === item.id) {
        setExpandedAlternatives(null);
        return;
      }
      setExpandedAlternatives(item.id);
      const prefKey = [...preferences.allergies, ...preferences.sensitivities].sort().join('|');
      const poolKey = `${item.id}:${prefKey}`;
      const existingPool = alternativesPoolRef.current[poolKey];
      setLoadingAlternativesFor(item.id);
      try {
        const pool = existingPool ?? (await fetchAlternativesPool(item, items, preferences));
        alternativesPoolRef.current[poolKey] = pool;
        setAlternativesPoolTotal((prev) => ({ ...prev, [item.id]: pool.length }));
        setAlternativesData((prev) => ({ ...prev, [item.id]: pool.slice(0, 3) }));
      } catch (err) {
        console.warn('Find alternatives failed:', err);
        setAlternativesData((prev) => ({ ...prev, [item.id]: [] }));
        setAlternativesPoolTotal((prev) => ({ ...prev, [item.id]: 0 }));
      } finally {
        setLoadingAlternativesFor(null);
      }
    },
    [expandedAlternatives, preferences, items]
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
                lightColor={sensUi.chipBg}
                darkColor="rgba(245, 158, 11, 0.14)"
                style={[
                  styles.banner,
                  { borderColor: sensUi.chipBorder },
                ]}
              >
                <View style={[styles.bannerIconWrap, { backgroundColor: sensUi.accentSoft }]}>
                  <Ionicons name="information-circle" size={22} color={sensUi.chipIcon} />
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
                      <View style={[styles.sectionIcon, { backgroundColor: sensUi.chipBg }]}>
                        <Ionicons name="warning" size={18} color={sensUi.chipIcon} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="subtitle" style={[styles.sectionTitle, { color: sensUi.chipText }]}>
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
                                {(alternativesData[item.id] ?? []).length > 0 &&
                                  (alternativesData[item.id] ?? []).length <
                                    (alternativesPoolTotal[item.id] ?? 0) && (
                                    <TouchableOpacity
                                      style={[
                                        styles.moreAlternativesBtn,
                                        {
                                          backgroundColor: isDark
                                            ? 'rgba(156,214,189,0.18)'
                                            : 'rgba(9,25,107,0.08)',
                                        },
                                      ]}
                                      onPress={() => handleLoadMoreAlternatives(item)}
                                      activeOpacity={0.85}
                                    >
                                      <Ionicons name="add-circle-outline" size={18} color={Palette.navy} />
                                      <ThemedText style={styles.moreAlternativesText}>
                                        {t('discover.moreAlternatives')}
                                      </ThemedText>
                                    </TouchableOpacity>
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
  moreAlternativesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignSelf: 'stretch',
  },
  moreAlternativesText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 13,
    color: Palette.navy,
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

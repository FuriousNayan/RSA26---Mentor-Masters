import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useScanHistory } from '@/contexts/scan-history-context';
import { useLanguage } from '@/contexts/language-context';
import {
  BrandGradient,
  BrandGradientSecondary,
  Palette,
} from '@/constants/theme';

export default function HomeScreen() {
  const { addItem } = useScanHistory();
  const { t } = useLanguage();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [foodData, setFoodData] = useState<any>(null);
  const isProcessingRef = useRef(false);

  const [fontsLoaded] = useFonts({
    'OpenDyslexic': require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  const heroBg = useThemeColor(
    { light: 'rgba(255,255,255,0.78)', dark: 'rgba(11,22,84,0.78)' },
    'background'
  );
  const heroBorder = useThemeColor(
    { light: 'rgba(255,255,255,0.9)', dark: 'rgba(255,255,255,0.06)' },
    'background'
  );
  const featurePillBg = useThemeColor(
    { light: 'rgba(255,255,255,0.7)', dark: 'rgba(255,255,255,0.04)' },
    'background'
  );
  const featurePillBorder = useThemeColor(
    { light: 'rgba(9,25,107,0.10)', dark: 'rgba(255,255,255,0.06)' },
    'background'
  );
  const featureColor = useThemeColor({ light: '#1F2A55', dark: '#A8B3D8' }, 'text');
  const macroBg = useThemeColor(
    { light: '#FFFFFF', dark: '#0B1654' },
    'background'
  );
  const macroBorder = useThemeColor(
    { light: 'rgba(9,25,107,0.10)', dark: 'rgba(255,255,255,0.06)' },
    'background'
  );
  const macroLabelColor = useThemeColor({ light: '#5B6786', dark: '#A8B3D8' }, 'text');
  const macroTextColor = useThemeColor({ light: '#09196B', dark: '#F2F8FF' }, 'text');
  const cardBg = useThemeColor(
    { light: '#FFFFFF', dark: '#0B1654' },
    'background'
  );
  const cardBorder = useThemeColor(
    { light: 'rgba(9,25,107,0.10)', dark: 'rgba(255,255,255,0.06)' },
    'background'
  );
  const brandColor = Palette.navy;
  const brandHalo = Palette.mint;

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setScanned(true);
    setIsLoading(true);
    setIsCameraOpen(false);

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const json = await response.json();

      if (json.status === 1) {
        const product = json.product;
        setFoodData(product);
        addItem({
          barcode: data,
          productName: product.product_name || 'Unknown Product',
          brand: product.brands || 'Unknown Brand',
          imageUrl: product.image_url || null,
          allergens: getAllergens(product),
        });
      } else {
        alert(t('home.productNotFound'));
        setFoodData(null);
      }
    } catch (error) {
      console.error(error);
      alert(t('home.networkError'));
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setFoodData(null);
    isProcessingRef.current = false;
  };

  const getAllergens = (product: any) => {
    if (product.allergens_tags && product.allergens_tags.length > 0) {
      return product.allergens_tags
        .map((tag: string) => tag.replace(/^[a-z]+:/, ''))
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(', ');
    }

    if (product.allergens && product.allergens.trim().length > 0) {
      return product.allergens
        .split(',')
        .map((a: string) => a.replace(/^[a-z]+:/, '').trim())
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(', ');
    }

    let rawText = product.ingredients_text_en || product.ingredients_text || '';
    if (rawText) {
      const containsMatch = rawText.match(/contains\s*:?\s*([^.]*)/i);
      if (containsMatch && containsMatch[1]) {
        let foundAllergens = containsMatch[1].trim().replace(/_/g, '').replace(/\s+/g, ' ');
        if (foundAllergens.length > 2) return foundAllergens;
      }
    }

    return 'None detected by database. (Always double check packaging!)';
  };

  if (!fontsLoaded) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={brandColor} />
      </ThemedView>
    );
  }

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <AppBackground>
        <SafeAreaView style={styles.centerContainer} edges={['top']}>
          <View style={[styles.permissionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.permissionIconWrap, { backgroundColor: `${brandHalo}40` }]}>
              <Ionicons name="camera-outline" size={40} color={brandColor} />
            </View>
            <ThemedText style={styles.permissionTitle}>{t('home.cameraAccessNeeded')}</ThemedText>
            <ThemedText style={styles.permissionText}>
              {t('home.cameraPermissionText')}
            </ThemedText>
            <TouchableOpacity
              style={styles.gradientButtonWrap}
              onPress={requestPermission}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[...BrandGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <ThemedText style={styles.gradientButtonText}>
                  {t('home.grantPermission')}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  if (isLoading) {
    return (
      <AppBackground>
        <SafeAreaView style={styles.centerContainer} edges={['top']}>
          <View style={[styles.loadingCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <ActivityIndicator size="large" color={brandColor} />
            <ThemedText style={styles.loadingText}>{t('home.lookingUpData')}</ThemedText>
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  if (foodData) {
    const nutriments = foodData.nutriments || {};
    const calories = nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || '--';
    const fat = nutriments['fat_serving'] || nutriments['fat_100g'] || '--';
    const carbs = nutriments['carbohydrates_serving'] || nutriments['carbohydrates_100g'] || '--';
    const protein = nutriments['proteins_serving'] || nutriments['proteins_100g'] || '--';

    return (
      <AppBackground>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            style={styles.resultsContainer}
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backButton} onPress={resetScanner} activeOpacity={0.7}>
              <View style={[styles.backButtonIcon, { backgroundColor: `${brandHalo}40` }]}>
                <Ionicons name="arrow-back" size={18} color={brandColor} />
              </View>
              <ThemedText style={[styles.backButtonText, { color: brandColor }]}>
                {t('home.scanAnother')}
              </ThemedText>
            </TouchableOpacity>

            {foodData.image_url && (
              <View style={[styles.productImageWrap, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Image
                  source={{ uri: foodData.image_url }}
                  style={styles.productImage}
                  contentFit="contain"
                />
              </View>
            )}

            <ThemedText type="title" style={[styles.productTitle, { flexShrink: 1 }]}>
              {foodData.product_name || 'Unknown Product'}
            </ThemedText>

            <ThemedText style={[styles.brandText, { color: macroLabelColor }]}>
              {foodData.brands || 'Unknown Brand'}
            </ThemedText>

            <View style={styles.nutritionRow}>
              {[
                { label: t('home.calories'), value: `${calories}` },
                { label: t('home.fat'), value: `${fat}g` },
                { label: t('home.carbs'), value: `${carbs}g` },
                { label: t('home.protein'), value: `${protein}g` },
              ].map((macro) => (
                <View
                  key={macro.label}
                  style={[styles.macroBox, { backgroundColor: macroBg, borderColor: macroBorder }]}
                >
                  <ThemedText
                    style={[styles.macroLabel, { color: macroLabelColor }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {macro.label}
                  </ThemedText>
                  <ThemedText
                    style={[styles.macroValue, { color: macroTextColor }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {macro.value}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={[styles.dataCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.dataCardHeader}>
                <View style={[styles.dataCardIcon, { backgroundColor: `${Palette.rose}1F` }]}>
                  <Ionicons name="alert-circle" size={20} color={Palette.rose} />
                </View>
                <ThemedText
                  type="subtitle"
                  style={[styles.sectionTitle, { color: Palette.rose }]}
                >
                  {t('home.containsAllergens')}
                </ThemedText>
              </View>
              <ThemedText style={[styles.bodyText, { color: macroTextColor }]}>
                {getAllergens(foodData)}
              </ThemedText>
            </View>
          </ScrollView>
        </SafeAreaView>
      </AppBackground>
    );
  }

  if (isCameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["upc_a", "upc_e", "ean13", "ean8", "qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent']}
            style={styles.cameraTopFade}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.cameraBottomFade}
            pointerEvents="none"
          />
          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              onPress={() => setIsCameraOpen(false)}
              style={styles.cameraCloseBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerTarget}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.scannerTextWrap}>
              <ThemedText style={styles.scannerText}>{t('home.pointAtBarcode')}</ThemedText>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={styles.mainWrapper} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.heroCard,
              { backgroundColor: heroBg, borderColor: heroBorder },
            ]}
          >
            <View style={styles.heroMascotWrap}>
              <Image
                source={require('@/assets/images/nutrinav-mascot.png')}
                style={styles.heroMascot}
                contentFit="contain"
                accessibilityRole="image"
                accessibilityLabel="NutriNav mascot"
              />
            </View>

            <ThemedText type="title" style={styles.titleText}>
              {t('home.title')}
            </ThemedText>
            <ThemedText style={styles.subtitleText}>
              {t('home.subtitle')}
            </ThemedText>
          </View>

          <View style={styles.featuresRow}>
            {[
              { icon: 'shield-checkmark' as const, label: t('home.allergyCheck') },
              { icon: 'leaf' as const, label: t('home.nutritionFacts') },
              { icon: 'flash' as const, label: t('home.instantScan') },
            ].map((feat) => (
              <View
                key={feat.label}
                style={[
                  styles.featurePill,
                  { backgroundColor: featurePillBg, borderColor: featurePillBorder },
                ]}
              >
                <Ionicons name={feat.icon} size={20} color={brandColor} />
                <ThemedText
                  style={[styles.featureText, { color: featureColor }]}
                  numberOfLines={2}
                >
                  {feat.label}
                </ThemedText>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButtonWrap}
            activeOpacity={0.88}
            onPress={() => {
              setScanned(false);
              isProcessingRef.current = false;
              setIsCameraOpen(true);
            }}
          >
            <LinearGradient
              colors={[...BrandGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <View
                style={[
                  styles.primaryButtonIconWrap,
                  { backgroundColor: 'rgba(9,25,107,0.14)' },
                ]}
              >
                <Ionicons name="scan-outline" size={24} color="#09196B" />
              </View>
              <ThemedText style={[styles.primaryButtonText, { color: '#09196B' }]}>
                {t('home.tapToScan')}
              </ThemedText>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButtonWrap}
            activeOpacity={0.88}
            onPress={() => router.push('/preferences')}
          >
            <LinearGradient
              colors={[...BrandGradientSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <View style={styles.primaryButtonIconWrap}>
                <Ionicons name="options-outline" size={24} color="#FFF" />
              </View>
              <ThemedText style={styles.primaryButtonText}>{t('home.myPreferences')}</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: 28,
    padding: 28,
    paddingTop: 32,
    paddingBottom: 32,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  heroMascotWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  /** Source art is 2816×1536 (wide); aspect keeps letterboxing minimal. */
  heroMascot: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 2816 / 1536,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#09196B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 18,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  titleText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 30,
    lineHeight: 42,
    textAlign: 'center',
    includeFontPadding: Platform.OS === 'android',
  },
  subtitleText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 15,
    lineHeight: 23,
    opacity: 0.78,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  featurePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    minHeight: 80,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 15,
  },
  primaryButtonWrap: {
    width: '100%',
    borderRadius: 20,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#09196B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  primaryButtonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  primaryButtonText: {
    fontFamily: 'OpenDyslexic-Bold',
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 1,
    minWidth: 220,
  },
  permissionCard: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    padding: 28,
    borderRadius: 28,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 6 },
    }),
  },
  permissionIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  permissionTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.78,
    textAlign: 'center',
    marginBottom: 24,
  },
  gradientButtonWrap: {
    width: '100%',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#09196B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientButtonText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 16,
    color: '#09196B',
    letterSpacing: 0.2,
  },
  loadingText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 15,
    marginTop: 16,
    opacity: 0.85,
    textAlign: 'center',
  },
  cameraContainer: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraTopFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 5,
  },
  cameraBottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 5,
  },
  cameraTopBar: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  cameraCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTarget: {
    width: 280,
    height: 280,
    marginBottom: 28,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#FFFFFF',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
  scannerTextWrap: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  scannerText: {
    fontFamily: 'OpenDyslexic-Bold',
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  resultsContainer: { flex: 1 },
  resultsContent: {
    padding: 22,
    paddingTop: 8,
    paddingBottom: 120,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backButtonText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 15,
  },
  productImageWrap: {
    width: '100%',
    height: 240,
    borderRadius: 24,
    marginBottom: 22,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 26,
    marginBottom: 4,
    lineHeight: 34,
  },
  brandText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 15,
    marginBottom: 20,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 8,
  },
  macroBox: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  macroLabel: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  macroValue: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 17,
  },
  dataCard: {
    padding: 20,
    borderRadius: 22,
    marginBottom: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 17,
  },
  bodyText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 15,
    lineHeight: 24,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
});

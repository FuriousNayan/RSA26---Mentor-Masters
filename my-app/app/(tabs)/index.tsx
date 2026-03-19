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
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useScanHistory } from '@/contexts/scan-history-context';
import { useLanguage } from '@/contexts/language-context';

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

  const cardBg = useThemeColor(
    { light: '#FEF7F6', dark: '#2A1F1E' },
    'background'
  );
  const iconTint = useThemeColor({ light: '#FF6B6B', dark: '#FF8A7A' }, 'tint');
  const featureColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'icon');
  const macroBg = useThemeColor({ light: '#FFFFFF', dark: '#2A2A2A' }, 'background');
  const macroTextColor = useThemeColor({ light: '#333', dark: '#ECEDEE' }, 'text');

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
        <ActivityIndicator size="large" color="#FF6B6B" />
      </ThemedView>
    );
  }

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <ThemedView style={styles.centerContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={56} color="#FF6B6B" style={{ marginBottom: 16 }} />
          <ThemedText style={styles.permissionTitle}>{t('home.cameraAccessNeeded')}</ThemedText>
          <ThemedText style={styles.permissionText}>
            {t('home.cameraPermissionText')}
          </ThemedText>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <ThemedText style={styles.permissionButtonText}>{t('home.grantPermission')}</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <ThemedText style={styles.loadingText}>{t('home.lookingUpData')}</ThemedText>
      </ThemedView>
    );
  }

  if (foodData) {
    const nutriments = foodData.nutriments || {};
    const calories = nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || '--';
    const fat = nutriments['fat_serving'] || nutriments['fat_100g'] || '--';
    const carbs = nutriments['carbohydrates_serving'] || nutriments['carbohydrates_100g'] || '--';
    const protein = nutriments['proteins_serving'] || nutriments['proteins_100g'] || '--';

    return (
      <ThemedView style={styles.resultsWrapper}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={styles.resultsContainer}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={resetScanner} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={iconTint} />
            <ThemedText style={styles.backButtonText}>{t('home.scanAnother')}</ThemedText>
          </TouchableOpacity>

          {foodData.image_url && (
            <Image source={{ uri: foodData.image_url }} style={styles.productImage} contentFit="contain" />
          )}

          <ThemedText type="title" style={[styles.productTitle, { flexShrink: 1 }]}>
            {foodData.product_name || 'Unknown Product'}
          </ThemedText>

          <ThemedText style={styles.brandText}>
            {foodData.brands || 'Unknown Brand'}
          </ThemedText>

          <View style={styles.nutritionRow}>
            <View style={[styles.macroBox, { backgroundColor: macroBg }]}>
              <ThemedText style={styles.macroLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.calories')}</ThemedText>
              <ThemedText style={[styles.macroValue, { color: macroTextColor }]} numberOfLines={1} adjustsFontSizeToFit>{calories}</ThemedText>
            </View>
            <View style={[styles.macroBox, { backgroundColor: macroBg }]}>
              <ThemedText style={styles.macroLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.fat')}</ThemedText>
              <ThemedText style={[styles.macroValue, { color: macroTextColor }]} numberOfLines={1} adjustsFontSizeToFit>{fat}g</ThemedText>
            </View>
            <View style={[styles.macroBox, { backgroundColor: macroBg }]}>
              <ThemedText style={styles.macroLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.carbs')}</ThemedText>
              <ThemedText style={[styles.macroValue, { color: macroTextColor }]} numberOfLines={1} adjustsFontSizeToFit>{carbs}g</ThemedText>
            </View>
            <View style={[styles.macroBox, { backgroundColor: macroBg }]}>
              <ThemedText style={styles.macroLabel} numberOfLines={1} adjustsFontSizeToFit>{t('home.protein')}</ThemedText>
              <ThemedText style={[styles.macroValue, { color: macroTextColor }]} numberOfLines={1} adjustsFontSizeToFit>{protein}g</ThemedText>
            </View>
          </View>

          <View style={[styles.dataCard, { borderColor: '#FF6B6B', borderWidth: 2 }]}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: '#FF6B6B' }]}>
              {t('home.containsAllergens')}
            </ThemedText>
            <ThemedText style={styles.bodyText}>
              {getAllergens(foodData)}
            </ThemedText>
          </View>
        </ScrollView>
        </SafeAreaView>
      </ThemedView>
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
          <View style={styles.cameraTopBar}>
            <TouchableOpacity onPress={() => setIsCameraOpen(false)}>
              <Ionicons name="close-circle" size={40} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerTarget} />
            <ThemedText style={styles.scannerText}>{t('home.pointAtBarcode')}</ThemedText>
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
        <View style={[styles.heroCard, { backgroundColor: cardBg }]}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.titleText}>
              {t('home.title')}
            </ThemedText>
          </View>
          <ThemedText style={styles.subtitleText}>
            {t('home.subtitle')}
          </ThemedText>
          <View style={[styles.iconCircle, { backgroundColor: `${iconTint}18` }]}>
            <Ionicons name="barcode-outline" size={48} color={iconTint} />
          </View>
        </View>

        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark-outline" size={22} color={iconTint} />
            <ThemedText style={[styles.featureText, { color: featureColor }]}>{t('home.allergyCheck')}</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="nutrition-outline" size={22} color={iconTint} />
            <ThemedText style={[styles.featureText, { color: featureColor }]}>{t('home.nutritionFacts')}</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="flash-outline" size={22} color={iconTint} />
            <ThemedText style={[styles.featureText, { color: featureColor }]}>{t('home.instantScan')}</ThemedText>
          </View>
        </View>

        <TouchableOpacity
          style={styles.scanButton}
          activeOpacity={0.85}
          onPress={() => {
            setScanned(false);
            isProcessingRef.current = false;
            setIsCameraOpen(true);
          }}
        >
          <Ionicons name="scan-outline" size={26} color="#FFF" style={styles.buttonIcon} />
          <ThemedText style={styles.scanButtonText}>{t('home.tapToScan')}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.preferencesButton}
          activeOpacity={0.85}
          onPress={() => router.push('/preferences')}
        >
          <Ionicons name="settings-outline" size={26} color="#FFF" style={styles.buttonIcon} />
          <ThemedText style={styles.scanButtonText}>{t('home.myPreferences')}</ThemedText>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 28,
    paddingTop: 32,
    paddingBottom: 32,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  titleText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 34,
    lineHeight: 48,
    includeFontPadding: Platform.OS === 'android',
  },
  subtitleText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.85,
    marginBottom: 28,
    textAlign: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
  },
  featureText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  preferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B8EFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    marginTop: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#6B8EFF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonIcon: { marginRight: 12 },
  scanButtonText: {
    fontFamily: 'OpenDyslexic-Bold',
    color: '#FFFFFF',
    fontSize: 19,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    alignItems: 'center',
    maxWidth: 320,
  },
  permissionTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  permissionButtonText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 16,
    color: '#FFF',
  },
  loadingText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
    marginTop: 20,
    opacity: 0.9,
  },
  cameraContainer: { flex: 1, justifyContent: 'center', backgroundColor: '#0D0D0D' },
  camera: { flex: 1 },
  cameraTopBar: { paddingTop: 60, paddingHorizontal: 20, alignItems: 'flex-start', zIndex: 10 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scannerTarget: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'transparent',
    borderRadius: 24,
    marginBottom: 24,
  },
  scannerText: {
    fontFamily: 'OpenDyslexic-Bold',
    color: 'white',
    fontSize: 17,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  resultsWrapper: { flex: 1 },
  resultsContainer: { flex: 1 },
  resultsContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    paddingRight: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
    marginLeft: 8,
  },
  productImage: {
    width: '100%',
    height: 220,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  productTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 26,
    marginBottom: 6,
    lineHeight: 34,
  },
  brandText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
  macroBox: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  macroLabel: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 9,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  macroValue: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 17,
  },
  dataCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 18,
    marginBottom: 10,
  },
  bodyText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 16,
    lineHeight: 26,
    color: '#444',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
});
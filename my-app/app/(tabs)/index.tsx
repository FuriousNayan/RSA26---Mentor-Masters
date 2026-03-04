import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, View, Button, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFonts } from 'expo-font'; 

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScanHistory } from '@/contexts/scan-history-context';

export default function HomeScreen() {
  const { addItem } = useScanHistory();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [foodData, setFoodData] = useState<any>(null);

  const [fontsLoaded] = useFonts({
    'OpenDyslexic': require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
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
        alert('Product not found in the database. Try another item!');
        setFoodData(null);
      }
    } catch (error) {
      console.error(error);
      alert('Network error. Could not fetch food data.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setFoodData(null);
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={{ textAlign: 'center', marginBottom: 20, fontFamily: 'OpenDyslexic' }}>
          NutriNav needs your permission to show the camera
        </ThemedText>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <ThemedText style={{ marginTop: 20, fontFamily: 'OpenDyslexic' }}>Looking up food data...</ThemedText>
      </View>
    );
  }

  if (foodData) {
    const nutriments = foodData.nutriments || {};
    const calories = nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || '--';
    const fat = nutriments['fat_serving'] || nutriments['fat_100g'] || '--';
    const carbs = nutriments['carbohydrates_serving'] || nutriments['carbohydrates_100g'] || '--';
    const protein = nutriments['proteins_serving'] || nutriments['proteins_100g'] || '--';

    return (
      <ScrollView style={styles.resultsContainer} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <TouchableOpacity style={styles.backButton} onPress={resetScanner}>
          <Ionicons name="arrow-back" size={24} color="#333" />
          <ThemedText style={styles.backButtonText}>Scan Another Item</ThemedText>
        </TouchableOpacity>

        {foodData.image_url && (
          <Image source={{ uri: foodData.image_url }} style={styles.productImage} contentFit="contain" />
        )}

        {/* Added flexShrink to prevent text from pushing layout bounds */}
        <ThemedText type="title" style={[styles.productTitle, { flexShrink: 1 }]}>
          {foodData.product_name || 'Unknown Product'}
        </ThemedText>
        
        <ThemedText style={styles.brandText}>
          {foodData.brands || 'Unknown Brand'}
        </ThemedText>

        <View style={styles.nutritionRow}>
          <View style={styles.macroBox}>
            <ThemedText style={styles.macroLabel}>Calories</ThemedText>
            <ThemedText style={styles.macroValue}>{calories}</ThemedText>
          </View>
          <View style={styles.macroBox}>
            <ThemedText style={styles.macroLabel}>Fat</ThemedText>
            <ThemedText style={styles.macroValue}>{fat}g</ThemedText>
          </View>
          <View style={styles.macroBox}>
            <ThemedText style={styles.macroLabel}>Carbs</ThemedText>
            <ThemedText style={styles.macroValue}>{carbs}g</ThemedText>
          </View>
          <View style={styles.macroBox}>
            <ThemedText style={styles.macroLabel}>Protein</ThemedText>
            <ThemedText style={styles.macroValue}>{protein}g</ThemedText>
          </View>
        </View>

        <View style={[styles.dataCard, { borderColor: '#FF6B6B', borderWidth: 2 }]}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: '#FF6B6B' }]}>
            Contains Allergens:
          </ThemedText>
          <ThemedText style={styles.bodyText}>
            {getAllergens(foodData)}
          </ThemedText>
        </View>

      </ScrollView>
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
            <ThemedText style={styles.scannerText}>Point at a barcode</ThemedText>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#FFE4E1', dark: '#4A148C' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.headerImage}
          contentFit="contain"
        />
      }>
      <ThemedView style={styles.mainContainer}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={styles.titleText}>NutriNav</ThemedText>
          <HelloWave />
        </ThemedView>
        <ThemedText style={styles.subtitleText}>
          Scan your food for an instant allergy report.
        </ThemedText>
        <TouchableOpacity 
          style={styles.scanButton} 
          activeOpacity={0.8}
          onPress={() => {
            setScanned(false);
            setIsCameraOpen(true);
          }}
        >
          <Ionicons name="scan-outline" size={24} color="#FFF" style={styles.buttonIcon} />
          <ThemedText style={styles.scanButtonText}>Tap to Scan</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  
  // Removed custom letter spacing to allow natural wrapping
  titleText: { 
    fontFamily: 'OpenDyslexic-Bold', 
    fontSize: 40, 
    lineHeight: 48, 
    paddingHorizontal: 4 
  },
  subtitleText: { 
    fontFamily: 'OpenDyslexic',
    fontSize: 16, 
    textAlign: 'center', 
    opacity: 0.8, 
    marginBottom: 50, 
    lineHeight: 28, 
    paddingHorizontal: 15 
  },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B6B', paddingVertical: 18, paddingHorizontal: 32, borderRadius: 999, width: '100%', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  buttonIcon: { marginRight: 10 },
  scanButtonText: { 
    fontFamily: 'OpenDyslexic-Bold',
    color: '#FFFFFF', 
    fontSize: 18, 
  },
  headerImage: { height: '100%', width: '100%', bottom: -20, opacity: 0.5, position: 'absolute' },
  
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  cameraContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraTopBar: { paddingTop: 60, paddingHorizontal: 20, alignItems: 'flex-start', zIndex: 10 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scannerTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#00FF00', backgroundColor: 'transparent', borderRadius: 20, marginBottom: 20 },
  scannerText: { 
    fontFamily: 'OpenDyslexic-Bold',
    color: 'white', 
    fontSize: 18, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 10, 
    borderRadius: 10,
  },

  resultsContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButtonText: { 
    fontFamily: 'OpenDyslexic',
    fontSize: 16, 
    marginLeft: 8, 
    color: '#333',
  },
  productImage: { width: '100%', height: 200, marginBottom: 20, borderRadius: 10 },
  
  // Adjusted line height for better multi-line title wrapping
  productTitle: { 
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 28, 
    marginBottom: 4, 
    color: '#1A1A1A',
    lineHeight: 36, 
  },
  brandText: { 
    fontFamily: 'OpenDyslexic',
    fontSize: 16, 
    color: '#666', 
    marginBottom: 20,
  },
  
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  macroBox: { flex: 1, backgroundColor: 'white', paddingVertical: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  macroLabel: { 
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 11, // Slightly smaller to prevent squishing on narrow screens
    color: '#888', 
    textTransform: 'uppercase', 
    marginBottom: 4,
  },
  macroValue: { 
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 18, 
    color: '#333' 
  },

  dataCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  sectionTitle: { 
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 18, 
    marginBottom: 8,
  },
  // Increased line height and explicit flex mapping for smooth wrapping
  bodyText: { 
    fontFamily: 'OpenDyslexic-Bold', 
    fontSize: 16, // Reduced slightly to balance with the bold weight
    lineHeight: 26, 
    color: '#444',
    flexWrap: 'wrap', // Forces wrapping behavior
    flexShrink: 1 
  },
});
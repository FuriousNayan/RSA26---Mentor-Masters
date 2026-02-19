import { useState, useRef } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, View, Button, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [foodData, setFoodData] = useState<any>(null);
  const isProcessingRef = useRef(false);
  

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // 1. Check the lock. If it's already locked, ignore this scan completely!
    if (isProcessingRef.current) return; 
    
    // 2. Instantly lock the scanner
    isProcessingRef.current = true; 

    setScanned(true); 
    setIsLoading(true);
    setIsCameraOpen(false);

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const json = await response.json();

      if (json.status === 1) {
        setFoodData(json.product);
      } else {
        alert('Product not found in the database. Try another item!');
        setFoodData(null);
        // If it failed, we unlock it so they can try again without restarting the app
        isProcessingRef.current = false; 
      }
    } catch (error) {
      console.error(error);
      alert('Network error. Could not fetch food data.');
      isProcessingRef.current = false; // Unlock on error
    } finally {
      setIsLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setFoodData(null);
    // 3. Unlock the scanner when the user clicks "Scan Another Item"
    isProcessingRef.current = false; 
  };

  // NEW: Helper function to clean up the allergens array
  const formatAllergens = (tags: string[]) => {
    if (!tags || tags.length === 0) return 'None detected by database. (Always double check packaging!)';
    
    return tags
      .map(tag => tag.replace(/^[a-z]+:/, '')) // Removes the "en:" or "fr:" language prefix
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalizes the first letter
      .join(', '); // Joins them into a nice comma-separated list
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={{ textAlign: 'center', marginBottom: 20 }}>
          FoodBuddy needs your permission to show the camera
        </ThemedText>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <ThemedText style={{ marginTop: 20 }}>Looking up food data...</ThemedText>
      </View>
    );
  }

  // --- UI: The Results Screen ---
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

        <ThemedText type="title" style={styles.productTitle}>
          {foodData.product_name || 'Unknown Product'}
        </ThemedText>
        
        <ThemedText style={styles.brandText}>
          {foodData.brands || 'Unknown Brand'}
        </ThemedText>

        {/* NUTRITION FACTS */}
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

        {/* CLEAN ALLERGENS ONLY - Ingredients block is completely gone! */}
        <View style={[styles.dataCard, { borderColor: '#FF6B6B', borderWidth: 2 }]}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: '#FF6B6B' }]}>
            Contains Allergens:
          </ThemedText>
          <ThemedText style={[styles.bodyText, { fontWeight: 'bold', fontSize: 18 }]}>
            {formatAllergens(foodData.allergens_tags)}
          </ThemedText>
        </View>

      </ScrollView>
    );
  }

  // --- UI: The Camera Screen ---
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

  // --- UI: The Home Screen ---
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
          <ThemedText type="title" style={styles.titleText}>FoodBuddy</ThemedText>
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
  // Home Screen Styles
  mainContainer: { flex: 1, alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  titleText: { fontSize: 40, fontWeight: '900', letterSpacing: 0, lineHeight: 48, paddingHorizontal: 4 },
  subtitleText: { fontSize: 16, textAlign: 'center', opacity: 0.6, marginBottom: 50, lineHeight: 24, paddingHorizontal: 15 },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B6B', paddingVertical: 18, paddingHorizontal: 32, borderRadius: 999, width: '100%', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  buttonIcon: { marginRight: 10 },
  scanButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  headerImage: { height: '100%', width: '100%', bottom: -20, opacity: 0.5, position: 'absolute' },
  
  // Utility
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  // Camera Styles
  cameraContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraTopBar: { paddingTop: 60, paddingHorizontal: 20, alignItems: 'flex-start', zIndex: 10 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scannerTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#00FF00', backgroundColor: 'transparent', borderRadius: 20, marginBottom: 20 },
  scannerText: { color: 'white', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },

  // Results Styles
  resultsContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButtonText: { fontSize: 16, marginLeft: 8, color: '#333', fontWeight: '600' },
  productImage: { width: '100%', height: 200, marginBottom: 20, borderRadius: 10 },
  productTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 4, color: '#1A1A1A' },
  brandText: { fontSize: 16, color: '#666', marginBottom: 20 },
  
  // Nutrition Facts Styles
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  macroBox: { flex: 1, backgroundColor: 'white', paddingVertical: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  macroLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  macroValue: { fontSize: 18, fontWeight: '900', color: '#333' },

  dataCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  bodyText: { fontSize: 15, lineHeight: 22, color: '#444' },
});
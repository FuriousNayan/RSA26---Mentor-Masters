import { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useUserPreferences } from '@/contexts/user-preferences-context';
import { useLanguage } from '@/contexts/language-context';

const COMMON_ALLERGENS = [
  'Gluten',
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree nuts',
  'Peanuts',
  'Soy',
  'Sesame',
  'Mustard',
  'Celery',
  'Lupin',
  'Sulfites',
];

const COMMON_SENSITIVITIES = [
  'Lactose',
  'Gluten',
  'Fructose',
  'Histamine',
  'Artificial sweeteners',
  'MSG',
  'Sulfites',
  'Food dyes',
];

function Tag({
  label,
  onRemove,
  variant,
}: {
  label: string;
  onRemove: () => void;
  variant: 'allergy' | 'sensitivity';
}) {
  const bg = variant === 'allergy' ? 'rgba(211, 47, 47, 0.15)' : 'rgba(245, 124, 0, 0.15)';
  const color = variant === 'allergy' ? '#C62828' : '#E65100';

  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <ThemedText style={[styles.tagText, { color }]}>{label}</ThemedText>
      <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.tagRemove}>
        <Ionicons name="close-circle" size={18} color={color} />
      </TouchableOpacity>
    </View>
  );
}

export default function PreferencesScreen() {
  const {
    allergies,
    sensitivities,
    addAllergy,
    removeAllergy,
    addSensitivity,
    removeSensitivity,
  } = useUserPreferences();
  const { t } = useLanguage();
  const [newAllergy, setNewAllergy] = useState('');
  const [newSensitivity, setNewSensitivity] = useState('');

  const [fontsLoaded] = useFonts({
    OpenDyslexic: require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  if (!fontsLoaded) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('preferences.title'),
          headerBackTitle: t('common.back'),
          headerShadowVisible: false,
        }}
      />
      <AppBackground>
        <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {t('preferences.allergies')}
              </ThemedText>
              <ThemedText style={styles.sectionHint}>
                {t('preferences.allergiesHint')}
              </ThemedText>
              <View style={styles.tagRow}>
                {allergies.map((a) => (
                  <Tag key={a} label={a} variant="allergy" onRemove={() => removeAllergy(a)} />
                ))}
              </View>
              <View style={styles.quickAddRow}>
                {COMMON_ALLERGENS.filter((c) => !allergies.some((a) => a.toLowerCase() === c.toLowerCase())).map(
                  (c) => (
                    <TouchableOpacity
                      key={c}
                      style={styles.quickAddChip}
                      onPress={() => addAllergy(c)}
                    >
                      <ThemedText style={styles.quickAddText}>+ {c}</ThemedText>
                    </TouchableOpacity>
                  )
                )}
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder={t('preferences.addAllergyPlaceholder')}
                  placeholderTextColor="#999"
                  value={newAllergy}
                  onChangeText={setNewAllergy}
                  onSubmitEditing={() => {
                    if (newAllergy.trim()) {
                      addAllergy(newAllergy.trim());
                      setNewAllergy('');
                    }
                  }}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    if (newAllergy.trim()) {
                      addAllergy(newAllergy.trim());
                      setNewAllergy('');
                    }
                  }}
                >
                  <Ionicons name="add-circle" size={28} color="#0a7ea4" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {t('preferences.sensitivities')}
              </ThemedText>
              <ThemedText style={styles.sectionHint}>
                {t('preferences.sensitivitiesHint')}
              </ThemedText>
              <View style={styles.tagRow}>
                {sensitivities.map((s) => (
                  <Tag
                    key={s}
                    label={s}
                    variant="sensitivity"
                    onRemove={() => removeSensitivity(s)}
                  />
                ))}
              </View>
              <View style={styles.quickAddRow}>
                {COMMON_SENSITIVITIES.filter(
                  (c) => !sensitivities.some((s) => s.toLowerCase() === c.toLowerCase())
                ).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={styles.quickAddChip}
                    onPress={() => addSensitivity(c)}
                  >
                    <ThemedText style={styles.quickAddText}>+ {c}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder={t('preferences.addSensitivityPlaceholder')}
                  placeholderTextColor="#999"
                  value={newSensitivity}
                  onChangeText={setNewSensitivity}
                  onSubmitEditing={() => {
                    if (newSensitivity.trim()) {
                      addSensitivity(newSensitivity.trim());
                      setNewSensitivity('');
                    }
                  }}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    if (newSensitivity.trim()) {
                      addSensitivity(newSensitivity.trim());
                      setNewSensitivity('');
                    }
                  }}
                >
                  <Ionicons name="add-circle" size={28} color="#0a7ea4" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </AppBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 19,
    marginBottom: 8,
  },
  sectionHint: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    opacity: 0.75,
    marginBottom: 16,
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 24,
  },
  tagText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 14,
    marginRight: 4,
  },
  tagRemove: { padding: 4 },
  quickAddRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  quickAddChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 126, 164, 0.12)',
  },
  quickAddText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 13,
    color: '#0a7ea4',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.08)',
    color: '#333',
  },
  addButton: { padding: 6 },
});

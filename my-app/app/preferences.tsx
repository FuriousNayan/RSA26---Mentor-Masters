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
import { Stack } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserPreferences } from '@/contexts/user-preferences-context';
import { useLanguage } from '@/contexts/language-context';
import { Palette } from '@/constants/theme';

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
  const isAllergy = variant === 'allergy';
  const bg = isAllergy ? 'rgba(239,68,68,0.14)' : 'rgba(245,158,11,0.16)';
  const color = isAllergy ? Palette.rose : '#B45309';
  const borderColor = isAllergy ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.30)';

  return (
    <View style={[styles.tag, { backgroundColor: bg, borderColor }]}>
      <ThemedText style={[styles.tagText, { color }]}>{label}</ThemedText>
      <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.tagRemove}>
        <Ionicons name="close" size={14} color={color} />
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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [fontsLoaded] = useFonts({
    OpenDyslexic: require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#0B1654' }, 'background');
  const cardBorder = useThemeColor(
    { light: 'rgba(9,25,107,0.10)', dark: 'rgba(242,248,255,0.08)' },
    'background'
  );
  const inputBg = useThemeColor(
    { light: '#F2F8FF', dark: '#04081E' },
    'background'
  );
  const inputBorder = useThemeColor(
    { light: 'rgba(9,25,107,0.14)', dark: 'rgba(242,248,255,0.10)' },
    'background'
  );
  const textColor = useThemeColor({ light: '#09196B', dark: '#F2F8FF' }, 'text');
  const subtleText = useThemeColor({ light: '#3B4682', dark: '#A8B3D8' }, 'text');
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';

  if (!fontsLoaded) return null;

  const renderSection = ({
    icon,
    accent,
    title,
    hint,
    tags,
    quickAdd,
    inputValue,
    setInputValue,
    onAdd,
    onRemove,
    placeholder,
    variant,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    title: string;
    hint: string;
    tags: string[];
    quickAdd: string[];
    inputValue: string;
    setInputValue: (v: string) => void;
    onAdd: (v: string) => void;
    onRemove: (v: string) => void;
    placeholder: string;
    variant: 'allergy' | 'sensitivity';
  }) => (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: cardBg, borderColor: cardBorder },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: `${accent}1F` }]}>
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.sectionHint, { color: subtleText }]}>{hint}</ThemedText>
        </View>
      </View>

      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((a) => (
            <Tag key={a} label={a} variant={variant} onRemove={() => onRemove(a)} />
          ))}
        </View>
      )}

      <View style={styles.quickAddRow}>
        {quickAdd
          .filter((c) => !tags.some((a) => a.toLowerCase() === c.toLowerCase()))
          .map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.quickAddChip,
                {
                  backgroundColor: isDark ? 'rgba(156,214,189,0.18)' : 'rgba(156,214,189,0.32)',
                  borderColor: isDark ? 'rgba(156,214,189,0.32)' : 'rgba(156,214,189,0.55)',
                },
              ]}
              onPress={() => onAdd(c)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={12} color={Palette.navy} />
              <ThemedText style={styles.quickAddText}>{c}</ThemedText>
            </TouchableOpacity>
          ))}
      </View>

      <View
        style={[
          styles.inputRow,
          { backgroundColor: inputBg, borderColor: inputBorder },
        ]}
      >
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={() => {
            if (inputValue.trim()) {
              onAdd(inputValue.trim());
              setInputValue('');
            }
          }}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: accent }]}
          onPress={() => {
            if (inputValue.trim()) {
              onAdd(inputValue.trim());
              setInputValue('');
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t('preferences.title'),
          headerBackTitle: t('common.back'),
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: isDark ? '#04081E' : '#F2F8FF',
          },
          headerTitleStyle: {
            fontFamily: 'OpenDyslexic-Bold',
          },
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
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.intro}>
                <ThemedText style={[styles.introText, { color: subtleText }]}>
                  Tell us what to watch out for so we can keep your scans safe and personal.
                </ThemedText>
              </View>

              {renderSection({
                icon: 'medkit',
                accent: Palette.rose,
                title: t('preferences.allergies'),
                hint: t('preferences.allergiesHint'),
                tags: allergies,
                quickAdd: COMMON_ALLERGENS,
                inputValue: newAllergy,
                setInputValue: setNewAllergy,
                onAdd: addAllergy,
                onRemove: removeAllergy,
                placeholder: t('preferences.addAllergyPlaceholder'),
                variant: 'allergy',
              })}

              {renderSection({
                icon: 'pulse',
                accent: Palette.amber,
                title: t('preferences.sensitivities'),
                hint: t('preferences.sensitivitiesHint'),
                tags: sensitivities,
                quickAdd: COMMON_SENSITIVITIES,
                inputValue: newSensitivity,
                setInputValue: setNewSensitivity,
                onAdd: addSensitivity,
                onRemove: removeSensitivity,
                placeholder: t('preferences.addSensitivityPlaceholder'),
                variant: 'sensitivity',
              })}
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
  scrollContent: { padding: 22, paddingBottom: 60 },
  intro: { marginBottom: 18 },
  introText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 17,
    marginBottom: 2,
  },
  sectionHint: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 13,
    marginRight: 4,
  },
  tagRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  quickAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickAddText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 12,
    color: Palette.navy,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    paddingVertical: 10,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
});

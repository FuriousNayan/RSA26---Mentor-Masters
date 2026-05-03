import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFonts } from 'expo-font';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Stack } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserPreferences } from '@/contexts/user-preferences-context';
import { useLanguage } from '@/contexts/language-context';
import { getAllergySensitivityBranch } from '@/constants/theme';

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
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const tok = getAllergySensitivityBranch(scheme, variant);

  const selectedGlowIOS = Platform.select({
    ios: {
      shadowColor: tok.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: scheme === 'dark' ? 0.55 : 0.5,
      shadowRadius: 10,
    },
    default: {},
  });

  const inner = (
    <View
      style={[
        styles.tag,
        selectedGlowIOS,
        {
          backgroundColor: tok.chipBg,
          borderColor: tok.accent,
          borderWidth: 2,
          ...(Platform.OS === 'android' ? { elevation: 5 } : {}),
        },
      ]}
    >
      <ThemedText style={[styles.tagText, { color: tok.chipText }]}>{label}</ThemedText>
      <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.tagRemove}>
        <Ionicons name="close" size={14} color={tok.chipIcon} />
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'android') {
    return (
      <View style={[styles.tagAndroidHalo, { backgroundColor: `${tok.accent}38` }]}>{inner}</View>
    );
  }

  return inner;
}

const SHEET_SLIDE = Math.min(Dimensions.get('window').height * 0.5, 520);
const SHEET_MAX_HEIGHT = Math.min(Dimensions.get('window').height * 0.88, 680);

export default function PreferencesScreen() {
  const navigation = useNavigation();
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
  const [infoVisible, setInfoVisible] = useState(false);
  const sheetY = useRef(new Animated.Value(SHEET_SLIDE)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

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
  const headerTint = isDark ? '#F2F8FF' : '#09196B';
  const scheme = isDark ? 'dark' : 'light';

  const openInfo = useCallback(() => {
    setInfoVisible(true);
    sheetY.setValue(SHEET_SLIDE);
    backdropOp.setValue(0);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 12,
        }),
      ]).start();
    });
  }, [backdropOp, sheetY]);

  const closeInfo = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: SHEET_SLIDE,
        duration: 240,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(({ finished }) => {
      if (finished) setInfoVisible(false);
    });
  }, [backdropOp, sheetY]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTintColor: headerTint,
      headerRight: () => (
        <TouchableOpacity
          onPress={openInfo}
          accessibilityRole="button"
          accessibilityLabel={t('preferences.infoAccessibilityLabel')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ marginRight: Platform.OS === 'ios' ? 4 : 14 }}
        >
          <Ionicons name="information-circle-outline" size={26} color={headerTint} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, headerTint, t, openInfo]);

  if (!fontsLoaded) return null;

  const renderSection = ({
    icon,
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
  }) => {
    const tok = getAllergySensitivityBranch(scheme, variant);

    return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: cardBg, borderColor: cardBorder },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: tok.accentSoft }]}>
          <Ionicons name={icon} size={20} color={tok.accent} />
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
            <Pressable
              key={c}
              onPress={() => onAdd(c)}
              onPressIn={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              android_ripple={{ color: `${tok.accent}40` }}
              style={({ pressed }) => [
                styles.quickAddChip,
                {
                  backgroundColor: pressed ? tok.accentSoft : tok.chipBg,
                  borderColor: pressed ? tok.accent : tok.chipBorder,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Ionicons name="add" size={12} color={tok.chipIcon} />
              <ThemedText style={[styles.quickAddText, { color: tok.chipText }]}>{c}</ThemedText>
            </Pressable>
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
          style={[styles.addButton, { backgroundColor: tok.accentButton }]}
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
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('preferences.title'),
          headerBackTitle: t('common.back'),
          headerShadowVisible: false,
          headerTintColor: headerTint,
          headerStyle: {
            backgroundColor: isDark ? '#04081E' : '#F2F8FF',
          },
          headerTitleStyle: {
            fontFamily: 'OpenDyslexic-Bold',
            color: headerTint,
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
                  {t('preferences.introBody')}
                </ThemedText>
              </View>

              {renderSection({
                icon: 'medkit',
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

      <Modal
        visible={infoVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeInfo}
      >
        <View style={styles.infoModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeInfo} accessibilityRole="button">
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'rgba(9,25,107,0.42)',
                  opacity: backdropOp,
                },
              ]}
            />
          </Pressable>
          <Animated.View
            style={[
              styles.infoSheet,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                maxHeight: SHEET_MAX_HEIGHT,
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <ScrollView
              style={[styles.infoScroll, { maxHeight: SHEET_MAX_HEIGHT }]}
              contentContainerStyle={styles.infoScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.infoGrabberWrap}>
                <View style={[styles.infoGrabber, { backgroundColor: subtleText }]} />
              </View>
              <ThemedText type="subtitle" style={[styles.infoTitle, { color: textColor }]}>
                {t('preferences.infoTitle')}
              </ThemedText>
              <ThemedText style={[styles.infoBody, { color: subtleText }]}>
                {t('preferences.infoIntro')}
              </ThemedText>

              <View style={[styles.infoBlock, { borderColor: cardBorder }]}>
                <View style={styles.infoBlockHeader}>
                  <View
                    style={[
                      styles.infoBlockIcon,
                      { backgroundColor: getAllergySensitivityBranch(scheme, 'allergy').accentSoft },
                    ]}
                  >
                    <Ionicons
                      name="medkit"
                      size={18}
                      color={getAllergySensitivityBranch(scheme, 'allergy').accent}
                    />
                  </View>
                  <ThemedText style={[styles.infoHeading, { color: textColor }]}>
                    {t('preferences.infoAllergiesHeading')}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.infoBody, { color: subtleText }]}>
                  {t('preferences.infoAllergiesBody')}
                </ThemedText>
              </View>

              <View style={[styles.infoBlock, { borderColor: cardBorder }]}>
                <View style={styles.infoBlockHeader}>
                  <View
                    style={[
                      styles.infoBlockIcon,
                      { backgroundColor: getAllergySensitivityBranch(scheme, 'sensitivity').accentSoft },
                    ]}
                  >
                    <Ionicons
                      name="pulse"
                      size={18}
                      color={getAllergySensitivityBranch(scheme, 'sensitivity').accent}
                    />
                  </View>
                  <ThemedText style={[styles.infoHeading, { color: textColor }]}>
                    {t('preferences.infoSensitivitiesHeading')}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.infoBody, { color: subtleText }]}>
                  {t('preferences.infoSensitivitiesBody')}
                </ThemedText>
              </View>

              <ThemedText style={[styles.infoDisclaimer, { color: subtleText }]}>
                {t('preferences.infoDisclaimer')}
              </ThemedText>

              <SafeAreaView edges={['bottom']}>
                <TouchableOpacity
                  style={[
                    styles.infoCloseBtn,
                    { backgroundColor: getAllergySensitivityBranch(scheme, 'allergy').accentButton },
                  ]}
                  onPress={closeInfo}
                  activeOpacity={0.9}
                >
                  <ThemedText style={styles.infoCloseBtnText}>{t('preferences.infoClose')}</ThemedText>
                </TouchableOpacity>
              </SafeAreaView>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
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
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  tagAndroidHalo: {
    borderRadius: 999,
    padding: 3,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 999,
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
  infoModalRoot: {
    flex: 1,
  },
  infoSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#09196B',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  infoGrabberWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
  },
  infoGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  infoScroll: {},
  infoScrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  infoTitle: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 20,
    marginBottom: 10,
  },
  infoBody: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  infoBlock: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  infoBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoBlockIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoHeading: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 16,
    flex: 1,
  },
  infoDisclaimer: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  infoCloseBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  infoCloseBtnText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});

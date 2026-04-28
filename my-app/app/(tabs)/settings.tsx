import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLanguage } from '@/contexts/language-context';
import { Palette } from '@/constants/theme';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n';

export default function SettingsScreen() {
  const { locale, setLocale, t } = useLanguage();
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
  const dividerColor = useThemeColor(
    { light: 'rgba(9,25,107,0.10)', dark: 'rgba(242,248,255,0.08)' },
    'background'
  );
  const subtleText = useThemeColor({ light: '#3B4682', dark: '#A8B3D8' }, 'text');

  if (!fontsLoaded) return null;

  return (
    <AppBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {t('settings.title')}
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: subtleText }]}>
              Personalize your NutriNav experience
            </ThemedText>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(9,25,107,0.10)' }]}>
                <Ionicons name="globe-outline" size={20} color={Palette.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  {t('settings.language')}
                </ThemedText>
                <ThemedText style={[styles.sectionHint, { color: subtleText }]}>
                  {t('settings.languageSubtitle')}
                </ThemedText>
              </View>
            </View>

            <ThemedView
              lightColor="#FFFFFF"
              darkColor="#0B1654"
              style={[styles.optionsCard, { borderColor: cardBorder }]}
            >
              {SUPPORTED_LOCALES.map(({ code, label }, idx) => {
                const isSelected = locale === code;
                const isLast = idx === SUPPORTED_LOCALES.length - 1;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.optionRow,
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor },
                    ]}
                    onPress={() => setLocale(code as SupportedLocale)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {label}
                    </ThemedText>
                    <View
                      style={[
                        styles.radio,
                        isSelected && {
                          borderColor: Palette.mint,
                          backgroundColor: 'rgba(156,214,189,0.32)',
                        },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioDot, { backgroundColor: Palette.mint }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(156,214,189,0.32)' }]}>
                <Ionicons name="medkit-outline" size={20} color={Palette.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  {t('settings.allergiesLink')}
                </ThemedText>
                <ThemedText style={[styles.sectionHint, { color: subtleText }]}>
                  {t('settings.allergiesLinkSubtitle')}
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => router.push('/preferences' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.linkIconWrap, { backgroundColor: 'rgba(156,214,189,0.32)' }]}>
                <Ionicons name="medkit" size={20} color={Palette.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.linkText}>{t('preferences.title')}</ThemedText>
                <ThemedText style={[styles.linkHint, { color: subtleText }]}>
                  Tap to manage allergies & sensitivities
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={subtleText} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 120 },
  header: { marginBottom: 28, paddingHorizontal: 0 },
  title: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 30,
    lineHeight: 38,
  },
  headerSubtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  sectionIcon: {
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
  optionsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  optionLabel: {
    fontFamily: 'OpenDyslexic',
    fontSize: 15,
  },
  optionLabelSelected: {
    fontFamily: 'OpenDyslexic-Bold',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
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
  linkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 15,
    marginBottom: 2,
  },
  linkHint: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    lineHeight: 16,
  },
});

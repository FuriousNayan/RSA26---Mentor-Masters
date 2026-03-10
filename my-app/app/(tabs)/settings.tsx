import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { useLanguage } from '@/contexts/language-context';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n';

export default function SettingsScreen() {
  const { locale, setLocale, t } = useLanguage();

  const [fontsLoaded] = useFonts({
    OpenDyslexic: require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  if (!fontsLoaded) return null;

  return (
    <AppBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {t('settings.title')}
            </ThemedText>
          </View>
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {t('settings.language')}
            </ThemedText>
            <ThemedText style={styles.sectionHint}>{t('settings.languageSubtitle')}</ThemedText>
            <View style={styles.options}>
              {SUPPORTED_LOCALES.map(({ code, label }) => (
                <TouchableOpacity
                  key={code}
                  style={[styles.optionRow, locale === code && styles.optionRowSelected]}
                  onPress={() => setLocale(code as SupportedLocale)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.optionLabel}>{label}</ThemedText>
                  {locale === code && (
                    <Ionicons name="checkmark-circle" size={24} color="#0a7ea4" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {t('settings.allergiesLink')}
            </ThemedText>
            <ThemedText style={styles.sectionHint}>{t('settings.allergiesLinkSubtitle')}</ThemedText>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/preferences' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="medkit-outline" size={24} color="#0a7ea4" />
              <ThemedText style={styles.linkText}>{t('preferences.title')}</ThemedText>
              <Ionicons name="chevron-forward" size={20} color="#999" />
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
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 28,
    lineHeight: 36,
  },
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
  options: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  optionRowSelected: {
    backgroundColor: 'rgba(10, 126, 164, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 126, 164, 0.3)',
  },
  optionLabel: {
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.08)',
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontFamily: 'OpenDyslexic',
    fontSize: 16,
  },
});

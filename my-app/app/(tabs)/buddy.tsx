import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/app-background';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/contexts/language-context';
import { BrandGradient, Palette } from '@/constants/theme';

// --- AGGRESSIVE POLYFILL FOR REACT NATIVE ---
if (typeof global.AbortController === 'undefined') {
  (global as any).AbortController = class {
    signal = { aborted: false, addEventListener: () => {}, removeEventListener: () => {} };
    abort() {}
  };
}
if (typeof global.AbortSignal === 'undefined') {
  (global as any).AbortSignal = class {};
}
if (!(global.AbortSignal as any).any) {
  (global.AbortSignal as any).any = function () {
    return { aborted: false, addEventListener: () => {}, removeEventListener: () => {} };
  };
}

// --- FIREBASE AI LOGIC IMPORTS ---
const { initializeApp } = require("firebase/app");
const { getAI, getGenerativeModel } = require("firebase/ai"); //

const firebaseConfig = {
  apiKey: "AIzaSyDA2YiiZoZnXCkBM0e3gCEinTMF4WWpeWU",
  authDomain: "nutrinav-c8802.firebaseapp.com",
  projectId: "nutrinav-c8802",
  storageBucket: "nutrinav-c8802.firebasestorage.app",
  messagingSenderId: "11046359792",
  appId: "1:11046359792:web:c66dda1a7b88bc866de835",
  measurementId: "G-6HTF0GY66Q"
};

const app = initializeApp(firebaseConfig);
const ai = getAI(app); //
const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash-lite' }); //

export default function BuddyScreen() {
  const [fontsLoaded] = useFonts({
    OpenDyslexic: require('@/assets/images/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('@/assets/images/fonts/OpenDyslexic-Bold.otf'),
  });

  const { t, locale } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([
    { text: t('buddy.welcomeMessage'), sender: 'bot' }
  ]);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0 && prev[0].sender === 'bot') {
        return [{ text: t('buddy.welcomeMessage'), sender: 'bot' as const }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [locale, t]);

  const chatRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- THEME COLORS ---
  const textColor = useThemeColor({}, 'text');
  const headerBg = useThemeColor(
    { light: 'rgba(255,255,255,0.85)', dark: 'rgba(11,22,84,0.85)' },
    'background'
  );
  const headerBorder = useThemeColor(
    { light: 'rgba(9,25,107,0.10)', dark: 'rgba(242,248,255,0.08)' },
    'background'
  );
  const inputBg = useThemeColor({ light: '#FFFFFF', dark: '#0B1654' }, 'background');
  const inputContainerBg = useThemeColor(
    { light: 'rgba(255,255,255,0.92)', dark: 'rgba(11,22,84,0.92)' },
    'background'
  );
  const botBubbleBg = useThemeColor({ light: '#FFFFFF', dark: '#0B1654' }, 'background');
  const botBubbleBorder = useThemeColor(
    { light: 'rgba(9,25,107,0.10)', dark: 'rgba(242,248,255,0.08)' },
    'background'
  );
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';
  const subtitleColor = isDark ? '#A8B3D8' : '#3B4682';

  useEffect(() => {
    chatRef.current = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "You are the NutriNav Nutrition Buddy. Keep answers friendly, highly readable, and concise. Remind users you are an AI and not a doctor." }],
        },
        {
          role: "model",
          parts: [{ text: "Understood! I'm ready to help." }],
        },
      ],
    });
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || !chatRef.current) return;
    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setIsLoading(true);

    try {
      const result = await chatRef.current.sendMessage(userMessage);
      const botResponse = result.response.text();
      setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { text: "Connection error. Try again later!", sender: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  const inputDisabled = !inputText.trim() || isLoading;

  return (
    <AppBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
            <View style={styles.avatarWrap}>
              <LinearGradient
                colors={['#B8E2CD', '#9CD6BD', '#7AC4A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Ionicons name="leaf" size={20} color="#09196B" />
              </LinearGradient>
              <View style={styles.onlineDot} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="title" style={styles.title}>NutriBuddy</ThemedText>
              <ThemedText style={[styles.headerSubtitle, { color: subtitleColor }]}>
                AI nutrition assistant
              </ThemedText>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.chatArea}
            contentContainerStyle={[styles.chatContent, { paddingBottom: 100 }]}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="on-drag"
          >
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <View
                  key={index}
                  style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}
                >
                  {!isUser && (
                    <View style={styles.botAvatar}>
                      <LinearGradient
                        colors={['#B8E2CD', '#9CD6BD']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.botAvatarGradient}
                      >
                        <Ionicons name="leaf" size={12} color="#09196B" />
                      </LinearGradient>
                    </View>
                  )}
                  {isUser ? (
                    <LinearGradient
                      colors={[...BrandGradient]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.messageBubble, styles.userBubble]}
                    >
                      <ThemedText style={[styles.messageText, styles.userText]}>
                        {msg.text}
                      </ThemedText>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.messageBubble,
                        styles.botBubble,
                        { backgroundColor: botBubbleBg, borderColor: botBubbleBorder },
                      ]}
                    >
                      <ThemedText style={[styles.messageText, { color: textColor }]}>
                        {msg.text}
                      </ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
            {isLoading && (
              <View style={[styles.messageRow, styles.botRow]}>
                <View style={styles.botAvatar}>
                  <LinearGradient
                    colors={['#B8E2CD', '#9CD6BD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.botAvatarGradient}
                  >
                    <Ionicons name="leaf" size={12} color="#09196B" />
                  </LinearGradient>
                </View>
                <View
                  style={[
                    styles.messageBubble,
                    styles.botBubble,
                    {
                      backgroundColor: botBubbleBg,
                      borderColor: botBubbleBorder,
                      paddingVertical: 14,
                      paddingHorizontal: 18,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={Palette.navy} />
                </View>
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: inputContainerBg,
                borderTopColor: headerBorder,
                paddingBottom: Math.max(insets.bottom, 14),
              },
            ]}
          >
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: inputBg, borderColor: botBubbleBorder },
              ]}
            >
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder={t('buddy.placeholder')}
                placeholderTextColor={placeholderColor}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButtonWrap, inputDisabled && { opacity: 0.45 }]}
                onPress={sendMessage}
                disabled={inputDisabled}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[...BrandGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendButton}
                >
                  <Ionicons name="arrow-up" size={18} color="#09196B" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 44,
    height: 44,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#09196B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.32,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9CD6BD',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  title: {
    fontFamily: 'OpenDyslexic-Bold',
    fontSize: 22,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontFamily: 'OpenDyslexic',
    fontSize: 12,
    marginTop: 2,
  },
  chatArea: { flex: 1 },
  chatContent: { padding: 18, gap: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end', gap: 8 },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 28,
    height: 28,
    marginBottom: 2,
  },
  botAvatarGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  userBubble: {
    borderBottomRightRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#09196B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  botBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
    }),
  },
  messageText: {
    fontFamily: 'OpenDyslexic',
    fontSize: 15,
    lineHeight: 23,
  },
  userText: {
    color: '#09196B',
    fontFamily: 'OpenDyslexic-Bold',
  },
  inputWrapper: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
  input: {
    flex: 1,
    fontFamily: 'OpenDyslexic',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendButtonWrap: {
    marginLeft: 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#09196B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
});

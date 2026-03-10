import { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

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

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([
    { text: "Hi! I'm your NutriNav Buddy. Ask me anything about nutrition!", sender: 'bot' }
  ]);
  
  const chatRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // --- THEME COLORS ---
  const bgColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const inputBg = useThemeColor({ light: '#F0F2F5', dark: '#2C2C2E' }, 'background');
  const botBubbleBg = useThemeColor({ light: '#FFFFFF', dark: '#3A3A3C' }, 'background');

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.header, { backgroundColor: cardColor, borderBottomColor: inputBg }]}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="leaf" size={24} color="#4CAF50" style={{ marginRight: 8 }} />
            <ThemedText type="title" style={styles.title}>NutriBuddy</ThemedText>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={[styles.chatArea, { backgroundColor: bgColor }]} 
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="on-drag"
        >
          {messages.map((msg, index) => (
            <View key={index} style={[styles.messageRow, msg.sender === 'user' ? styles.userRow : styles.botRow]}>
              <View style={[
                styles.messageBubble, 
                msg.sender === 'user' ? styles.userBubble : [styles.botBubble, { backgroundColor: botBubbleBg }]
              ]}>
                <ThemedText style={[styles.messageText, msg.sender === 'user' ? styles.userText : { color: textColor }]}>
                  {msg.text}
                </ThemedText>
              </View>
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageRow, styles.botRow]}>
              <View style={[styles.messageBubble, { backgroundColor: botBubbleBg, width: 60 }]}>
                <ActivityIndicator size="small" color="#FF6B6B" />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputWrapper, { backgroundColor: cardColor, paddingBottom: Math.max(insets.bottom, 15) }]}>
          <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Ask me anything..."
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} 
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="arrow-up" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontFamily: 'OpenDyslexic-Bold', fontSize: 24 },
  chatArea: { flex: 1 },
  chatContent: { padding: 20, paddingBottom: 20, gap: 14 },
  messageRow: { flexDirection: 'row', marginBottom: 6 },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '85%', padding: 16, borderRadius: 22 },
  userBubble: { backgroundColor: '#FF6B6B', borderBottomRightRadius: 6 },
  botBubble: { borderBottomLeftRadius: 6 },
  messageText: { fontFamily: 'OpenDyslexic', fontSize: 16, lineHeight: 24 },
  userText: { color: '#FFFFFF', fontFamily: 'OpenDyslexic-Bold' },
  inputWrapper: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'transparent' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: { flex: 1, fontFamily: 'OpenDyslexic', fontSize: 16, paddingHorizontal: 12, paddingVertical: 10 },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
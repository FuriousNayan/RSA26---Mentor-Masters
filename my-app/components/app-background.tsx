import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GradientColorsLight, GradientColorsDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function AppBackground({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? [...GradientColorsDark] : [...GradientColorsLight];

  // Soft accent glow tints — give the background a sense of depth without
  // distracting from foreground content.
  const accentTop = isDark
    ? 'rgba(156, 214, 189, 0.16)'
    : 'rgba(156, 214, 189, 0.32)';
  const accentBottom = isDark
    ? 'rgba(46, 61, 154, 0.30)'
    : 'rgba(9, 25, 107, 0.10)';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top-right warm glow */}
      <LinearGradient
        colors={[accentTop, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.6 }}
        style={[StyleSheet.absoluteFill, styles.glow]}
        pointerEvents="none"
      />
      {/* Bottom-left cool glow */}
      <LinearGradient
        colors={[accentBottom, 'transparent']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.6, y: 0.4 }}
        style={[StyleSheet.absoluteFill, styles.glow]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glow: {
    opacity: 0.9,
  },
});

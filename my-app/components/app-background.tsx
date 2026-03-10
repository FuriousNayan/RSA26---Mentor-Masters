import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GradientColorsLight, GradientColorsDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function AppBackground({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? [...GradientColorsDark] : [...GradientColorsLight];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

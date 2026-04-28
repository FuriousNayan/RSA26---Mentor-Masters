/**
 * Design tokens for the NutriNav app.
 *
 * Palette is built around three core colors:
 *   • Mint  `#9cd6bd` — primary accent / brand
 *   • Ice   `#f2f8ff` — backgrounds and surfaces
 *   • Navy  `#09196b` — shadows, accents, dark emphasis
 *
 * Semantic warning / danger tints (amber, rose) are intentionally kept
 * because the app surfaces food-allergen safety information where
 * universally-recognised colors aid accessibility.
 */

import { Platform } from 'react-native';

const tintColorLight = '#9cd6bd';
const tintColorDark = '#B8E2CD';

/** Soft, cool light background gradient (ice → mint whisper). */
export const GradientColorsLight = ['#F2F8FF', '#EAF4F0', '#DEEEE5'] as const;

/** Deep navy dark background gradient (midnight → navy → indigo-navy). */
export const GradientColorsDark = ['#04081E', '#070F3D', '#0B1654'] as const;

/** Brand gradients used for primary action buttons / hero accents. */
export const BrandGradient = ['#B8E2CD', '#9CD6BD', '#7AC4A6'] as const;
export const BrandGradientSecondary = ['#2E3D9A', '#09196B', '#050E4A'] as const;
export const BrandGradientSafe = ['#B8E2CD', '#9CD6BD', '#7AC4A6'] as const;

export const Palette = {
  // Core palette
  mint: '#9CD6BD',
  mintLight: '#B8E2CD',
  mintDark: '#7AC4A6',
  mintSoft: '#E5F4ED',
  navy: '#09196B',
  navyLight: '#2E3D9A',
  navyDark: '#050E4A',
  navySoft: '#DDE4FF',
  ice: '#F2F8FF',

  // Backwards-compatible aliases used throughout the codebase.
  // (coral & indigo names are kept so consumers don't break, but
  //  visually they now point to the new palette.)
  coral: '#9CD6BD',
  coralSoft: '#E5F4ED',
  indigo: '#09196B',
  indigoSoft: '#DDE4FF',
  emerald: '#9CD6BD',
  emeraldSoft: '#E5F4ED',

  // Semantic safety colors (intentionally retained).
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  rose: '#EF4444',
  roseSoft: '#FEE2E2',

  // Neutral slate scale tuned to read well over ice/navy backgrounds.
  slate50: '#F2F8FF',
  slate100: '#E6EEF8',
  slate200: '#CCD6E8',
  slate500: '#5B6786',
  slate700: '#1F2A55',
  slate900: '#09196B',
};

export const Colors = {
  light: {
    text: '#09196B',
    textMuted: '#3B4682',
    background: '#F2F8FF',
    surface: '#FFFFFF',
    surfaceMuted: '#E8F1F4',
    border: 'rgba(9, 25, 107, 0.10)',
    tint: tintColorLight,
    icon: '#5B6786',
    tabIconDefault: '#8A93B5',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F2F8FF',
    textMuted: '#A8B3D8',
    background: '#04081E',
    surface: '#0B1654',
    surfaceMuted: '#0F1B66',
    border: 'rgba(242, 248, 255, 0.10)',
    tint: tintColorDark,
    icon: '#A8B3D8',
    tabIconDefault: '#5B6786',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

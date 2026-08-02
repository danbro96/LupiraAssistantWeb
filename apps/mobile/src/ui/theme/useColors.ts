import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type Palette } from './colors';

/** Active palette, following the live system light/dark setting. */
export function useColors(): Palette {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}

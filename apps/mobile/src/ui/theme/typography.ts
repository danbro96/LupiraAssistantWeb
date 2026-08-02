import type { TextStyle } from 'react-native';
import type { Palette } from './colors';

export function makeType(c: Palette) {
  return {
    title: { fontSize: 26, fontWeight: '700', color: c.text } as TextStyle,
    heading: { fontSize: 20, fontWeight: '700', color: c.text } as TextStyle,
    bodyLg: { fontSize: 17, color: c.text } as TextStyle,
    body: { fontSize: 16, color: c.text } as TextStyle,
    button: { fontSize: 16, fontWeight: '600' } as TextStyle,
    small: { fontSize: 13, color: c.textMuted } as TextStyle,
    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textSubtle } as TextStyle,
    hint: { fontSize: 11, color: c.textSubtle } as TextStyle,
    /** Fixed-width numeric / status readouts. */
    mono: { fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'] } as TextStyle,
  };
}

export type TypePresets = ReturnType<typeof makeType>;

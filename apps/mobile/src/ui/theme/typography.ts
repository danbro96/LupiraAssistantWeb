import type { TextStyle } from 'react-native';
import type { Palette } from './colors';

export function makeType(c: Palette) {
  return {
    title: { fontSize: 26, fontWeight: '700', color: c.text },
    heading: { fontSize: 20, fontWeight: '700', color: c.text },
    bodyLg: { fontSize: 17, color: c.text },
    body: { fontSize: 16, color: c.text },
    button: { fontSize: 16, fontWeight: '600' },
    small: { fontSize: 13, color: c.textMuted },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textSubtle },
    hint: { fontSize: 11, color: c.textSubtle },
    /** Fixed-width numeric / status readouts. */
    mono: { fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'] },
  } satisfies Record<string, TextStyle>;
}

export type TypePresets = ReturnType<typeof makeType>;

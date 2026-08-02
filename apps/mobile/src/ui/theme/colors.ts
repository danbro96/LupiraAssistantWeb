export interface Palette {
  bg: string;
  surface: string;
  primary: string;
  onPrimary: string;
  border: string;
  divider: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textDisabled: string;
  onAccent: string;
  danger: string;
  warning: string;
  success: string;
  pending: string;
  failed: string;
  bannerOffline: string;
  bannerUnreachable: string;
  bannerSyncing: string;
  toastBg: string;
  toastAction: string;
}

export const lightColors: Palette = {
  bg: '#ffffff',
  surface: '#f5f6f8',
  primary: '#0b6e4f',
  onPrimary: '#ffffff',
  border: '#d4d8e0',
  divider: '#e3e6ec',
  text: '#1c2230',
  textMuted: '#6e7686',
  textSubtle: '#8a909c',
  textDisabled: '#9aa0ac',
  onAccent: '#ffffff',
  danger: '#b3261e',
  warning: '#5b4b18',
  success: '#1f7a4d',
  pending: '#d8a200',
  failed: '#b3261e',
  bannerOffline: '#5b4b18',
  bannerUnreachable: '#7a1f1f',
  bannerSyncing: '#0b6e4f',
  toastBg: '#2b2f36',
  toastAction: '#6ee7a8',
};

export const darkColors: Palette = {
  bg: '#14171c',
  surface: '#1e232b',
  primary: '#3fb986',
  onPrimary: '#0d1117',
  border: '#2c333d',
  divider: '#252b33',
  text: '#e6e9ee',
  textMuted: '#9aa3b2',
  textSubtle: '#7c8492',
  textDisabled: '#5b626e',
  onAccent: '#ffffff',
  danger: '#f2675e',
  warning: '#d8b24a',
  success: '#5fd49b',
  pending: '#d8a200',
  failed: '#f2675e',
  bannerOffline: '#5b4b18',
  bannerUnreachable: '#7a1f1f',
  bannerSyncing: '#1f6b4d',
  toastBg: '#2b2f36',
  toastAction: '#6ee7a8',
};

/** Fallback palette for non-component contexts that can't use the hook. */
export const colors = lightColors;

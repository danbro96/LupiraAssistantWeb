import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { SECURE_KEYS } from '../config/secure-keys';

interface PrefsState {
  loaded: boolean;
  /** Gates the Developer + debug-log entries in Settings. */
  debugEnabled: boolean;
  init: () => Promise<void>;
  setDebugEnabled: (value: boolean) => Promise<void>;
}

export const usePrefs = create<PrefsState>((set) => ({
  loaded: false,
  debugEnabled: false,

  init: async () => {
    const stored = await SecureStore.getItemAsync(SECURE_KEYS.debugEnabled);
    set({ debugEnabled: stored === '1', loaded: true });
  },

  setDebugEnabled: async (value) => {
    set({ debugEnabled: value });
    await SecureStore.setItemAsync(SECURE_KEYS.debugEnabled, value ? '1' : '0');
  },
}));

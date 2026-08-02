import * as ExpoCrypto from 'expo-crypto';

// Hermes has no global `crypto`; back the methods uuid needs with expo-crypto. MUST be imported before any uuid usage.

const target = globalThis as unknown as {
  crypto?: { getRandomValues?: unknown; randomUUID?: unknown };
};

if (!target.crypto) {
  target.crypto = {
    getRandomValues: ExpoCrypto.getRandomValues,
    randomUUID: ExpoCrypto.randomUUID,
  };
} else {
  if (typeof target.crypto.getRandomValues !== 'function') {
    target.crypto.getRandomValues = ExpoCrypto.getRandomValues;
  }
  if (typeof target.crypto.randomUUID !== 'function') {
    target.crypto.randomUUID = ExpoCrypto.randomUUID;
  }
}

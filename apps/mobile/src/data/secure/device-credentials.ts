import * as SecureStore from 'expo-secure-store';
import { SECURE_KEYS } from '../../config/secure-keys';
import type { RegisterDeviceResponse } from '../api/generated/location/models';
import type { HealthRecordDto } from '../api/generated/health/models';

// `apiKey` lives ONLY in the OS secure keystore — never logged, never in Zustand/SQLite.

export interface DeviceCredentials {
  apiKey: string;
  keyId: string;
  deviceId: string;
  healthRecordId: string;
  label: string | null;
  recordSlug: string | null;
}

/** Read fresh each upload so rotation/clear takes effect. */
export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEYS.apiKey);
}

export async function getDeviceId(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEYS.deviceId);
}

export async function loadCredentials(): Promise<DeviceCredentials | null> {
  const [apiKey, keyId, deviceId, healthRecordId, label, recordSlug] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS.apiKey),
    SecureStore.getItemAsync(SECURE_KEYS.keyId),
    SecureStore.getItemAsync(SECURE_KEYS.deviceId),
    SecureStore.getItemAsync(SECURE_KEYS.healthRecordId),
    SecureStore.getItemAsync(SECURE_KEYS.deviceLabel),
    SecureStore.getItemAsync(SECURE_KEYS.recordSlug),
  ]);
  if (!apiKey || !keyId || !deviceId || !healthRecordId) return null;
  return { apiKey, keyId, deviceId, healthRecordId, label, recordSlug };
}

/** The apiKey is returned once — store it now. */
export async function saveCredentials(resp: RegisterDeviceResponse, record: HealthRecordDto): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEYS.apiKey, resp.apiKey),
    SecureStore.setItemAsync(SECURE_KEYS.keyId, resp.keyId),
    SecureStore.setItemAsync(SECURE_KEYS.deviceId, resp.device.id),
    SecureStore.setItemAsync(SECURE_KEYS.healthRecordId, record.id),
    SecureStore.setItemAsync(SECURE_KEYS.deviceLabel, resp.device.label),
    SecureStore.setItemAsync(SECURE_KEYS.recordSlug, record.slug),
  ]);
}

export async function clearCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.apiKey),
    SecureStore.deleteItemAsync(SECURE_KEYS.keyId),
    SecureStore.deleteItemAsync(SECURE_KEYS.deviceId),
    SecureStore.deleteItemAsync(SECURE_KEYS.healthRecordId),
    SecureStore.deleteItemAsync(SECURE_KEYS.deviceLabel),
    SecureStore.deleteItemAsync(SECURE_KEYS.recordSlug),
  ]);
}

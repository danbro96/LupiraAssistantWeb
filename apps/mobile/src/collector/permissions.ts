import * as Location from 'expo-location';

// iOS escalates When-In-Use → Always; Android 10+ needs foreground before background. Requests must be user-initiated.

export type PermissionStage = 'denied' | 'foreground' | 'background';

/** Current stage WITHOUT prompting. */
export async function getStage(): Promise<PermissionStage> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'background' : 'foreground';
}

/** Escalate foreground → background; returns the highest stage reached. */
export async function ensureBackgroundPermissions(): Promise<PermissionStage> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'background' : 'foreground';
}

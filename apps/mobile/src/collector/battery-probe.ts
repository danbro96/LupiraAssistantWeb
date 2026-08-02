import * as Battery from 'expo-battery';

export async function readBatteryPct(): Promise<number | null> {
  try {
    const level = await Battery.getBatteryLevelAsync(); // 0..1, or -1 when unknown
    if (level < 0) return null;
    return Math.round(level * 100);
  } catch {
    return null;
  }
}

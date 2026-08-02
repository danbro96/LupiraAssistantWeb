import type { Db } from './db';
import type { GeoPoint } from '../../domain/geo';
import { INITIAL_DEBOUNCE, type MotionDebounce } from '../../domain/motion-state';

// Cross-context key/value: the background task reads the cached `paused` flag here instead of the network.

const KEYS = {
  paused: 'paused',
  collectingDesired: 'collectingDesired',
  lastFix: 'lastFix',
  motionDebounce: 'motionDebounce',
  lastError: 'lastError',
} as const;

async function getMeta(db: Db, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ v: string }>(`SELECT v FROM collector_meta WHERE k = ?`, [key]);
  return row?.v ?? null;
}

async function setMeta(db: Db, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO collector_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`,
    [key, value],
  );
}

export async function isPausedCached(db: Db): Promise<boolean> {
  return (await getMeta(db, KEYS.paused)) === 'true';
}
export async function setPausedCached(db: Db, paused: boolean): Promise<void> {
  await setMeta(db, KEYS.paused, paused ? 'true' : 'false');
}

export async function isCollectingDesired(db: Db): Promise<boolean> {
  return (await getMeta(db, KEYS.collectingDesired)) === 'true';
}
export async function setCollectingDesired(db: Db, desired: boolean): Promise<void> {
  await setMeta(db, KEYS.collectingDesired, desired ? 'true' : 'false');
}

export async function getLastFix(db: Db): Promise<GeoPoint | null> {
  const raw = await getMeta(db, KEYS.lastFix);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GeoPoint;
  } catch {
    return null;
  }
}
export async function setLastFix(db: Db, fix: GeoPoint): Promise<void> {
  await setMeta(db, KEYS.lastFix, JSON.stringify(fix));
}

export async function getMotionDebounce(db: Db): Promise<MotionDebounce> {
  const raw = await getMeta(db, KEYS.motionDebounce);
  if (!raw) return INITIAL_DEBOUNCE;
  try {
    return JSON.parse(raw) as MotionDebounce;
  } catch {
    return INITIAL_DEBOUNCE;
  }
}
export async function setMotionDebounce(db: Db, state: MotionDebounce): Promise<void> {
  await setMeta(db, KEYS.motionDebounce, JSON.stringify(state));
}

export async function setLastError(db: Db, error: string): Promise<void> {
  await setMeta(db, KEYS.lastError, error);
}

import type { Db } from './db';
import { boolToInt, intToBool } from './db';
import { nextSeq } from './seq-repo';
import type { WireFix } from '../../domain/location-fix';

// Writes assign a monotonic seq atomically (seq bump + insert in one transaction).

export interface PendingFix extends WireFix {
  seq: number;
}

const INSERT_SQL = `INSERT OR IGNORE INTO pending_fixes
  (seq, ts, lat, lon, accuracy_m, altitude_m, vertical_acc_m, heading_deg, heading_acc_deg,
   speed_mps, speed_acc_mps, provider, activity, activity_conf, battery_pct, is_moving, is_mock,
   status, reject_reason, created_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,NULL,?)`;

function insertParams(seq: number, f: WireFix, createdAtMs: number): (string | number | null)[] {
  return [
    seq, f.ts, f.lat, f.lon, f.accuracy_m, f.altitude_m, f.vertical_acc_m, f.heading_deg,
    f.heading_acc_deg, f.speed_mps, f.speed_acc_mps, f.provider, f.activity, f.activity_conf,
    f.battery_pct, boolToInt(f.is_moving), boolToInt(f.is_mock), createdAtMs,
  ];
}

/** One transaction so a seq is never burned without a durable row. */
export async function enqueueFixes(db: Db, fixes: readonly WireFix[], createdAtMs: number): Promise<number[]> {
  const seqs: number[] = [];
  await db.withTransactionAsync(async () => {
    for (const f of fixes) {
      const seq = await nextSeq(db, 'location');
      await db.runAsync(INSERT_SQL, insertParams(seq, f, createdAtMs));
      seqs.push(seq);
    }
  });
  return seqs;
}

export async function enqueueFix(db: Db, fix: WireFix, createdAtMs: number): Promise<number> {
  const [seq] = await enqueueFixes(db, [fix], createdAtMs);
  return seq;
}

interface FixRow {
  seq: number;
  ts: string;
  lat: number;
  lon: number;
  accuracy_m: number | null;
  altitude_m: number | null;
  vertical_acc_m: number | null;
  heading_deg: number | null;
  heading_acc_deg: number | null;
  speed_mps: number | null;
  speed_acc_mps: number | null;
  provider: string | null;
  activity: string | null;
  activity_conf: number | null;
  battery_pct: number | null;
  is_moving: number | null;
  is_mock: number;
}

function rowToFix(r: FixRow): PendingFix {
  return {
    seq: r.seq,
    ts: r.ts,
    lat: r.lat,
    lon: r.lon,
    accuracy_m: r.accuracy_m,
    altitude_m: r.altitude_m,
    vertical_acc_m: r.vertical_acc_m,
    heading_deg: r.heading_deg,
    heading_acc_deg: r.heading_acc_deg,
    speed_mps: r.speed_mps,
    speed_acc_mps: r.speed_acc_mps,
    provider: (r.provider ?? 'fused') as PendingFix['provider'],
    activity: (r.activity ?? 'unknown') as PendingFix['activity'],
    activity_conf: r.activity_conf,
    battery_pct: r.battery_pct,
    is_moving: intToBool(r.is_moving) ?? false,
    is_mock: intToBool(r.is_mock) ?? false,
  };
}

export async function selectPending(db: Db, limit: number): Promise<PendingFix[]> {
  const rows = await db.getAllAsync<FixRow>(
    `SELECT * FROM pending_fixes WHERE status = 0 ORDER BY seq ASC LIMIT ?`,
    [limit],
  );
  return rows.map(rowToFix);
}

export async function pendingCount(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM pending_fixes WHERE status = 0`);
  return row?.n ?? 0;
}

/** Chunks to stay under SQLite's bound-variable limit. */
export async function deleteSeqs(db: Db, seqs: readonly number[]): Promise<void> {
  if (seqs.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const chunk of chunked(seqs, 500)) {
      const placeholders = chunk.map(() => '?').join(',');
      await db.runAsync(`DELETE FROM pending_fixes WHERE seq IN (${placeholders})`, chunk);
    }
  });
}

/** Drop everything at or below the server cursor (cursor-resume). */
export async function deleteUpTo(db: Db, lastSeq: number): Promise<void> {
  await db.runAsync(`DELETE FROM pending_fixes WHERE seq <= ?`, [lastSeq]);
}

/** status=2: kept for diagnostics, out of the pending set. */
export async function markRejected(db: Db, seqs: readonly number[], reason: string): Promise<void> {
  if (seqs.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const chunk of chunked(seqs, 500)) {
      const placeholders = chunk.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE pending_fixes SET status = 2, reject_reason = ? WHERE seq IN (${placeholders})`,
        [reason, ...chunk],
      );
    }
  });
}

export async function clearAll(db: Db): Promise<void> {
  await db.runAsync(`DELETE FROM pending_fixes`);
}

function* chunked<T>(arr: readonly T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

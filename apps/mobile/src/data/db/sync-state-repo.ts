import type { Db } from './db';
import type { Stream } from '../../domain/seq';

export interface SyncState {
  deviceId: string;
  stream: Stream;
  lastUploadedSeq: number;
  lastCursorSeq: number | null;
  highWaterSeq: number | null;
  lastReceiptJson: string | null;
  lastUploadAt: string | null;
  paused: boolean;
  pausedReason: string | null;
  lastError: string | null;
}

interface SyncStateRow {
  device_id: string;
  stream: string;
  last_uploaded_seq: number;
  last_cursor_seq: number | null;
  high_water_seq: number | null;
  last_receipt_json: string | null;
  last_upload_at: string | null;
  paused: number;
  paused_reason: string | null;
  last_error: string | null;
}

export async function ensureRow(db: Db, deviceId: string, stream: Stream): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO sync_state (device_id, stream) VALUES (?, ?)`,
    [deviceId, stream],
  );
}

export async function read(db: Db, deviceId: string, stream: Stream): Promise<SyncState | null> {
  const r = await db.getFirstAsync<SyncStateRow>(
    `SELECT * FROM sync_state WHERE device_id = ? AND stream = ?`,
    [deviceId, stream],
  );
  if (!r) return null;
  return {
    deviceId: r.device_id,
    stream: r.stream as Stream,
    lastUploadedSeq: r.last_uploaded_seq,
    lastCursorSeq: r.last_cursor_seq,
    highWaterSeq: r.high_water_seq,
    lastReceiptJson: r.last_receipt_json,
    lastUploadAt: r.last_upload_at,
    paused: r.paused !== 0,
    pausedReason: r.paused_reason,
    lastError: r.last_error,
  };
}

export interface UploadResult {
  /** New last-uploaded high-water; only advances, never lowers. */
  advanceTo: number | null;
  highWaterSeq: number | null;
  receiptJson: string;
  at: string;
}

export async function applyUploadResult(db: Db, deviceId: string, stream: Stream, r: UploadResult): Promise<void> {
  await ensureRow(db, deviceId, stream);
  await db.runAsync(
    `UPDATE sync_state SET
       last_uploaded_seq = MAX(last_uploaded_seq, ?),
       high_water_seq = ?,
       last_receipt_json = ?,
       last_upload_at = ?,
       last_error = NULL
     WHERE device_id = ? AND stream = ?`,
    [r.advanceTo ?? 0, r.highWaterSeq, r.receiptJson, r.at, deviceId, stream],
  );
}

/** Also raises last_uploaded_seq to cover the cursor. */
export async function setCursor(db: Db, deviceId: string, stream: Stream, lastSeq: number | null): Promise<void> {
  await ensureRow(db, deviceId, stream);
  await db.runAsync(
    `UPDATE sync_state SET last_cursor_seq = ?, last_uploaded_seq = MAX(last_uploaded_seq, ?)
     WHERE device_id = ? AND stream = ?`,
    [lastSeq, lastSeq ?? 0, deviceId, stream],
  );
}

export async function setPaused(db: Db, deviceId: string, stream: Stream, paused: boolean, reason: string | null): Promise<void> {
  await ensureRow(db, deviceId, stream);
  await db.runAsync(
    `UPDATE sync_state SET paused = ?, paused_reason = ? WHERE device_id = ? AND stream = ?`,
    [paused ? 1 : 0, reason, deviceId, stream],
  );
}

export async function setError(db: Db, deviceId: string, stream: Stream, error: string): Promise<void> {
  await ensureRow(db, deviceId, stream);
  await db.runAsync(
    `UPDATE sync_state SET last_error = ? WHERE device_id = ? AND stream = ?`,
    [error, deviceId, stream],
  );
}

export async function clearForDevice(db: Db, deviceId: string): Promise<void> {
  await db.runAsync(`DELETE FROM sync_state WHERE device_id = ?`, [deviceId]);
}

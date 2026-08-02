import type { Db } from './db';
import { nextSeq } from './seq-repo';
import type { AckKind, AnswerPayload, ResolvePayload } from '@lupira/assistant-domain/ack';

// The acks queue: one row per inbox gesture, drained in seq order by the ack uploader. The hub
// dedups on client_action_id, so replaying a row after a crash or timeout is always safe.

export interface PendingAck {
  seq: number;
  kind: AckKind;
  targetId: string;
  clientActionId: string;
  payloadJson: string;
}

/** One transaction so a seq is never burned without a durable row. */
export async function enqueueAck(
  db: Db,
  kind: AckKind,
  targetId: string,
  clientActionId: string,
  payload: ResolvePayload | AnswerPayload,
  createdAtMs: number,
): Promise<number> {
  let seq = 0;
  await db.withTransactionAsync(async () => {
    seq = await nextSeq(db, 'acks');
    await db.runAsync(
      `INSERT INTO pending_acks (seq, kind, target_id, client_action_id, payload_json, created_at)
       VALUES (?,?,?,?,?,?)`,
      [seq, kind, targetId, clientActionId, JSON.stringify(payload), createdAtMs],
    );
  });
  return seq;
}

interface AckRow {
  seq: number;
  kind: string;
  target_id: string;
  client_action_id: string;
  payload_json: string;
}

export async function fetchPendingAcks(db: Db, limit: number): Promise<PendingAck[]> {
  const rows = await db.getAllAsync<AckRow>(
    `SELECT seq, kind, target_id, client_action_id, payload_json
     FROM pending_acks ORDER BY seq LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    seq: r.seq,
    kind: r.kind as AckKind,
    targetId: r.target_id,
    clientActionId: r.client_action_id,
    payloadJson: r.payload_json,
  }));
}

export async function deleteAck(db: Db, seq: number): Promise<void> {
  await db.runAsync(`DELETE FROM pending_acks WHERE seq = ?`, [seq]);
}

export async function countPendingAcks(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM pending_acks`);
  return row?.n ?? 0;
}

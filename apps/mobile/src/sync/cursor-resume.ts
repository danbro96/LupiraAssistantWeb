import type { Db } from '../data/db/db';
import { getIngestLocationCursor } from '../data/api/generated/location-ingest/ingest/ingest';
import * as fixesRepo from '../data/db/pending-fixes-repo';
import * as seqRepo from '../data/db/seq-repo';
import * as syncState from '../data/db/sync-state-repo';
import { logDebug } from '../debug/log';

// Drop already-accepted fixes (seq <= lastSeq) and keep the local seq counter at/above server high-water (reinstall).

export async function resumeFromCursor(db: Db, deviceId: string): Promise<void> {
  const { data: cursor } = await getIngestLocationCursor();
  const lastSeq = cursor.lastSeq ?? 0;
  if (lastSeq > 0) {
    await fixesRepo.deleteUpTo(db, lastSeq);
    await seqRepo.ensureAtLeast(db, 'location', lastSeq);
  }
  await syncState.setCursor(db, deviceId, 'location', cursor.lastSeq ?? null);
  logDebug('sync:cursor-resume', `lastSeq=${cursor.lastSeq ?? 'null'}`);
}

import type { Db } from '../data/db/db';
import { getIngestLocationState } from '../data/api/generated/location-ingest/ingest/ingest';
import * as syncState from '../data/db/sync-state-repo';
import * as collectorMeta from '../data/db/collector-meta-repo';
import { logDebug } from '../debug/log';

// Writes the paused flag to both sync_state (UI) and collector_meta (collector's cross-context read).

export async function pollTrackingState(db: Db, deviceId: string): Promise<boolean> {
  const { data: state } = await getIngestLocationState();
  await syncState.setPaused(db, deviceId, 'location', state.paused, state.reason ?? null);
  await collectorMeta.setPausedCached(db, state.paused);
  logDebug('sync:state-poll', `paused=${state.paused}`);
  return state.paused;
}

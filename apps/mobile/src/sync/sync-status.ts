import { create } from 'zustand';
import type { Db } from '../data/db/db';
import { pendingCount as readPendingCount } from '../data/db/pending-fixes-repo';
import * as syncStateRepo from '../data/db/sync-state-repo';

// Lives in the SYNC layer (not state/) so sync can update it without importing upward.

export type CollectorStatus = 'off' | 'idle' | 'collecting' | 'paused';

interface SyncStatusState {
  mirror: number;
  collector: CollectorStatus;
  uploading: boolean;
  online: boolean;
  pendingCount: number;
  lastUploadedSeq: number;
  highWaterSeq: number | null;
  lastUploadAt: string | null;
  paused: boolean;
  pausedReason: string | null;
  lastError: string | null;

  bumpMirror: () => void;
  setCollector: (collector: CollectorStatus) => void;
  setUploading: (uploading: boolean) => void;
  setOnline: (online: boolean) => void;
  patch: (p: Partial<SyncStatusState>) => void;
}

export const useSyncStatus = create<SyncStatusState>((set) => ({
  mirror: 0,
  collector: 'off',
  uploading: false,
  online: true,
  pendingCount: 0,
  lastUploadedSeq: 0,
  highWaterSeq: null,
  lastUploadAt: null,
  paused: false,
  pausedReason: null,
  lastError: null,

  bumpMirror: () => set((s) => ({ mirror: s.mirror + 1 })),
  setCollector: (collector) => set({ collector }),
  setUploading: (uploading) => set({ uploading }),
  setOnline: (online) => set({ online }),
  patch: (p) => set(p),
}));

export function bumpMirror(): void {
  useSyncStatus.getState().bumpMirror();
}

export async function refreshSyncStatus(db: Db, deviceId: string): Promise<void> {
  const [pending, state] = await Promise.all([
    readPendingCount(db),
    syncStateRepo.read(db, deviceId, 'location'),
  ]);
  useSyncStatus.getState().patch({
    pendingCount: pending,
    lastUploadedSeq: state?.lastUploadedSeq ?? 0,
    highWaterSeq: state?.highWaterSeq ?? null,
    lastUploadAt: state?.lastUploadAt ?? null,
    paused: state?.paused ?? false,
    pausedReason: state?.pausedReason ?? null,
    lastError: state?.lastError ?? null,
  });
}

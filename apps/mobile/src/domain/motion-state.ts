import type { ActivityKind } from './location-fix';

// Values match the `activity` wire strings so `activityOf` is an identity map.
export enum MotionState {
  Unknown = 'unknown',
  Still = 'still',
  Walk = 'walk',
  Run = 'run',
  Cycle = 'cycle',
  Vehicle = 'vehicle',
}

// Speed thresholds (m/s). Boundaries only affect sampling density, not data.
export const STILL_MAX_MPS = 0.3;
export const WALK_MAX_MPS = 2.2;
export const FAST_MAX_MPS = 8.0; // above → vehicle
export const RUN_CADENCE_SPM = 120; // splits run vs cycle at overlapping speeds

export interface MotionInput {
  speedMps: number | null;
  speedMeasured: boolean; // from GPS sample vs derived from displacement (lower confidence)
  stepsPerMin: number | null;
}

export interface MotionReading {
  state: MotionState;
  conf: number; // 0–100 (measured speed > derived > none)
}

export function classifyMotion(i: MotionInput): MotionReading {
  if (i.speedMps === null) return { state: MotionState.Unknown, conf: 20 };
  const s = i.speedMps;
  let state: MotionState;
  if (s < STILL_MAX_MPS) state = MotionState.Still;
  else if (s < WALK_MAX_MPS) state = MotionState.Walk;
  else if (s < FAST_MAX_MPS) state = (i.stepsPerMin ?? 0) >= RUN_CADENCE_SPM ? MotionState.Run : MotionState.Cycle;
  else state = MotionState.Vehicle;
  const conf = i.speedMeasured ? (state === MotionState.Still ? 70 : 85) : 50;
  return { state, conf };
}

// Unknown → not moving (safe default).
export function isMovingForState(state: MotionState): boolean {
  return state !== MotionState.Still && state !== MotionState.Unknown;
}

export function activityOf(state: MotionState): ActivityKind {
  return state;
}

export const DEFAULT_HYSTERESIS = 2;

export interface MotionDebounce {
  state: MotionState;
  pending: MotionState | null;
  pendingCount: number;
}

export const INITIAL_DEBOUNCE: MotionDebounce = { state: MotionState.Unknown, pending: null, pendingCount: 0 };

// Switch committed state only after `threshold` consecutive observations — prevents task churn on one bad GPS sample.
export function debounceMotion(
  prev: MotionDebounce,
  observed: MotionState,
  threshold: number = DEFAULT_HYSTERESIS,
): { next: MotionDebounce; changed: boolean } {
  if (observed === prev.state) {
    return { next: { state: prev.state, pending: null, pendingCount: 0 }, changed: false };
  }
  if (observed === prev.pending) {
    const pendingCount = prev.pendingCount + 1;
    if (pendingCount >= threshold) {
      return { next: { state: observed, pending: null, pendingCount: 0 }, changed: true };
    }
    return { next: { state: prev.state, pending: observed, pendingCount }, changed: false };
  }
  return { next: { state: prev.state, pending: observed, pendingCount: 1 }, changed: false };
}

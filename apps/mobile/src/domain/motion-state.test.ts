import { describe, it, expect } from 'vitest';
import {
  classifyMotion,
  debounceMotion,
  isMovingForState,
  activityOf,
  MotionState,
  INITIAL_DEBOUNCE,
} from './motion-state';

describe('classifyMotion', () => {
  it('returns Unknown with low confidence when speed is unavailable', () => {
    expect(classifyMotion({ speedMps: null, speedMeasured: false, stepsPerMin: null })).toEqual({
      state: MotionState.Unknown,
      conf: 20,
    });
  });

  it('maps speed bands to states', () => {
    expect(classifyMotion({ speedMps: 0.1, speedMeasured: true, stepsPerMin: null }).state).toBe(MotionState.Still);
    expect(classifyMotion({ speedMps: 1.2, speedMeasured: true, stepsPerMin: null }).state).toBe(MotionState.Walk);
    expect(classifyMotion({ speedMps: 12, speedMeasured: true, stepsPerMin: null }).state).toBe(MotionState.Vehicle);
  });

  it('uses cadence to split run vs cycle in the overlapping mid-speed band', () => {
    expect(classifyMotion({ speedMps: 3.5, speedMeasured: true, stepsPerMin: 160 }).state).toBe(MotionState.Run);
    expect(classifyMotion({ speedMps: 3.5, speedMeasured: true, stepsPerMin: 0 }).state).toBe(MotionState.Cycle);
  });

  it('lowers confidence when speed was derived (not measured)', () => {
    expect(classifyMotion({ speedMps: 5, speedMeasured: false, stepsPerMin: null }).conf).toBe(50);
    expect(classifyMotion({ speedMps: 5, speedMeasured: true, stepsPerMin: null }).conf).toBe(85);
  });
});

describe('isMovingForState / activityOf', () => {
  it('treats still and unknown as not moving', () => {
    expect(isMovingForState(MotionState.Still)).toBe(false);
    expect(isMovingForState(MotionState.Unknown)).toBe(false);
    expect(isMovingForState(MotionState.Walk)).toBe(true);
  });

  it('maps state to the matching wire activity string', () => {
    expect(activityOf(MotionState.Vehicle)).toBe('vehicle');
  });
});

describe('debounceMotion (hysteresis)', () => {
  it('does not switch on a single differing observation', () => {
    const start = { state: MotionState.Still, pending: null, pendingCount: 0 };
    const r1 = debounceMotion(start, MotionState.Vehicle);
    expect(r1.changed).toBe(false);
    expect(r1.next.state).toBe(MotionState.Still);
    expect(r1.next.pending).toBe(MotionState.Vehicle);
  });

  it('switches once the new state persists for the threshold', () => {
    const start = { state: MotionState.Still, pending: null, pendingCount: 0 };
    const r1 = debounceMotion(start, MotionState.Vehicle);
    const r2 = debounceMotion(r1.next, MotionState.Vehicle);
    expect(r2.changed).toBe(true);
    expect(r2.next.state).toBe(MotionState.Vehicle);
  });

  it('a flap back to the committed state clears the pending candidate', () => {
    const start = { state: MotionState.Walk, pending: null, pendingCount: 0 };
    const r1 = debounceMotion(start, MotionState.Run);
    const r2 = debounceMotion(r1.next, MotionState.Walk);
    expect(r2.changed).toBe(false);
    expect(r2.next.pending).toBeNull();
    expect(r2.next.pendingCount).toBe(0);
  });

  it('initial debounce starts Unknown with no pending', () => {
    expect(INITIAL_DEBOUNCE).toEqual({ state: MotionState.Unknown, pending: null, pendingCount: 0 });
  });
});

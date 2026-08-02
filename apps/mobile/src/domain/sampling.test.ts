import { describe, it, expect } from 'vitest';
import { paramsFor, Accuracy, ActivityType } from './sampling';
import { MotionState } from './motion-state';

describe('paramsFor', () => {
  it('returns a params row for every motion state', () => {
    for (const state of Object.values(MotionState)) {
      const p = paramsFor(state);
      expect(p.distanceInterval).toBeGreaterThan(0);
      expect(p.timeInterval).toBeGreaterThan(0);
    }
  });

  it('samples densely in vehicle (best accuracy, short intervals)', () => {
    const v = paramsFor(MotionState.Vehicle);
    expect(v.accuracy).toBe(Accuracy.BestForNavigation);
    expect(v.activityType).toBe(ActivityType.AutomotiveNavigation);
    expect(v.timeInterval).toBeLessThanOrEqual(5_000);
  });

  it('samples sparsely when still (coarse accuracy, long intervals) to save battery', () => {
    const s = paramsFor(MotionState.Still);
    expect(s.accuracy).toBe(Accuracy.Balanced);
    expect(s.distanceInterval).toBeGreaterThanOrEqual(100);
    expect(s.timeInterval).toBeGreaterThanOrEqual(5 * 60_000);
  });

  it('run samples more frequently than still', () => {
    expect(paramsFor(MotionState.Run).timeInterval).toBeLessThan(paramsFor(MotionState.Still).timeInterval);
  });
});

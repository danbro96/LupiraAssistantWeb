import { describe, it, expect } from 'vitest';
import { haversineMeters, speedFromDisplacement } from './geo';

describe('haversineMeters', () => {
  it('is ~0 for identical points', () => {
    expect(haversineMeters(59.3, 18.0, 59.3, 18.0)).toBeCloseTo(0, 5);
  });

  it('is ~111.2 km for 1° of longitude at the equator', () => {
    const d = haversineMeters(0, 0, 0, 1);
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });
});

describe('speedFromDisplacement', () => {
  it('computes m/s from displacement over elapsed time', () => {
    const prev = { lat: 0, lon: 0, tsMs: 0 };
    const cur = { lat: 0, lon: 0.001, tsMs: 1000 };
    const v = speedFromDisplacement(prev, cur);
    expect(v).not.toBeNull();
    expect(v as number).toBeGreaterThan(100);
    expect(v as number).toBeLessThan(120);
  });

  it('returns null for a non-positive time delta', () => {
    expect(speedFromDisplacement({ lat: 0, lon: 0, tsMs: 1000 }, { lat: 0, lon: 1, tsMs: 1000 })).toBeNull();
  });
});

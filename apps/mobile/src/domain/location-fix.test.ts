import { describe, it, expect } from 'vitest';
import { mapToWireFix, WIRE_FIX_KEYS, type LocationSample, type MapContext } from './location-fix';

const NOW = Date.parse('2026-06-18T12:00:00.000Z');

function sample(over: Partial<LocationSample['coords']> = {}, extra: Partial<LocationSample> = {}): LocationSample {
  return {
    coords: { latitude: 59.3293, longitude: 18.0686, accuracy: 8.46, altitude: 42.4, altitudeAccuracy: 3.27, heading: 270.55, speed: 3.74, ...over },
    timestamp: NOW,
    ...extra,
  };
}

const ctx: MapContext = {
  batteryPct: 78,
  provider: 'fused',
  activity: 'walk',
  activityConf: 85,
  isMoving: true,
  nowMs: NOW,
};

describe('mapToWireFix', () => {
  it('maps coords to the snake_case wire shape and rounds floats to 1dp', () => {
    const f = mapToWireFix(sample(), ctx);
    expect(f.lat).toBe(59.3293); // lat/lon are not rounded
    expect(f.lon).toBe(18.0686);
    expect(f.accuracy_m).toBe(8.5);
    expect(f.altitude_m).toBe(42.4);
    expect(f.vertical_acc_m).toBe(3.3);
    expect(f.heading_deg).toBe(270.6);
    expect(f.speed_mps).toBe(3.7);
    expect(f.heading_acc_deg).toBeNull(); // expo-location exposes neither
    expect(f.speed_acc_mps).toBeNull();
    expect(f.provider).toBe('fused');
    expect(f.activity).toBe('walk');
    expect(f.activity_conf).toBe(85);
    expect(f.battery_pct).toBe(78);
    expect(f.is_moving).toBe(true);
    expect(f.ts).toBe('2026-06-18T12:00:00.000Z');
  });

  it('maps Android -1 heading/speed (unknown) to null and keeps low-accuracy fixes', () => {
    const f = mapToWireFix(sample({ heading: -1, speed: -1, accuracy: 1500 }), ctx);
    expect(f.heading_deg).toBeNull();
    expect(f.speed_mps).toBeNull();
    expect(f.accuracy_m).toBe(1500); // low accuracy is flagged, never dropped
  });

  it('sets is_mock from the (Android-only) mocked flag, defaulting to false', () => {
    expect(mapToWireFix(sample({}, { mocked: true }), ctx).is_mock).toBe(true);
    expect(mapToWireFix(sample(), ctx).is_mock).toBe(false);
  });

  it('clamps a future timestamp to now (server rejects ts > now+5min)', () => {
    const f = mapToWireFix(sample({}, { timestamp: NOW + 10 * 60_000 }), ctx);
    expect(f.ts).toBe(new Date(NOW).toISOString());
  });

  it('nulls missing optional fields', () => {
    const f = mapToWireFix(sample({ accuracy: null, altitude: null, altitudeAccuracy: null }), ctx);
    expect(f.accuracy_m).toBeNull();
    expect(f.altitude_m).toBeNull();
    expect(f.vertical_acc_m).toBeNull();
  });

  it('CONTRACT: emits exactly the wire keys and never any *_id / principal / device field', () => {
    const f = mapToWireFix(sample(), ctx);
    const keys = Object.keys(f).sort();
    expect(keys).toEqual([...WIRE_FIX_KEYS].sort());
    for (const k of keys) {
      expect(k).not.toMatch(/_id$|principal|device/i);
    }
  });
});

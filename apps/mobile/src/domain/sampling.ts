import { MotionState } from './motion-state';

// Motion state → expo-location request options. Numeric values mirror expo-location's enums (kept dependency-free).
export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
} as const;
export type AccuracyValue = (typeof Accuracy)[keyof typeof Accuracy];

export const ActivityType = {
  Other: 1,
  AutomotiveNavigation: 2,
  Fitness: 3,
  OtherNavigation: 4,
  Airborne: 5,
} as const;
export type ActivityTypeValue = (typeof ActivityType)[keyof typeof ActivityType];

export interface SamplingParams {
  accuracy: AccuracyValue;
  activityType: ActivityTypeValue;
  distanceInterval: number; // min movement (m) between fixes
  timeInterval: number; // min time (ms) between fixes (Android)
  deferredUpdatesDistance: number; // iOS: batch until this distance (m) accrues
  deferredUpdatesInterval: number; // iOS: batch until this time (ms) elapses
}

const TABLE: Record<MotionState, SamplingParams> = {
  [MotionState.Still]: {
    accuracy: Accuracy.Balanced,
    activityType: ActivityType.Other,
    distanceInterval: 100,
    timeInterval: 5 * 60_000,
    deferredUpdatesDistance: 200,
    deferredUpdatesInterval: 10 * 60_000,
  },
  [MotionState.Walk]: {
    accuracy: Accuracy.High,
    activityType: ActivityType.Fitness,
    distanceInterval: 25,
    timeInterval: 30_000,
    deferredUpdatesDistance: 50,
    deferredUpdatesInterval: 60_000,
  },
  [MotionState.Run]: {
    accuracy: Accuracy.High,
    activityType: ActivityType.Fitness,
    distanceInterval: 15,
    timeInterval: 10_000,
    deferredUpdatesDistance: 25,
    deferredUpdatesInterval: 30_000,
  },
  [MotionState.Cycle]: {
    accuracy: Accuracy.High,
    activityType: ActivityType.Fitness,
    distanceInterval: 25,
    timeInterval: 10_000,
    deferredUpdatesDistance: 40,
    deferredUpdatesInterval: 30_000,
  },
  [MotionState.Vehicle]: {
    accuracy: Accuracy.BestForNavigation,
    activityType: ActivityType.AutomotiveNavigation,
    distanceInterval: 30,
    timeInterval: 5_000,
    deferredUpdatesDistance: 50,
    deferredUpdatesInterval: 15_000,
  },
  [MotionState.Unknown]: {
    accuracy: Accuracy.Balanced,
    activityType: ActivityType.Other,
    distanceInterval: 50,
    timeInterval: 60_000,
    deferredUpdatesDistance: 100,
    deferredUpdatesInterval: 120_000,
  },
};

export function paramsFor(state: MotionState): SamplingParams {
  return TABLE[state];
}

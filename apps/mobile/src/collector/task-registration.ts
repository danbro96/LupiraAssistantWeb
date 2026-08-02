import * as Location from 'expo-location';
import { LOCATION_TASK, FGS_NOTIFICATION_BODY, FGS_NOTIFICATION_COLOR, FGS_NOTIFICATION_TITLE } from './constants';
import { paramsFor } from '../domain/sampling';
import { MotionState } from '../domain/motion-state';

// reconfigure = stop + restart: expo-location has no live-update-options API.

export function isCollecting(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
}

export async function startCollecting(state: MotionState = MotionState.Unknown): Promise<void> {
  if (await isCollecting()) return;
  await applyUpdates(state);
}

export async function stopCollecting(): Promise<void> {
  if (await isCollecting()) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}

export async function reconfigure(state: MotionState): Promise<void> {
  if (await isCollecting()) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  await applyUpdates(state);
}

async function applyUpdates(state: MotionState): Promise<void> {
  const p = paramsFor(state);
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: p.accuracy as Location.Accuracy,
    activityType: p.activityType as Location.ActivityType,
    distanceInterval: p.distanceInterval,
    timeInterval: p.timeInterval,
    deferredUpdatesDistance: p.deferredUpdatesDistance,
    deferredUpdatesInterval: p.deferredUpdatesInterval,
    pausesUpdatesAutomatically: false, // we manage pausing via the server kill-switch
    showsBackgroundLocationIndicator: true, // iOS: honest blue status bar
    foregroundService: {
      notificationTitle: FGS_NOTIFICATION_TITLE,
      notificationBody: FGS_NOTIFICATION_BODY,
      notificationColor: FGS_NOTIFICATION_COLOR,
      killServiceOnDestroy: false,
    },
  });
}

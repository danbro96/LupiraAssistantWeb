import { obtainPushToken, unregisterPushToken } from './push-registration';

// Sign-out hook, split from registration so `state` can call it without importing the registrar's
// wider surface. Best-effort: the hub also prunes tokens Expo reports dead.

export async function dropPushRegistration(): Promise<void> {
  const token = await obtainPushToken();
  if (token) await unregisterPushToken(token);
}

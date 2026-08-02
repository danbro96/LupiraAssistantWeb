// Status 0 = no HTTP response (timeout / unreachable host).
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Ingest 401: device key revoked → stop uploading, prompt re-registration (no OIDC re-auth on ingest path).
export class DeviceKeyInvalidError extends ApiError {
  constructor(message = 'Device key rejected (401) — re-register this device.') {
    super(401, message);
    this.name = 'DeviceKeyInvalidError';
  }
}

export function isNetworkError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 0;
}

export const REQUEST_TIMEOUT_MS = 15_000;

/** All overridable via the settings screen. Location ingest + device registration → LocationApi; health record/bootstrap → HealthApi; proposals/grant → AssistantApi. */
export const DEFAULT_HEALTH_API_URL = 'https://health-api.lupira.com';
export const DEFAULT_LOCATION_API_URL = 'https://location-api.lupira.com';
export const DEFAULT_ASSISTANT_API_URL = 'https://assistant-api.lupira.com';

/** Keep in sync with app.config.ts. */
export const APP_VERSION = '0.1.0';

/** Public client key, safe to commit. Empty disables crash reporting. */
export const SENTRY_DSN = '';

/** Below the server's 10k `batch_too_large` cap, with headroom. */
export const MAX_BATCH_LINES = 9_000;

/** Server guidance: <5 MB. */
export const MAX_BATCH_BYTES = 5 * 1024 * 1024 - 64 * 1024;

export const UPLOAD_FETCH_LIMIT = 12_000;

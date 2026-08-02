export const MAX_RETRIES = 2; // total attempts = MAX_RETRIES + 1

const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 10_000;

// Transient = transport failure (0), 429, or any 5xx.
export function isTransientStatus(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

// GET/HEAD always retriable; ingest POSTs pass idempotent:true (server dedupes on seq).
export function isRetriableRequest(method: string | undefined, idempotent: boolean): boolean {
  const m = (method ?? 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD') return true;
  return idempotent;
}

// Honors numeric `Retry-After` (seconds); else exponential backoff + jitter capped at MAX_DELAY_MS. `attempt` 0-based.
export function retryDelayMs(attempt: number, retryAfter: string | null, rand: () => number = Math.random): number {
  const secs = retryAfter !== null ? Number(retryAfter) : NaN;
  if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, MAX_DELAY_MS);
  const base = BASE_DELAY_MS * 2 ** attempt;
  const jitter = Math.floor(rand() * BASE_DELAY_MS);
  return Math.min(base + jitter, MAX_DELAY_MS);
}

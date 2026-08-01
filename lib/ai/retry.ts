/**
 * Server-side retry with exponential backoff. Ported from the legacy
 * frontend's client-side retry (TestcaseForm.tsx) so that every caller —
 * not just the browser — gets resilience against transient provider errors.
 */

const RETRYABLE_PATTERNS = [
  /overloaded/i,
  /rate[ _-]?limit/i,
  /\b429\b/,
  /\b503\b/,
  /\b529\b/,
  /UNAVAILABLE/i,
  /ServiceUnavailable/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /fetch failed/i,
];

export function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return RETRYABLE_PATTERNS.some((p) => p.test(message));
}

export interface RetryOptions {
  attempts?: number;
  /** Base delay in ms; attempt n waits base * 2^(n-1) (2s, 4s, 8s by default). */
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 2000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryableError(error)) throw error;
      options.onRetry?.(attempt, error);
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

/**
 * Provider SDKs sometimes echo request details into error messages. Strip
 * anything that looks like an API key before an error reaches the client or a
 * log line — a user-supplied key must never leave the request it came in on.
 */

const KEY_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{8,}/g, // OpenAI, Anthropic
  /AIza[A-Za-z0-9_-]{10,}/g, // Google
  /\b[A-Za-z0-9_-]{32,}\b/g, // long opaque tokens
];

export function redactSecrets(text: string): string {
  return KEY_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, "***"), text);
}

export function errorMessage(error: unknown, fallback: string): string {
  return redactSecrets(error instanceof Error ? error.message : fallback);
}

/**
 * Parse JSON out of an LLM text response.
 *
 * Models often wrap JSON in ```json … ``` fences (or plain ``` fences) despite
 * being told not to. This strips those fences and parses. Throws on invalid
 * JSON — callers should catch and return a friendly error.
 */
export function stripJsonFences(text: string): string {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.slice(7);
  } else if (clean.startsWith('```')) {
    clean = clean.slice(3);
  }
  if (clean.endsWith('```')) {
    clean = clean.slice(0, -3);
  }
  return clean.trim();
}

export function parseLlmJson<T = unknown>(text: string): T {
  return JSON.parse(stripJsonFences(text)) as T;
}

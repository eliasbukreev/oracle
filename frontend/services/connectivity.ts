export const PROBE_TIMEOUT_MS = 15000;
export const RECHECK_INTERVAL_MS = 30000;
export const ASK_TIMEOUT_MS = 40000;

export async function checkConnection(
  apiUrl: string,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<boolean> {
  if (!apiUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(apiUrl, { method: "OPTIONS", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

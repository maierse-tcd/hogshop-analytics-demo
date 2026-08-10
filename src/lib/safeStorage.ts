/**
 * localStorage helpers that survive a full quota.
 *
 * When the quota is full, every `setItem` throws a QuotaExceededError. The
 * write fails, and a click handler that persists state before it repaints does
 * nothing visible — the user sees a dead click. `safeSetItem` catches the
 * error, evicts the app's own expired keys, and retries once, so a full quota
 * degrades to "state not persisted" instead of a dead click.
 */

const isQuotaError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
};

// Keys that hold a JSON blob with an `expiresAt` timestamp. They are safe to
// drop once that time passes.
const EXPIRING_KEYS = ["checkout_user", "checkout_basket"];

const TRACKED_SESSIONS_KEY = "tracked_sessions";
const TRACKED_SESSIONS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TRACKED_SESSIONS_MAX = 50;

/**
 * Drop tracked-session records older than the TTL, then keep only the newest
 * `TRACKED_SESSIONS_MAX` entries, so the map cannot grow without bound.
 */
export const pruneTrackedSessions = (): void => {
  try {
    const raw = localStorage.getItem(TRACKED_SESSIONS_KEY);
    if (!raw) return;

    const sessions: Record<string, { timestamp?: number }> = JSON.parse(raw);
    const cutoff = Date.now() - TRACKED_SESSIONS_TTL_MS;

    const kept = Object.entries(sessions)
      .filter(([, value]) => (value?.timestamp ?? 0) >= cutoff)
      .sort(([, a], [, b]) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0))
      .slice(0, TRACKED_SESSIONS_MAX);

    localStorage.setItem(
      TRACKED_SESSIONS_KEY,
      JSON.stringify(Object.fromEntries(kept)),
    );
  } catch {
    // Pruning is best effort — never let it throw.
  }
};

/**
 * Remove the app's own expired keys: stale checkout blobs and old
 * tracked-session records. Safe to call on app start and before a write.
 */
export const pruneExpiredStorage = (): void => {
  const now = Date.now();

  for (const key of EXPIRING_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.expiresAt && now > parsed.expiresAt) {
        localStorage.removeItem(key);
      }
    } catch {
      // Corrupt value — drop it.
      localStorage.removeItem(key);
    }
  }

  pruneTrackedSessions();
};

/**
 * Write to localStorage without letting a full quota throw. On a quota error it
 * evicts the app's own expired keys and retries once. Returns true when the
 * value was stored.
 */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (!isQuotaError(error)) {
      console.error("Storage: write failed", key, error);
      return false;
    }
    try {
      pruneExpiredStorage();
      localStorage.setItem(key, value);
      return true;
    } catch (retryError) {
      console.warn("Storage: quota full, value not persisted", key, retryError);
      return false;
    }
  }
};

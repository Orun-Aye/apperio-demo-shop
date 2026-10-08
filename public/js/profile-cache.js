// Keeps the profile the header already loaded, so other parts of the page
// can show the shopper's name without asking the API again.
const KEY = "shop.profile";
const FRESH_FOR_MS = 10 * 60 * 1000;

export function remember(userId, profile) {
  sessionStorage.setItem(KEY, JSON.stringify({ userId, profile, savedAt: Date.now() }));
}

export function peek(userId) {
  try {
    const entry = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return entry && entry.userId === userId ? entry.profile : undefined;
  } catch {
    return undefined;
  }
}

/** The cached profile if it was loaded in the last ten minutes. */
export function get(userId) {
  try {
    const entry = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!entry || entry.userId !== userId) return undefined;
    return Date.now() - entry.savedAt < FRESH_FOR_MS ? entry.profile : undefined;
  } catch {
    return undefined;
  }
}

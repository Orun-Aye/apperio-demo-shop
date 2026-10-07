// Keeps the profile the header already loaded, so other parts of the page
// can show the shopper's name without asking the API again.
const KEY = "shop.profile";

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

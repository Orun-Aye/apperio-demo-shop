// Shared helpers for the API functions. Files starting with "_" are not routes.

export const PRODUCTS = [
  { id: "pour-over", name: "Ceramic pour-over", price: 28, blurb: "Hand-glazed dripper, fits most mugs." },
  { id: "grinder", name: "Burr grinder", price: 149, blurb: "Forty steps from espresso to cold brew." },
  { id: "kettle", name: "Gooseneck kettle", price: 64, blurb: "Slow, steady pour. Holds 900ml." },
  { id: "filters", name: "Paper filters, 100", price: 7, blurb: "Unbleached, for the ceramic pour-over." },
  { id: "scale", name: "Brew scale", price: 39, blurb: "0.1g resolution with a built-in timer." },
  { id: "travel-mug", name: "Travel mug", price: 22, blurb: "Keeps it hot for the whole commute." },
];

const FIRST = ["Amara", "Jamie", "Priya", "Tomasz", "Chidi", "Sofia", "Kwame", "Hannah", "Luis", "Mei", "Oliver", "Zainab"];
const LAST = ["Okafor", "Patel", "Nowak", "Reyes", "Mensah", "Clarke", "Haddad", "Lindqvist", "Adeyemi", "Chen"];

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Saved profile for a shopper, or null for accounts that never saved one.
 * Deterministic per user id so a shopper looks the same on every request.
 */
export function profileFor(userId) {
  if (!userId) return null;
  const h = hash(userId);
  if (h % 100 < 35) return null;
  const first = FIRST[h % FIRST.length];
  const last = LAST[(h >>> 8) % LAST.length];
  return {
    userId,
    name: `${first} ${last}`,
    email: `${first}.${last}@example.com`.toLowerCase(),
    city: ["Manchester", "Leeds", "Bristol", "Glasgow", "Cardiff", "Lagos"][(h >>> 4) % 6],
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const between = (min, max) => min + Math.random() * (max - min);

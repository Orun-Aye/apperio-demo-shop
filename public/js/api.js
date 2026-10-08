async function getJson(url) {
  const res = await fetch(url);
  // Path only: the query varies per call and would split one failure into many
  if (!res.ok) throw new Error(`${url.split("?")[0]} answered ${res.status}`);
  return res.json();
}

export const fetchProducts = () => getJson("/api/products");

export const fetchProduct = (id) => getJson(`/api/products?id=${encodeURIComponent(id)}`);

export const fetchRecommendations = (exclude) =>
  getJson(`/api/recommendations?exclude=${encodeURIComponent(exclude || "")}`);

/** The shopper's saved profile, or null when they never saved one. */
export async function fetchProfile(userId) {
  const res = await fetch(`/api/profile?user=${encodeURIComponent(userId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`/api/profile answered ${res.status}`);
  return res.json();
}

export async function placeOrder(order) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Checkout failed with ${res.status}`);
  return body;
}

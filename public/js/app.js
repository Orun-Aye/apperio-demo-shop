// Runs on every page: starts the logger, fills the header, keeps the cart badge current.
import { logger } from "./apperio.js";
import { fetchProfile } from "./api.js";
import { cartCount } from "./cart.js";
import { remember } from "./profile-cache.js";
import { currentUser } from "./session.js";

function renderCartBadge() {
  const badge = document.querySelector("[data-cart-count]");
  if (badge) badge.textContent = String(cartCount());
}

async function renderAccount() {
  const slot = document.querySelector("[data-account]");
  const userId = currentUser();
  try {
    const profile = await fetchProfile(userId);
    if (profile) remember(userId, profile);
    if (slot) slot.textContent = profile ? `Hi, ${profile.name.split(" ")[0]}` : "Guest";
  } catch (err) {
    if (slot) slot.textContent = "Guest";
    logger?.warn("Could not load shopper profile", { reason: String(err) });
  }
}

renderCartBadge();
document.addEventListener("cart:change", renderCartBadge);
renderAccount();

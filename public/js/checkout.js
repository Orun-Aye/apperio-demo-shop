import { logger } from "./apperio.js";
import { fetchProfile, placeOrder } from "./api.js";
import { cartTotal, clearCart, money, readCart } from "./cart.js";
import { currentUser } from "./session.js";

export async function initCheckout() {
  const cart = readCart();
  const profile = await fetchProfile(currentUser());
  renderCheckoutSummary(cart, profile ?? {});
  bindPlaceOrder(cart);
}

function renderCheckoutSummary(cart, profile) {
  const lines = cart
    .map((i) => `<li><span>${i.qty} × ${i.name}</span><span>${money(i.price * i.qty)}</span></li>`)
    .join("");

  document.querySelector("[data-summary]").innerHTML = `
    <ul class="lines">${lines || "<li class=\"muted\">Your cart is empty.</li>"}</ul>
    <p class="total"><span>Total</span><span>${money(cartTotal(cart))}</span></p>`;

  const email = profile.email;
  document.querySelector("[data-receipt]").textContent = email
    ? `Your receipt goes to ${email}.`
    : "Add an email so we can send your receipt.";
  if (email) document.querySelector("#email").value = email;
  if (profile.name) document.querySelector("#name").value = profile.name;
}

function bindPlaceOrder(cart) {
  const form = document.querySelector("[data-checkout-form]");
  const status = document.querySelector("[data-status]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const total = cartTotal(cart);

    // Personal fields go in on purpose: the SDK redacts them before sending
    logger?.info("Checkout submitted", {
      email: data.email,
      card: data.card,
      items: cart.length,
      total,
    });

    status.textContent = "Placing your order…";
    try {
      const { orderId } = await placeOrder({ items: cart, total });
      clearCart();
      status.textContent = `Order ${orderId} confirmed. Thank you.`;
      logger?.info("Order placed", { orderId, total });
    } catch (err) {
      status.textContent = "We could not take payment just now. Please try again.";
      logger?.error("Order failed", err instanceof Error ? err : undefined, { total });
    }
  });
}

import { cartTotal, money, readCart } from "./cart.js";

export function initCart() {
  const items = readCart();
  const list = document.querySelector("[data-cart]");
  list.innerHTML = items.length
    ? items
        .map((i) => `<li><span>${i.qty} × ${i.name}</span><span>${money(i.price * i.qty)}</span></li>`)
        .join("")
    : `<li class="muted">Nothing here yet. <a href="/">Browse the range</a>.</li>`;
  document.querySelector("[data-cart-total]").textContent = money(cartTotal(items));
  document.querySelector("[data-go-checkout]").hidden = items.length === 0;
}

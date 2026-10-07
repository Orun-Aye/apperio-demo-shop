const KEY = "shop.cart";

export function readCart() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  document.dispatchEvent(new CustomEvent("cart:change"));
}

export function addToCart(product, qty = 1) {
  const items = readCart();
  const line = items.find((i) => i.id === product.id);
  if (line) line.qty += qty;
  else items.push({ id: product.id, name: product.name, price: product.price, qty });
  writeCart(items);
}

export function clearCart() {
  writeCart([]);
}

export const cartCount = (items = readCart()) => items.reduce((n, i) => n + i.qty, 0);

export const cartTotal = (items = readCart()) => items.reduce((sum, i) => sum + i.price * i.qty, 0);

export const money = (n) => `£${n.toFixed(2)}`;

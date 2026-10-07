import { logger } from "./apperio.js";
import { fetchProduct, fetchProducts, fetchRecommendations } from "./api.js";
import { addToCart, money } from "./cart.js";

function productCard(p) {
  return `
    <a class="card" href="/product?id=${p.id}" data-product="${p.id}">
      <div class="thumb thumb-${p.id}" aria-hidden="true"></div>
      <h3>${p.name}</h3>
      <p>${p.blurb}</p>
      <span class="price">${money(p.price)}</span>
    </a>`;
}

export async function initHome() {
  const grid = document.querySelector("[data-grid]");
  grid.innerHTML = `<p class="muted">Loading the range…</p>`;
  const products = await fetchProducts();
  grid.innerHTML = products.map(productCard).join("");
}

export async function initProduct() {
  const id = new URLSearchParams(location.search).get("id");
  const slot = document.querySelector("[data-product-detail]");
  const product = await fetchProduct(id);
  document.title = `${product.name} · Demo Shop`;
  slot.innerHTML = `
    <div class="thumb thumb-lg thumb-${product.id}" aria-hidden="true"></div>
    <div>
      <h1>${product.name}</h1>
      <p class="lead">${product.blurb}</p>
      <p class="price price-lg">${money(product.price)}</p>
      <button class="btn" data-add>Add to cart</button>
      <p class="muted" data-added hidden>Added. <a href="/cart">View cart</a></p>
    </div>`;

  slot.querySelector("[data-add]").addEventListener("click", () => {
    addToCart(product);
    slot.querySelector("[data-added]").hidden = false;
  });

  const recs = document.querySelector("[data-recs]");
  try {
    const picks = await fetchRecommendations(product.id);
    recs.innerHTML = picks.map(productCard).join("");
  } catch (err) {
    // Recommendations are nice to have; the page works without them
    recs.innerHTML = "";
    logger?.error("Recommendations failed to load", err instanceof Error ? err : undefined, {
      productId: product.id,
    });
  }
}

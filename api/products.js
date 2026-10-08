import { PRODUCTS, between, sleep } from "./_lib.js";

export default async function handler(req, res) {
  // Most reads are quick; roughly one in twelve hits a cold cache and drags
  await sleep(Math.random() < 0.08 ? between(1600, 2600) : between(60, 220));

  const { id } = req.query;
  if (id) {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.status(200).json(product);
  }
  return res.status(200).json(PRODUCTS);
}

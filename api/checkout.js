import { between, sleep } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  await sleep(between(400, 1200));
  // The payment provider occasionally answers with a bad gateway
  if (Math.random() < 0.04) {
    return res.status(502).json({ error: "Payment provider unavailable" });
  }
  const orderId = `ord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return res.status(201).json({ orderId });
}

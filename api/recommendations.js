import { PRODUCTS, between, sleep } from "./_lib.js";

export default async function handler(req, res) {
  await sleep(between(300, 900));
  // The recommendations provider is flaky; a small share of calls time out upstream
  if (Math.random() < 0.03) {
    return res.status(503).json({ error: "Recommendations upstream timed out" });
  }
  const exclude = String(req.query.exclude || "");
  const picks = PRODUCTS.filter((p) => p.id !== exclude)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  return res.status(200).json(picks);
}

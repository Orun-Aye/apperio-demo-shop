import { between, profileFor, sleep } from "./_lib.js";

export default async function handler(req, res) {
  await sleep(between(80, 240));
  const profile = profileFor(String(req.query.user || ""));
  if (!profile) return res.status(404).json({ error: "No saved profile" });
  return res.status(200).json(profile);
}

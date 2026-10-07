// Ship the current commit to production, then tell Apperio about it.
//
//   npm run deploy
//
// 1. `vercel deploy --prod` builds on Vercel with this commit's release tag.
// 2. On success, POST /projects/:id/deployments, the same call a CI job makes.
//
// Reads APPERIO_PROJECT_ID, APPERIO_API_KEY and optionally APPERIO_ENDPOINT
// from .env.deploy (gitignored) or the environment. Nothing secret is committed.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnvFile(".env.deploy");

const { APPERIO_PROJECT_ID, APPERIO_API_KEY } = process.env;
const endpoint = process.env.APPERIO_ENDPOINT || "https://apperioserver.onrender.com/api/v1";
if (!APPERIO_PROJECT_ID || !APPERIO_API_KEY) {
  console.error("deploy: set APPERIO_PROJECT_ID and APPERIO_API_KEY in .env.deploy");
  process.exit(1);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain")) {
  console.error("deploy: commit your changes first, the deploy is tied to a SHA");
  process.exit(1);
}

const sha = git("rev-parse", "HEAD");
const subject = git("log", "-1", "--format=%s");
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const release = `v${version}`;

console.log(`deploy: ${release} (${sha.slice(0, 7)}) ${subject}`);
const out = execFileSync(
  "npx",
  [
    "vercel", "deploy", "--prod", "--yes",
    "--build-env", `APP_RELEASE=${release}`,
    "--build-env", `APPERIO_PROJECT_ID=${APPERIO_PROJECT_ID}`,
    "--build-env", `APPERIO_API_KEY=${APPERIO_API_KEY}`,
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], shell: process.platform === "win32" }
);
const url = out.trim().split(/\s+/).pop();
console.log(`deploy: live at ${url}`);

const res = await fetch(`${endpoint}/projects/${APPERIO_PROJECT_ID}/deployments`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": APPERIO_API_KEY },
  body: JSON.stringify({
    environment: "production",
    release,
    sha,
    url: "https://shop.demo.apperio.dev",
    description: subject,
    deployedBy: "deploy script",
    status: "success",
  }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`deploy: Apperio rejected the deploy record (${res.status})`, body.message || "");
  process.exit(1);
}
console.log(`deploy: recorded in Apperio as ${body.data?._id ?? "a new deployment"}`);

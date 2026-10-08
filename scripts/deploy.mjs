// Ship the current commit to production, then tell Apperio about it.
//
//   npm run deploy
//
// 1. `vercel deploy --prod` builds on Vercel with this commit's release tag.
// 2. Once it is live, POST /projects/:id/deployments to Apperio, the same
//    call a CI job makes.
//
// Needs a logged-in Vercel CLI and a .env.deploy (gitignored) with
// APPERIO_PROJECT_ID and APPERIO_API_KEY. Nothing secret is committed.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const PROJECT = "apperio-demo-shop";
const DOMAIN = "shop.demo.apperio.dev";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && m[2] && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnvFile(".env.deploy");

const { APPERIO_PROJECT_ID, APPERIO_API_KEY } = process.env;
const apperio = process.env.APPERIO_ENDPOINT || "https://apperioserver.onrender.com/api/v1";
if (!APPERIO_PROJECT_ID || !APPERIO_API_KEY) {
  console.error("deploy: set APPERIO_PROJECT_ID and APPERIO_API_KEY in .env.deploy");
  process.exit(1);
}

const run = (cmd, opts = {}) =>
  execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opts }).trim();
// VERCEL_CLI lets a machine point at a specific installed CLI instead of npx
const vercel = (args, opts) => run(`${process.env.VERCEL_CLI || "npx --yes vercel"} ${args}`, opts);

if (run("git status --porcelain")) {
  console.error("deploy: commit your changes first, the deploy is tied to a SHA");
  process.exit(1);
}
const sha = run("git rev-parse HEAD");
const subject = run("git log -1 --format=%s");
const release = `v${JSON.parse(readFileSync("package.json", "utf8")).version}`;

// First run only: create or link the Vercel project and attach the domain
if (!existsSync(".vercel/project.json")) {
  vercel(`link --yes --project ${PROJECT}`);
  try {
    vercel(`domains add ${DOMAIN} ${PROJECT}`);
  } catch {
    console.warn(`deploy: could not add ${DOMAIN}; it may already be attached`);
  }
}

console.log(`deploy: ${release} (${sha.slice(0, 7)}) ${subject}`);
const deployArgs = [
  "deploy --prod --yes",
  `--build-env APP_RELEASE=${release}`,
  `--build-env APPERIO_PROJECT_ID=${APPERIO_PROJECT_ID}`,
  `--build-env APPERIO_API_KEY=${APPERIO_API_KEY}`,
].join(" ");
// A dropped connection fails the whole deploy ("fetch failed"), so try again
let output;
for (let attempt = 1; ; attempt++) {
  try {
    output = vercel(deployArgs);
    break;
  } catch (err) {
    if (attempt >= 4) throw err;
    console.warn(`deploy: Vercel attempt ${attempt} failed, retrying in 30s`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
}
const url = output.match(/https:\/\/\S+\.vercel\.app/)?.[0] ?? "(url not printed)";
console.log(`deploy: built ${url}, live at https://${DOMAIN}`);

const record = () =>
  fetch(`${apperio}/projects/${APPERIO_PROJECT_ID}/deployments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": APPERIO_API_KEY },
    body: JSON.stringify({
      environment: "production",
      release,
      sha,
      url: `https://${DOMAIN}`,
      description: subject,
      deployedBy: "deploy script",
      status: "success",
    }),
  }).catch((err) => ({ ok: false, status: 0, json: async () => ({ message: String(err) }) }));

// The API may be waking up or mid-deploy; retry transient failures for ~10 minutes
let res = await record();
for (let i = 0; i < 20 && !res.ok && ![400, 403, 404].includes(res.status); i++) {
  console.warn(`deploy: Apperio answered ${res.status}, retrying in 30s`);
  await new Promise((r) => setTimeout(r, 30_000));
  res = await record();
}
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`deploy: Apperio rejected the deploy record (${res.status})`, body.message || "");
  process.exit(1);
}
console.log(`deploy: recorded in Apperio at ${new Date().toTimeString().slice(0, 8)}`);

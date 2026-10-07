// Ship the current commit to production, then tell Apperio about it.
//
//   npm run deploy
//
// 1. Uploads the tracked files to Vercel and creates a production deployment
//    through the REST API (Vercel builds it with `npm run build`).
// 2. Once it is READY, POSTs /projects/:id/deployments to Apperio, the same
//    call a CI job makes.
//
// Reads from .env.deploy (gitignored) or the environment:
//   VERCEL_TOKEN, VERCEL_TEAM_ID (optional), APPERIO_PROJECT_ID, APPERIO_API_KEY
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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

const { VERCEL_TOKEN, VERCEL_TEAM_ID, APPERIO_PROJECT_ID, APPERIO_API_KEY } = process.env;
const apperio = process.env.APPERIO_ENDPOINT || "https://apperioserver.onrender.com/api/v1";
for (const [k, v] of Object.entries({ VERCEL_TOKEN, APPERIO_PROJECT_ID, APPERIO_API_KEY })) {
  if (!v) {
    console.error(`deploy: ${k} is missing from .env.deploy`);
    process.exit(1);
  }
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain")) {
  console.error("deploy: commit your changes first, the deploy is tied to a SHA");
  process.exit(1);
}
const sha = git("rev-parse", "HEAD");
const subject = git("log", "-1", "--format=%s");
const release = `v${JSON.parse(readFileSync("package.json", "utf8")).version}`;

async function vercel(path, { method = "GET", body, headers = {}, ok = [] } = {}) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (VERCEL_TEAM_ID) url.searchParams.set("teamId", VERCEL_TEAM_ID);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      ...(body && !(body instanceof Buffer) ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body instanceof Buffer ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !ok.includes(res.status)) {
    throw new Error(`Vercel ${method} ${path} -> ${res.status} ${data.error?.message ?? ""}`);
  }
  return { status: res.status, data };
}

// --- Project, env and domain (idempotent) ---------------------------------
await vercel("/v10/projects", {
  method: "POST",
  body: { name: PROJECT, framework: null, buildCommand: "npm run build", outputDirectory: "public" },
  ok: [409],
});
for (const [key, value] of Object.entries({ APPERIO_PROJECT_ID, APPERIO_API_KEY })) {
  await vercel(`/v10/projects/${PROJECT}/env?upsert=true`, {
    method: "POST",
    body: { key, value, type: "encrypted", target: ["production", "preview"] },
  });
}
await vercel(`/v10/projects/${PROJECT}/domains`, { method: "POST", body: { name: DOMAIN }, ok: [409] });

// --- Upload files ----------------------------------------------------------
const files = git("ls-files")
  .split("\n")
  .filter((f) => f && !f.startsWith("traffic/"));
const manifest = files.map((file) => {
  const data = readFileSync(file);
  return { file, data, sha: createHash("sha1").update(data).digest("hex"), size: data.length };
});
console.log(`deploy: ${release} (${sha.slice(0, 7)}) ${subject}`);
console.log(`deploy: uploading ${manifest.length} files`);
for (let i = 0; i < manifest.length; i += 6) {
  await Promise.all(
    manifest.slice(i, i + 6).map((f) =>
      vercel("/v2/files", {
        method: "POST",
        body: f.data,
        headers: { "x-vercel-digest": f.sha, "Content-Type": "application/octet-stream" },
      })
    )
  );
}

// --- Create the production deployment and wait for it ----------------------
const { data: created } = await vercel("/v13/deployments", {
  method: "POST",
  body: {
    name: PROJECT,
    project: PROJECT,
    target: "production",
    files: manifest.map(({ file, sha: digest, size }) => ({ file, sha: digest, size })),
    projectSettings: {
      framework: null,
      buildCommand: "npm run build",
      outputDirectory: "public",
      installCommand: "npm install",
    },
    meta: { release, commitSha: sha, commitMessage: subject },
  },
});
console.log(`deploy: building ${created.id}`);

let state = created.readyState;
for (let i = 0; i < 120 && !["READY", "ERROR", "CANCELED"].includes(state); i++) {
  await new Promise((r) => setTimeout(r, 5000));
  state = (await vercel(`/v13/deployments/${created.id}`)).data.readyState;
}
if (state !== "READY") {
  console.error(`deploy: Vercel finished in state ${state}, not recording it in Apperio`);
  process.exit(1);
}
console.log(`deploy: live at https://${DOMAIN}`);

// --- Record it in Apperio ---------------------------------------------------
const res = await fetch(`${apperio}/projects/${APPERIO_PROJECT_ID}/deployments`, {
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
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`deploy: Apperio rejected the deploy record (${res.status})`, body.message || "");
  process.exit(1);
}
console.log(`deploy: recorded in Apperio (${body.data?._id ?? "ok"}) at ${new Date().toTimeString().slice(0, 8)}`);

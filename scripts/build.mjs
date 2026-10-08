// Build step: bundle the apperio SDK into public/vendor and write the runtime
// config from environment variables. The shop's own code under public/js is
// served as-is (no bundler), so stack traces point at the real source files.
import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";

const { APPERIO_API_KEY = "", APPERIO_PROJECT_ID = "", APP_RELEASE = "" } = process.env;

await rm("public/vendor", { recursive: true, force: true });
await mkdir("public/vendor", { recursive: true });

await build({
  stdin: { contents: "export { Apperio } from 'apperio';", resolveDir: process.cwd() },
  bundle: true,
  format: "esm",
  splitting: true, // keeps the replay recorder and rrweb in their own lazy chunk
  platform: "browser",
  target: "es2020",
  minify: true,
  outdir: "public/vendor",
  entryNames: "apperio",
  chunkNames: "chunk-[hash]",
  logLevel: "warning",
});

const version = JSON.parse(await (await import("node:fs/promises")).readFile("package.json", "utf8")).version;
const config = {
  apiKey: APPERIO_API_KEY,
  projectId: APPERIO_PROJECT_ID,
  release: APP_RELEASE || `v${version}`,
};
await writeFile("public/config.js", `window.__SHOP_CONFIG__ = ${JSON.stringify(config)};\n`);

if (!config.apiKey || !config.projectId) {
  console.warn("build: APPERIO_API_KEY / APPERIO_PROJECT_ID not set, the SDK will stay off");
}
console.log(`build: ${config.release}`);

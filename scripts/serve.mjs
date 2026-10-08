// Local preview without Vercel: serves public/ and runs api/*.js handlers.
//   node scripts/serve.mjs   ->  http://localhost:4173
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PORT || 4173);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json" };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^a-z-]/g, "");
      const mod = await import(pathToFileURL(join(process.cwd(), "api", `${name}.js`)).href);
      let body = "";
      for await (const chunk of req) body += chunk;
      req.query = Object.fromEntries(url.searchParams);
      req.body = body ? JSON.parse(body) : undefined;
      res.status = (code) => ((res.statusCode = code), res);
      res.json = (data) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      };
      return mod.default(req, res);
    }
    let path = normalize(url.pathname).replace(/^([/\\])+/, "");
    if (!path) path = "index.html";
    if (!extname(path)) path += ".html";
    const file = await readFile(join(process.cwd(), "public", path));
    res.setHeader("Content-Type", TYPES[extname(path)] || "application/octet-stream");
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(PORT, () => console.log(`demo shop on http://localhost:${PORT}`));

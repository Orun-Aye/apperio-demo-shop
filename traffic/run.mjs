// Synthetic shoppers for the demo shop. Each visitor is a fresh browser
// context, so a fresh shopper id and fresh SDK sessions, and browses the way
// a person would: lands, looks at products, maybe buys.
//
//   node traffic/run.mjs --url https://shop.demo.apperio.dev --minutes 200 --every 20
//
// Uses the installed Chrome. Logs one line per visit to stdout.
import { chromium } from "playwright";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const URL_BASE = arg("url", "https://shop.demo.apperio.dev").replace(/\/$/, "");
const MINUTES = Number(arg("minutes", "200"));
const EVERY_S = Number(arg("every", "20"));
const MAX_CONCURRENT = Number(arg("concurrency", "5"));
const HEADLESS = arg("headed", "no") === "no";

const FIRST = ["Ade", "Bea", "Cal", "Dami", "Eve", "Femi", "Gus", "Hana", "Ira", "Jo", "Kemi", "Lev"];
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1536, height: 864 },
  { width: 390, height: 844, isMobile: true, hasTouch: true },
  { width: 412, height: 915, isMobile: true, hasTouch: true },
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const chance = (p) => Math.random() < p;
const pause = (min, max) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
// Long enough on each page for the SDK's 5s batch timer to flush
const dwell = () => pause(6500, 12000);

async function visit(browser, n) {
  const viewport = pick(VIEWPORTS);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: !!viewport.isMobile,
    hasTouch: !!viewport.hasTouch,
    locale: "en-GB",
    timezoneId: "Europe/London",
  });
  const page = await context.newPage();
  const steps = [];
  let crashed = false;
  page.on("pageerror", (err) => {
    crashed = true;
    steps.push(`pageerror:${err.message.slice(0, 60)}`);
  });

  try {
    await page.goto(`${URL_BASE}/`, { waitUntil: "load" });
    steps.push("home");
    await page.waitForSelector("[data-product]", { timeout: 20000 });
    await dwell();

    // Look at one or two products
    const views = chance(0.4) ? 2 : 1;
    for (let i = 0; i < views; i++) {
      const cards = page.locator("[data-grid] [data-product], [data-recs] [data-product]");
      const count = await cards.count();
      if (!count) break;
      await cards.nth(Math.floor(Math.random() * count)).click();
      await page.waitForSelector("[data-add]", { timeout: 20000 });
      steps.push("product");
      await pause(1500, 4000);
      if (chance(0.78)) {
        await page.click("[data-add]");
        steps.push("add");
      }
      await dwell();
    }

    const inCart = Number(await page.locator("[data-cart-count]").textContent()) > 0;
    if (inCart && chance(0.85)) {
      await page.click(".cart-link");
      await page.waitForSelector("[data-cart] li");
      steps.push("cart");
      await dwell();

      if (chance(0.85)) {
        await page.click("[data-go-checkout]");
        await page.waitForSelector("[data-checkout-form]");
        steps.push("checkout");
        await pause(2500, 5000);

        if (!crashed && chance(0.7)) {
          const name = `${pick(FIRST)} Example`;
          if (!(await page.inputValue("#name"))) await page.fill("#name", name);
          if (!(await page.inputValue("#email")))
            await page.fill("#email", `${name.split(" ")[0].toLowerCase()}@example.com`);
          await page.fill("#card", "4242 4242 4242 4242");
          await pause(800, 2000);
          await page.click("[data-pay]");
          await page.waitForFunction(
            () => !/Placing/.test(document.querySelector("[data-status]")?.textContent || "Placing"),
            null,
            { timeout: 20000 }
          );
          steps.push("paid");
        } else if (crashed) {
          // A shopper who sees a broken checkout tries once more, then gives up
          await pause(2000, 4000);
          await page.reload();
          steps.push("reload");
          await pause(3000, 6000);
        }
        await dwell();
      }
    }
  } catch (err) {
    steps.push(`stopped:${String(err.message || err).split("\n")[0].slice(0, 60)}`);
  } finally {
    await context.close();
  }
  console.log(`${new Date().toISOString().slice(11, 19)} #${n} ${viewport.width}px ${steps.join(" > ")}`);
}

const browser = await chromium.launch({ channel: "chrome", headless: HEADLESS });
const stopAt = Date.now() + MINUTES * 60_000;
let n = 0;
let active = 0;
console.log(`traffic: ${URL_BASE} for ${MINUTES} min, a visitor every ~${EVERY_S}s`);

while (Date.now() < stopAt) {
  if (active < MAX_CONCURRENT) {
    active++;
    visit(browser, ++n).finally(() => active--);
  }
  // Jitter the arrivals so they don't land on a metronome
  await pause(EVERY_S * 600, EVERY_S * 1400);
}
while (active > 0) await pause(500, 500);
await browser.close();
console.log(`traffic: done, ${n} visitors`);

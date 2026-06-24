const path = require("node:path");
const { chromium } = require("../archive/tooling/.tooling/playwright/node_modules/playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "outputs", "ui-captures");
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureSection(page, section, fileName) {
  await page.click(`#admin-sidebar [data-section="${section}"]`);
  await page.waitForFunction(
    (sectionId) => {
      const node = document.querySelector(`#section-${sectionId}`);
      return node && node.classList.contains("active");
    },
    section
  );
  await wait(450);
  await page.screenshot({ path: path.join(OUT_DIR, fileName) });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1512, height: 982 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await wait(500);
  await page.screenshot({ path: path.join(OUT_DIR, "login-current.png") });

  await page.fill("#login-username", "admin");
  await page.fill("#login-password", "admin123");
  await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(() => {
    const view = document.querySelector("#admin-view");
    return view && !view.classList.contains("hidden");
  });
  await wait(800);

  await page.screenshot({ path: path.join(OUT_DIR, "admin-home-current.png") });
  await captureSection(page, "analytics", "analytics-current.png");
  await captureSection(page, "operations", "operations-current.png");
  await captureSection(page, "predictive", "predictive-current.png");
  await captureSection(page, "accounts", "accounts-current.png");
  await captureSection(page, "audit", "audit-current.png");

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

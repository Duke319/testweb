const fs = require("node:fs/promises");
const path = require("node:path");

const { loadEnv } = require("../src/env");
const { getDataAuthenticity } = require("../backend/services/performanceService");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT_DIR, "docs", "current-data-gap-checklist.csv");

loadEnv(ROOT_DIR);

async function main() {
  const audit = await getDataAuthenticity({});
  await fs.writeFile(OUTPUT_FILE, `\ufeff${audit.gapChecklist.csv}\n`, "utf8");
  console.log(JSON.stringify({
    ok: true,
    output: path.relative(ROOT_DIR, OUTPUT_FILE),
    rows: audit.gapChecklist.rows.length,
    quarantinedRecords: audit.summary.quarantinedRecords,
    criticalCount: audit.summary.criticalCount,
    batchStatus: audit.summary.batchStatus,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

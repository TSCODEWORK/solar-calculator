/**
 * sync-rates-and-weather.ts
 * Background Cron & CI/CD Sync Script
 * 
 * Fetches latest regional retail electricity rate benchmarks (EIA v2 / OpenEI)
 * and updates pre-cached solar insolation tables and regional tariffs.
 * Run weekly via GitHub Actions, Vercel Cron, or npm run sync-data.
 */

import { syncData } from "../src/lib/sync-engine";

if (require.main === module || process.argv[1]?.endsWith("sync-rates-and-weather.ts")) {
  syncData().catch((err) => {
    console.error("[Sync Engine] Error during sync:", err);
    process.exit(1);
  });
}

export { syncData };

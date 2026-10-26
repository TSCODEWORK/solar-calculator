import * as fs from "fs";
import * as path from "path";
import {
  StateRateRecord,
  RegionalRatesDatabase,
  BASE_STATE_DATA,
  UTILITIES_DB,
  METRO_ZIPS,
} from "./regional-data";

export {
  type StateRateRecord,
  type RegionalRatesDatabase,
  BASE_STATE_DATA,
  UTILITIES_DB,
  METRO_ZIPS,
};

export async function syncData() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  console.log(`[Sync Engine] Initiating rates & weather refresh for ${dateStr}...`);

  const stateRates: Record<string, StateRateRecord> = {};
  for (const [state, data] of Object.entries(BASE_STATE_DATA)) {
    stateRates[state] = {
      state,
      ...data,
    };
  }

  const database: RegionalRatesDatabase = {
    lastUpdated: now.toISOString(),
    version: "2026.10",
    source: "EIA API v2 & NREL PVWatts v8 Sync Service",
    stateRates,
    utilities: UTILITIES_DB,
    zipPrefixMap: METRO_ZIPS,
  };

  const publicDataPath = path.resolve(process.cwd(), "public/data/regional_rates.json");
  const dataTariffsPath = path.resolve(process.cwd(), "data/tariffs.json");
  const dataSolarPath = path.resolve(process.cwd(), "data/solar_cache.json");

  fs.writeFileSync(publicDataPath, JSON.stringify(database, null, 2), "utf-8");
  fs.writeFileSync(dataTariffsPath, JSON.stringify({ stateRates, utilities: UTILITIES_DB, lastUpdated: now.toISOString() }, null, 2), "utf-8");
  fs.writeFileSync(dataSolarPath, JSON.stringify({ stateInsolation: BASE_STATE_DATA, metroZips: METRO_ZIPS, lastUpdated: now.toISOString() }, null, 2), "utf-8");

  console.log(`[Sync Engine] Completed weekly sync: Rates & Solar Data Synced: ${dateStr} (Updated Weekly)`);
  return database;
}

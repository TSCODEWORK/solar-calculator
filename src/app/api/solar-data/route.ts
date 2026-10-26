import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import {
  RegionalRatesDatabase,
  StateRateRecord,
  BASE_STATE_DATA,
  UTILITIES_DB,
  METRO_ZIPS,
} from "@/lib/sync-engine";

export const dynamic = "force-dynamic";

let cachedData: RegionalRatesDatabase | null = null;

function getDatabase(): RegionalRatesDatabase {
  if (cachedData) return cachedData;
  const filePath = path.resolve(process.cwd(), "public/data/regional_rates.json");
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      cachedData = JSON.parse(raw);
      return cachedData!;
    } catch {
      // Fall through to memory fallback
    }
  }

  // Memory fallback if file system is read-only or not yet generated
  const stateRates: Record<string, StateRateRecord> = {};
  for (const [st, item] of Object.entries(BASE_STATE_DATA)) {
    stateRates[st] = { state: st, ...item };
  }
  return {
    lastUpdated: new Date().toISOString(),
    version: "2026.10",
    source: "EIA API v2 & NREL PVWatts v8 Sync Service",
    stateRates,
    utilities: UTILITIES_DB,
    zipPrefixMap: METRO_ZIPS,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") || searchParams.get("zip") || "").trim();
    const systemCapacityKw = parseFloat(searchParams.get("kw") || "10");

    const db = getDatabase();

    let resolvedState: string = "CA";
    let resolvedCity: string = "San Francisco";
    let resolvedZip: string = "94102";
    let resolvedLat: number = 37.77;
    let resolvedLon: number = -122.42;
    let resolvedUtility: string = "Pacific Gas & Electric (PG&E)";

    // Clean zip lookup (first 3 digits or full 5 digits)
    const numericZip = query.replace(/\D/g, "");
    if (numericZip.length >= 3) {
      const prefix = numericZip.slice(0, 3);
      if (db.zipPrefixMap[prefix]) {
        const item = db.zipPrefixMap[prefix];
        resolvedZip = item.zip;
        resolvedCity = item.city;
        resolvedState = item.state;
        resolvedLat = item.lat;
        resolvedLon = item.lon;
        resolvedUtility = item.utility;
      } else {
        const zipNum = parseInt(numericZip.slice(0, 5), 10);
        if (zipNum >= 1000 && zipNum <= 2799) resolvedState = "MA";
        else if (zipNum >= 2800 && zipNum <= 2999) resolvedState = "RI";
        else if (zipNum >= 3000 && zipNum <= 3899) resolvedState = "NH";
        else if (zipNum >= 3900 && zipNum <= 4999) resolvedState = "ME";
        else if (zipNum >= 5000 && zipNum <= 5999) resolvedState = "VT";
        else if (zipNum >= 6000 && zipNum <= 6999) resolvedState = "CT";
        else if (zipNum >= 7000 && zipNum <= 8999) resolvedState = "NJ";
        else if (zipNum >= 10000 && zipNum <= 14999) resolvedState = "NY";
        else if (zipNum >= 15000 && zipNum <= 19699) resolvedState = "PA";
        else if (zipNum >= 30000 && zipNum <= 31999) resolvedState = "GA";
        else if (zipNum >= 32000 && zipNum <= 34999) resolvedState = "FL";
        else if (zipNum >= 60000 && zipNum <= 62999) resolvedState = "IL";
        else if (zipNum >= 73000 && zipNum <= 79999) resolvedState = "TX";
        else if (zipNum >= 80000 && zipNum <= 81699) resolvedState = "CO";
        else if (zipNum >= 84000 && zipNum <= 84799) resolvedState = "UT";
        else if (zipNum >= 85000 && zipNum <= 86599) resolvedState = "AZ";
        else if (zipNum >= 89000 && zipNum <= 89899) resolvedState = "NV";
        else if (zipNum >= 90000 && zipNum <= 96199) resolvedState = "CA";
        else if (zipNum >= 96700 && zipNum <= 96899) resolvedState = "HI";
        else if (zipNum >= 97000 && zipNum <= 97999) resolvedState = "OR";
        else if (zipNum >= 98000 && zipNum <= 99499) resolvedState = "WA";

        const stateInfo = db.stateRates[resolvedState];
        if (stateInfo) {
          resolvedCity = stateInfo.name;
          resolvedUtility = stateInfo.primaryUtility;
        }
      }
    } else if (query.length === 2 && db.stateRates[query.toUpperCase()]) {
      resolvedState = query.toUpperCase();
      const stateInfo = db.stateRates[resolvedState];
      resolvedCity = stateInfo.name;
      resolvedUtility = stateInfo.primaryUtility;
    } else if (query.length > 2) {
      const queryLower = query.toLowerCase();
      const foundState = Object.entries(db.stateRates).find(
        ([st, s]) => s.name.toLowerCase().includes(queryLower) || st.toLowerCase() === queryLower
      );
      if (foundState) {
        resolvedState = foundState[0];
        resolvedCity = foundState[1].name;
        resolvedUtility = foundState[1].primaryUtility;
      }
    }

    const stateProfile: StateRateRecord = db.stateRates[resolvedState] || db.stateRates["CA"];
    const utilityInfo = db.utilities[resolvedUtility];
    const ratePerKwh = utilityInfo ? utilityInfo.ratePerKwh : stateProfile.ratePerKwh;
    const nemDefault = utilityInfo ? utilityInfo.nemDefault : stateProfile.nemPolicy;

    let monthlyIrradiance = [...stateProfile.monthlyIrradiance];
    let annualKwhPerKw = stateProfile.annualKwhPerKw;
    let dataSource = "Regional Solar Cache (NREL PVWatts v8 Benchmark)";

    // Live NREL PVWatts v8 lookup if API key is provided
    const nrelKey = process.env.NREL_API_KEY;
    if (nrelKey && nrelKey !== "DEMO_KEY") {
      try {
        const nrelUrl = `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=${nrelKey}&lat=${resolvedLat}&lon=${resolvedLon}&system_capacity=${systemCapacityKw}&azimuth=180&tilt=20&array_type=1&module_type=0&losses=14`;
        const res = await fetch(nrelUrl, { next: { revalidate: 86400 } });
        if (res.ok) {
          const json = await res.json();
          if (json.outputs) {
            annualKwhPerKw = Math.round(json.outputs.ac_annual / systemCapacityKw);
            if (Array.isArray(json.outputs.solrad_monthly)) {
              monthlyIrradiance = json.outputs.solrad_monthly.map((v: number) => Number(v.toFixed(2)));
            }
            dataSource = "Live NREL PVWatts v8 API";
          }
        }
      } catch (err) {
        console.warn("[Solar Data API] NREL live fetch fallback to local cache:", err);
      }
    }

    return NextResponse.json({
      location: {
        zip: resolvedZip,
        city: resolvedCity,
        state: resolvedState,
        lat: resolvedLat,
        lon: resolvedLon,
        utility: resolvedUtility,
        ratePerKwh,
        peakSunHours: stateProfile.peakSunHours,
        annualKwhPerKw,
        monthlyIrradiance,
        nemDefault,
      },
      dataSource,
      lastUpdated: db.lastUpdated,
    });
  } catch (error) {
    console.error("[Solar Data API] Error:", error);
    return NextResponse.json(
      { error: "Failed to resolve solar and tariff data" },
      { status: 500 }
    );
  }
}

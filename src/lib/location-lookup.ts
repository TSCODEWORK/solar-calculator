import { LocationData } from "@/types/solar";
import { RegionalRatesDatabase, BASE_STATE_DATA, UTILITIES_DB, METRO_ZIPS } from "./regional-data";
import { PLACES_INDEX, PlaceSuggestion } from "./cities-database";

let cachedDb: RegionalRatesDatabase | null = null;

export async function getRegionalDatabase(): Promise<RegionalRatesDatabase> {
  if (cachedDb) return cachedDb;
  try {
    const res = await fetch("/data/regional_rates.json");
    if (res.ok) {
      cachedDb = await res.json();
      return cachedDb!;
    }
  } catch {
    // Fall back to bundled data
  }

  const stateRates: Record<string, any> = {};
  for (const [st, item] of Object.entries(BASE_STATE_DATA)) {
    stateRates[st] = { state: st, ...item };
  }
  cachedDb = {
    lastUpdated: new Date().toISOString(),
    version: "2026.10",
    source: "Bundled Regional Solar & Tariff Matrix",
    stateRates,
    utilities: UTILITIES_DB,
    zipPrefixMap: METRO_ZIPS,
  };
  return cachedDb;
}

/**
 * Searches places for instant autocomplete suggestions as the user types.
 * Returns up to maxResults enriched suggestions with rates and sun hours.
 */
export function searchPlaceSuggestions(query: string, maxResults = 6): PlaceSuggestion[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const cleanNoComma = clean.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const tokens = cleanNoComma.split(" ").filter(Boolean);

  const scored: { item: PlaceSuggestion; score: number }[] = [];

  for (const place of PLACES_INDEX) {
    const cityLower = place.city.toLowerCase();
    const stateLower = place.state.toLowerCase();
    const stateNameLower = place.stateName.toLowerCase();
    const nameLower = place.name.toLowerCase();
    const zipPrefix = place.zip;

    let score = 0;

    // Exact city prefix match gets top score
    if (cityLower.startsWith(clean)) {
      score = 100 - (cityLower.length - clean.length);
    } else if (nameLower.startsWith(clean)) {
      score = 90;
    } else if (clean.length === 2 && stateLower === clean) {
      // 2-letter state abbreviation
      score = place.isState ? 95 : 75;
    } else if (stateNameLower.startsWith(clean)) {
      score = place.isState ? 85 : 65;
    } else if (zipPrefix.startsWith(clean)) {
      score = 80;
    } else if (tokens.length > 1 && tokens.every((t) => nameLower.includes(t) || stateNameLower.includes(t) || zipPrefix.startsWith(t))) {
      // Multi-token match like "austin tx" or "san fran"
      score = 70;
    } else if (cityLower.includes(clean)) {
      score = 50;
    } else if (stateNameLower.includes(clean)) {
      score = 40;
    }

    if (score > 0) {
      // Enrich with rate and sun hours from BASE_STATE_DATA
      const stateInfo = BASE_STATE_DATA[place.state] || BASE_STATE_DATA["CA"];
      const utilityInfo = place.utility && UTILITIES_DB[place.utility] ? UTILITIES_DB[place.utility] : null;
      const ratePerKwh = utilityInfo ? utilityInfo.ratePerKwh : stateInfo.ratePerKwh;

      scored.push({
        item: {
          ...place,
          ratePerKwh,
          peakSunHours: stateInfo.peakSunHours,
        },
        score,
      });
    }
  }

  // Sort by score descending, then by city name length
  scored.sort((a, b) => b.score - a.score || a.item.city.length - b.item.city.length);
  return scored.slice(0, maxResults).map((s) => s.item);
}

/**
 * Finds the single best autocomplete match for inline ghost completion.
 */
export function getTopAutocompleteMatch(query: string): PlaceSuggestion | null {
  const suggestions = searchPlaceSuggestions(query, 1);
  return suggestions.length > 0 ? suggestions[0] : null;
}

/**
 * Resolves a location string or suggestion into full LocationData.
 */
export async function resolveLocationClient(query: string): Promise<LocationData> {
  const db = await getRegionalDatabase();
  const clean = query.trim();

  // 1. Direct match with PlaceSuggestion
  const suggestions = searchPlaceSuggestions(clean, 1);
  if (suggestions.length > 0 && (
    suggestions[0].name.toLowerCase() === clean.toLowerCase() ||
    suggestions[0].city.toLowerCase() === clean.toLowerCase() ||
    suggestions[0].zip === clean
  )) {
    const s = suggestions[0];
    const stateProfile = db.stateRates[s.state] || db.stateRates["CA"];
    const utilityInfo = s.utility && db.utilities[s.utility] ? db.utilities[s.utility] : null;
    const ratePerKwh = utilityInfo ? utilityInfo.ratePerKwh : stateProfile.ratePerKwh;

    return {
      zip: s.zip,
      city: s.city,
      state: s.state,
      lat: s.lat,
      lon: s.lon,
      utility: s.utility || stateProfile.primaryUtility,
      ratePerKwh,
      peakSunHours: stateProfile.peakSunHours,
      annualKwhPerKw: stateProfile.annualKwhPerKw,
      monthlyIrradiance: [...stateProfile.monthlyIrradiance],
    };
  }

  let resolvedState = "CA";
  let resolvedCity = "San Francisco";
  let resolvedZip = "94102";
  let resolvedLat = 37.77;
  let resolvedLon = -122.42;
  let resolvedUtility = "Pacific Gas & Electric (PG&E)";

  const numericZip = clean.replace(/\D/g, "");
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
  } else if (clean.length === 2 && db.stateRates[clean.toUpperCase()]) {
    resolvedState = clean.toUpperCase();
    const stateInfo = db.stateRates[resolvedState];
    resolvedCity = stateInfo.name;
    resolvedUtility = stateInfo.primaryUtility;
  } else if (clean.length > 2) {
    const queryLower = clean.toLowerCase();
    const foundState = Object.entries(db.stateRates).find(
      ([st, s]) => s.name.toLowerCase().includes(queryLower) || st.toLowerCase() === queryLower
    );
    if (foundState) {
      resolvedState = foundState[0];
      resolvedCity = foundState[1].name;
      resolvedUtility = foundState[1].primaryUtility;
    }
  }

  const stateProfile = db.stateRates[resolvedState] || db.stateRates["CA"];
  const utilityInfo = db.utilities[resolvedUtility];
  const ratePerKwh = utilityInfo ? utilityInfo.ratePerKwh : stateProfile.ratePerKwh;

  return {
    zip: resolvedZip,
    city: resolvedCity,
    state: resolvedState,
    lat: resolvedLat,
    lon: resolvedLon,
    utility: resolvedUtility,
    ratePerKwh,
    peakSunHours: stateProfile.peakSunHours,
    annualKwhPerKw: stateProfile.annualKwhPerKw,
    monthlyIrradiance: [...stateProfile.monthlyIrradiance],
  };
}

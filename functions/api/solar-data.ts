import {
  BASE_STATE_DATA,
  UTILITIES_DB,
  METRO_ZIPS,
} from "../../src/lib/regional-data";

export async function onRequestGet(context: { request: Request; env: Record<string, string> }) {
  try {
    const url = new URL(context.request.url);
    const query = (url.searchParams.get("query") || url.searchParams.get("zip") || "").trim();
    const systemCapacityKw = parseFloat(url.searchParams.get("kw") || "10");

    let resolvedState = "CA";
    let resolvedCity = "San Francisco";
    let resolvedZip = "94102";
    let resolvedLat = 37.77;
    let resolvedLon = -122.42;
    let resolvedUtility = "Pacific Gas & Electric (PG&E)";

    const numericZip = query.replace(/\D/g, "");
    if (numericZip.length >= 3) {
      const prefix = numericZip.slice(0, 3);
      if (METRO_ZIPS[prefix]) {
        const item = METRO_ZIPS[prefix];
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

        const stateInfo = BASE_STATE_DATA[resolvedState];
        if (stateInfo) {
          resolvedCity = stateInfo.name;
          resolvedUtility = stateInfo.primaryUtility;
        }
      }
    } else if (query.length === 2 && BASE_STATE_DATA[query.toUpperCase()]) {
      resolvedState = query.toUpperCase();
      const stateInfo = BASE_STATE_DATA[resolvedState];
      resolvedCity = stateInfo.name;
      resolvedUtility = stateInfo.primaryUtility;
    } else if (query.length > 2) {
      const queryLower = query.toLowerCase();
      const foundState = Object.entries(BASE_STATE_DATA).find(
        ([st, s]) => s.name.toLowerCase().includes(queryLower) || st.toLowerCase() === queryLower
      );
      if (foundState) {
        resolvedState = foundState[0];
        resolvedCity = foundState[1].name;
        resolvedUtility = foundState[1].primaryUtility;
      }
    }

    const stateProfile = BASE_STATE_DATA[resolvedState] || BASE_STATE_DATA["CA"];
    const utilityInfo = UTILITIES_DB[resolvedUtility];
    const ratePerKwh = utilityInfo ? utilityInfo.ratePerKwh : stateProfile.ratePerKwh;
    const nemDefault = utilityInfo ? utilityInfo.nemDefault : stateProfile.nemPolicy;

    let monthlyIrradiance = [...stateProfile.monthlyIrradiance];
    let annualKwhPerKw = stateProfile.annualKwhPerKw;
    let dataSource = "Regional Solar Cache (NREL PVWatts v8 Benchmark)";

    // Live NREL PVWatts v8 lookup if API key is provided
    const nrelKey = context.env?.NREL_API_KEY;
    if (nrelKey && nrelKey !== "DEMO_KEY") {
      try {
        const nrelUrl = `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=${nrelKey}&lat=${resolvedLat}&lon=${resolvedLon}&system_capacity=${systemCapacityKw}&azimuth=180&tilt=20&array_type=1&module_type=0&losses=14`;
        const res = await fetch(nrelUrl);
        if (res.ok) {
          const json: any = await res.json();
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

    const payload = {
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
      lastUpdated: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to resolve solar and tariff data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

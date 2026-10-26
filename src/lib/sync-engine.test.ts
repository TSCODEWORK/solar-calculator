import { describe, it, expect } from "vitest";
import { BASE_STATE_DATA, UTILITIES_DB, METRO_ZIPS } from "./sync-engine";

describe("Sync Engine & Regional Tariffs Dataset", () => {
  it("contains all 50 US States + DC with accurate baseline rate benchmarks", () => {
    expect(Object.keys(BASE_STATE_DATA).length).toBe(51);

    // Verify key states
    expect(BASE_STATE_DATA["CA"].ratePerKwh).toBeGreaterThanOrEqual(0.30);
    expect(BASE_STATE_DATA["HI"].ratePerKwh).toBeGreaterThan(0.40);
    expect(BASE_STATE_DATA["MA"].ratePerKwh).toBeGreaterThanOrEqual(0.25);
    expect(BASE_STATE_DATA["TX"].ratePerKwh).toBeLessThan(0.20);
    expect(BASE_STATE_DATA["AZ"].ratePerKwh).toBeLessThan(0.20);
  });

  it("contains major US investor-owned utilities", () => {
    expect(UTILITIES_DB["Pacific Gas & Electric (PG&E)"]).toBeDefined();
    expect(UTILITIES_DB["Consolidated Edison (ConEd NY)"]).toBeDefined();
    expect(UTILITIES_DB["Florida Power & Light (FPL)"]).toBeDefined();
    expect(UTILITIES_DB["Eversource Massachusetts"]).toBeDefined();
  });

  it("has valid solar irradiance distributions (12 months per state)", () => {
    for (const [st, item] of Object.entries(BASE_STATE_DATA)) {
      expect(item.monthlyIrradiance.length).toBe(12);
      expect(item.annualKwhPerKw).toBeGreaterThan(800);
      expect(item.peakSunHours).toBeGreaterThan(2.5);
    }
  });

  it("maps representative metro ZIP prefixes", () => {
    expect(METRO_ZIPS["941"].city).toBe("San Francisco");
    expect(METRO_ZIPS["100"].city).toBe("New York");
    expect(METRO_ZIPS["021"].city).toBe("Boston");
    expect(METRO_ZIPS["750"].city).toBe("Dallas");
    expect(METRO_ZIPS["850"].city).toBe("Phoenix");
  });
});

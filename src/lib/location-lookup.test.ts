import { describe, it, expect } from "vitest";
import { searchPlaceSuggestions, getTopAutocompleteMatch, resolveLocationClient } from "./location-lookup";

describe("Place Autocomplete & Auto-population Engine", () => {
  it("suggests Austin, TX when user types 'aus'", () => {
    const results = searchPlaceSuggestions("aus");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("Austin, TX");
    expect(results[0].state).toBe("TX");
    expect(results[0].ratePerKwh).toBeDefined();
  });

  it("suggests San Francisco, San Diego, San Jose when user types 'san'", () => {
    const results = searchPlaceSuggestions("san");
    expect(results.length).toBeGreaterThan(1);
    const names = results.map((r) => r.name);
    expect(names.some((n) => n.includes("San Francisco"))).toBe(true);
    expect(names.some((n) => n.includes("San Diego"))).toBe(true);
  });

  it("suggests Denver when user types 'den'", () => {
    const results = searchPlaceSuggestions("den");
    expect(results[0].name).toContain("Denver");
  });

  it("suggests Texas when user types 'tx' or 'texas'", () => {
    const txResults = searchPlaceSuggestions("tx");
    expect(txResults.some((r) => r.state === "TX")).toBe(true);

    const texasResults = searchPlaceSuggestions("texas");
    expect(texasResults.some((r) => r.name === "Texas")).toBe(true);
  });

  it("suggests Beverly Hills when user types '90210'", () => {
    const results = searchPlaceSuggestions("90210");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].city).toBe("Beverly Hills");
    expect(results[0].state).toBe("CA");
  });

  it("provides top autocomplete match for inline ghost completion", () => {
    const match = getTopAutocompleteMatch("Miam");
    expect(match).not.toBeNull();
    expect(match?.name).toBe("Miami, FL");
  });

  it("resolves location data accurately from suggestion name", async () => {
    const loc = await resolveLocationClient("Austin, TX");
    expect(loc.city).toBe("Austin");
    expect(loc.state).toBe("TX");
    expect(loc.ratePerKwh).toBeGreaterThan(0);
    expect(loc.peakSunHours).toBeGreaterThan(0);
  });
});

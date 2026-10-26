"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sun,
  MapPin,
  Share2,
  Check,
  Search,
  Sparkles,
  ArrowDown,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { GeminiPaybackChart } from "./GeminiPaybackChart";
import { calculateSolarPayback } from "@/lib/solar-math";
import { resolveLocationClient } from "@/lib/location-lookup";
import { SolarInputs, LocationData } from "@/types/solar";
import { formatCurrency } from "@/lib/utils";

const DEFAULT_LOCATION: LocationData = {
  zip: "94102",
  city: "San Francisco",
  state: "CA",
  lat: 37.77,
  lon: -122.42,
  utility: "Pacific Gas & Electric (PG&E)",
  ratePerKwh: 0.384,
  peakSunHours: 5.6,
  annualKwhPerKw: 1620,
  monthlyIrradiance: [3.2, 4.2, 5.5, 6.8, 7.6, 8.1, 8.0, 7.4, 6.4, 5.0, 3.6, 2.9],
};

const INITIAL_INPUTS: SolarInputs = {
  location: DEFAULT_LOCATION,
  systemCapex: 11000,
  grossCapex: 15714,
  itcEligible: true,
  itcRate: 0.30,
  arraySizeKw: 10,
  batteryStorageKwh: 0,
  hasBattery: false,
  electricityTariff: 0.384,
  utilityEscalation: 4.0,
  panelDegradation: 0.5,
  batteryEfficiency: 90,
  netMeteringType: "full_nem",
  derateFactor: 0.86,
  discountRate: 5.0,
  inverterAcKw: 7.6,
  inverterEfficiency: 96,
};

const POPULAR_REGIONS = [
  { label: "California", query: "94102", rate: 0.38 },
  { label: "Texas", query: "78701", rate: 0.15 },
  { label: "Arizona", query: "85001", rate: 0.14 },
  { label: "Florida", query: "33101", rate: 0.16 },
  { label: "Massachusetts", query: "02108", rate: 0.32 },
  { label: "New York", query: "10001", rate: 0.31 },
  { label: "Colorado", query: "80202", rate: 0.16 },
  { label: "Hawaii", query: "96813", rate: 0.44 },
];

export function SimpleCalculator() {
  const searchParams = useSearchParams();
  const [inputs, setInputs] = useState<SolarInputs>(INITIAL_INPUTS);
  const [locationSearch, setLocationSearch] = useState("San Francisco, CA");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize from URL search parameters on mount
  useEffect(() => {
    const zipParam = searchParams.get("zip");
    const capexParam = searchParams.get("capex");
    const kwParam = searchParams.get("kw");
    const rateParam = searchParams.get("rate");
    const escParam = searchParams.get("esc");
    const battParam = searchParams.get("batt");

    const updated: Partial<SolarInputs> = {};
    if (capexParam) updated.systemCapex = Number(capexParam);
    if (kwParam) updated.arraySizeKw = Number(kwParam);
    if (rateParam) updated.electricityTariff = Number(rateParam);
    if (escParam) updated.utilityEscalation = Number(escParam);
    if (battParam) {
      const b = Number(battParam);
      updated.batteryStorageKwh = b;
      updated.hasBattery = b > 0;
    }

    if (zipParam) {
      resolveLocationClient(zipParam).then((loc) => {
        setInputs((prev) => ({
          ...prev,
          ...updated,
          location: loc,
          electricityTariff: updated.electricityTariff ?? loc.ratePerKwh,
        }));
        setLocationSearch(`${loc.city}, ${loc.state}`);
      });
    } else if (Object.keys(updated).length > 0) {
      setInputs((prev) => ({ ...prev, ...updated }));
    }
  }, [searchParams]);

  // Sync state to URL
  const updateUrl = useCallback((current: SolarInputs) => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams();
    if (current.location?.zip) p.set("zip", current.location.zip);
    p.set("capex", current.systemCapex.toString());
    p.set("kw", current.arraySizeKw.toString());
    p.set("rate", current.electricityTariff.toString());
    p.set("esc", current.utilityEscalation.toString());
    if (current.hasBattery) p.set("batt", current.batteryStorageKwh.toString());

    const newUrl = `${window.location.pathname}?${p.toString()}`;
    window.history.replaceState({ path: newUrl }, "", newUrl);
  }, []);

  const handleUpdate = useCallback(
    (updates: Partial<SolarInputs>) => {
      setInputs((prev) => {
        const next = { ...prev, ...updates };
        updateUrl(next);
        return next;
      });
    },
    [updateUrl]
  );

  const handleLocationSelect = async (query: string) => {
    setIsSearchingLocation(true);
    try {
      const loc = await resolveLocationClient(query);
      setInputs((prev) => {
        const next = {
          ...prev,
          location: loc,
          electricityTariff: loc.ratePerKwh,
        };
        updateUrl(next);
        return next;
      });
      setLocationSearch(`${loc.city}, ${loc.state}`);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const calculationResult = useMemo(() => {
    return calculateSolarPayback(inputs);
  }, [inputs]);

  return (
    <div className="relative min-h-screen text-slate-100 pb-16">
      {/* Ambient background with Maipo green radial gradient */}
      <div className="ambient-bg">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
      </div>

      <div className="max-w-[760px] mx-auto px-4 pt-6 space-y-5">
        {/* Top Header */}
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(34,197,94,0.35)]">
              <Sun className="w-5 h-5 animate-[spin_24s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Solar Calculator
              </h1>
              <div className="text-xs text-emerald-300/80 font-medium flex items-center gap-1.5">
                <span>{inputs.location?.city || "San Francisco"}, {inputs.location?.state || "CA"}</span>
                <span>•</span>
                <span>${inputs.electricityTariff.toFixed(2)}/kWh</span>
              </div>
            </div>
          </div>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-medium text-white border border-white/15 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-300" />
                <span>Share</span>
              </>
            )}
          </button>
        </header>

        {/* The Exact Gemini Payback Simulation Graph Card */}
        <GeminiPaybackChart inputs={inputs} result={calculationResult} />

        {/* Center prompt matching screenshot: "Adjust cost, inflation, and rate assumptions ↓" */}
        <div className="text-center py-2 flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-white tracking-tight">
          <span>Adjust cost, inflation, and rate assumptions</span>
          <ArrowDown className="w-4 h-4 text-emerald-400 animate-bounce" />
        </div>

        {/* Simple Controls Section in Maipo Frosted Glass */}
        <div className="maipo-glass p-5 sm:p-6 space-y-6">
          {/* 1. General Area Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Your General Area (Sun & Electricity Prices)</span>
              </label>
              {inputs.location && (
                <span className="text-xs text-emerald-300 font-medium">
                  {inputs.location.peakSunHours} peak sun hrs/day
                </span>
              )}
            </div>

            {/* Quick Region Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {POPULAR_REGIONS.map((r) => {
                const isSelected = inputs.location?.state === r.label || inputs.location?.city === r.label || (r.label === "California" && inputs.location?.state === "CA") || (r.label === "Texas" && inputs.location?.state === "TX") || (r.label === "Arizona" && inputs.location?.state === "AZ") || (r.label === "Florida" && inputs.location?.state === "FL") || (r.label === "Massachusetts" && inputs.location?.state === "MA") || (r.label === "New York" && inputs.location?.state === "NY") || (r.label === "Colorado" && inputs.location?.state === "CO") || (r.label === "Hawaii" && inputs.location?.state === "HI");

                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => handleLocationSelect(r.query)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/25 border-emerald-400 text-white font-bold shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {r.label} <span className="text-emerald-400/90 font-normal">(${r.rate.toFixed(2)})</span>
                  </button>
                );
              })}
            </div>

            {/* Custom ZIP / City input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLocationSelect(locationSearch);
              }}
              className="flex gap-2 pt-1"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Enter ZIP code (e.g. 94103, 78701) or City..."
                  className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/15 focus:border-emerald-400 focus:outline-none rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingLocation}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer"
              >
                Set Area
              </button>
            </form>
          </div>

          {/* 2. How much money to build (Initial Cost) */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">
                How Much Money to Build (Initial Cost)
              </label>
              <div className="text-xl sm:text-2xl font-black text-white">
                {formatCurrency(inputs.systemCapex)}
              </div>
            </div>

            <input
              type="range"
              min={2000}
              max={45000}
              step={500}
              value={inputs.systemCapex}
              onChange={(e) => handleUpdate({ systemCapex: Number(e.target.value) })}
              className="w-full"
            />

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>$2,000</span>
              <span className="text-emerald-300/90 font-medium">
                (After 30% Federal Tax Credit)
              </span>
              <span>$45,000</span>
            </div>

            {/* Quick Cost Chips */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-xs text-slate-400">Presets:</span>
              {[8000, 11000, 15000, 22000, 30000].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleUpdate({ systemCapex: c })}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    inputs.systemCapex === c
                      ? "bg-emerald-500/25 border-emerald-400 text-white font-bold"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  ${c / 1000}k
                </button>
              ))}
            </div>
          </div>

          {/* 3. Solar System Size (kW) */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">
                Solar System Size (kW)
              </label>
              <div className="text-xl sm:text-2xl font-black text-amber-300">
                {inputs.arraySizeKw.toFixed(0)} kW
              </div>
            </div>

            <input
              type="range"
              min={3}
              max={25}
              step={1}
              value={inputs.arraySizeKw}
              onChange={(e) => handleUpdate({ arraySizeKw: Number(e.target.value) })}
              className="w-full"
            />

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>3 kW (Small Home)</span>
              <span>10 kW (Standard)</span>
              <span>25 kW (Large)</span>
            </div>

            {/* Quick kW Chips */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-xs text-slate-400">Presets:</span>
              {[6, 8, 10, 12, 16].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleUpdate({ arraySizeKw: kw })}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    inputs.arraySizeKw === kw
                      ? "bg-amber-500/25 border-amber-400 text-white font-bold"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {kw} kW
                </button>
              ))}
            </div>
          </div>

          {/* 4. Grid Electricity Rate & Escalation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            {/* Electricity Rate */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  Electricity Rate ($/kWh)
                </label>
                <span className="text-sm font-bold text-emerald-400">
                  ${inputs.electricityTariff.toFixed(2)}/kWh
                </span>
              </div>
              <input
                type="range"
                min={0.08}
                max={0.65}
                step={0.01}
                value={inputs.electricityTariff}
                onChange={(e) => handleUpdate({ electricityTariff: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>$0.08 (Low)</span>
                <span>$0.65 (High)</span>
              </div>
            </div>

            {/* Inflation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  Utility Inflation (%/yr)
                </label>
                <span className="text-sm font-bold text-sky-300">
                  {inputs.utilityEscalation.toFixed(1)}% / yr
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={inputs.utilityEscalation}
                onChange={(e) => handleUpdate({ utilityEscalation: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0% (Flat)</span>
                <span>4% (US Avg)</span>
                <span>10%</span>
              </div>
            </div>
          </div>

          {/* 5. Optional Battery Storage */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">
                Battery Storage (Optional)
              </label>
              <span className="text-xs text-slate-300 font-medium">
                {inputs.hasBattery ? `${inputs.batteryStorageKwh} kWh Storage` : "Grid-Tie (No Battery)"}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "No Battery", kwh: 0, has: false },
                { label: "10 kWh", kwh: 10, has: true },
                { label: "15 kWh", kwh: 15, has: true },
                { label: "30 kWh", kwh: 30, has: true },
              ].map((b) => {
                const isSelected = !b.has ? !inputs.hasBattery : inputs.hasBattery && inputs.batteryStorageKwh === b.kwh;
                return (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => handleUpdate({ hasBattery: b.has, batteryStorageKwh: b.kwh })}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                      isSelected
                        ? "bg-emerald-500/25 border-emerald-400 text-white font-bold shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <footer className="text-center pt-4 pb-8 space-y-1 text-xs text-emerald-300/60 font-medium">
          <div>Self-Updating Solar Payback Engine • 100% Free & Private</div>
          <div className="text-[11px] text-slate-400">
            Regional irradiance from NREL PVWatts v8 & residential tariffs from EIA API v2.
          </div>
        </footer>
      </div>
    </div>
  );
}

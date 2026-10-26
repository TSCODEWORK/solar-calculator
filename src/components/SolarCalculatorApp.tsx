"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { LocationPicker } from "@/components/LocationPicker";
import { InputControls } from "@/components/InputControls";
import { HeroKpiCards } from "@/components/HeroKpiCards";
import { ChartsSection } from "@/components/ChartsSection";
import { AdvancedParameters } from "@/components/AdvancedParameters";
import { calculateSolarPayback } from "@/lib/solar-math";
import { resolveLocationClient } from "@/lib/location-lookup";
import { SolarInputs, LocationData, NetMeteringType } from "@/types/solar";
import { ShieldCheck, Zap, Database, ArrowRight, ExternalLink } from "lucide-react";

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
  batteryStorageKwh: 30,
  hasBattery: true,
  electricityTariff: 0.384,
  utilityEscalation: 4.0,
  panelDegradation: 0.5,
  batteryEfficiency: 90,
  netMeteringType: "avoided_cost",
  derateFactor: 0.86,
  discountRate: 5.0,
  inverterAcKw: 7.6,
  inverterEfficiency: 96,
};

export function SolarCalculatorApp() {
  const searchParams = useSearchParams();
  const [inputs, setInputs] = useState<SolarInputs>(INITIAL_INPUTS);
  const [lastUpdated, setLastUpdated] = useState<string>("2026-10-26T00:00:00.000Z");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from URL search parameters on mount
  useEffect(() => {
    const zipParam = searchParams.get("zip");
    const capexParam = searchParams.get("capex");
    const kwParam = searchParams.get("kw");
    const battParam = searchParams.get("batt");
    const hasBattParam = searchParams.get("has_batt");
    const rateParam = searchParams.get("rate");
    const escParam = searchParams.get("esc");
    const nemParam = searchParams.get("nem") as NetMeteringType | null;
    const degParam = searchParams.get("deg");
    const battEffParam = searchParams.get("batt_eff");

    const updated: Partial<SolarInputs> = {};

    if (capexParam) updated.systemCapex = Number(capexParam);
    if (kwParam) updated.arraySizeKw = Number(kwParam);
    if (battParam) updated.batteryStorageKwh = Number(battParam);
    if (hasBattParam !== null) updated.hasBattery = hasBattParam === "1" || hasBattParam === "true";
    if (rateParam) updated.electricityTariff = Number(rateParam);
    if (escParam) updated.utilityEscalation = Number(escParam);
    if (nemParam && ["full_nem", "avoided_cost", "off_grid_self"].includes(nemParam)) {
      updated.netMeteringType = nemParam;
    }
    if (degParam) updated.panelDegradation = Number(degParam);
    if (battEffParam) updated.batteryEfficiency = Number(battEffParam);

    if (zipParam && zipParam !== inputs.location?.zip) {
      resolveLocationClient(zipParam)
        .then((loc) => {
          setInputs((prev) => ({
            ...prev,
            ...updated,
            location: loc,
            electricityTariff: updated.electricityTariff ?? loc.ratePerKwh,
          }));
        })
        .catch(() => {
          setInputs((prev) => ({ ...prev, ...updated }));
        })
        .finally(() => setIsInitialized(true));
      return;
    }

    if (Object.keys(updated).length > 0) {
      setInputs((prev) => ({ ...prev, ...updated }));
    }
    setIsInitialized(true);
  }, [searchParams]);

  // Synchronize state changes to URL search params
  const updateUrlParams = useCallback((currentInputs: SolarInputs) => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    if (currentInputs.location?.zip) params.set("zip", currentInputs.location.zip);
    params.set("capex", currentInputs.systemCapex.toString());
    params.set("kw", currentInputs.arraySizeKw.toString());
    params.set("batt", currentInputs.batteryStorageKwh.toString());
    params.set("has_batt", currentInputs.hasBattery ? "1" : "0");
    params.set("rate", currentInputs.electricityTariff.toString());
    params.set("esc", currentInputs.utilityEscalation.toString());
    params.set("nem", currentInputs.netMeteringType);
    if (currentInputs.panelDegradation !== 0.5) params.set("deg", currentInputs.panelDegradation.toString());
    if (currentInputs.batteryEfficiency !== 90) params.set("batt_eff", currentInputs.batteryEfficiency.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, "", newUrl);
  }, []);

  const handleInputsChange = useCallback((updates: Partial<SolarInputs>) => {
    setInputs((prev) => {
      const next = { ...prev, ...updates };
      updateUrlParams(next);
      return next;
    });
  }, [updateUrlParams]);

  const handleLocationChange = useCallback((newLoc: LocationData) => {
    setInputs((prev) => {
      const next: SolarInputs = {
        ...prev,
        location: newLoc,
        electricityTariff: newLoc.ratePerKwh,
      };
      updateUrlParams(next);
      return next;
    });
  }, [updateUrlParams]);

  // Run financial and physical mathematical engine
  const calculationResult = useMemo(() => {
    return calculateSolarPayback(inputs);
  }, [inputs]);

  return (
    <div className="min-h-screen flex flex-col bg-[#080C15] text-slate-100 font-sans">
      {/* Header with live weekly sync badge and export tools */}
      <Header
        lastUpdated={lastUpdated}
        inputs={inputs}
        result={calculationResult}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Mission Statement Banner */}
        <div className="bg-gradient-to-r from-slate-900/90 via-[#0D1527] to-slate-900/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <h1 className="text-base sm:text-lg font-mono font-bold text-slate-100 tracking-tight">
                Solar Calculator • Self-Updating Payback Engine
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-sans max-w-3xl">
              100% free, private client-side calculator. Automatically synchronizes regional solar irradiance (NREL PVWatts v8) and local residential retail electricity rate movements (EIA v2) on a weekly background schedule. No sales reps, no email walls, zero lead capture.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Private & Client-Side</span>
          </div>
        </div>

        {/* 2-Column Primary Grid: Controls (Left) vs Hero KPIs (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Location & Input Controls (7 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <LocationPicker
              location={inputs.location}
              onLocationChange={handleLocationChange}
              onTariffChange={(rate) => handleInputsChange({ electricityTariff: rate })}
              currentTariff={inputs.electricityTariff}
            />

            <InputControls
              inputs={inputs}
              onChange={handleInputsChange}
            />
          </div>

          {/* Right Column: Hero KPI Card & Financial Return Overview (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <HeroKpiCards
              inputs={inputs}
              result={calculationResult}
            />

            <ChartsSection
              inputs={inputs}
              result={calculationResult}
            />
          </div>
        </div>

        {/* Advanced Parameter Drawer */}
        <div className="pt-2">
          <AdvancedParameters
            inputs={inputs}
            onChange={handleInputsChange}
          />
        </div>

        {/* Technical Architecture & Data Footnotes */}
        <div className="border-t border-slate-800/80 pt-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-slate-400">
          <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3.5 space-y-1">
            <div className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> NREL PVWatts v8 Model
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
              Solar insolation and monthly DC-to-AC yield calculations simulate standard crystalline silicon arrays with 14% total system loss derate and regional typical meteorological year (TMY) irradiance.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3.5 space-y-1">
            <div className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" /> EIA v2 Retail Tariffs
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
              Retail utility prices are tracked across all US states and major investor-owned utilities (PG&E, SCE, SDG&E, ConEd, Eversource, FPL) refreshed weekly with zero third-party client cookies.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3.5 space-y-1">
            <div className="text-slate-200 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Privacy & Portability
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
              All financial modeling executes in your browser. Calculations can be shared via URL parameter bookmarks or downloaded as clean CSV / PDF reports.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060911] py-4 px-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Self-Updating Solar & Storage Payback Engine • Production Release</span>
          <span>Open Solar Finance Architecture • Free & Private</span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sun,
  Moon,
  MapPin,
  Share2,
  Check,
  Search,
  Sliders,
  DollarSign,
  Battery,
  Shield,
  Gauge,
  Percent,
  Table as TableIcon,
  RefreshCw,
} from "lucide-react";
import { GeminiPaybackChart } from "./GeminiPaybackChart";
import { calculateSolarPayback } from "@/lib/solar-math";
import { resolveLocationClient } from "@/lib/location-lookup";
import { SolarInputs, LocationData, NetMeteringType } from "@/types/solar";
import { formatCurrency, formatNumber } from "@/lib/utils";

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

export function SimpleCalculator() {
  const searchParams = useSearchParams();
  const [inputs, setInputs] = useState<SolarInputs>(INITIAL_INPUTS);
  const [activeTab, setActiveTab] = useState<"calculator" | "advanced">("calculator");
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [locationSearch, setLocationSearch] = useState("San Francisco, CA");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize theme from system preference or localStorage
  useEffect(() => {
    const saved = localStorage.getItem("solar_theme");
    if (saved === "light") {
      setIsLightMode(true);
      document.documentElement.classList.add("light");
    } else {
      setIsLightMode(false);
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("light");
        localStorage.setItem("solar_theme", "light");
      } else {
        document.documentElement.classList.remove("light");
        localStorage.setItem("solar_theme", "dark");
      }
      return next;
    });
  };

  // Initialize inputs from URL search params
  useEffect(() => {
    const zipParam = searchParams.get("zip");
    const capexParam = searchParams.get("capex");
    const kwParam = searchParams.get("kw");
    const rateParam = searchParams.get("rate");
    const escParam = searchParams.get("esc");
    const battParam = searchParams.get("batt");
    const nemParam = searchParams.get("nem") as NetMeteringType | null;

    const updated: Partial<SolarInputs> = {};
    if (capexParam) updated.systemCapex = Number(capexParam);
    if (kwParam) updated.arraySizeKw = Number(kwParam);
    if (rateParam) updated.electricityTariff = Number(rateParam);
    if (escParam) updated.utilityEscalation = Number(escParam);
    if (battParam !== null && battParam !== undefined) {
      const b = Number(battParam);
      updated.batteryStorageKwh = b;
      updated.hasBattery = b > 0;
    }
    if (nemParam) updated.netMeteringType = nemParam;

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

  // Sync to URL
  const updateUrl = useCallback((current: SolarInputs) => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams();
    if (current.location?.zip) p.set("zip", current.location.zip);
    p.set("capex", current.systemCapex.toString());
    p.set("kw", current.arraySizeKw.toString());
    p.set("rate", current.electricityTariff.toString());
    p.set("esc", current.utilityEscalation.toString());
    p.set("batt", current.hasBattery ? current.batteryStorageKwh.toString() : "0");
    p.set("nem", current.netMeteringType);

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

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearch.trim()) return;
    setIsSearchingLocation(true);
    try {
      const loc = await resolveLocationClient(locationSearch);
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
    <div className={`relative min-h-screen pb-16 transition-colors duration-300 ${isLightMode ? "light" : ""}`}>
      {/* Ambient background with radial glow */}
      <div className="ambient-bg">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
      </div>

      <div className="max-w-[740px] mx-auto px-4 pt-5 space-y-4">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 flex items-center justify-center text-[var(--accent-amber)] shadow-[0_0_16px_rgba(34,197,94,0.3)]">
              <Sun className="w-5 h-5 animate-[spin_30s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                Solar Calculator
              </h1>
              <div className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1.5">
                <span>{inputs.location?.city || "San Francisco"}, {inputs.location?.state || "CA"}</span>
                <span>•</span>
                <span>${inputs.electricityTariff.toFixed(2)}/kWh</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light/dark theme"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 border border-black/10 dark:border-white/15 text-[var(--text-primary)] transition-all cursor-pointer"
            >
              {isLightMode ? <Moon className="w-4 h-4 text-emerald-800" /> : <Sun className="w-4 h-4 text-amber-300" />}
            </button>

            {/* Share Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 text-xs font-medium text-[var(--text-primary)] border border-black/10 dark:border-white/15 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                  <span className="text-[var(--accent-green)] font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Maipo Style Tab Bar: [ Calculator ] | [ Advanced ] */}
        <nav className="maipo-tab-bar">
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center ${
              activeTab === "calculator"
                ? "bg-[var(--tab-active-bg)] text-white shadow-md font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Calculator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("advanced")}
            className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center ${
              activeTab === "advanced"
                ? "bg-[var(--tab-active-bg)] text-white shadow-md font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Advanced
          </button>
        </nav>

        {/* 1. Main Page Tab: Fast and Easy Calculator */}
        {activeTab === "calculator" && (
          <div className="space-y-4">
            {/* Top Gemini Payback Simulation Card (Large numbers at top + Graph directly below) */}
            <GeminiPaybackChart inputs={inputs} result={calculationResult} isLightMode={isLightMode} />

            {/* Fast, Simplified Controls Card (Sliders only, no preset buttons) */}
            <div className="maipo-glass p-5 sm:p-6 space-y-5">
              {/* General Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[var(--accent-green)]" />
                    <span>General Area (Sun & Electricity Rate)</span>
                  </label>
                  {inputs.location && (
                    <span className="text-xs text-[var(--text-muted)] font-medium">
                      {inputs.location.peakSunHours} peak sun hrs/day
                    </span>
                  )}
                </div>

                <form onSubmit={handleLocationSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Enter ZIP code (e.g. 94103, 78701) or City, State..."
                      className="w-full pl-9 pr-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-green)] focus:outline-none rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingLocation}
                    className="px-4 py-2 bg-[var(--accent-green)] hover:opacity-90 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSearchingLocation ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Set Area"}
                  </button>
                </form>
              </div>

              {/* Money to Spend (Initial Cost) - Slider Only */}
              <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    Money to Spend (Initial Cost)
                  </label>
                  <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
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

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>$2,000</span>
                  <span className="text-[var(--accent-green)] font-medium">
                    (After 30% Federal Tax Credit)
                  </span>
                  <span>$45,000</span>
                </div>
              </div>

              {/* Solar System Size (kW) - Slider Only */}
              <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    Solar System Size (kW)
                  </label>
                  <div className="text-xl sm:text-2xl font-black text-[var(--accent-amber)]">
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

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>3 kW (Small Home)</span>
                  <span>10 kW (Standard)</span>
                  <span>25 kW (Large)</span>
                </div>
              </div>

              {/* Battery Storage (kWh) - Sliding Scale Amount */}
              <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    Battery Storage
                  </label>
                  <div className="text-lg sm:text-xl font-bold text-[var(--accent-green)]">
                    {inputs.hasBattery && inputs.batteryStorageKwh > 0
                      ? `${inputs.batteryStorageKwh} kWh`
                      : "0 kWh (No Battery)"}
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={40}
                  step={2.5}
                  value={inputs.hasBattery ? inputs.batteryStorageKwh : 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    handleUpdate({
                      batteryStorageKwh: val,
                      hasBattery: val > 0,
                    });
                  }}
                  className="w-full"
                />

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>0 kWh (Grid-Tie)</span>
                  <span>15 kWh (Whole-Home)</span>
                  <span>40 kWh (Max Storage)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Advanced Tab: Clean with more optionality */}
        {activeTab === "advanced" && (
          <div className="space-y-4">
            <div className="maipo-glass p-5 sm:p-6 space-y-5">
              <div className="border-b border-black/10 dark:border-white/10 pb-3">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Advanced Parameters & Policy Tuning
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Fine-tune local utility rates, net metering policies, and degradation models
                </p>
              </div>

              {/* Electricity Rate ($/kWh) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    Electricity Tariff ($/kWh)
                  </label>
                  <span className="text-sm font-bold text-[var(--accent-green)]">
                    ${inputs.electricityTariff.toFixed(3)} / kWh
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
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>$0.08 (Low)</span>
                  <span>$0.65 (High)</span>
                </div>
              </div>

              {/* Utility Inflation (%/yr) */}
              <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    Utility Rate Inflation (%/yr)
                  </label>
                  <span className="text-sm font-bold text-[var(--accent-blue)]">
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
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>0% (Flat)</span>
                  <span>4% (US Avg)</span>
                  <span>10% (High)</span>
                </div>
              </div>

              {/* Net Metering Policy */}
              <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
                <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  Net Metering & Export Policy
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      id: "full_nem" as NetMeteringType,
                      title: "1:1 Retail Net Metering (Full NEM)",
                      desc: "Full retail credit for all exported solar power. Traditional solar policy.",
                    },
                    {
                      id: "avoided_cost" as NetMeteringType,
                      title: "NEM 3.0 / Avoided Cost (TOU + Battery Peak Shift)",
                      desc: "Surplus export valued at wholesale rate (~28%). Battery shifts power to peak evening rates.",
                    },
                    {
                      id: "off_grid_self" as NetMeteringType,
                      title: "100% Self-Consumption / Zero Export",
                      desc: "Zero utility export credit. Surplus beyond battery absorption is curtailed.",
                    },
                  ].map((p) => {
                    const isSelected = inputs.netMeteringType === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleUpdate({ netMeteringType: p.id })}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[var(--accent-green)]/15 border-[var(--accent-green)] font-semibold shadow-sm"
                            : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10"
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                          {p.title}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {p.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Panel Degradation */}
              <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    Annual Panel Degradation
                  </label>
                  <span className="text-xs sm:text-sm font-bold text-[var(--accent-amber)]">
                    {inputs.panelDegradation.toFixed(2)}% / yr
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  value={inputs.panelDegradation}
                  onChange={(e) => handleUpdate({ panelDegradation: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>0.1% (Premium)</span>
                  <span>0.5% (Standard)</span>
                  <span>2.0%</span>
                </div>
              </div>

              {/* Battery Efficiency */}
              <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    Battery Round-Trip Efficiency
                  </label>
                  <span className="text-xs sm:text-sm font-bold text-[var(--accent-green)]">
                    {inputs.batteryEfficiency}%
                  </span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={98}
                  step={1}
                  value={inputs.batteryEfficiency}
                  onChange={(e) => handleUpdate({ batteryEfficiency: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>70% (AC Coupled)</span>
                  <span>90% (LiFePO4 DC)</span>
                  <span>98%</span>
                </div>
              </div>

              {/* Federal ITC 30% Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                    30% Federal Clean Energy Credit (ITC)
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Section 25D Residential Clean Energy Tax Credit
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdate({ itcEligible: !inputs.itcEligible })}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    inputs.itcEligible
                      ? "bg-[var(--accent-green)] text-white border-[var(--accent-green)]"
                      : "bg-black/10 dark:bg-white/10 text-[var(--text-muted)] border-black/15 dark:border-white/15"
                  }`}
                >
                  {inputs.itcEligible ? "30% Active" : "Disabled"}
                </button>
              </div>
            </div>

            {/* 25-Year Amortization Schedule Table */}
            <div className="maipo-glass p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <TableIcon className="w-4 h-4 text-[var(--accent-green)]" />
                  <span>25-Year Amortization Ledger</span>
                </div>
                <span className="text-xs text-[var(--accent-green)] font-semibold">
                  ★ = Investment Recouped
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 border border-black/10 dark:border-white/10 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-black/5 dark:bg-white/5 text-[var(--text-muted)] sticky top-0 border-b border-black/10 dark:border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Year</th>
                      <th className="py-2.5 px-3 font-semibold">Yield (kWh)</th>
                      <th className="py-2.5 px-3 font-semibold">Rate</th>
                      <th className="py-2.5 px-3 font-semibold">Annual Savings</th>
                      <th className="py-2.5 px-3 font-semibold">Cumulative</th>
                      <th className="py-2.5 px-3 font-semibold">Net Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {calculationResult.cashFlowSchedule.map((row) => {
                      const isBreakevenYear =
                        row.cumulativeSavings >= inputs.systemCapex &&
                        (row.year === 1 || calculationResult.cashFlowSchedule[row.year - 2].cumulativeSavings < inputs.systemCapex);
                      const isPositive = row.netCashFlow >= 0;

                      return (
                        <tr
                          key={row.year}
                          className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                            isBreakevenYear ? "bg-[var(--accent-green)]/15 font-bold" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-[var(--text-primary)] font-bold">
                            Yr {row.year} {isBreakevenYear && "★"}
                          </td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">{formatNumber(row.energyYieldKwh)}</td>
                          <td className="py-2 px-3 text-[var(--text-muted)]">${row.electricityRate.toFixed(3)}</td>
                          <td className="py-2 px-3 text-[var(--text-primary)]">{formatCurrency(row.annualSavings)}</td>
                          <td className="py-2 px-3 text-[var(--accent-green)] font-semibold">{formatCurrency(row.cumulativeSavings)}</td>
                          <td className={`py-2 px-3 font-bold ${isPositive ? "text-[var(--accent-green)]" : "text-rose-500"}`}>
                            {isPositive ? "+" : ""}{formatCurrency(row.netCashFlow)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Clean Footer */}
        <footer className="text-center pt-2 pb-6 text-xs text-[var(--text-muted)]">
          Solar Calculator • 100% Free & Private • Zero Lead-Capture
        </footer>
      </div>
    </div>
  );
}

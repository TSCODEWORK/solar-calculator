"use client";

import React, { useState } from "react";
import {
  DollarSign,
  Sun,
  BatteryCharging,
  Zap,
  TrendingUp,
  ShieldAlert,
  Sliders,
  Sparkles,
  Home,
  Check,
  ShieldCheck,
} from "lucide-react";
import { SolarInputs, NetMeteringType } from "@/types/solar";
import { formatCurrency } from "@/lib/utils";

interface InputControlsProps {
  inputs: SolarInputs;
  onChange: (newInputs: Partial<SolarInputs>) => void;
}

const SYSTEM_ARCHETYPES = [
  {
    id: "standard",
    title: "Typical Home",
    icon: Home,
    kw: 8.0,
    kwh: 15,
    hasBattery: true,
    capex: 14000,
    desc: "8 kW Solar + 15 kWh LFP Battery • ~$200/mo bill",
  },
  {
    id: "solar_only",
    title: "Solar Only (Grid-Tie)",
    icon: Sun,
    kw: 6.0,
    kwh: 0,
    hasBattery: false,
    capex: 8500,
    desc: "6 kW PV • Direct 1:1 Net Metering • Lowest Capex",
  },
  {
    id: "resilience",
    title: "Whole-Home Backup",
    icon: BatteryCharging,
    kw: 10.0,
    kwh: 30,
    hasBattery: true,
    capex: 18000,
    desc: "10 kW Solar + 30 kWh Storage • 24/7 Outage Backup",
  },
  {
    id: "ev_heavy",
    title: "EV & Heat Pump",
    icon: Zap,
    kw: 15.0,
    kwh: 30,
    hasBattery: true,
    capex: 25000,
    desc: "15 kW PV + 30 kWh Storage • High kWh Household",
  },
];

export function InputControls({ inputs, onChange }: InputControlsProps) {
  const {
    systemCapex,
    arraySizeKw,
    batteryStorageKwh,
    hasBattery,
    electricityTariff,
    utilityEscalation,
    netMeteringType,
    itcEligible,
    itcRate,
  } = inputs;

  // Toggle between inputting Net Capex (out of pocket) vs Gross Quote
  const [costInputMode, setCostInputMode] = useState<"net" | "gross">("net");

  // Gross and tax credit derivation
  const grossCost = itcEligible ? Math.round(systemCapex / (1 - itcRate)) : systemCapex;
  const taxCreditAmount = grossCost - systemCapex;

  const handleArchetypeClick = (archetype: typeof SYSTEM_ARCHETYPES[0]) => {
    onChange({
      arraySizeKw: archetype.kw,
      hasBattery: archetype.hasBattery,
      batteryStorageKwh: archetype.kwh,
      systemCapex: archetype.capex,
    });
  };

  const handleGrossChange = (val: number) => {
    if (itcEligible) {
      const net = Math.round(val * (1 - itcRate));
      onChange({ systemCapex: Math.max(1000, net), grossCapex: val });
    } else {
      onChange({ systemCapex: Math.max(1000, val), grossCapex: val });
    }
  };

  return (
    <div className="bg-[#0C1220] border border-slate-800/90 rounded-xl p-4 sm:p-5 shadow-lg space-y-6">
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-tight font-mono">
              Step 2: System Sizing & Capital Outlay
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Choose a quick system archetype or fine-tune exact specifications
            </p>
          </div>
        </div>
      </div>

      {/* Quick 1-Click System Archetype Cards */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick System Archetypes (Click to Apply)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SYSTEM_ARCHETYPES.map((arch) => {
            const isMatch =
              arraySizeKw === arch.kw &&
              hasBattery === arch.hasBattery &&
              (!hasBattery || batteryStorageKwh === arch.kwh);
            const Icon = arch.icon;

            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => handleArchetypeClick(arch)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isMatch
                    ? "bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={`w-3.5 h-3.5 ${isMatch ? "text-emerald-400" : "text-slate-400"}`} />
                    {isMatch && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-100 truncate">
                    {arch.title}
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-mono text-emerald-400 font-semibold">
                  ${(arch.capex / 1000).toFixed(1)}k net
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Net Out-of-Pocket Capex / Gross Quote */}
      <div className="space-y-2.5 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-mono font-medium text-slate-200 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Installation Outlay & Federal ITC</span>
          </label>

          {/* Net vs Gross Mode Switch */}
          <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-md text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setCostInputMode("net")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                costInputMode === "net"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Net Out-of-Pocket
            </button>
            <button
              type="button"
              onClick={() => setCostInputMode("gross")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                costInputMode === "gross"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Gross Quote (Before ITC)
            </button>
          </div>
        </div>

        {/* Input box & Slider */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={costInputMode === "net" ? 2000 : 3000}
            max={costInputMode === "net" ? 60000 : 85000}
            step={500}
            value={costInputMode === "net" ? systemCapex : grossCost}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (costInputMode === "net") {
                onChange({ systemCapex: val });
              } else {
                handleGrossChange(val);
              }
            }}
            className="flex-1 accent-emerald-500 cursor-pointer"
          />

          <div className="relative">
            <span className="absolute left-2.5 top-1.5 text-slate-500 text-xs font-mono">$</span>
            <input
              type="number"
              min={1000}
              max={100000}
              step={500}
              value={costInputMode === "net" ? systemCapex : grossCost}
              onChange={(e) => {
                const val = Math.max(1000, Number(e.target.value));
                if (costInputMode === "net") {
                  onChange({ systemCapex: val });
                } else {
                  handleGrossChange(val);
                }
              }}
              className="w-28 pl-6 pr-2 py-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded text-xs sm:text-sm font-mono font-bold text-emerald-400 focus:outline-none text-right"
            />
          </div>
        </div>

        {/* ITC Breakdown Banner */}
        <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Gross Contract: <strong className="text-slate-200">{formatCurrency(grossCost)}</strong></span>
          </div>
          {itcEligible && (
            <div className="text-teal-300 font-medium">
              30% Federal ITC: <strong className="text-teal-400">-{formatCurrency(taxCreditAmount)}</strong>
            </div>
          )}
          <div className="text-emerald-400 font-bold">
            Net Out-of-Pocket: {formatCurrency(systemCapex)}
          </div>
        </div>
      </div>

      {/* 2. Solar Array Size (kW DC) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-medium text-slate-200 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Solar Array DC Capacity</span>
          </label>
          <span className="text-xs sm:text-sm font-mono font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            {arraySizeKw.toFixed(1)} kW DC <span className="text-[10px] text-slate-500 font-normal">(~{Math.round(arraySizeKw * 2.5)} panels)</span>
          </span>
        </div>

        <input
          type="range"
          min={2}
          max={30}
          step={0.5}
          value={arraySizeKw}
          onChange={(e) => onChange({ arraySizeKw: Number(e.target.value) })}
          className="w-full accent-amber-500 cursor-pointer"
        />

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>2.0 kW (Compact)</span>
          <span>10.0 kW (Standard Home)</span>
          <span>30.0 kW (Large Roof)</span>
        </div>
      </div>

      {/* 3. Battery Storage Capacity (kWh) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-medium text-slate-200 flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-indigo-400" />
            <span>Battery Energy Storage</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ hasBattery: !hasBattery })}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                !hasBattery
                  ? "bg-slate-900 border-slate-700 text-slate-400"
                  : "bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold"
              }`}
            >
              {hasBattery ? "Storage Active" : "No Battery (Grid-Tie Only)"}
            </button>

            {hasBattery && (
              <span className="text-xs sm:text-sm font-mono font-bold text-indigo-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {batteryStorageKwh} kWh
              </span>
            )}
          </div>
        </div>

        {hasBattery ? (
          <>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={batteryStorageKwh}
              onChange={(e) => onChange({ batteryStorageKwh: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>5 kWh</span>
              <span>
                {batteryStorageKwh <= 15
                  ? "1x LFP Home Battery"
                  : batteryStorageKwh <= 30
                  ? "2x Whole-Home Batteries"
                  : "3+ High-Capacity Units"}
              </span>
              <span>60 kWh</span>
            </div>
          </>
        ) : (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Grid-tied solar only. Daytime solar is exported directly to the grid.</span>
            <button
              type="button"
              onClick={() => onChange({ hasBattery: true, batteryStorageKwh: 15 })}
              className="text-emerald-400 font-semibold hover:underline cursor-pointer"
            >
              + Add 15 kWh Battery
            </button>
          </div>
        )}
      </div>

      {/* 4. Tariff & Utility Inflation Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Tariff Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Electricity Tariff ($/kWh)</span>
            </label>
            <input
              type="number"
              step={0.005}
              min={0.05}
              max={0.80}
              value={electricityTariff}
              onChange={(e) => onChange({ electricityTariff: Number(e.target.value) })}
              className="w-20 text-right px-2 py-0.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded text-xs font-mono font-semibold text-emerald-400 focus:outline-none"
            />
          </div>
          <input
            type="range"
            min={0.08}
            max={0.65}
            step={0.01}
            value={electricityTariff}
            onChange={(e) => onChange({ electricityTariff: Number(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>$0.08 (Low)</span>
            <span>$0.65 (High)</span>
          </div>
        </div>

        {/* Inflation Rate Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <span>Utility Escalation (%/yr)</span>
            </label>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {utilityEscalation.toFixed(1)}% / yr
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={10.0}
            step={0.5}
            value={utilityEscalation}
            onChange={(e) => onChange({ utilityEscalation: Number(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0.0% (Flat)</span>
            <span>4.0% (US Benchmark)</span>
            <span>10.0%</span>
          </div>
        </div>
      </div>

      {/* 5. Net Metering Profile Selector */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <label className="text-xs font-mono font-medium text-slate-200 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Net Metering & Export Policy</span>
        </label>

        <div className="grid grid-cols-1 gap-2">
          {[
            {
              id: "avoided_cost" as NetMeteringType,
              title: "NEM 3.0 / Avoided Cost (TOU + Battery Peak Shift)",
              desc: "Battery shifts daytime solar to high evening peak rates ($0.45+/kWh). Any remaining exported surplus gets wholesale credit (~28%).",
              badge: "California & Modern TOU",
            },
            {
              id: "full_nem" as NetMeteringType,
              title: "1:1 Full Retail Net Metering (Legacy NEM)",
              desc: "100% full retail credit for all surplus exported solar kilowatt-hours across all daytime hours.",
              badge: "Highest Return",
            },
            {
              id: "off_grid_self" as NetMeteringType,
              title: "100% Self-Consumption / Zero Export",
              desc: "Zero utility export credit. Battery absorbs daytime solar surplus; any excess beyond battery capacity is clipped.",
              badge: "Independent / Off-Grid",
            },
          ].map((policy) => {
            const isSelected = netMeteringType === policy.id;
            return (
              <button
                key={policy.id}
                type="button"
                onClick={() => onChange({ netMeteringType: policy.id })}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/30"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-mono font-bold ${isSelected ? "text-emerald-300" : "text-slate-200"}`}>
                    {policy.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isSelected
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    {policy.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {policy.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

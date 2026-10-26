"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Cpu, Percent, Wrench, Shield, BatteryMedium, Gauge, Info } from "lucide-react";
import { SolarInputs } from "@/types/solar";

interface AdvancedParametersProps {
  inputs: SolarInputs;
  onChange: (updates: Partial<SolarInputs>) => void;
}

export function AdvancedParameters({ inputs, onChange }: AdvancedParametersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    panelDegradation,
    batteryEfficiency,
    derateFactor,
    itcEligible,
    inverterAcKw,
    discountRate,
    arraySizeKw,
  } = inputs;

  const dcAcRatio = inverterAcKw > 0 ? (arraySizeKw / inverterAcKw).toFixed(2) : "1.25";

  return (
    <div className="bg-[#0C1220] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* Header / Accordion Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-tight font-mono flex items-center gap-2">
              Step 3: Advanced Hardware & Financial Parameters
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-normal">
                Optional
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Tune inverter clipping, battery round-trip efficiency, panel degradation, and discount rates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{isOpen ? "Collapse" : "Tune Parameters"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Panel Degradation */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-400" /> Annual Degradation
                </span>
                <span className="text-amber-300 font-bold">{panelDegradation.toFixed(2)}% / yr</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={2.0}
                step={0.05}
                value={panelDegradation}
                onChange={(e) => onChange({ panelDegradation: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.1% (High-end)</span>
                <span>0.5% (Tier 1 Std)</span>
                <span>2.0%</span>
              </div>
            </div>

            {/* 2. Battery Round-Trip Efficiency */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <BatteryMedium className="w-3.5 h-3.5 text-indigo-400" /> Battery Efficiency
                </span>
                <span className="text-indigo-300 font-bold">{batteryEfficiency}%</span>
              </div>
              <input
                type="range"
                min={70}
                max={98}
                step={1}
                value={batteryEfficiency}
                onChange={(e) => onChange({ batteryEfficiency: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>70% (AC-coupled)</span>
                <span>90% (LiFePO4 DC)</span>
                <span>98%</span>
              </div>
            </div>

            {/* 3. System Losses / Derate Factor */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Derate Factor
                </span>
                <span className="text-emerald-300 font-bold">
                  {(derateFactor * 100).toFixed(0)}% ({(100 - derateFactor * 100).toFixed(0)}% losses)
                </span>
              </div>
              <input
                type="range"
                min={0.70}
                max={0.95}
                step={0.01}
                value={derateFactor}
                onChange={(e) => onChange({ derateFactor: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>70% (High losses)</span>
                <span>86% (NREL Benchmark)</span>
                <span>95%</span>
              </div>
            </div>

            {/* 4. Federal ITC 30% Tax Credit Toggle */}
            <div className="space-y-2 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-teal-400" /> 30% Federal ITC
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ itcEligible: !itcEligible })}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                    itcEligible
                      ? "bg-teal-500/20 border-teal-500 text-teal-300 font-bold"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  {itcEligible ? "30% Active" : "Disabled (All-Cash)"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Applies the 30% Residential Clean Energy Credit to net out-of-pocket costs.
              </p>
            </div>

            {/* 5. Inverter AC Rating & DC/AC Ratio */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Inverter AC Rating
                </span>
                <span className="text-cyan-300 font-bold">{inverterAcKw.toFixed(1)} kW AC</span>
              </div>
              <input
                type="range"
                min={3.8}
                max={20.0}
                step={0.2}
                value={inverterAcKw}
                onChange={(e) => onChange({ inverterAcKw: Number(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>DC/AC Ratio: <strong className="text-slate-200">{dcAcRatio}</strong></span>
                <span>Clipping: {Number(dcAcRatio) > 1.35 ? "Minor" : "Optimal"}</span>
              </div>
            </div>

            {/* 6. Financial Discount Rate (NPV) */}
            <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-purple-400" /> NPV Discount Rate
                </span>
                <span className="text-purple-300 font-bold">{discountRate.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={12.0}
                step={0.5}
                value={discountRate}
                onChange={(e) => onChange({ discountRate: Number(e.target.value) })}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>1.0%</span>
                <span>5.0% (Opportunity Cost)</span>
                <span>12.0%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

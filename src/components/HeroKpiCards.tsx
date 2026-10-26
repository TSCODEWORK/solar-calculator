"use client";

import React, { useState } from "react";
import {
  Zap,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { PaybackResult, SolarInputs } from "@/types/solar";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface HeroKpiCardsProps {
  inputs: SolarInputs;
  result: PaybackResult;
}

export function HeroKpiCards({ inputs, result }: HeroKpiCardsProps) {
  const [savingsFrequency, setSavingsFrequency] = useState<"monthly" | "annual">("monthly");

  const {
    paybackYears,
    paybackMonths,
    isPaybackAchieved,
    totalCapex,
    cumulativeNetProfit25Yr,
    lcoePerKwh,
    irr,
    npv,
    roi10Yr,
    roi20Yr,
    roi25Yr,
    year1GenerationKwh,
    year1Savings,
  } = result;

  const breakevenDate = React.useMemo(() => {
    if (!isPaybackAchieved) return "Post 25-Year Horizon";
    const now = new Date();
    const future = new Date(now.getFullYear(), now.getMonth() + paybackMonths, 1);
    return future.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }, [isPaybackAchieved, paybackMonths]);

  const paybackProgressPct = isPaybackAchieved
    ? Math.max(12, Math.min(100, Math.round((1 - paybackYears / 10) * 100)))
    : 5;

  const gridLcoeDiff = inputs.electricityTariff > 0
    ? Math.round(((inputs.electricityTariff - lcoePerKwh) / inputs.electricityTariff) * 100)
    : 0;

  const displayYear1Savings =
    savingsFrequency === "monthly"
      ? `${formatCurrency(Math.round(year1Savings / 12))} / mo`
      : `${formatCurrency(year1Savings)} / yr`;

  return (
    <div className="space-y-4">
      {/* 1. Large Bold Hero Payoff KPI Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0D1527] via-[#0C1220] to-[#0A0E1A] border border-emerald-500/40 p-5 sm:p-6 shadow-[0_0_30px_rgba(16,185,129,0.12)]">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Capital Breakeven Horizon
            </span>
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Breakeven Date: <strong className="text-slate-100">{breakevenDate}</strong>
            </span>
          </div>

          {/* Big Bold Headline */}
          <div className="my-2">
            <h1 className="text-4xl sm:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-tight">
              {isPaybackAchieved ? `Payoff in ${paybackYears.toFixed(1)} Years` : "> 25 Years"}
            </h1>
          </div>

          <p className="text-xs sm:text-sm font-mono text-slate-300 mb-4 leading-relaxed">
            {isPaybackAchieved ? (
              <>
                <strong className="text-emerald-400 font-bold">{paybackMonths} Months</strong> to 100% net out-of-pocket recovery on {formatCurrency(totalCapex)} initial investment
              </>
            ) : (
              "Extended payback period exceeds standard 25-year modeling horizon."
            )}
          </p>

          {/* Payback Visual Progress Meter */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Payback Velocity (vs 10-Yr Standard)</span>
              <span className="text-emerald-400 font-semibold">
                {isPaybackAchieved
                  ? paybackYears <= 3.5
                    ? "Exceptional (< 3.5 Yrs)"
                    : paybackYears <= 6
                    ? "Fast (< 6 Yrs)"
                    : "Standard Horizon"
                  : "Low Tariff"}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 border border-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${paybackProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics 2x2 Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Metric 1: 25-Year Cumulative Net Profit */}
        <div className="bg-[#0C1220] border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-4 transition-all shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> 25-Yr Net Profit
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Net Over Capex
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-100 tracking-tight">
            +{formatCurrency(cumulativeNetProfit25Yr)}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>ROI: +{roi25Yr}% over 25-yr panel warranty</span>
          </div>
        </div>

        {/* Metric 2: Levelized Cost of Energy (LCOE) */}
        <div className="bg-[#0C1220] border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-4 transition-all shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Levelized Cost (LCOE)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              {gridLcoeDiff}% Cheaper
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-300 tracking-tight">
            ${lcoePerKwh.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">/ kWh</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Grid Baseline: <span className="text-slate-200 font-semibold">${inputs.electricityTariff.toFixed(3)}/kWh</span>
          </div>
        </div>

        {/* Metric 3: Internal Rate of Return (IRR) */}
        <div className="bg-[#0C1220] border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-4 transition-all shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Internal Rate of Return
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              IRR
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300 tracking-tight">
            {irr.toFixed(1)}%
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            25-Yr Net Present Value: <span className="text-slate-200 font-semibold">+{formatCurrency(npv)}</span>
          </div>
        </div>

        {/* Metric 4: Year 1 Immediate Avoided Bill */}
        <div className="bg-[#0C1220] border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-4 transition-all shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Immediate Bill Relief
            </span>
            <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setSavingsFrequency("monthly")}
                className={`px-1.5 py-0.2 rounded transition-colors cursor-pointer ${
                  savingsFrequency === "monthly" ? "bg-indigo-500/20 text-indigo-300 font-bold" : "text-slate-400"
                }`}
              >
                / mo
              </button>
              <button
                type="button"
                onClick={() => setSavingsFrequency("annual")}
                className={`px-1.5 py-0.2 rounded transition-colors cursor-pointer ${
                  savingsFrequency === "annual" ? "bg-indigo-500/20 text-indigo-300 font-bold" : "text-slate-400"
                }`}
              >
                / yr
              </button>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-indigo-300 tracking-tight">
            {displayYear1Savings}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Generates <strong className="text-slate-200">{formatNumber(year1GenerationKwh)} kWh/yr</strong>
          </div>
        </div>
      </div>

      {/* 3. Milestone Return Timeline */}
      <div className="bg-[#0C1220] border border-slate-800/90 rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span>Cumulative Net Return Milestones</span>
          <span className="text-slate-300 font-semibold">Capex: {formatCurrency(totalCapex)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] font-mono text-slate-400 mb-0.5 uppercase tracking-wider">10-Year ROI</div>
            <div className="text-sm sm:text-base font-mono font-bold text-emerald-400">
              +{roi10Yr}%
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {formatCurrency(result.cumulativeSavings10Yr)} total
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] font-mono text-slate-400 mb-0.5 uppercase tracking-wider">20-Year ROI</div>
            <div className="text-sm sm:text-base font-mono font-bold text-teal-300">
              +{roi20Yr}%
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {formatCurrency(result.cumulativeSavings20Yr)} total
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] font-mono text-slate-400 mb-0.5 uppercase tracking-wider">25-Year ROI</div>
            <div className="text-sm sm:text-base font-mono font-bold text-cyan-300">
              +{roi25Yr}%
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {formatCurrency(result.cumulativeSavings25Yr)} total
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

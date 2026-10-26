"use client";

import React, { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PaybackResult, SolarInputs } from "@/types/solar";
import { formatCurrency } from "@/lib/utils";

interface GeminiPaybackChartProps {
  inputs: SolarInputs;
  result: PaybackResult;
}

export function GeminiPaybackChart({ inputs, result }: GeminiPaybackChartProps) {
  const { systemCapex, arraySizeKw, electricityTariff } = inputs;
  const {
    paybackYears,
    paybackMonths,
    isPaybackAchieved,
    cumulativeSavings10Yr,
    cashFlowSchedule,
  } = result;

  // Build the 10-year trajectory points matching the Gemini chart
  const chartData = useMemo(() => {
    const data = [];
    // Year 0
    data.push({
      year: 0,
      unrecoveredCost: systemCapex,
      cumulativeSavings: 0,
    });

    for (let yr = 1; yr <= 10; yr++) {
      const scheduleRow = cashFlowSchedule[yr - 1];
      const cumSav = scheduleRow ? scheduleRow.cumulativeSavings : 0;
      const unrec = Math.max(0, systemCapex - cumSav);

      data.push({
        year: yr,
        unrecoveredCost: Math.round(unrec),
        cumulativeSavings: Math.round(cumSav),
      });
    }

    return data;
  }, [cashFlowSchedule, systemCapex]);

  // Max value for Y-Axis ceiling (round up to nearest $10k or $50k)
  const maxY = useMemo(() => {
    const maxVal = Math.max(systemCapex, cumulativeSavings10Yr);
    return Math.ceil(maxVal / 10000) * 10000 || 50000;
  }, [systemCapex, cumulativeSavings10Yr]);

  return (
    <div className="maipo-glass p-5 sm:p-6 text-slate-100">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          {arraySizeKw.toFixed(0)} kW Solar Payback Simulation
        </h2>
        {isPaybackAchieved && (
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full w-fit">
            <span>Payoff in {paybackYears.toFixed(1)} Years ({paybackMonths} Months)</span>
          </div>
        )}
      </div>

      {/* 3 Top Stat Callouts */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 text-center border-b border-white/10 pb-5">
        {/* Initial Cost */}
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(systemCapex)}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Initial Cost
          </div>
        </div>

        {/* Baseline Utility Rate */}
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ${electricityTariff.toFixed(2)}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Baseline Utility Rate
          </div>
        </div>

        {/* 10-Year Avoided Bills */}
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
            {formatCurrency(cumulativeSavings10Yr)}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 mt-0.5">
            10-Year Avoided Bills
          </div>
        </div>
      </div>

      {/* Graph Section */}
      <div className="w-full">
        <div className="text-xs font-semibold text-slate-400 mb-1">
          Value ($)
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="geminiGreenFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="2 2" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />

              <XAxis
                dataKey="year"
                stroke="rgba(255, 255, 255, 0.4)"
                tick={{ fill: "rgba(255, 255, 255, 0.6)", fontSize: 11 }}
                ticks={[0, 2, 4, 6, 8, 10]}
              />

              <YAxis
                stroke="rgba(255, 255, 255, 0.4)"
                tick={{ fill: "rgba(255, 255, 255, 0.6)", fontSize: 11 }}
                domain={[0, maxY]}
                tickFormatter={(val) => (val === 0 ? "$0" : `$${Math.round(val / 1000)}K`)}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#052215] border border-emerald-500/30 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                      <div className="text-white font-bold border-b border-white/10 pb-1">
                        Year {d.year} from Commissioning
                      </div>
                      <div className="flex justify-between gap-4 text-sky-300">
                        <span>Remaining Unrecovered:</span>
                        <span className="font-bold">{formatCurrency(d.unrecoveredCost)}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-emerald-400">
                        <span>Cumulative Avoided:</span>
                        <span className="font-bold">{formatCurrency(d.cumulativeSavings)}</span>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Green shaded area under the cumulative avoided utility line */}
              <Area
                type="monotone"
                dataKey="cumulativeSavings"
                stroke="none"
                fill="url(#geminiGreenFill)"
              />

              {/* Blue line: Remaining Unrecovered Cost */}
              <Line
                type="monotone"
                dataKey="unrecoveredCost"
                stroke="#60a5fa"
                strokeWidth={2.5}
                dot={false}
              />

              {/* Green line: Cumulative Avoided Utility Cost */}
              <Line
                type="monotone"
                dataKey="cumulativeSavings"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* X-Axis Caption */}
        <div className="text-center text-xs text-slate-400 mt-1">
          Years from Commissioning
        </div>

        {/* Legend matching Gemini screenshot */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t border-white/10 text-xs sm:text-sm text-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-[#60a5fa]" />
            <span>Remaining Unrecovered Cost</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-[#22c55e]" />
            <span>Cumulative Avoided Utility Cost</span>
          </div>
        </div>
      </div>
    </div>
  );
}

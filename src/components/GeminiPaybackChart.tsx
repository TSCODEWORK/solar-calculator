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
  isLightMode?: boolean;
}

export function GeminiPaybackChart({ inputs, result, isLightMode = false }: GeminiPaybackChartProps) {
  const { systemCapex, arraySizeKw, electricityTariff } = inputs;
  const {
    paybackYears,
    paybackMonths,
    isPaybackAchieved,
    cumulativeSavings10Yr,
    cashFlowSchedule,
  } = result;

  // 10-year trajectory points matching the Gemini chart
  const chartData = useMemo(() => {
    const data = [];
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

  const maxY = useMemo(() => {
    const maxVal = Math.max(systemCapex, cumulativeSavings10Yr);
    return Math.ceil(maxVal / 10000) * 10000 || 50000;
  }, [systemCapex, cumulativeSavings10Yr]);

  // Color tokens based on theme
  const blueColor = isLightMode ? "#2563eb" : "#60a5fa";
  const greenColor = isLightMode ? "#16a34a" : "#22c55e";
  const gridColor = isLightMode ? "rgba(6, 78, 59, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const tickColor = isLightMode ? "rgba(6, 78, 59, 0.6)" : "rgba(255, 255, 255, 0.6)";

  return (
    <div className="maipo-glass p-5 sm:p-7">
      {/* Top Section: Prominent Large Numbers of How Many Years Until Recouped Cost */}
      <div className="text-center pb-6 border-b border-black/10 dark:border-white/10">
        <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
          Estimated Payback Time
        </div>

        {/* Large bold number of years */}
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl sm:text-6xl font-black tracking-tight text-[var(--accent-green)]">
            {isPaybackAchieved ? `${paybackYears.toFixed(1)}` : "> 25"}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            Years
          </span>
        </div>

        <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mt-1">
          {isPaybackAchieved ? (
            <>
              <strong>{paybackMonths} Months</strong> to fully recoup your investment
            </>
          ) : (
            "Payback extends beyond standard 10-year model"
          )}
        </p>

        {/* 3 Metric Summary Row below the big payback number */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-black/5 dark:border-white/5">
          <div>
            <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
              {formatCurrency(systemCapex)}
            </div>
            <div className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5">
              Initial Cost
            </div>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
              ${electricityTariff.toFixed(2)}
            </div>
            <div className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5">
              Baseline Rate
            </div>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black text-[var(--accent-green)]">
              {formatCurrency(cumulativeSavings10Yr)}
            </div>
            <div className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5">
              10-Yr Avoided Bills
            </div>
          </div>
        </div>
      </div>

      {/* Graph Section Directly Below */}
      <div className="pt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] mb-1">
          <span>{arraySizeKw.toFixed(0)} kW Payback Simulation</span>
          <span>Value ($)</span>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="geminiGreenFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={greenColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={greenColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="2 2" stroke={gridColor} vertical={false} />

              <XAxis
                dataKey="year"
                stroke={tickColor}
                tick={{ fill: tickColor, fontSize: 11 }}
                ticks={[0, 2, 4, 6, 8, 10]}
              />

              <YAxis
                stroke={tickColor}
                tick={{ fill: tickColor, fontSize: 11 }}
                domain={[0, maxY]}
                tickFormatter={(val) => (val === 0 ? "$0" : `$${Math.round(val / 1000)}K`)}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#052215] text-white border border-emerald-500/30 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                      <div className="font-bold border-b border-white/10 pb-1">
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

              {/* Green shaded area */}
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
                stroke={blueColor}
                strokeWidth={2.5}
                dot={false}
              />

              {/* Green line: Cumulative Avoided Utility Cost */}
              <Line
                type="monotone"
                dataKey="cumulativeSavings"
                stroke={greenColor}
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="text-center text-xs text-[var(--text-muted)] mt-1">
          Years from Commissioning
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t border-black/10 dark:border-white/10 text-xs sm:text-sm text-[var(--text-primary)] font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: blueColor }} />
            <span>Remaining Unrecovered Cost</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: greenColor }} />
            <span>Cumulative Avoided Utility Cost</span>
          </div>
        </div>
      </div>
    </div>
  );
}

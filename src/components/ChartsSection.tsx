"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Bar,
  Line,
  ComposedChart,
} from "recharts";
import { TrendingUp, BarChart3, Table as TableIcon } from "lucide-react";
import { PaybackResult, SolarInputs } from "@/types/solar";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface ChartsSectionProps {
  inputs: SolarInputs;
  result: PaybackResult;
}

export function ChartsSection({ inputs, result }: ChartsSectionProps) {
  const [activeTab, setActiveTab] = useState<"cashflow" | "monthly" | "schedule">("cashflow");

  const { cashFlowSchedule, monthlyBreakdown, totalCapex, paybackYears } = result;

  // Format data for Cumulative Cash Flow Chart (Year 0 to 25)
  const cashFlowChartData = React.useMemo(() => {
    return [
      {
        yearLabel: "Yr 0 (Install)",
        year: 0,
        netCashFlow: -totalCapex,
        cumulativeSavings: 0,
        annualSavings: 0,
        electricityRate: inputs.electricityTariff,
      },
      ...cashFlowSchedule.map((row) => ({
        yearLabel: `Yr ${row.year}`,
        year: row.year,
        netCashFlow: row.netCashFlow,
        cumulativeSavings: row.cumulativeSavings,
        annualSavings: row.annualSavings,
        electricityRate: row.electricityRate,
      })),
    ];
  }, [cashFlowSchedule, totalCapex, inputs.electricityTariff]);

  return (
    <div className="bg-[#0C1220] border border-slate-800/90 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Navigation Tabs Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 uppercase tracking-tight font-mono">
              Cash Flow Trajectory & Generation Model
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Dynamic 25-year compounding simulation & seasonal solar curves
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("cashflow")}
            className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "cashflow"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cumulative Cash Flow</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "monthly"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Monthly Curve</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "schedule"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>25-Yr Ledger</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Cumulative Cash Flow Curve */}
      {activeTab === "cashflow" && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-400"></span>
                <span>Cumulative Net Balance</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-500"></span>
                <span>$0 Breakeven Horizon</span>
              </span>
            </div>
            <span className="text-emerald-400 font-semibold">
              Net Positive at Year {paybackYears.toFixed(1)}
            </span>
          </div>

          <div className="h-72 sm:h-84 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="65%" stopColor="#10b981" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#080c15" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(val) => (val === 0 ? "Yr 0" : `Y${val}`)}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    const isPositive = item.netCashFlow >= 0;
                    return (
                      <div className="bg-[#090D16] border border-slate-700/80 p-3 rounded-lg shadow-2xl font-mono text-xs space-y-1.5">
                        <div className="text-slate-100 font-bold border-b border-slate-800 pb-1 flex justify-between gap-4">
                          <span>{item.year === 0 ? "Installation Day" : `Year ${item.year} Status`}</span>
                          {item.year > 0 && <span className="text-cyan-300">${item.electricityRate.toFixed(3)}/kWh</span>}
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Net Cash Position:</span>
                          <span className={`font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                            {item.netCashFlow >= 0 ? "+" : ""}{formatCurrency(item.netCashFlow)}
                          </span>
                        </div>
                        {item.year > 0 && (
                          <>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Annual Savings:</span>
                              <span className="text-slate-100 font-semibold">{formatCurrency(item.annualSavings)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Monthly Avg Savings:</span>
                              <span className="text-emerald-400 font-semibold">{formatCurrency(Math.round(item.annualSavings / 12))} / mo</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Cumulative Savings:</span>
                              <span className="text-emerald-300 font-bold">{formatCurrency(item.cumulativeSavings)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="netCashFlow"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cashFlowGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Seasonal Harvest */}
      {activeTab === "monthly" && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/80"></span>
                <span>Solar Generation (kWh)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400"></span>
                <span>Avoided Bill Value ($)</span>
              </span>
            </div>
            <span className="text-amber-300 font-mono">
              Total Year 1 Harvest: {formatNumber(result.year1GenerationKwh)} kWh
            </span>
          </div>

          <div className="h-72 sm:h-84 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyBreakdown} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  tick={{ fill: "#f59e0b", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(val) => `${val}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  tick={{ fill: "#10b981", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-[#090D16] border border-slate-700/80 p-3 rounded-lg shadow-2xl font-mono text-xs space-y-1.5">
                        <div className="text-slate-100 font-bold border-b border-slate-800 pb-1">
                          {item.month} Seasonal Harvest
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-amber-400">Solar Yield:</span>
                          <span className="text-slate-100 font-bold">{formatNumber(item.generationKwh)} kWh</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-emerald-400">Avoided Bill:</span>
                          <span className="text-emerald-300 font-bold">{formatCurrency(item.valueGenerated)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Daily Solar Irradiance:</span>
                          <span className="text-slate-300">{item.solarRadiation} kWh/m²/day</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar yAxisId="left" dataKey="generationKwh" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="valueGenerated"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: 25-Year Ledger */}
      {activeTab === "schedule" && (
        <div className="space-y-2 pt-1">
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Compounded Matrix (0.5% Degradation + 4% Utility Inflation)</span>
            <span className="text-emerald-400">★ = Outlay Recovered</span>
          </div>

          <div className="overflow-x-auto max-h-80 border border-slate-800 rounded-lg">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Year</th>
                  <th className="py-2.5 px-3 font-semibold">Yield (kWh)</th>
                  <th className="py-2.5 px-3 font-semibold">Tariff</th>
                  <th className="py-2.5 px-3 font-semibold">Annual Savings</th>
                  <th className="py-2.5 px-3 font-semibold">Cumulative</th>
                  <th className="py-2.5 px-3 font-semibold">Net Cash Flow</th>
                  <th className="py-2.5 px-3 font-semibold">ROI %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0A0F1D]">
                {cashFlowSchedule.map((row) => {
                  const isBreakevenYear =
                    row.cumulativeSavings >= totalCapex &&
                    (row.year === 1 || cashFlowSchedule[row.year - 2].cumulativeSavings < totalCapex);
                  const isPositive = row.netCashFlow >= 0;
                  const netRoi = Math.round((row.netCashFlow / totalCapex) * 100);

                  return (
                    <tr
                      key={row.year}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isBreakevenYear ? "bg-emerald-500/15 border-l-4 border-l-emerald-400 font-semibold" : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-200">
                        Yr {row.year} {isBreakevenYear && "★"}
                      </td>
                      <td className="py-2 px-3 text-slate-300">{formatNumber(row.energyYieldKwh)}</td>
                      <td className="py-2 px-3 text-cyan-300">${row.electricityRate.toFixed(3)}</td>
                      <td className="py-2 px-3 text-slate-200">{formatCurrency(row.annualSavings)}</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">{formatCurrency(row.cumulativeSavings)}</td>
                      <td className={`py-2 px-3 font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPositive ? "+" : ""}{formatCurrency(row.netCashFlow)}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {isPositive ? `+${netRoi}%` : `${netRoi}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

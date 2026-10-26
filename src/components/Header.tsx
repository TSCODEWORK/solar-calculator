"use client";

import React, { useState } from "react";
import { Sun, BatteryCharging, Share2, Download, Printer, Check, ShieldCheck, RefreshCw } from "lucide-react";
import { PaybackResult, SolarInputs } from "@/types/solar";
import { exportPaybackToCsv } from "@/lib/export-csv";

interface HeaderProps {
  lastUpdated: string;
  inputs: SolarInputs;
  result: PaybackResult;
}

export function Header({ lastUpdated, inputs, result }: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(lastUpdated);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Oct 26, 2026";
    }
  }, [lastUpdated]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportCsv = () => {
    exportPaybackToCsv(inputs, result);
  };

  return (
    <header className="border-b border-slate-800/80 bg-[#0A0E1A]/95 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo and Engine Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Sun className="w-5 h-5 text-amber-400 animate-[spin_20s_linear_infinite]" />
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 absolute -bottom-0.5 -right-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm tracking-widest uppercase font-semibold text-slate-100">
                  Solar & Storage Payback Engine
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase bg-slate-800/80 text-emerald-400 border border-emerald-500/30 rounded">
                  v2.4 Live
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                <span className="text-slate-500">NREL PVWatts v8</span>
                <span>•</span>
                <span className="text-slate-500">EIA Retail v2</span>
                <span>•</span>
                <span className="text-emerald-400/90 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 inline" /> 100% Free & Private
                </span>
              </div>
            </div>
          </div>

          {/* Sync Status Badge (Mobile View) */}
          <div className="flex md:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Synced Weekly</span>
          </div>
        </div>

        {/* Sync Badge & Actions (Desktop) */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end flex-wrap">
          {/* Synchronized Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800/80 text-xs font-mono text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">Rates & Solar Data Synced:</span>
            <span className="text-emerald-400 font-medium">{formattedDate}</span>
            <span className="text-slate-500 text-[11px]">(Updated Weekly)</span>
          </div>

          {/* Share Button */}
          <button
            onClick={handleCopyLink}
            title="Copy shareable calculation link with current parameters"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-mono">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">Share Scenario</span>
              </>
            )}
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            title="Export 25-year cash-flow schedule to CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono">CSV</span>
          </button>

          {/* PDF / Print */}
          <button
            onClick={handlePrintPdf}
            title="Print or Save Summary PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="font-mono">PDF Report</span>
          </button>
        </div>
      </div>
    </header>
  );
}

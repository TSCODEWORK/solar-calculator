import { Suspense } from "react";
import { SolarCalculatorApp } from "@/components/SolarCalculatorApp";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080C15] flex items-center justify-center text-slate-400 font-mono text-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span>Initializing Solar & Storage Payback Engine...</span>
          </div>
        </div>
      }
    >
      <SolarCalculatorApp />
    </Suspense>
  );
}

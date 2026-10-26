import { Suspense } from "react";
import { SimpleCalculator } from "@/components/SimpleCalculator";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#03140c] flex items-center justify-center text-emerald-300/80 font-mono text-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span>Loading Solar Payback Simulator...</span>
          </div>
        </div>
      }
    >
      <SimpleCalculator />
    </Suspense>
  );
}

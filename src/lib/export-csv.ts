import { PaybackResult, SolarInputs } from "@/types/solar";

export function exportPaybackToCsv(inputs: SolarInputs, result: PaybackResult) {
  const lines: string[] = [];

  // Summary Section
  lines.push("SOLAR & STORAGE PAYBACK ENGINE - FINANCIAL REPORT");
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push(`Location,${inputs.location?.city ?? "Custom"}, ${inputs.location?.state ?? ""}`);
  lines.push(`Utility,${inputs.location?.utility ?? "Standard Utility"}`);
  lines.push(`Array Size (kW DC),${inputs.arraySizeKw}`);
  lines.push(`Battery Storage (kWh),${inputs.hasBattery ? inputs.batteryStorageKwh : 0}`);
  lines.push(`Net Out-of-Pocket Capex ($),${inputs.systemCapex}`);
  lines.push(`Gross Capex ($),${result.grossCapex}`);
  lines.push(`Federal ITC 30% Amount ($),${result.federalTaxCreditAmount}`);
  lines.push(`Base Electricity Tariff ($/kWh),${inputs.electricityTariff}`);
  lines.push(`Utility Escalation Rate (%/yr),${inputs.utilityEscalation}`);
  lines.push(`Panel Degradation Rate (%/yr),${inputs.panelDegradation}`);
  lines.push(`Net Metering Profile,${inputs.netMeteringType}`);
  lines.push("");

  // Key KPI Metrics
  lines.push("KEY PERFORMANCE INDICATORS");
  lines.push(`Payback Horizon,${result.paybackExactText}`);
  lines.push(`Levelized Cost of Energy (LCOE $/kWh),${result.lcoePerKwh}`);
  lines.push(`Internal Rate of Return (IRR %),${result.irr}%`);
  lines.push(`25-Year Net Present Value (NPV $),${result.npv}`);
  lines.push(`25-Year Cumulative Net Profit ($),${result.cumulativeNetProfit25Yr}`);
  lines.push(`10-Year Cumulative ROI (%),${result.roi10Yr}%`);
  lines.push(`20-Year Cumulative ROI (%),${result.roi20Yr}%`);
  lines.push(`25-Year Cumulative ROI (%),${result.roi25Yr}%`);
  lines.push("");

  // 25-Year Schedule
  lines.push("25-YEAR AMORTIZATION SCHEDULE");
  lines.push("Year,Energy Yield (kWh),Grid Tariff ($/kWh),Annual Savings ($),Cumulative Savings ($),Net Cash Flow ($),Discounted Cash Flow ($),Cumulative Discounted ($)");

  for (const row of result.cashFlowSchedule) {
    lines.push(
      [
        row.year,
        row.energyYieldKwh,
        row.electricityRate.toFixed(4),
        row.annualSavings,
        row.cumulativeSavings,
        row.netCashFlow,
        row.discountedCashFlow,
        row.cumulativeDiscounted,
      ].join(",")
    );
  }

  lines.push("");
  // Monthly seasonal breakdown
  lines.push("MONTHLY SEASONAL PRODUCTION (YEAR 1)");
  lines.push("Month,Solar Radiation (kWh/m2/day),Monthly Generation (kWh),Avoided Grid Cost ($)");
  for (const m of result.monthlyBreakdown) {
    lines.push([m.month, m.solarRadiation, m.generationKwh, m.valueGenerated].join(","));
  }

  const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
  const link = document.createElement("a");
  link.setAttribute("href", csvContent);
  link.setAttribute("download", `solar_payback_report_${inputs.location?.state || "custom"}_${inputs.arraySizeKw}kw.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

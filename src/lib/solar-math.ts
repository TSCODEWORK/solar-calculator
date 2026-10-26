import { SolarInputs, PaybackResult, YearlyCashFlow, MonthlyProduction } from "@/types/solar";

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Days in each month for production weighting
const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Calculates internal rate of return (IRR) using Newton-Raphson method
 * @param cashFlows Cash flows where cashFlows[0] is initial outlay (negative)
 * @param guess Initial discount rate guess (default 0.1)
 * @param maxIterations Maximum iterations for convergence
 * @param tolerance Convergence tolerance
 */
export function calculateIRR(
  cashFlows: number[],
  guess = 0.1,
  maxIterations = 1000,
  tolerance = 1e-7
): number {
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashFlows[t] / denom;
      if (t > 0) {
        derivativeNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < tolerance) {
      return rate * 100; // Return as percentage
    }

    if (Math.abs(derivativeNpv) < 1e-10) {
      break;
    }

    const nextRate = rate - npv / derivativeNpv;
    if (isNaN(nextRate) || !isFinite(nextRate)) {
      break;
    }

    // Clamp search boundary between -90% and 1000%
    rate = Math.max(-0.9, Math.min(10.0, nextRate));
  }

  // Fallback: estimate if Newton-Raphson didn't converge
  return Math.max(0, rate * 100);
}

/**
 * Calculate Net Present Value
 */
export function calculateNPV(discountRatePercent: number, cashFlows: number[]): number {
  const r = discountRatePercent / 100;
  return cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);
}

/**
 * Core Solar & Storage Payback Engine
 * Strictly typed financial and physical simulation model
 */
export function calculateSolarPayback(inputs: SolarInputs): PaybackResult {
  const {
    systemCapex,
    arraySizeKw,
    batteryStorageKwh,
    hasBattery,
    electricityTariff,
    utilityEscalation,
    panelDegradation,
    batteryEfficiency,
    netMeteringType,
    derateFactor = 0.86,
    discountRate = 5.0,
    itcEligible = true,
    itcRate = 0.30,
    location,
  } = inputs;

  // Specific annual yield in kWh per kW DC installed
  // Base default is 1450 kWh/kW if no location provided
  const annualKwhPerKw = location?.annualKwhPerKw ?? 1450;
  const baseYear1Kwh = arraySizeKw * annualKwhPerKw * (derateFactor / 0.86);

  // Storage and Net Metering Effective Value Multiplier
  // Battery Round-Trip Efficiency Factor (applied to shifted energy)
  const battEfficiencyDecimal = Math.max(0.5, Math.min(1.0, batteryEfficiency / 100));
  
  // Daily Solar Production vs Battery Capacity Ratio
  const dailyGenKwh = baseYear1Kwh / 365;
  const effectiveBatteryCap = hasBattery ? batteryStorageKwh : 0;
  const batteryFractionOfDailyGen = dailyGenKwh > 0 ? Math.min(0.85, effectiveBatteryCap / dailyGenKwh) : 0;

  // Calculate self-consumed portion:
  // Baseline daytime home load absorbs ~35% of daily generation.
  // Battery absorbs excess up to capacity, allowing higher self-consumption up to 92-95%.
  const selfConsumedPortion = hasBattery && effectiveBatteryCap > 0
    ? Math.min(0.92, 0.35 + batteryFractionOfDailyGen * 0.70)
    : 0.35;
  const exportedPortion = Math.max(0, 1.0 - selfConsumedPortion);

  let effectiveTariffMultiplier = 1.0;
  let batteryEfficiencyFactor = 1.0;

  if (hasBattery && effectiveBatteryCap > 0) {
    // Energy cycled through battery experiences round-trip loss:
    const shiftedFraction = selfConsumedPortion - 0.35;
    const directFraction = 1.0 - shiftedFraction;
    batteryEfficiencyFactor = directFraction + (shiftedFraction * battEfficiencyDecimal);
  }

  if (netMeteringType === "full_nem") {
    // 1:1 Retail Net Metering - 100% of generation valued at full retail rate
    effectiveTariffMultiplier = 1.0;
  } else if (netMeteringType === "avoided_cost") {
    // NEM 3.0 / California style:
    // Self-consumed gets full retail value (1.0).
    // Exported surplus gets wholesale avoided cost (~28% of retail).
    effectiveTariffMultiplier = (selfConsumedPortion * 1.0) + (exportedPortion * 0.28);
  } else if (netMeteringType === "off_grid_self") {
    // Zero Export / Off-Grid self-consumption:
    // Exported excess is dumped/curtailed with 0 utility credit.
    effectiveTariffMultiplier = selfConsumedPortion * 1.0;
  }

  // Incentives calculation: If user provided gross Capex or if systemCapex is net
  const grossCapex = inputs.grossCapex ?? (itcEligible ? systemCapex / (1 - itcRate) : systemCapex);
  const federalTaxCreditAmount = itcEligible ? grossCapex * itcRate : 0;
  const netCapex = systemCapex;

  // Compounded 25-Year Schedule
  const cashFlowSchedule: YearlyCashFlow[] = [];
  const irrCashFlows: number[] = [-netCapex];

  let cumulativeSavings = 0;
  let cumulativeDiscounted = 0;
  let lifetimeTotalKwh = 0;

  const degRate = panelDegradation / 100;
  const escRate = utilityEscalation / 100;
  const discRate = discountRate / 100;

  for (let year = 1; year <= 25; year++) {
    // Yearly Degraded Energy Yield:
    // Et = Annual_kWh * (1 - Degradation)^(t-1) * Battery_Efficiency_Factor
    const degradationMultiplier = Math.pow(1 - degRate, year - 1);
    const yearlyEnergyKwh = baseYear1Kwh * degradationMultiplier * batteryEfficiencyFactor;
    lifetimeTotalKwh += yearlyEnergyKwh;

    // Yearly Escalated Electricity Rate:
    // Rt = Base_Rate * (1 + Inflation)^(t-1)
    const escalatedRate = electricityTariff * Math.pow(1 + escRate, year - 1);

    // Annual Avoided Cost ($):
    // Savings_t = Et * Rt * effectiveTariffMultiplier
    const annualSavings = yearlyEnergyKwh * escalatedRate * effectiveTariffMultiplier;
    cumulativeSavings += annualSavings;

    const netCashFlow = cumulativeSavings - netCapex;
    const discountedCashFlow = annualSavings / Math.pow(1 + discRate, year);
    cumulativeDiscounted += discountedCashFlow;

    cashFlowSchedule.push({
      year,
      energyYieldKwh: Math.round(yearlyEnergyKwh),
      electricityRate: Number(escalatedRate.toFixed(4)),
      annualSavings: Math.round(annualSavings),
      cumulativeSavings: Math.round(cumulativeSavings),
      netCashFlow: Math.round(netCashFlow),
      discountedCashFlow: Math.round(discountedCashFlow),
      cumulativeDiscounted: Math.round(cumulativeDiscounted),
    });

    irrCashFlows.push(annualSavings);
  }

  // Exact Payback Horizon (Month & Year interpolation)
  let paybackYears = 0;
  let paybackMonths = 0;
  let isPaybackAchieved = false;

  let priorCumulative = 0;
  for (let i = 0; i < cashFlowSchedule.length; i++) {
    const item = cashFlowSchedule[i];
    if (item.cumulativeSavings >= netCapex) {
      isPaybackAchieved = true;
      const year = item.year;
      const annualSav = item.annualSavings;
      const neededInYear = netCapex - priorCumulative;
      const fractionOfYear = annualSav > 0 ? Math.max(0, Math.min(1, neededInYear / annualSav)) : 0;
      
      paybackYears = Number(((year - 1) + fractionOfYear).toFixed(2));
      paybackMonths = Math.max(1, Math.round(paybackYears * 12));
      break;
    }
    priorCumulative = item.cumulativeSavings;
  }

  if (!isPaybackAchieved) {
    paybackYears = 25.1;
    paybackMonths = 300;
  }

  const paybackExactText = isPaybackAchieved
    ? `${paybackYears.toFixed(1)} Years (${paybackMonths} Months)`
    : "> 25 Years (Extended Horizon)";

  // Milestones: 10-Yr, 20-Yr, 25-Yr ROI
  const cumulativeSavings10Yr = cashFlowSchedule[9]?.cumulativeSavings ?? 0;
  const cumulativeSavings20Yr = cashFlowSchedule[19]?.cumulativeSavings ?? 0;
  const cumulativeSavings25Yr = cashFlowSchedule[24]?.cumulativeSavings ?? 0;

  const cumulativeNetProfit25Yr = cumulativeSavings25Yr - netCapex;

  const roi10Yr = netCapex > 0 ? Math.round(((cumulativeSavings10Yr - netCapex) / netCapex) * 100) : 0;
  const roi20Yr = netCapex > 0 ? Math.round(((cumulativeSavings20Yr - netCapex) / netCapex) * 100) : 0;
  const roi25Yr = netCapex > 0 ? Math.round(((cumulativeSavings25Yr - netCapex) / netCapex) * 100) : 0;

  // Levelized Cost of Energy (LCOE, $/kWh): Total Capex / Lifetime kWh
  const lcoePerKwh = lifetimeTotalKwh > 0 ? Number((netCapex / lifetimeTotalKwh).toFixed(4)) : 0;

  // IRR & NPV
  const irr = calculateIRR(irrCashFlows);
  const npv = Math.round(calculateNPV(discountRate, irrCashFlows));

  // Monthly Seasonal Breakdown (Jan - Dec)
  // Monthly solar insolation weights
  const monthlyIrradiance = location?.monthlyIrradiance ?? [
    3.2, 4.1, 5.2, 6.2, 6.8, 7.1, 6.9, 6.4, 5.6, 4.5, 3.4, 2.9
  ];
  const totalDailySum = monthlyIrradiance.reduce((acc, val, idx) => acc + val * DAYS_IN_MONTH[idx], 0);

  const year1GenerationKwh = Math.round(cashFlowSchedule[0].energyYieldKwh);
  const year1Savings = Math.round(cashFlowSchedule[0].annualSavings);

  const monthlyBreakdown: MonthlyProduction[] = MONTH_NAMES.map((month, idx) => {
    const monthDays = DAYS_IN_MONTH[idx];
    const monthRadiation = monthlyIrradiance[idx];
    const monthWeight = (monthRadiation * monthDays) / totalDailySum;
    const generationKwh = Math.round(year1GenerationKwh * monthWeight);
    const valueGenerated = Math.round(generationKwh * electricityTariff * effectiveTariffMultiplier);

    return {
      month,
      monthIndex: idx,
      solarRadiation: Number(monthRadiation.toFixed(2)),
      generationKwh,
      gridRate: Number(electricityTariff.toFixed(4)),
      valueGenerated,
    };
  });

  return {
    paybackYears,
    paybackMonths,
    paybackExactText,
    isPaybackAchieved,
    totalCapex: netCapex,
    grossCapex: Math.round(grossCapex),
    federalTaxCreditAmount: Math.round(federalTaxCreditAmount),
    year1GenerationKwh,
    year1Savings,
    cumulativeSavings10Yr,
    cumulativeSavings20Yr,
    cumulativeSavings25Yr,
    cumulativeNetProfit25Yr,
    roi10Yr,
    roi20Yr,
    roi25Yr,
    lcoePerKwh,
    npv,
    irr: Number(irr.toFixed(1)),
    cashFlowSchedule,
    monthlyBreakdown,
    avoidedRateEffective: Number((electricityTariff * effectiveTariffMultiplier).toFixed(4)),
    lifetimeTotalKwh: Math.round(lifetimeTotalKwh),
  };
}

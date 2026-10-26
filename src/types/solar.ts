export type NetMeteringType = "full_nem" | "avoided_cost" | "off_grid_self";

export interface LocationData {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  utility: string;
  ratePerKwh: number;
  peakSunHours: number; // Avg peak sun hours per day
  annualKwhPerKw: number; // Specific yield kWh/kW/yr
  monthlyIrradiance: number[]; // 12 months in kWh/m2/day
}

export interface SolarInputs {
  location?: LocationData;
  systemCapex: number; // Net out-of-pocket cost in USD
  grossCapex?: number; // Total gross cost before incentives
  itcEligible: boolean; // 30% Federal ITC
  itcRate: number; // Federal ITC rate (default 0.30)
  arraySizeKw: number; // Solar DC capacity (kW)
  batteryStorageKwh: number; // Battery capacity (kWh)
  hasBattery: boolean; // Storage toggle
  electricityTariff: number; // $/kWh
  utilityEscalation: number; // %/yr escalation
  panelDegradation: number; // %/yr degradation
  batteryEfficiency: number; // % round-trip efficiency
  netMeteringType: NetMeteringType; // NEM policy profile
  derateFactor: number; // System derate (default 0.86)
  discountRate: number; // % discount rate for NPV
  inverterAcKw: number; // AC rating kW
  inverterEfficiency: number; // Inverter efficiency %
}

export interface YearlyCashFlow {
  year: number;
  energyYieldKwh: number;
  electricityRate: number;
  annualSavings: number;
  cumulativeSavings: number;
  netCashFlow: number; // cumulativeSavings - systemCapex
  discountedCashFlow: number;
  cumulativeDiscounted: number;
}

export interface MonthlyProduction {
  month: string;
  monthIndex: number;
  solarRadiation: number; // kWh/m²/day
  generationKwh: number;
  gridRate: number;
  valueGenerated: number;
}

export interface PaybackResult {
  paybackYears: number; // Fractional years (e.g. 2.92)
  paybackMonths: number; // Total months (e.g. 35)
  paybackExactText: string;
  isPaybackAchieved: boolean;
  totalCapex: number; // Net Capex
  grossCapex: number;
  federalTaxCreditAmount: number;
  year1GenerationKwh: number;
  year1Savings: number;
  cumulativeSavings10Yr: number;
  cumulativeSavings20Yr: number;
  cumulativeSavings25Yr: number;
  cumulativeNetProfit25Yr: number;
  roi10Yr: number; // % ROI
  roi20Yr: number;
  roi25Yr: number;
  lcoePerKwh: number; // $/kWh
  npv: number;
  irr: number; // %
  cashFlowSchedule: YearlyCashFlow[];
  monthlyBreakdown: MonthlyProduction[];
  avoidedRateEffective: number;
  lifetimeTotalKwh: number;
}

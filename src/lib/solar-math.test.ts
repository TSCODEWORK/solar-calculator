import { describe, it, expect } from "vitest";
import { calculateSolarPayback, calculateIRR, calculateNPV } from "./solar-math";
import { SolarInputs } from "@/types/solar";

describe("Solar & Storage Calculation Engine (solar-math.ts)", () => {
  const defaultInputs: SolarInputs = {
    systemCapex: 11000,
    arraySizeKw: 10,
    batteryStorageKwh: 30,
    hasBattery: true,
    electricityTariff: 0.32,
    utilityEscalation: 4.0,
    panelDegradation: 0.5,
    batteryEfficiency: 90,
    netMeteringType: "full_nem",
    derateFactor: 0.86,
    discountRate: 5.0,
    itcEligible: true,
    itcRate: 0.30,
    inverterAcKw: 7.6,
    inverterEfficiency: 96,
  };

  it("calculates exact payback horizon within expected years and months", () => {
    const result = calculateSolarPayback(defaultInputs);

    expect(result.isPaybackAchieved).toBe(true);
    expect(result.paybackYears).toBeGreaterThan(1.5);
    expect(result.paybackYears).toBeLessThan(4.5);
    expect(result.paybackMonths).toBe(Math.round(result.paybackYears * 12));
    expect(result.paybackExactText).toMatch(/\d+\.\d+ Years \(\d+ Months\)/);
  });

  it("verifies degradation formula: Et = Annual_kWh * (1 - Deg)^(t-1) * BattFactor", () => {
    const result = calculateSolarPayback(defaultInputs);
    const schedule = result.cashFlowSchedule;

    const y1 = schedule[0];
    const y2 = schedule[1];
    const y10 = schedule[9];

    // Year 1 degradation exponent is 0 -> 1.0
    // Year 2 degradation exponent is 1 -> (1 - 0.005)^1 = 0.995
    const expectedY2 = y1.energyYieldKwh * (1 - 0.005);
    expect(y2.energyYieldKwh).toBeCloseTo(expectedY2, -1);

    // Year 10 degradation: (1 - 0.005)^9 = 0.9558
    const expectedY10 = y1.energyYieldKwh * Math.pow(1 - 0.005, 9);
    expect(y10.energyYieldKwh).toBeCloseTo(expectedY10, -1);
  });

  it("verifies electricity escalation formula: Rt = Base_Rate * (1 + Inflation)^(t-1)", () => {
    const result = calculateSolarPayback(defaultInputs);
    const schedule = result.cashFlowSchedule;

    // Year 1: base rate $0.32
    expect(schedule[0].electricityRate).toBeCloseTo(0.32, 2);

    // Year 5: 0.32 * (1 + 0.04)^4 = 0.37435
    const expectedY5Rate = 0.32 * Math.pow(1.04, 4);
    expect(schedule[4].electricityRate).toBeCloseTo(expectedY5Rate, 3);

    // Year 25: 0.32 * (1.04)^24 = 0.82026
    const expectedY25Rate = 0.32 * Math.pow(1.04, 24);
    expect(schedule[24].electricityRate).toBeCloseTo(expectedY25Rate, 3);
  });

  it("verifies Levelized Cost of Energy (LCOE = Capex / Lifetime kWh)", () => {
    const result = calculateSolarPayback(defaultInputs);

    const calculatedLcoe = defaultInputs.systemCapex / result.lifetimeTotalKwh;
    expect(result.lcoePerKwh).toBeCloseTo(calculatedLcoe, 3);
    // Solar LCOE should be substantially cheaper than grid retail rate $0.32/kWh
    expect(result.lcoePerKwh).toBeLessThan(0.08);
    expect(result.lcoePerKwh).toBeGreaterThan(0.02);
  });

  it("verifies 10-Yr, 20-Yr, and 25-Yr Cumulative Savings and ROI", () => {
    const result = calculateSolarPayback(defaultInputs);

    expect(result.cumulativeSavings10Yr).toBeGreaterThan(defaultInputs.systemCapex);
    expect(result.cumulativeSavings20Yr).toBeGreaterThan(result.cumulativeSavings10Yr);
    expect(result.cumulativeSavings25Yr).toBeGreaterThan(result.cumulativeSavings20Yr);

    // Net profit = 25-yr cumulative - capex
    expect(result.cumulativeNetProfit25Yr).toBe(result.cumulativeSavings25Yr - defaultInputs.systemCapex);

    // ROI % is positive and increasing
    expect(result.roi10Yr).toBeGreaterThan(100);
    expect(result.roi25Yr).toBeGreaterThan(result.roi10Yr);
  });

  it("verifies Net Present Value (NPV) and IRR calculation convergence", () => {
    const result = calculateSolarPayback(defaultInputs);

    expect(result.npv).toBeGreaterThan(0);
    expect(result.irr).toBeGreaterThan(15); // Robust returns for high utility rate $0.32
    expect(result.irr).toBeLessThan(100);
  });

  it("compares 1:1 Full Retail NEM vs Avoided Cost vs Off-Grid", () => {
    const fullNem = calculateSolarPayback({ ...defaultInputs, netMeteringType: "full_nem" });
    const avoidedCost = calculateSolarPayback({ ...defaultInputs, netMeteringType: "avoided_cost" });
    const offGrid = calculateSolarPayback({ ...defaultInputs, netMeteringType: "off_grid_self" });

    // Full NEM generates highest savings
    expect(fullNem.year1Savings).toBeGreaterThanOrEqual(avoidedCost.year1Savings);
    expect(avoidedCost.year1Savings).toBeGreaterThanOrEqual(offGrid.year1Savings);

    // Payback is fastest under Full NEM
    expect(fullNem.paybackYears).toBeLessThanOrEqual(avoidedCost.paybackYears);
  });

  it("correctly models the advantage of battery storage in Avoided Cost (NEM 3.0)", () => {
    // Under NEM 3.0 without battery, surplus is sold at low avoided rates
    const withBattery = calculateSolarPayback({
      ...defaultInputs,
      netMeteringType: "avoided_cost",
      batteryStorageKwh: 30,
      hasBattery: true,
    });

    const withoutBattery = calculateSolarPayback({
      ...defaultInputs,
      netMeteringType: "avoided_cost",
      batteryStorageKwh: 0,
      hasBattery: false,
    });

    // With battery, effective savings per kWh are significantly higher under NEM 3.0
    expect(withBattery.avoidedRateEffective).toBeGreaterThan(withoutBattery.avoidedRateEffective);
  });

  it("handles edge cases: zero inflation and high capex", () => {
    const zeroInflation = calculateSolarPayback({
      ...defaultInputs,
      utilityEscalation: 0,
    });

    expect(zeroInflation.cashFlowSchedule[0].electricityRate).toBe(0.32);
    expect(zeroInflation.cashFlowSchedule[24].electricityRate).toBe(0.32);
    expect(zeroInflation.isPaybackAchieved).toBe(true);

    const veryHighCapex = calculateSolarPayback({
      ...defaultInputs,
      systemCapex: 200000,
    });
    expect(veryHighCapex.isPaybackAchieved).toBe(false);
    expect(veryHighCapex.paybackExactText).toContain("> 25 Years");
  });

  it("correctly models Federal ITC tax credit deduction", () => {
    const withItc = calculateSolarPayback({
      ...defaultInputs,
      systemCapex: 11000, // net
      itcEligible: true,
      itcRate: 0.30,
    });

    // Gross capex = 11000 / (1 - 0.30) = ~15,714
    expect(withItc.grossCapex).toBeCloseTo(15714, -1);
    expect(withItc.federalTaxCreditAmount).toBeCloseTo(4714, -1);
  });
});

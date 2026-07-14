// Tax-layer extension for the DSF model (not a rebuild — layered on top).
// Implements company-level tax (already in companyModel.tau),
// fund-level participation-exemption toggle, and withholding tax on distributions.
// Core cooperative waterfall logic is reproduced here so the original is not modified.

import type { CoopParams } from "./cooperativeModel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FundTaxMode = "equity_exempt" | "taxable";
export type RedemptionCharacter = "equity" | "debt_like";

export type TaxParams = {
  companyTaxRate: number;           // τ — company EBIT tax rate (0–1)
  fundTaxMode: FundTaxMode;         // participation exemption or taxable
  fundTaxRate: number;              // rate applied if mode = taxable (0–1)
  redemptionCharacter: RedemptionCharacter; // equity → exempt pathway; debt_like → taxable
  withholdingTaxRate: number;       // applied to gross distributions to investors (0–1)
};

export const TAX_DEFAULTS: TaxParams = {
  companyTaxRate: 0.25,
  fundTaxMode: "equity_exempt",
  fundTaxRate: 0.25,
  redemptionCharacter: "equity",
  withholdingTaxRate: 0.0,
};

export type TaxYearResult = {
  t: number;
  GrossProceeds: number;
  CoopOpex: number;
  DSNPV: number;
  NetIncomeBeforeFundTax: number;
  FundTax: number;
  NetAfterFundTax: number;
  ReinvestFund: number;
  DistPoolGross: number;
  WithholdingTax: number;
  DistPoolNet: number;
  Eclose: number;
};

export type TaxSummary = {
  totalGross: number;
  totalFundTax: number;
  totalWithholdingTax: number;
  totalCompanyTax: number;
  totalGrossDist: number;
  totalNetDist: number;
  taxLeakagePct: number;
  netInvestorMultiple: number;
};

export type ScenarioResult = {
  label: string;
  description: string;
  character: RedemptionCharacter;
  fundTaxRate: number;
  withholdingRate: number;
  rows: TaxYearResult[];
  summary: TaxSummary;
  yearToInvestorCap: number | null;
};

// ---------------------------------------------------------------------------
// Core simulation — wraps cooperative waterfall with dynamic tax logic.
// Original simulateCooperative is not modified.
// ---------------------------------------------------------------------------

export function simulateWithTax(
  coop: CoopParams,
  tax: TaxParams,
  redemptionStream: number[],
): TaxYearResult[] {
  const out: TaxYearResult[] = [];
  let E = coop.E0_target;
  let loanBalance = coop.L_NPV;
  const principalPerYear = coop.Tloan > 0 ? coop.L_NPV / coop.Tloan : 0;

  // Effective fund tax rate: 0 if equity structure achieves participation exemption.
  const effectiveFundRate =
    tax.fundTaxMode === "equity_exempt" || tax.redemptionCharacter === "equity"
      ? 0
      : tax.fundTaxRate;

  for (let t = 0; t < coop.yearsToSim; t++) {
    const redInflow = redemptionStream[t] ?? 0;
    const liquidation = coop.liquidationProceeds[t] ?? 0;
    const other = coop.otherProceeds[t] ?? 0;
    const GrossProceeds = redInflow + liquidation + other;

    const IntNPV = loanBalance > 0 ? loanBalance * coop.iNPV : 0;
    const PrinNPV = Math.min(loanBalance, principalPerYear);
    const DSNPV = IntNPV + PrinNPV;

    const CoopOpex = coop.coopOpex;
    // NetIncome before fund tax = Gross − operating costs − debt service
    const NetIncomeBeforeFundTax = Math.max(
      0,
      GrossProceeds - CoopOpex - coop.liabOther - DSNPV,
    );

    const FundTax = effectiveFundRate * NetIncomeBeforeFundTax;
    const NetAfterFundTax = Math.max(0, NetIncomeBeforeFundTax - FundTax);

    const AvailAfterReserve = Math.max(0, NetAfterFundTax - coop.reserveAlloc);
    const etaPolicy = t <= coop.earlySplit ? coop.etaEarly : coop.etaLate;
    const targetFloor = Math.max(0, coop.E_target - E);
    const reinvestFloor = Math.max(etaPolicy * AvailAfterReserve, targetFloor);
    const ReinvestFund = Math.min(AvailAfterReserve, reinvestFloor);

    const DistPoolGross = AvailAfterReserve - ReinvestFund;
    const WithholdingTax = tax.withholdingTaxRate * DistPoolGross;
    const DistPoolNet = DistPoolGross - WithholdingTax;

    const newDeploy = coop.newDeploy[t] ?? 0;
    const Eclose = Math.max(0, E + ReinvestFund - newDeploy);

    out.push({
      t,
      GrossProceeds,
      CoopOpex,
      DSNPV,
      NetIncomeBeforeFundTax,
      FundTax,
      NetAfterFundTax,
      ReinvestFund,
      DistPoolGross,
      WithholdingTax,
      DistPoolNet,
      Eclose,
    });

    E = Eclose;
    loanBalance = Math.max(0, loanBalance - PrinNPV);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Summary aggregation
// ---------------------------------------------------------------------------

export function computeTaxSummary(
  rows: TaxYearResult[],
  totalCompanyTax: number,
  totalMemberCapital: number,
): TaxSummary {
  const totalGross = rows.reduce((s, r) => s + r.GrossProceeds, 0);
  const totalFundTax = rows.reduce((s, r) => s + r.FundTax, 0);
  const totalWithholdingTax = rows.reduce((s, r) => s + r.WithholdingTax, 0);
  const totalGrossDist = rows.reduce((s, r) => s + r.DistPoolGross, 0);
  const totalNetDist = rows.reduce((s, r) => s + r.DistPoolNet, 0);
  // Leakage = fund-level drag only (company tax is already embedded in the redemption
  // stream — it reduces FCF before Red is computed, so it's not a "fund" leak).
  const fundLevelTax = totalFundTax + totalWithholdingTax;
  const taxLeakagePct = totalGross > 0 ? fundLevelTax / totalGross : 0;
  const netInvestorMultiple =
    totalMemberCapital > 0 ? totalNetDist / totalMemberCapital : 0;

  return {
    totalGross,
    totalFundTax,
    totalWithholdingTax,
    totalCompanyTax,
    totalGrossDist,
    totalNetDist,
    taxLeakagePct,
    netInvestorMultiple,
  };
}

// ---------------------------------------------------------------------------
// Scenario runner — always runs both scenarios for side-by-side comparison.
// ---------------------------------------------------------------------------

export function runScenarios(
  coop: CoopParams,
  tax: TaxParams,
  redemptionStream: number[],
  totalCompanyTax: number,
  totalMemberCapital: number,
): [ScenarioResult, ScenarioResult] {
  // Scenario A: true equity / participation exemption
  const taxA: TaxParams = {
    ...tax,
    fundTaxMode: "equity_exempt",
    redemptionCharacter: "equity",
    withholdingTaxRate: 0,
  };
  const rowsA = simulateWithTax(coop, taxA, redemptionStream);
  const sumA = computeTaxSummary(rowsA, totalCompanyTax, totalMemberCapital);

  // Scenario B: debt-like characterisation — user's rates
  const taxB: TaxParams = {
    ...tax,
    fundTaxMode: "taxable",
    redemptionCharacter: "debt_like",
  };
  const rowsB = simulateWithTax(coop, taxB, redemptionStream);
  const sumB = computeTaxSummary(rowsB, totalCompanyTax, totalMemberCapital);

  const yearCapA = findYearToInvestorCap(rowsA, totalMemberCapital, coop.members[0]?.rCap ?? 3);
  const yearCapB = findYearToInvestorCap(rowsB, totalMemberCapital, coop.members[0]?.rCap ?? 3);

  return [
    {
      label: "True equity structure",
      description: "Participation exemption applies. Fund income is 0% taxed. No withholding.",
      character: "equity",
      fundTaxRate: 0,
      withholdingRate: 0,
      rows: rowsA,
      summary: sumA,
      yearToInvestorCap: yearCapA,
    },
    {
      label: "Debt-like characterisation",
      description: `Tax authority views instruments as debt. Fund tax ${(tax.fundTaxRate * 100).toFixed(0)}% + WHT ${(tax.withholdingTaxRate * 100).toFixed(0)}%.`,
      character: "debt_like",
      fundTaxRate: tax.fundTaxRate,
      withholdingRate: tax.withholdingTaxRate,
      rows: rowsB,
      summary: sumB,
      yearToInvestorCap: yearCapB,
    },
  ];
}

function findYearToInvestorCap(
  rows: TaxYearResult[],
  totalMemberCapital: number,
  rCap: number,
): number | null {
  const cap = totalMemberCapital * rCap;
  let cum = 0;
  for (const r of rows) {
    cum += r.DistPoolNet;
    if (cum >= cap) return r.t + 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sensitivity table — varies fund tax rate from 0% to 40%
// ---------------------------------------------------------------------------

export type SensitivityRow = {
  fundTaxRate: number;
  totalFundTax: number;
  totalNetDist: number;
  netInvestorMultiple: number;
  taxLeakagePct: number;
};

export function buildSensitivityTable(
  coop: CoopParams,
  baseTax: TaxParams,
  redemptionStream: number[],
  totalCompanyTax: number,
  totalMemberCapital: number,
): SensitivityRow[] {
  const rates = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40];
  return rates.map((rate) => {
    const tax: TaxParams = {
      ...baseTax,
      fundTaxMode: rate === 0 ? "equity_exempt" : "taxable",
      redemptionCharacter: rate === 0 ? "equity" : "debt_like",
      fundTaxRate: rate,
    };
    const rows = simulateWithTax(coop, tax, redemptionStream);
    const s = computeTaxSummary(rows, totalCompanyTax, totalMemberCapital);
    return {
      fundTaxRate: rate,
      totalFundTax: s.totalFundTax,
      totalNetDist: s.totalNetDist,
      netInvestorMultiple: s.netInvestorMultiple,
      taxLeakagePct: s.taxLeakagePct,
    };
  });
}

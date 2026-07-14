// Portfolio-company simulation layer (March 2026 working paper).
// Implements the company-level state vector, FCF chain, three-layer waterfall
// (operating → resilience → conditional allocation), redemption trigger,
// and capped redemption formula from §§4–5.

export type CompanyYearInput = {
  label: string;
  N: number; // team size (FTE)
  W: number; // average annual salary (€)
  O: number; // non-payroll opex (€)
  R: number; // revenue (€)
  D: number; // depreciation (€)
  Capex: number; // capital expenditure (€)
  dNWC: number; // change in net working capital (€)
  I: number; // DSF capital injected this year (€)
};

export type CompanyParams = {
  years: CompanyYearInput[]; // index 0 = Day 1
  C0: number; // opening cash before Day 1 (€)
  tau: number; // tax rate on positive EBIT
  Lmin: number; // floor on the resilience reserve (€)
  rhoRes: number; // resilience reserve in months of CashOpex
  Sreq: number; // additional solvency / covenant minimum (€)
  kappa: number; // company-level redemption multiple κ
  gammaEarly: number; // reinvest share, t ≤ earlySplit
  gammaLate: number; // reinvest share, t ≥ earlySplit + 1
  earlySplit: number; // last "early" period index (Day 1 = 0)
  CSO: number; // steward-ownership transition cost (€), one-off, year 1
  Cinc: number; // incorporation / restructuring cost (€), one-off, year 1
};

export type CompanyYearState = {
  t: number;
  label: string;
  N: number;
  Payroll: number;
  CashOpex: number;
  Revenue: number;
  EBITDA: number;
  EBIT: number;
  Tax: number;
  Capex: number;
  dNWC: number;
  FCF: number;
  Burn: number; // monthly
  cashOpening: number; // C_t before injection
  injection: number; // I_t (gross), already net of CSO+Cinc in year 1
  cashAfterInjection: number; // C_pre = cashOpening + injection
  Lstar: number;
  ResGap: number;
  DistCash: number;
  gamma: number;
  Reinvest: number;
  RedBase: number;
  Omega: number; // running cap
  CumDeployed: number; // running ΣI
  CumRedPrev: number;
  trigger: boolean;
  Red: number;
  CumRed: number;
  cashClosing: number;
  alive: boolean; // C_closing ≥ 0
  breakeven: boolean; // EBITDA ≥ 0
};

export type CompanyOutput = {
  rows: CompanyYearState[];
  totalDeployed: number;
  totalRedeemed: number;
  capOmega: number;
  yearOfBreakeven: number | null;
  yearOfFirstRedemption: number | null;
  peakBurnMonthly: number;
  minCash: number;
  // Steward-ownership transition: gross vs net usable capital in year 1
  netUsableYear1: number;
  grossYear1: number;
  inetDeduction: number;
};

export function simulateCompany(p: CompanyParams): CompanyOutput {
  const rows: CompanyYearState[] = [];
  let cash = p.C0;
  let cumRed = 0;
  let cumDeployed = 0;
  let firstRed: number | null = null;
  let firstBreak: number | null = null;
  let peakBurn = 0;
  let minCash = p.C0;

  const grossYear1 = p.years[1]?.I ?? 0;
  const inetDeduction = p.CSO + p.Cinc;
  const netUsableYear1 = Math.max(0, grossYear1 - inetDeduction);

  for (let t = 0; t < p.years.length; t++) {
    const y = p.years[t];

    const Payroll = y.N * y.W;
    const CashOpex = Payroll + y.O;
    const EBITDA = y.R - CashOpex;
    const EBIT = EBITDA - y.D;
    const Tax = p.tau * Math.max(0, EBIT);
    const FCF = EBITDA - Tax - y.Capex - y.dNWC;
    const Burn = (CashOpex - y.R) / 12;
    if (Burn > peakBurn) peakBurn = Burn;

    // Steward-ownership transition is deducted from year 1's usable capital.
    const transitionCost = t === 1 ? inetDeduction : 0;
    const cashOpening = cash;
    const injection = y.I;
    const usableInjection = injection - transitionCost;
    const cashAfterInjection = cashOpening + usableInjection;
    cumDeployed += injection;

    const Lstar = Math.max(p.Lmin, (p.rhoRes * CashOpex) / 12, p.Sreq);
    const ResGap = Math.max(0, Lstar - (cashAfterInjection + FCF));
    const DistCash = Math.max(0, FCF - ResGap);

    const gamma = t <= p.earlySplit ? p.gammaEarly : p.gammaLate;
    const Reinvest = gamma * DistCash;
    const RedBase = (1 - gamma) * DistCash;

    const Omega = p.kappa * cumDeployed;
    const cumRedPrev = cumRed;
    const trigger = EBITDA > 0 && DistCash > 0 && cumRedPrev < Omega;
    const Red = trigger ? Math.min(RedBase, Omega - cumRedPrev) : 0;
    const cumRedNew = cumRedPrev + Red;

    const cashClosing = cashAfterInjection + FCF - Red;
    const alive = cashClosing >= 0;
    const breakeven = EBITDA >= 0;
    if (breakeven && firstBreak === null) firstBreak = t;
    if (Red > 0 && firstRed === null) firstRed = t;
    if (cashClosing < minCash) minCash = cashClosing;

    rows.push({
      t,
      label: y.label,
      N: y.N,
      Payroll,
      CashOpex,
      Revenue: y.R,
      EBITDA,
      EBIT,
      Tax,
      Capex: y.Capex,
      dNWC: y.dNWC,
      FCF,
      Burn,
      cashOpening,
      injection: usableInjection,
      cashAfterInjection,
      Lstar,
      ResGap,
      DistCash,
      gamma,
      Reinvest,
      RedBase,
      Omega,
      CumDeployed: cumDeployed,
      CumRedPrev: cumRedPrev,
      trigger,
      Red,
      CumRed: cumRedNew,
      cashClosing,
      alive,
      breakeven,
    });

    cash = cashClosing;
    cumRed = cumRedNew;
  }

  return {
    rows,
    totalDeployed: cumDeployed,
    totalRedeemed: cumRed,
    capOmega: p.kappa * cumDeployed,
    yearOfBreakeven: firstBreak,
    yearOfFirstRedemption: firstRed,
    peakBurnMonthly: peakBurn,
    minCash,
    netUsableYear1,
    grossYear1,
    inetDeduction,
  };
}

// ----------------------------------------------------------------------------
// Archetype presets (§6) and the illustrative deterministic example (§12).
// ----------------------------------------------------------------------------

export type Archetype = {
  id: "I" | "II" | "III" | "ILLUSTRATIVE";
  name: string;
  blurb: string;
  params: CompanyParams;
};

const baseGov = {
  C0: 100_000,
  tau: 0.25,
  Lmin: 50_000,
  rhoRes: 3,
  Sreq: 0,
  kappa: 2.0,
  gammaEarly: 0.8,
  gammaLate: 0.6,
  earlySplit: 3,
  CSO: 25_000,
  Cinc: 15_000,
};

// §12 illustrative deterministic example (κ = 2.0, γ = 60% in Y3+, τ = 25%).
export const ILLUSTRATIVE_EXAMPLE: CompanyParams = {
  ...baseGov,
  kappa: 2.0,
  gammaEarly: 1.0, // PDF: no redemption in early years; reinvest all
  gammaLate: 0.6,
  earlySplit: 2, // late starts at Y3 (index 3) — γ_late applies from Y3 onward
  // C0 and D per the working paper's §12 assumptions (stated explicitly as
  // of paper v4.1, 2 July 2026). Acceptance: Y3 Tax/FCF/ResGap/Red =
  // 85k/163k/40k/49.2k; Y4 Tax/FCF/ResGap/Red = 224k/532k/0/212.8k;
  // cash positive every year (Day 1 ≈ 17k), alive throughout;
  // cumulative redeemed ≈ 262k (cap Ω = 1,500k).
  C0: 283_000,
  Lmin: 0,
  rhoRes: 3,
  CSO: 0,
  Cinc: 0,
  years: [
    { label: "Day 1", N: 3, W: 95_333, O: 0, R: 40_000, D: 0, Capex: 20_000, dNWC: 0, I: 0 },
    { label: "Year 1", N: 5, W: 96_000, O: 0, R: 180_000, D: 0, Capex: 35_000, dNWC: 10_000, I: 400_000 },
    { label: "Year 2", N: 8, W: 96_500, O: 0, R: 520_000, D: 0, Capex: 60_000, dNWC: 20_000, I: 350_000 },
    { label: "Year 3", N: 12, W: 97_667, O: 0, R: 1_550_000, D: 38_000, Capex: 90_000, dNWC: 40_000, I: 0 },
    { label: "Year 4", N: 18, W: 96_889, O: 0, R: 2_700_000, D: 60_000, Capex: 120_000, dNWC: 80_000, I: 0 },
  ],
};

// Archetype I — Infrastructure Core: small senior team, slow ramp, longer to FCF.
const ARCH_I: CompanyParams = {
  ...baseGov,
  kappa: 1.8,
  gammaEarly: 0.85,
  gammaLate: 0.7,
  earlySplit: 3,
  C0: 80_000,
  years: [
    { label: "Day 1", N: 2, W: 90_000, O: 30_000, R: 20_000, D: 0, Capex: 10_000, dNWC: 0, I: 0 },
    { label: "Year 1", N: 4, W: 92_000, O: 60_000, R: 80_000, D: 5_000, Capex: 25_000, dNWC: 5_000, I: 350_000 },
    { label: "Year 2", N: 6, W: 94_000, O: 90_000, R: 240_000, D: 8_000, Capex: 35_000, dNWC: 10_000, I: 350_000 },
    { label: "Year 3", N: 9, W: 96_000, O: 130_000, R: 700_000, D: 12_000, Capex: 50_000, dNWC: 25_000, I: 200_000 },
    { label: "Year 4", N: 12, W: 98_000, O: 170_000, R: 1_300_000, D: 15_000, Capex: 60_000, dNWC: 40_000, I: 0 },
  ],
};

// Archetype II — Service & Integration: faster paying customers, steady margins.
const ARCH_II: CompanyParams = {
  ...baseGov,
  kappa: 2.2,
  gammaEarly: 0.75,
  gammaLate: 0.55,
  earlySplit: 2,
  C0: 100_000,
  years: [
    { label: "Day 1", N: 3, W: 80_000, O: 40_000, R: 60_000, D: 0, Capex: 15_000, dNWC: 0, I: 0 },
    { label: "Year 1", N: 5, W: 82_000, O: 80_000, R: 250_000, D: 4_000, Capex: 30_000, dNWC: 10_000, I: 400_000 },
    { label: "Year 2", N: 9, W: 84_000, O: 130_000, R: 700_000, D: 8_000, Capex: 45_000, dNWC: 25_000, I: 300_000 },
    { label: "Year 3", N: 14, W: 86_000, O: 200_000, R: 1_500_000, D: 12_000, Capex: 70_000, dNWC: 40_000, I: 0 },
    { label: "Year 4", N: 20, W: 88_000, O: 280_000, R: 2_600_000, D: 18_000, Capex: 90_000, dNWC: 60_000, I: 0 },
  ],
};

// Archetype III — Scalable Platform / Product: stronger upside, higher early burn.
const ARCH_III: CompanyParams = {
  ...baseGov,
  kappa: 2.5,
  gammaEarly: 0.85,
  gammaLate: 0.55,
  earlySplit: 3,
  C0: 150_000,
  years: [
    { label: "Day 1", N: 4, W: 95_000, O: 60_000, R: 50_000, D: 0, Capex: 25_000, dNWC: 0, I: 0 },
    { label: "Year 1", N: 7, W: 97_000, O: 110_000, R: 200_000, D: 6_000, Capex: 50_000, dNWC: 15_000, I: 600_000 },
    { label: "Year 2", N: 12, W: 99_000, O: 180_000, R: 700_000, D: 12_000, Capex: 70_000, dNWC: 35_000, I: 500_000 },
    { label: "Year 3", N: 18, W: 101_000, O: 270_000, R: 1_900_000, D: 20_000, Capex: 100_000, dNWC: 60_000, I: 250_000 },
    { label: "Year 4", N: 25, W: 103_000, O: 380_000, R: 3_600_000, D: 28_000, Capex: 140_000, dNWC: 90_000, I: 0 },
  ],
};

export const ARCHETYPES: Archetype[] = [
  {
    id: "ILLUSTRATIVE",
    name: "§12 illustrative example",
    blurb: "Stylised company from the working paper. κ = 2.0, γ_late = 60%, τ = 25%.",
    params: ILLUSTRATIVE_EXAMPLE,
  },
  {
    id: "I",
    name: "Infrastructure Core",
    blurb: "Small senior team, slow revenue ramp, longer path to operating self-sufficiency.",
    params: ARCH_I,
  },
  {
    id: "II",
    name: "Service & Integration",
    blurb: "Faster paying customers, clearer unit economics, medium growth.",
    params: ARCH_II,
  },
  {
    id: "III",
    name: "Scalable Platform / Product",
    blurb: "Stronger upside, higher hiring complexity, more volatile outcomes.",
    params: ARCH_III,
  },
];

export const fmtEURcompact = (x: number) => {
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `€${(x / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `€${(x / 1_000).toFixed(0)}k`;
  return `€${x.toFixed(0)}`;
};

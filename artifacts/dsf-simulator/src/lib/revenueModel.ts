/**
 * revenueModel.ts
 * Pure computation: non-extractive open-source revenue model simulation.
 *
 * Five canonical models, each expressed as a parametric year-by-year function.
 * Output feeds into FCF + DSF redemption-gate analysis.
 */

// ── Model taxonomy ─────────────────────────────────────────────────────────────

export type RevenueModelType =
  | "subscription"
  | "implementation"
  | "advisory"
  | "procurement"
  | "managed_services";

export const ALL_MODEL_TYPES: RevenueModelType[] = [
  "subscription",
  "implementation",
  "advisory",
  "procurement",
  "managed_services",
];

export const MODEL_META: Record<
  RevenueModelType,
  {
    label: string;
    tagline: string;
    unit: string;      // what "units" means for this model
    formula: string;   // human-readable formula
    stability: "very high" | "high" | "medium" | "lower";
    speed: "slow" | "medium" | "fast";
    scalability: "low" | "medium" | "high" | "very high";
    color: string;
  }
> = {
  subscription: {
    label: "Subscription",
    tagline: "Recurring annual fee per organisation — not per user",
    unit: "orgs",
    formula: "Orgs × Annual fee",
    stability: "very high",
    speed: "medium",
    scalability: "very high",
    color: "hsl(235 85% 72%)",
  },
  implementation: {
    label: "Implementation",
    tagline: "Project-based B2B delivery — scoped, shipped, invoiced",
    unit: "projects",
    formula: "Projects/yr × Avg project value",
    stability: "medium",
    speed: "fast",
    scalability: "medium",
    color: "hsl(148 58% 55%)",
  },
  advisory: {
    label: "Advisory",
    tagline: "Expert consulting — consultants × utilisation × day rate",
    unit: "consultants",
    formula: "Consultants × Utilisation × Day rate × 220 days",
    stability: "high",
    speed: "fast",
    scalability: "low",
    color: "hsl(270 58% 70%)",
  },
  procurement: {
    label: "Procurement",
    tagline: "Public / institutional contracts — strategic, high-value, slow to close",
    unit: "contracts",
    formula: "Contracts × Avg contract value",
    stability: "lower",
    speed: "slow",
    scalability: "high",
    color: "hsl(38 92% 58%)",
  },
  managed_services: {
    label: "Managed Services",
    tagline: "Hosting & operations — lowest churn, highest predictability",
    unit: "clients",
    formula: "Clients × Monthly fee × 12",
    stability: "very high",
    speed: "slow",
    scalability: "high",
    color: "hsl(180 55% 52%)",
  },
};

// ── Per-model parameter types ──────────────────────────────────────────────────

export interface SubscriptionParams {
  initialOrgs: number;          // organisations at year 1
  newOrgsPerYear: number;       // new sign-ups per year (flat + growth)
  orgGrowthRate: number;        // annual growth in new-org acquisition (0–1)
  annualChurnRate: number;      // fraction of orgs lost per year (0–1)
  subscriptionFeeAnnual: number; // € per org per year
}

export interface ImplementationParams {
  initialProjectsPerYear: number; // projects delivered in year 1
  projectGrowthRate: number;      // annual growth rate of project count (0–1)
  avgProjectValue: number;        // € per project
  deliveryCapacityGrowth: number; // annual growth in delivery capacity (0–1)
}

export interface AdvisoryParams {
  initialConsultants: number;    // billable FTE at year 1
  hiresPerYear: number;          // additional FTE hired each year
  targetUtilisation: number;     // target billable fraction (0–1)
  rampUpYears: number;           // years to reach target utilisation
  dayRate: number;               // € per consultant per day
  workingDaysPerYear: number;    // typically 220
}

export interface ProcurementParams {
  initialContracts: number;         // contracts won in year 1
  contractsGrowthPerYear: number;   // additional contracts per year
  avgContractValue: number;         // € per contract
  procurementAccessFactor: number;  // 0–1: how favourable the environment is
  winRate: number;                  // fraction of bids won (0–1)
}

export interface ManagedServicesParams {
  initialClients: number;        // clients at year 1
  newClientsPerYear: number;     // new clients signed per year
  clientGrowthRate: number;      // annual growth in new-client acquisition
  annualChurnRate: number;       // fraction of clients lost per year
  monthlyFeePerClient: number;   // € per client per month
}

// ── Default parameters ────────────────────────────────────────────────────────

export const DEFAULT_SUBSCRIPTION: SubscriptionParams = {
  initialOrgs: 5,
  newOrgsPerYear: 8,
  orgGrowthRate: 0.15,
  annualChurnRate: 0.10,
  subscriptionFeeAnnual: 12000,
};

export const DEFAULT_IMPLEMENTATION: ImplementationParams = {
  initialProjectsPerYear: 3,
  projectGrowthRate: 0.30,
  avgProjectValue: 75000,
  deliveryCapacityGrowth: 0.20,
};

export const DEFAULT_ADVISORY: AdvisoryParams = {
  initialConsultants: 2,
  hiresPerYear: 1,
  targetUtilisation: 0.68,
  rampUpYears: 2,
  dayRate: 1200,
  workingDaysPerYear: 220,
};

export const DEFAULT_PROCUREMENT: ProcurementParams = {
  initialContracts: 1,
  contractsGrowthPerYear: 0.7,
  avgContractValue: 250000,
  procurementAccessFactor: 0.70,
  winRate: 0.35,
};

export const DEFAULT_MANAGED_SERVICES: ManagedServicesParams = {
  initialClients: 3,
  newClientsPerYear: 4,
  clientGrowthRate: 0.10,
  annualChurnRate: 0.07,
  monthlyFeePerClient: 2500,
};

// ── Shared opex + DSF parameters ─────────────────────────────────────────────

export interface OpexConfig {
  fixedOpexAnnual: number;   // €/yr — team + base costs (grows at opexGrowthRate)
  opexGrowthRate: number;    // annual growth in fixed opex (headcount etc.)
  variableOpexRate: number;  // fraction of revenue (delivery, infra)
  taxRate: number;           // corporate tax on EBITDA > 0
  reserveFloor: number;      // resilience reserve floor €/yr (L*)
  dsfInvestment: number;     // total DSF capital injection €
  kappa: number;             // cap multiple κ → Ω = κ × I
}

export const DEFAULT_OPEX: OpexConfig = {
  fixedOpexAnnual: 280_000,
  opexGrowthRate: 0.08,
  variableOpexRate: 0.15,
  taxRate: 0.25,
  reserveFloor: 70_000,
  dsfInvestment: 400_000,
  kappa: 2.5,
};

// ── Row output ────────────────────────────────────────────────────────────────

export interface RevenueRow {
  year: number;
  label: string;
  units: number;          // orgs / projects / consultants / contracts / clients
  unitRevenue: number;    // avg revenue per unit this year
  revenue: number;        // gross revenue €
  fixedOpex: number;
  variableOpex: number;
  totalOpex: number;
  ebitda: number;
  tax: number;
  fcf: number;
  cumFcf: number;
  redeemable: number;     // FCF above reserve floor (≥ 0)
  cumRedeemable: number;
}

export interface SimResult {
  modelType: RevenueModelType;
  rows: RevenueRow[];
  // Key metrics
  breakEvenYear: number | null;       // first year EBITDA ≥ 0
  fcfPositiveYear: number | null;     // first year FCF ≥ 0
  redemptionReadyYear: number | null; // first year cumRedeemable ≥ reserveFloor
  fullRepayYear: number | null;       // first year cumRedeemable ≥ Ω
  year5Revenue: number;
  year10Revenue: number;
  peakRevenue: number;
  totalRevenue: number;
  totalFcf: number;
  totalRedeemable: number;
  stabilityScore: number;  // 0–1 (1 = perfectly stable)
  cagr5: number;           // revenue CAGR years 1–5
  cagr10: number;          // revenue CAGR years 1–10
  omega: number;           // redemption cap = κ × DSF investment
}

// ── Raw revenue simulators ────────────────────────────────────────────────────

function simSubscription(
  p: SubscriptionParams,
  horizon: number,
): { units: number; revenue: number }[] {
  let orgs = p.initialOrgs;
  let acqPerYear = p.newOrgsPerYear;
  return Array.from({ length: horizon }, () => {
    orgs = orgs * (1 - p.annualChurnRate) + acqPerYear;
    acqPerYear *= 1 + p.orgGrowthRate;
    return { units: Math.max(0, orgs), revenue: Math.max(0, orgs) * p.subscriptionFeeAnnual };
  });
}

function simImplementation(
  p: ImplementationParams,
  horizon: number,
): { units: number; revenue: number }[] {
  let projects = p.initialProjectsPerYear;
  return Array.from({ length: horizon }, (_, i) => {
    if (i > 0) projects *= 1 + Math.min(p.projectGrowthRate, p.deliveryCapacityGrowth);
    return { units: projects, revenue: projects * p.avgProjectValue };
  });
}

function simAdvisory(
  p: AdvisoryParams,
  horizon: number,
): { units: number; revenue: number }[] {
  let consultants = p.initialConsultants;
  return Array.from({ length: horizon }, (_, i) => {
    if (i > 0) consultants += p.hiresPerYear;
    // Utilisation ramps up over rampUpYears, then holds
    const util = Math.min(
      p.targetUtilisation,
      p.targetUtilisation * ((i + 1) / Math.max(1, p.rampUpYears)),
    );
    const revenue = consultants * util * p.dayRate * p.workingDaysPerYear;
    return { units: consultants, revenue };
  });
}

function simProcurement(
  p: ProcurementParams,
  horizon: number,
): { units: number; revenue: number }[] {
  return Array.from({ length: horizon }, (_, i) => {
    // Contracts grow linearly, scaled by access factor and win rate
    const rawContracts = p.initialContracts + p.contractsGrowthPerYear * i;
    const contracts = rawContracts * p.procurementAccessFactor * (p.winRate / 0.35); // normalised
    return { units: Math.max(0, contracts), revenue: Math.max(0, contracts) * p.avgContractValue };
  });
}

function simManagedServices(
  p: ManagedServicesParams,
  horizon: number,
): { units: number; revenue: number }[] {
  let clients = p.initialClients;
  let acqPerYear = p.newClientsPerYear;
  return Array.from({ length: horizon }, () => {
    clients = clients * (1 - p.annualChurnRate) + acqPerYear;
    acqPerYear *= 1 + p.clientGrowthRate;
    return { units: Math.max(0, clients), revenue: Math.max(0, clients) * p.monthlyFeePerClient * 12 };
  });
}

// ── FCF builder ───────────────────────────────────────────────────────────────

function buildResult(
  modelType: RevenueModelType,
  raw: { units: number; revenue: number }[],
  opex: OpexConfig,
): SimResult {
  const omega = opex.dsfInvestment * opex.kappa;
  let cumFcf = 0;
  let cumRedeemable = 0;
  let fixedOpex = opex.fixedOpexAnnual;

  const rows: RevenueRow[] = raw.map(({ units, revenue }, i) => {
    const year = i + 1;
    if (i > 0) fixedOpex *= 1 + opex.opexGrowthRate;
    const variableOpex = revenue * opex.variableOpexRate;
    const totalOpex = fixedOpex + variableOpex;
    const ebitda = revenue - totalOpex;
    const tax = Math.max(0, ebitda) * opex.taxRate;
    const fcf = ebitda - tax;
    cumFcf += fcf;
    const redeemable = Math.max(0, fcf - opex.reserveFloor);
    cumRedeemable += redeemable;
    return {
      year,
      label: `Year ${year}`,
      units,
      unitRevenue: units > 0 ? revenue / units : 0,
      revenue,
      fixedOpex,
      variableOpex,
      totalOpex,
      ebitda,
      tax,
      fcf,
      cumFcf,
      redeemable,
      cumRedeemable,
    };
  });

  const horizon = rows.length;
  const breakEvenYear = rows.find(r => r.ebitda >= 0)?.year ?? null;
  const fcfPositiveYear = rows.find(r => r.fcf >= 0)?.year ?? null;
  const redemptionReadyYear = rows.find(r => r.redeemable > 0)?.year ?? null;
  const fullRepayYear = rows.find(r => r.cumRedeemable >= omega)?.year ?? null;

  const year5Revenue = rows[4]?.revenue ?? rows[rows.length - 1]?.revenue ?? 0;
  const year10Revenue = rows[9]?.revenue ?? rows[rows.length - 1]?.revenue ?? 0;
  const peakRevenue = Math.max(...rows.map(r => r.revenue));
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalFcf = rows.reduce((s, r) => s + r.fcf, 0);
  const totalRedeemable = rows[rows.length - 1]?.cumRedeemable ?? 0;

  // Stability: coefficient of variation of revenue from year 3 onwards
  const stableRows = rows.slice(2);
  const mean = stableRows.length > 0
    ? stableRows.reduce((s, r) => s + r.revenue, 0) / stableRows.length
    : 0;
  const variance = stableRows.length > 0
    ? stableRows.reduce((s, r) => s + (r.revenue - mean) ** 2, 0) / stableRows.length
    : 0;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const stabilityScore = Math.max(0, Math.min(1, 1 / (1 + 2 * cv)));

  const r1 = rows[0]?.revenue ?? 0;
  const r5 = rows[4]?.revenue ?? 0;
  const r10 = rows[Math.min(9, horizon - 1)]?.revenue ?? 0;
  const cagr5 = r1 > 0 && r5 > 0 ? Math.pow(r5 / r1, 1 / 4) - 1 : 0;
  const cagr10 = r1 > 0 && r10 > 0 ? Math.pow(r10 / r1, 1 / 9) - 1 : 0;

  return {
    modelType,
    rows,
    breakEvenYear,
    fcfPositiveYear,
    redemptionReadyYear,
    fullRepayYear,
    year5Revenue,
    year10Revenue,
    peakRevenue,
    totalRevenue,
    totalFcf,
    totalRedeemable,
    stabilityScore,
    cagr5,
    cagr10,
    omega,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface AllModelParams {
  subscription: SubscriptionParams;
  implementation: ImplementationParams;
  advisory: AdvisoryParams;
  procurement: ProcurementParams;
  managed_services: ManagedServicesParams;
}

export const DEFAULT_ALL_PARAMS: AllModelParams = {
  subscription: DEFAULT_SUBSCRIPTION,
  implementation: DEFAULT_IMPLEMENTATION,
  advisory: DEFAULT_ADVISORY,
  procurement: DEFAULT_PROCUREMENT,
  managed_services: DEFAULT_MANAGED_SERVICES,
};

export function simulateOne(
  modelType: RevenueModelType,
  params: AllModelParams,
  opex: OpexConfig,
  horizon: number,
): SimResult {
  let raw: { units: number; revenue: number }[];
  switch (modelType) {
    case "subscription":
      raw = simSubscription(params.subscription, horizon); break;
    case "implementation":
      raw = simImplementation(params.implementation, horizon); break;
    case "advisory":
      raw = simAdvisory(params.advisory, horizon); break;
    case "procurement":
      raw = simProcurement(params.procurement, horizon); break;
    case "managed_services":
      raw = simManagedServices(params.managed_services, horizon); break;
  }
  return buildResult(modelType, raw, opex);
}

export function simulateAll(
  params: AllModelParams,
  opex: OpexConfig,
  horizon: number,
): SimResult[] {
  return ALL_MODEL_TYPES.map(t => simulateOne(t, params, opex, horizon));
}

// ── Hybrid (weighted blend of two models) ────────────────────────────────────

export function simulateHybrid(
  modelA: RevenueModelType,
  weightA: number, // fraction 0–1
  modelB: RevenueModelType,
  params: AllModelParams,
  opex: OpexConfig,
  horizon: number,
): SimResult {
  const resA = simulateOne(modelA, params, opex, horizon);
  const resB = simulateOne(modelB, params, opex, horizon);
  const wB = 1 - weightA;
  const raw = resA.rows.map((rA, i) => ({
    units: rA.units * weightA + resB.rows[i].units * wB,
    revenue: rA.revenue * weightA + resB.rows[i].revenue * wB,
  }));
  // Use subscription as the "label" model type for hybrid — caller handles display
  return buildResult(modelA, raw, opex);
}

// ── Sensitivity: opex vs revenue at break-even ────────────────────────────────

export interface SensitivityPoint {
  fixedOpex: number;
  subscriptionBE: number | null;
  implementationBE: number | null;
  advisoryBE: number | null;
  procurementBE: number | null;
  managed_servicesBE: number | null;
}

export function buildOpexSensitivity(
  params: AllModelParams,
  baseOpex: OpexConfig,
  horizon: number,
): SensitivityPoint[] {
  const steps = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  return steps.map(mult => {
    const opex = { ...baseOpex, fixedOpexAnnual: baseOpex.fixedOpexAnnual * mult };
    const results = simulateAll(params, opex, horizon);
    const pt: SensitivityPoint = { fixedOpex: opex.fixedOpexAnnual } as SensitivityPoint;
    results.forEach(r => {
      (pt as unknown as Record<string, number | null>)[`${r.modelType}BE`] = r.breakEvenYear;
    });
    return pt;
  });
}

// Cooperative-level evergreen waterfall (March 2026 working paper §11, §15).
// Maps the redemption stream Π_t = Σ Red_i,t into the cooperative waterfall:
// GrossProceeds → NetProceeds (after coop opex/tax/liabilities/NPV debt service)
// → ReserveAlloc → ReinvestFund (with E* floor) → DistPool → vintage payouts.

export type Vintage = {
  id: string;
  member: string;
  vintageLabel: string;
  K: number; // contributed capital
  units: number; // participation units
  rCap: number; // cap multiple (default 3)
};

export type CoopParams = {
  // Launch stack (§15)
  members: Vintage[];
  L_NPV: number; // initial NPV loan principal
  C_coopSetup: number;
  C_stichting: number;
  C_golden: number;
  E0_target: number; // initial evergreen reserve held back at launch
  Bfund: number; // additional cooperative buffer at launch
  G1: number; // gross first-company ticket
  C_SO: number; // company SO transition cost
  C_inc: number; // company incorporation cost

  // Per-period operating logic
  yearsToSim: number;
  coopOpex: number; // €/yr
  coopTax: number; // fixed cooperative tax line, €/yr (placeholder)
  liabOther: number; // other liabilities, €/yr
  iNPV: number; // loan interest rate
  Tloan: number; // loan term in years (straight-line principal)
  reserveAlloc: number; // periodic Board reserve allocation, €/yr
  E_target: number; // evergreen target each period
  etaEarly: number; // policy reinvest share, t ≤ earlySplit
  etaLate: number; // policy reinvest share, t ≥ earlySplit + 1
  earlySplit: number;
  newDeploy: number[]; // periodic new deployments out of evergreen
  liquidationProceeds: number[]; // optional per-year exit proceeds
  otherProceeds: number[]; // optional other realised proceeds
};

export type CoopYearState = {
  t: number;
  redInflow: number; // Π_t from companies
  liquidation: number;
  other: number;
  GrossProceeds: number;
  IntNPV: number;
  PrinNPV: number; // scheduled principal billed this year
  DSNPV: number;
  // ── Cash ledger (Fix 5; simulation framework v5.1 §11.2) ──
  coopCashOpen: number;
  coopCashClose: number;
  Def: number; // eq. 21: max(0, opex+tax+liab+DS − GrossProceeds)
  reserveRaid: number; // drawn from E to cover deficit (recorded raid)
  arrearsOpen: number; // unpaid obligations carried in (incl. loan service)
  arrearsClose: number; // cumulative outstanding after this year
  insolvent: boolean; // arrearsClose > 0 (or negative opening cash)
  principalPaid: number; // principal actually paid (arrears + scheduled)
  NetProceeds: number; // real surplus entering the waterfall (ledger-based)
  AvailAfterReserve: number;
  Eopen: number;
  Etarget: number;
  etaPolicy: number;
  reinvestFloor: number; // max(η·avail, E*-E)
  ReinvestFund: number;
  DistPool: number;
  newDeploy: number;
  Eclose: number;
  loanBalance: number; // outstanding NPV loan, net of principal actually PAID
  vintages: VintagePayoutState[];
};

export type VintagePayoutState = {
  id: string;
  member: string;
  vintageLabel: string;
  K: number;
  units: number;
  rCap: number;
  cumDistOpen: number;
  headroomOpen: number;
  provisional: number;
  paid: number;
  cumDistClose: number;
  headroomClose: number;
  status: "economic" | "exhausted";
};

export type LaunchStack = {
  Kmembers: number;
  Fgross: number;
  setupTotal: number;
  Fdeploy: number;
  G1: number;
  Inet: number;
  feasible: boolean;
  buffer: number;
};

export function computeLaunchStack(p: CoopParams): LaunchStack {
  const Kmembers = p.members.reduce((s, m) => s + m.K, 0);
  const Fgross = Kmembers + p.L_NPV;
  const setupTotal = p.C_coopSetup + p.C_stichting + p.C_golden + p.E0_target + p.Bfund;
  const Fdeploy = Fgross - setupTotal;
  const Inet = Math.max(0, p.G1 - p.C_SO - p.C_inc);
  const feasible = p.G1 <= Fdeploy;
  const buffer = Fdeploy - p.G1;
  return { Kmembers, Fgross, setupTotal, Fdeploy, G1: p.G1, Inet, feasible, buffer };
}

// Distribute DistPool pro-rata across live vintages, clip at headroom,
// then redistribute the residual across the still-live vintages until
// either all headroom is exhausted or no live vintages remain.
function distributeVintages(
  DistPool: number,
  vintageState: { id: string; member: string; vintageLabel: string; K: number; units: number; rCap: number; cumDist: number }[],
): { paid: Record<string, number>; provisional: Record<string, number>; residual: number } {
  const paid: Record<string, number> = {};
  const provisional: Record<string, number> = {};
  vintageState.forEach((v) => {
    paid[v.id] = 0;
    provisional[v.id] = 0;
  });

  let pool = DistPool;
  const local = vintageState.map((v) => ({
    ...v,
    headroom: Math.max(0, v.rCap * v.K - v.cumDist),
  }));

  // First pass — record provisional pro-rata amount before headroom clipping.
  const liveTotalUnitsInit = local.filter((v) => v.headroom > 0).reduce((s, v) => s + v.units, 0);
  if (liveTotalUnitsInit > 0) {
    local.forEach((v) => {
      if (v.headroom > 0) {
        provisional[v.id] = (v.units / liveTotalUnitsInit) * DistPool;
      }
    });
  }

  // Iteratively split the pool, residuals roll into next pass.
  for (let pass = 0; pass < 10 && pool > 1e-6; pass++) {
    const live = local.filter((v) => v.headroom > 1e-6);
    const totalUnits = live.reduce((s, v) => s + v.units, 0);
    if (totalUnits <= 0) break;
    let consumed = 0;
    for (const v of live) {
      const share = (v.units / totalUnits) * pool;
      const give = Math.min(share, v.headroom);
      paid[v.id] += give;
      v.headroom -= give;
      consumed += give;
    }
    if (consumed <= 1e-6) break;
    pool -= consumed;
  }

  return { paid, provisional, residual: Math.max(0, pool) };
}

export function simulateCooperative(
  p: CoopParams,
  redemptionStream: number[],
): CoopYearState[] {
  const out: CoopYearState[] = [];
  let E = p.E0_target;
  let loanBalance = p.L_NPV;
  const vintageCum: Record<string, number> = {};
  p.members.forEach((m) => {
    vintageCum[m.id] = 0;
  });

  const principalPerYear = p.Tloan > 0 ? p.L_NPV / p.Tloan : 0;

  // ── Cash ledger state (Fix 5; simulation framework v5.1 §11.2) ──────────
  // Opening cooperative cash = the launch buffer: C_coop_0 = B_fund + (F_deploy − G_1)
  // (paper eq. before eq. 21). Deficits are met in order from coopCash, then
  // from the evergreen pot E (a recorded reserve raid), with any remainder
  // accruing as arrears — INCLUDING unpayable loan service, which no longer
  // amortizes silently: loanBalance falls only by principal actually paid,
  // so interest keeps accruing on the true outstanding balance, and unpaid
  // scheduled principal sits in arrearsPrincipal until covered.
  // Surpluses replenish coopCash to the launch-buffer level before entering
  // the waterfall. Distributions require a clean ledger (eq. 22):
  //   DistPool_t > 0 ⇒ Arr_t = 0 ∧ coopCash_t ≥ 0 ∧ E_t ≥ E★_t.
  // Payment order within a year (documented choice; ±k on exact figures):
  //   prior arrearsOther → prior arrearsPrincipal → current opex+tax+liab
  //   → current interest → current scheduled principal.
  const launchStack = computeLaunchStack(p);
  const bufferTarget = p.Bfund + (launchStack.Fdeploy - p.G1);
  let coopCash = bufferTarget;
  let arrearsOther = 0; // unpaid opex/tax/liab/interest
  let arrearsPrincipal = 0; // unpaid scheduled loan principal
  let cumBilledPrincipal = 0;

  for (let t = 0; t < p.yearsToSim; t++) {
    const redInflow = redemptionStream[t] ?? 0;
    const liquidation = p.liquidationProceeds[t] ?? 0;
    const other = p.otherProceeds[t] ?? 0;
    const GrossProceeds = redInflow + liquidation + other;

    const coopCashOpen = coopCash;
    const arrearsOpen = arrearsOther + arrearsPrincipal;
    const Eopen = E;

    // Interest accrues on the true outstanding balance (net of PAID principal).
    const IntNPV = loanBalance > 0 ? loanBalance * p.iNPV : 0;
    // Scheduled principal keeps billing until the full principal is billed;
    // unpaid tranches wait in arrearsPrincipal (term effectively extends).
    const PrinNPV = Math.max(0, Math.min(principalPerYear, p.L_NPV - cumBilledPrincipal));
    cumBilledPrincipal += PrinNPV;
    const DSNPV = IntNPV + PrinNPV;

    // eq. 21 — the period deficit (before past arrears):
    const currentObligations = p.coopOpex + p.coopTax + p.liabOther + DSNPV;
    const Def = Math.max(0, currentObligations - GrossProceeds);

    // ── Pay obligations from: gross proceeds → coopCash → E (recorded raid) ──
    let available = GrossProceeds + Math.max(0, coopCash) + Math.max(0, E);
    const cashDrawCap = Math.max(0, coopCash);
    const raidCap = Math.max(0, E);
    let principalPaid = 0;

    const dueOther = arrearsOther + p.coopOpex + p.coopTax + p.liabOther + IntNPV;
    const duePrincipal = arrearsPrincipal + PrinNPV;

    const paidOther = Math.min(available, dueOther);
    available -= paidOther;
    const paidPrincipal = Math.min(available, duePrincipal);
    available -= paidPrincipal;
    principalPaid = paidPrincipal;

    arrearsOther = dueOther - paidOther;
    arrearsPrincipal = duePrincipal - paidPrincipal;
    loanBalance = Math.max(0, loanBalance - paidPrincipal);

    // How much of the payments came from cash and from the reserve raid:
    const fundedByProceeds = Math.min(GrossProceeds, paidOther + paidPrincipal);
    const shortfallAfterProceeds = paidOther + paidPrincipal - fundedByProceeds;
    const cashDraw = Math.min(cashDrawCap, shortfallAfterProceeds);
    const reserveRaid = Math.min(raidCap, shortfallAfterProceeds - cashDraw);
    coopCash = coopCash - cashDraw;
    E = E - reserveRaid;

    // ── Surplus: replenish coopCash to the launch buffer, then the waterfall ──
    let surplus = Math.max(0, GrossProceeds - (paidOther + paidPrincipal) + 0);
    // (surplus is what remains of THIS year's proceeds after all obligations;
    //  cash/reserve draws only ever cover shortfalls, so surplus > 0 implies
    //  cashDraw = reserveRaid = 0.)
    const replenish = Math.min(surplus, Math.max(0, bufferTarget - coopCash));
    coopCash += replenish;
    surplus -= replenish;

    const arrearsClose = arrearsOther + arrearsPrincipal;
    const insolvent = arrearsClose > 1e-6 || coopCash < -1e-6;

    const NetProceeds = surplus;
    const AvailAfterReserve = Math.max(0, NetProceeds - p.reserveAlloc);

    const etaPolicy = t <= p.earlySplit ? p.etaEarly : p.etaLate;
    const targetFloor = Math.max(0, p.E_target - E);
    const reinvestFloor = Math.max(etaPolicy * AvailAfterReserve, targetFloor);
    const ReinvestFund = Math.min(AvailAfterReserve, reinvestFloor);
    // eq. 22 — distributions require a clean ledger (E measured after this
    // year's reinvest top-up). Gate-blocked cash is RETAINED in the evergreen
    // pot rather than silently vanishing.
    const cleanLedger = arrearsClose <= 1e-6 && coopCash >= 0 && E + ReinvestFund >= p.E_target;
    const distributable = AvailAfterReserve - ReinvestFund;
    const DistPool = cleanLedger ? distributable : 0;
    const retainedBlocked = cleanLedger ? 0 : distributable;

    const newDeploy = p.newDeploy[t] ?? 0;

    // Vintage distributions
    const vintageState = p.members.map((m) => ({
      id: m.id,
      member: m.member,
      vintageLabel: m.vintageLabel,
      K: m.K,
      units: m.units,
      rCap: m.rCap,
      cumDist: vintageCum[m.id],
    }));
    const { paid, provisional, residual } = distributeVintages(DistPool, vintageState);

    const vintages: VintagePayoutState[] = p.members.map((m) => {
      const cumDistOpen = vintageCum[m.id];
      const headroomOpen = Math.max(0, m.rCap * m.K - cumDistOpen);
      const paidNow = paid[m.id] ?? 0;
      const cumDistClose = cumDistOpen + paidNow;
      const headroomClose = Math.max(0, m.rCap * m.K - cumDistClose);
      vintageCum[m.id] = cumDistClose;
      return {
        id: m.id,
        member: m.member,
        vintageLabel: m.vintageLabel,
        K: m.K,
        units: m.units,
        rCap: m.rCap,
        cumDistOpen,
        headroomOpen,
        provisional: provisional[m.id] ?? 0,
        paid: paidNow,
        cumDistClose,
        headroomClose,
        status: headroomClose > 0 ? "economic" : "exhausted",
      };
    });

    // Residual from headroom clipping and gate-blocked distributions flow
    // back into the evergreen pot per §11.3 / eq. 22.
    const Eclose = Math.max(0, E + ReinvestFund + retainedBlocked + residual - newDeploy);

    out.push({
      t,
      redInflow,
      liquidation,
      other,
      GrossProceeds,
      IntNPV,
      PrinNPV,
      DSNPV,
      coopCashOpen,
      coopCashClose: coopCash,
      Def,
      reserveRaid,
      arrearsOpen,
      arrearsClose,
      insolvent,
      principalPaid,
      NetProceeds,
      AvailAfterReserve,
      Eopen,
      Etarget: p.E_target,
      etaPolicy,
      reinvestFloor,
      ReinvestFund,
      DistPool,
      newDeploy,
      Eclose,
      loanBalance: loanBalance,
      vintages,
    });

    E = Eclose;
    // NOTE: loanBalance is reduced in the ledger above by principal actually
    // PAID — the old unconditional `loanBalance -= PrinNPV` amortized the
    // loan silently even in years when nothing was paid (Fix 5).
  }

  return out;
}

// ----------------------------------------------------------------------------
// §15.5 illustrative launch defaults.
// ----------------------------------------------------------------------------

export const LAUNCH_DEFAULTS: CoopParams = {
  members: [
    { id: "m-A-2026", member: "Investor A", vintageLabel: "2026", K: 100_000, units: 100, rCap: 3 },
    { id: "m-B-2026", member: "Investor B", vintageLabel: "2026", K: 100_000, units: 100, rCap: 3 },
  ],
  L_NPV: 300_000,
  C_coopSetup: 15_000,
  C_stichting: 10_000,
  C_golden: 5_000,
  E0_target: 50_000,
  Bfund: 0,
  G1: 420_000,
  C_SO: 25_000,
  C_inc: 15_000,

  yearsToSim: 5,
  coopOpex: 25_000,
  coopTax: 0,
  liabOther: 0,
  iNPV: 0.04,
  Tloan: 5,
  reserveAlloc: 10_000,
  E_target: 250_000,
  etaEarly: 0.85,
  etaLate: 0.6,
  earlySplit: 2,
  newDeploy: [0, 0, 0, 0, 0],
  liquidationProceeds: [0, 0, 0, 0, 0],
  otherProceeds: [0, 0, 0, 0, 0],
};

export const fmtEURcompact = (x: number) => {
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `€${(x / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `€${(x / 1_000).toFixed(0)}k`;
  return `€${x.toFixed(0)}`;
};

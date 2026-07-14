/**
 * Ergodicity & Circular Finance / Pooled Reserve Extension
 *
 * Monte Carlo simulation comparing:
 *   Case A — No pooling / solidarity reserve
 *   Case B — With pooling / solidarity reserve
 *
 * This module deliberately uses simplified placeholder formulas
 * to show directional resilience effects.  It is NOT a final
 * investment-risk forecast.
 *
 * All TODO comments flag formulas that should be refined in
 * a future quantitative pass.
 */

export type ErgoParams = {
  /** Number of companies in the portfolio (maps to global N) */
  portfolioSize: number;
  /** Baseline survival probability per cycle (maps to global p) */
  baseSurvivalRate: number;
  /** Repayment multiple cap (maps to global r) */
  repaymentCap: number;
  /** Average investment per company (£) */
  averageInvestmentPerCompany: number;
  /** Evergreen cycles (maps to global c) */
  evergreenCycles: number;
  /** Years per cycle (maps to global yearsPerCycle) */
  yearsPerCycle: number;

  // ── Monte Carlo controls ──────────────────────────────────────────────────
  /** Number of simulation paths */
  simulationRuns: number;
  /** Total years simulated (defaults to evergreenCycles * yearsPerCycle) */
  timeHorizonYears: number;
  /** Annual probability of a serious but potentially survivable shock per company */
  shockProbabilityPerCompanyPerYear: number;
  /** Probability a shock kills the company WITHOUT support */
  shockFatalityWithoutSupport: number;
  /** Probability that reserve support prevents a fatal shock */
  rescueEffectiveness: number;
  /** Fraction of repayments / surplus allocated to the pooled reserve */
  poolingReserveAllocation: number;
  /** Starting pooled reserve (£) */
  initialPooledReserve: number;
  /** Maximum support per company per rescue event (£) */
  maxSupportPerCompany: number;
  /** Minimum reserve level not to spend below */
  reserveFloor: number;
  /** Share of support recovered when rescued company survives */
  supportAsLoanRecoveryRate: number;
  /** Simplified impact units per surviving company per year */
  averageCompanyImpact: number;
  /**
   * Degree of non-ergodicity / VUCA level (0–1).
   * TODO: refine – currently scales shockProbability and shockFatality
   */
  degreeOfNonErgodicity: number;
};

export const ERGO_DEFAULTS: ErgoParams = {
  portfolioSize: 25,
  baseSurvivalRate: 0.4,
  repaymentCap: 2.9,
  averageInvestmentPerCompany: 200_000,
  evergreenCycles: 3,
  yearsPerCycle: 10,
  simulationRuns: 1000,
  timeHorizonYears: 30,
  shockProbabilityPerCompanyPerYear: 0.10,
  shockFatalityWithoutSupport: 0.60,
  rescueEffectiveness: 0.50,
  poolingReserveAllocation: 0.20,
  initialPooledReserve: 0,
  maxSupportPerCompany: 50_000,
  reserveFloor: 0,
  supportAsLoanRecoveryRate: 0.70,
  averageCompanyImpact: 1,
  degreeOfNonErgodicity: 0.5,
};

/** Per-run output from one Monte Carlo path */
type RunResult = {
  survivingCompanies: number;
  totalRepayments: number;
  totalImpact: number;
  companiesRescued: number;
  finalReserve: number;
  reserveDepleted: boolean;
  severeDownside: boolean; // fewer than 20% survive
};

/** Aggregate output across all runs for one case */
export type CaseResult = {
  label: string;
  meanSurvivalRate: number;
  meanSurvivingCompanies: number;
  medianSurvivingCompanies: number;
  p5SurvivingCompanies: number;
  p25SurvivingCompanies: number;
  p75SurvivingCompanies: number;
  p95SurvivingCompanies: number;
  meanRepayments: number;
  meanImpact: number;
  meanCompaniesRescued: number;
  meanFinalReserve: number;
  probReserveDepletion: number;
  probSevereDownside: number;
  meanVsTypicalGap: number;
  /** Year-by-year average reserve trajectory (Case B only, empty for A) */
  reserveTrajectory: number[];
};

export type ErgoResult = {
  caseA: CaseResult;
  caseB: CaseResult;
  survivalUplift: number;
  repaymentsPreserved: number;
  impactPreserved: number;
  resilienceScore: number;
  /** monteCarloMeanSurvivalRateWithPooling – used for effectiveSurvivalRate */
  effectiveSurvivalRateWithPooling: number;
};

/** Derive annual failure probability from cycle-level survival and timeHorizonYears */
function annualFailureRate(baseSurvivalRate: number, timeHorizonYears: number): number {
  // TODO: refine – assumes compound annual survival so that
  // (1 - annualP_fail)^T ≈ baseSurvivalRate over the horizon
  if (timeHorizonYears <= 0) return 0;
  const annualSurvival = Math.pow(Math.max(baseSurvivalRate, 1e-9), 1 / timeHorizonYears);
  return 1 - annualSurvival;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

/**
 * Run a single Monte Carlo case.
 *
 * TODO: add delayed supportAsLoanRecovery (currently immediate) for accuracy.
 * TODO: implement vucaLevel as a proper shock-distribution modifier rather
 *       than a simple linear scaling factor.
 */
function runCase(params: ErgoParams, withPooling: boolean): { result: CaseResult; trajectoryRows: number[][] } {
  const {
    portfolioSize,
    baseSurvivalRate,
    repaymentCap,
    averageInvestmentPerCompany,
    timeHorizonYears,
    simulationRuns,
    shockProbabilityPerCompanyPerYear,
    shockFatalityWithoutSupport,
    rescueEffectiveness,
    poolingReserveAllocation,
    initialPooledReserve,
    maxSupportPerCompany,
    reserveFloor,
    supportAsLoanRecoveryRate,
    averageCompanyImpact,
    degreeOfNonErgodicity,
  } = params;

  // TODO: degreeOfNonErgodicity is a placeholder linear scale; refine to a
  //       proper VUCA distribution modifier in a future pass.
  const effectiveShockProb = Math.min(1, shockProbabilityPerCompanyPerYear * (1 + degreeOfNonErgodicity));
  const effectiveFatality = Math.min(1, shockFatalityWithoutSupport * (1 + 0.5 * degreeOfNonErgodicity));

  const baseAnnualFailure = annualFailureRate(baseSurvivalRate, timeHorizonYears);
  const avgRepaymentPerCompany = averageInvestmentPerCompany * repaymentCap;

  const runResults: RunResult[] = [];
  // trajectoryRows[runIdx][year] = reserve at end of that year
  const trajectoryRows: number[][] = [];

  for (let run = 0; run < simulationRuns; run++) {
    const active = new Array(portfolioSize).fill(true);
    let reserve = initialPooledReserve;
    let totalRepayments = 0;
    let totalImpact = 0;
    let companiesRescued = 0;
    let reserveDepleted = false;
    const reserveByYear: number[] = [];

    for (let year = 0; year < timeHorizonYears; year++) {
      let yearRepayments = 0;

      for (let c = 0; c < portfolioSize; c++) {
        if (!active[c]) continue;

        // Base annual failure check
        if (Math.random() < baseAnnualFailure) {
          active[c] = false;
          continue;
        }

        // Shock event
        if (Math.random() < effectiveShockProb) {
          const wouldBeFatal = Math.random() < effectiveFatality;
          if (wouldBeFatal) {
            if (withPooling && reserve - maxSupportPerCompany >= reserveFloor) {
              // Attempt rescue
              const supportGiven = Math.min(maxSupportPerCompany, reserve - reserveFloor);
              reserve -= supportGiven;
              if (Math.random() < rescueEffectiveness) {
                // Rescued – recover loan portion immediately
                // TODO: model delayed recovery keyed to future repayment year
                reserve += supportGiven * supportAsLoanRecoveryRate;
                companiesRescued++;
              } else {
                active[c] = false;
              }
            } else {
              active[c] = false;
            }
          }
        }

        if (active[c]) {
          totalImpact += averageCompanyImpact;
        }
      }

      // Repayments from surviving companies at end of year
      // TODO: refine – uses simplified uniform repayment distribution rather
      //       than cycle-boundary concentration
      const activeCount = active.filter(Boolean).length;
      yearRepayments = activeCount * (avgRepaymentPerCompany / timeHorizonYears);
      totalRepayments += yearRepayments;

      if (withPooling) {
        reserve += yearRepayments * poolingReserveAllocation;
        if (reserve <= reserveFloor) reserveDepleted = true;
      }

      reserveByYear.push(reserve);
    }

    const finalActive = active.filter(Boolean).length;
    const severeDownside = finalActive / portfolioSize < 0.2;

    runResults.push({
      survivingCompanies: finalActive,
      totalRepayments,
      totalImpact,
      companiesRescued,
      finalReserve: reserve,
      reserveDepleted,
      severeDownside,
    });
    trajectoryRows.push(reserveByYear);
  }

  // Sort surviving companies for percentile calcs
  const sortedSurvivors = runResults.map((r) => r.survivingCompanies).sort((a, b) => a - b);
  const meanSurvivors = sortedSurvivors.reduce((s, v) => s + v, 0) / simulationRuns;
  const medianSurvivors = percentile(sortedSurvivors, 50);

  const meanRepayments = runResults.reduce((s, r) => s + r.totalRepayments, 0) / simulationRuns;
  const meanImpact = runResults.reduce((s, r) => s + r.totalImpact, 0) / simulationRuns;
  const meanRescued = runResults.reduce((s, r) => s + r.companiesRescued, 0) / simulationRuns;
  const meanFinalReserve = runResults.reduce((s, r) => s + r.finalReserve, 0) / simulationRuns;
  const probReserveDepletion = runResults.filter((r) => r.reserveDepleted).length / simulationRuns;
  const probSevereDownside = runResults.filter((r) => r.severeDownside).length / simulationRuns;

  return {
    result: {
      label: withPooling ? "With Pooled Reserve" : "No Pooling (Baseline)",
      meanSurvivalRate: meanSurvivors / portfolioSize,
      meanSurvivingCompanies: meanSurvivors,
      medianSurvivingCompanies: medianSurvivors,
      p5SurvivingCompanies: percentile(sortedSurvivors, 5),
      p25SurvivingCompanies: percentile(sortedSurvivors, 25),
      p75SurvivingCompanies: percentile(sortedSurvivors, 75),
      p95SurvivingCompanies: percentile(sortedSurvivors, 95),
      meanRepayments,
      meanImpact,
      meanCompaniesRescued: meanRescued,
      meanFinalReserve,
      probReserveDepletion,
      probSevereDownside,
      meanVsTypicalGap: meanSurvivors - medianSurvivors,
      reserveTrajectory: [],
    },
    trajectoryRows,
  };
}

/**
 * Compute average reserve trajectory across all runs.
 */
function avgTrajectory(trajectoryRows: number[][], timeHorizonYears: number): number[] {
  if (trajectoryRows.length === 0) return [];
  const result: number[] = [];
  for (let y = 0; y < timeHorizonYears; y++) {
    const sum = trajectoryRows.reduce((s, row) => s + (row[y] ?? 0), 0);
    result.push(sum / trajectoryRows.length);
  }
  return result;
}

/**
 * Run the full ergodicity comparison (Case A vs Case B).
 *
 * TODO: placeholder resilienceScore formula — replace with a more
 *       principled composite metric in a future quantitative pass.
 */
export function runErgodicity(params: ErgoParams): ErgoResult {
  const { result: caseA } = runCase(params, false);
  const { result: caseB, trajectoryRows: trajB } = runCase(params, true);

  caseB.reserveTrajectory = avgTrajectory(trajB, params.timeHorizonYears);

  const survivalUplift = caseB.meanSurvivalRate - caseA.meanSurvivalRate;
  const repaymentsPreserved = caseB.meanRepayments - caseA.meanRepayments;
  const impactPreserved = caseB.meanImpact - caseA.meanImpact;

  // TODO: placeholder resilience score (0–100); replace with proper index
  const resilienceScore = Math.round(
    Math.min(
      100,
      50 +
        survivalUplift * 100 * 20 +
        (1 - caseB.probSevereDownside) * 20 +
        (1 - caseB.probReserveDepletion) * 10,
    ),
  );

  return {
    caseA,
    caseB,
    survivalUplift,
    repaymentsPreserved,
    impactPreserved,
    resilienceScore,
    effectiveSurvivalRateWithPooling: caseB.meanSurvivalRate,
  };
}

export function fmtPct2(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function fmtCompact(v: number) {
  if (Math.abs(v) >= 1_000_000) return `£${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `£${(v / 1_000).toFixed(1)}K`;
  return `£${v.toFixed(0)}`;
}

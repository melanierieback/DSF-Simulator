import { useMemo, useState, useCallback, useEffect } from "react";
import { useDsf } from "@/hooks/useDsfStore";
import { SliderField } from "@/components/dsf/SliderField";
import { ValueCard } from "@/components/dsf/ValueCard";
import {
  runErgodicity,
  ERGO_DEFAULTS,
  fmtPct2,
  fmtCompact,
  type ErgoParams,
  type ErgoResult,
} from "@/lib/ergodicityModel";
import {
  coinTossStats,
  coinTossTrajectories,
  coinTossPAhead,
  fundKelly,
  fundGOfF,
  fundFStar,
  coinGOfF,
  poolingGn,
  POOLING_LIMIT,
  runBorrowerLender,
} from "@/lib/ergodicityCore";
import { computeR } from "@/lib/dsfModel";
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const FINANCE = "hsl(var(--finance))";
const ACCENT = "hsl(235 90% 74%)";
const RESCUE = "hsl(142 60% 55%)";
const POOLED = "hsl(48 85% 62%)";

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function StatusBadge({ on }: { on: boolean }) {
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={
        on
          ? { background: "hsl(142 55% 25%)", color: "hsl(142 70% 70%)", border: "1px solid hsl(142 50% 40%)" }
          : { background: "hsl(237 22% 14%)", color: "hsl(237 40% 60%)", border: "1px solid hsl(237 22% 22%)" }
      }
    >
      {on ? "⬤ Pooling-adjusted survival included" : "◯ Baseline model — pooling excluded"}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: ACCENT }}>
      {children}
    </h3>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4 text-sm leading-relaxed text-white/70"
      style={{ background: "hsl(237 28% 9%)", border: "1px solid hsl(237 22% 18%)" }}
    >
      {children}
    </div>
  );
}

function StatRow({
  label,
  a,
  b,
  highlight,
}: {
  label: string;
  a: string;
  b: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 gap-2 py-2 text-sm ${highlight ? "font-semibold" : ""}`}
      style={{ borderBottom: "1px solid hsl(237 22% 14%)" }}
    >
      <span className="text-white/60">{label}</span>
      <span className="num text-center" style={{ color: "hsl(237 40% 65%)" }}>{a}</span>
      <span className="num text-center" style={{ color: RESCUE }}>{b}</span>
    </div>
  );
}

function ComparisonCard({
  title,
  color,
  survivalRate,
  medianSurviving,
  p5Surviving,
  p25Surviving,
  severeProbability,
  depletionProbability,
  note,
}: {
  title: string;
  color: string;
  survivalRate: string;
  medianSurviving: string;
  p5Surviving?: string;
  p25Surviving?: string;
  severeProbability: string;
  depletionProbability: string | null;
  note?: string;
}) {
  // Reporting standard (pack v2 II.5): median first, then P5/P25, then ruin
  // probability; ensemble means labeled "ensemble mean", never shown alone.
  const rows: Array<[string, string]> = [
    ["Median surviving companies", medianSurviving],
    ["P5 / P25 surviving", p5Surviving && p25Surviving ? `${p5Surviving} / ${p25Surviving}` : "—"],
    ["Prob. severe downside", severeProbability],
    ["Reserve depletion prob.", depletionProbability ?? "—"],
    ["Survival rate (ensemble mean)", survivalRate],
  ];
  return (
    <div
      className="flex-1 rounded-xl p-5 space-y-4"
      style={{ background: "hsl(237 28% 7%)", border: `1px solid ${color}33` }}
    >
      <p className="text-sm font-semibold" style={{ color }}>{title}</p>
      <div className="space-y-0">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between py-2 text-sm"
            style={{ borderBottom: "1px solid hsl(237 22% 12%)" }}
          >
            <span className="text-white/55">{label}</span>
            <span className="num font-semibold" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
      {note && <p className="text-xs text-white/40 italic">{note}</p>}
    </div>
  );
}

function SolidarityReserveTab() {
  const { params, set } = useDsf();

  const [ep, setEp] = useState<ErgoParams>(() => ({
    ...ERGO_DEFAULTS,
    portfolioSize: params.N,
    baseSurvivalRate: params.p,
    repaymentCap: params.composeR
      ? 1 + params.delta + params.pi + params.rho + params.lambda
      : params.rDirect,
    averageInvestmentPerCompany: params.If,
    evergreenCycles: params.c,
    yearsPerCycle: params.yearsPerCycle,
    // Default horizon = ONE cycle, so lab survival is directly comparable
    // with the main model's per-cycle p (Fix 3).
    timeHorizonYears: params.yearsPerCycle,
  }));

  const patch = useCallback(<K extends keyof ErgoParams>(key: K, value: ErgoParams[K]) => {
    setEp((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    const r = params.composeR
      ? 1 + params.delta + params.pi + params.rho + params.lambda
      : params.rDirect;
    setEp((prev) => ({
      ...prev,
      portfolioSize: params.N,
      baseSurvivalRate: params.p,
      repaymentCap: r,
      averageInvestmentPerCompany: params.If,
      evergreenCycles: params.c,
      yearsPerCycle: params.yearsPerCycle,
      timeHorizonYears:
        prev.timeHorizonYears === prev.yearsPerCycle
          ? params.yearsPerCycle
          : prev.timeHorizonYears,
    }));
  }, [
    params.N,
    params.p,
    params.delta,
    params.pi,
    params.rho,
    params.lambda,
    params.rDirect,
    params.composeR,
    params.If,
    params.c,
    params.yearsPerCycle,
  ]);

  const result: ErgoResult = useMemo(() => runErgodicity(ep), [ep]);

  const handleToggle = () => {
    const next = !params.includeErgodicityInResults;
    set("includeErgodicityInResults", next);
    if (next) {
      set("ergodicEffectiveSurvivalRate", result.effectiveSurvivalRateWithPooling);
    }
  };

  const toggleOn = params.includeErgodicityInResults;

  const distributionData = [
    { pct: "P5",     noPool: result.caseA.p5SurvivingCompanies,  pool: result.caseB.p5SurvivingCompanies },
    { pct: "P25",    noPool: result.caseA.p25SurvivingCompanies, pool: result.caseB.p25SurvivingCompanies },
    { pct: "Median", noPool: result.caseA.medianSurvivingCompanies, pool: result.caseB.medianSurvivingCompanies },
    { pct: "Mean",   noPool: +result.caseA.meanSurvivingCompanies.toFixed(1), pool: +result.caseB.meanSurvivingCompanies.toFixed(1) },
    { pct: "P75",    noPool: result.caseA.p75SurvivingCompanies, pool: result.caseB.p75SurvivingCompanies },
    { pct: "P95",    noPool: result.caseA.p95SurvivingCompanies, pool: result.caseB.p95SurvivingCompanies },
  ];

  const reserveTrajectory = result.caseB.reserveTrajectory.map((v, i) => ({
    year: i + 1,
    reserve: Math.round(v),
  }));

  const repaymentsData = [
    { label: "No Pooling",   repayments: Math.round(result.caseA.meanRepayments) },
    { label: "With Reserve", repayments: Math.round(result.caseB.meanRepayments) },
  ];

  return (
    <div className="space-y-8">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Solidarity Reserve Lab (pooled rescue simulation)</h1>
          <StatusBadge on={toggleOn} />
        </div>
        <p className="text-sm text-white/60 max-w-2xl">
          Test whether pooled reserves improve survival across path-dependent shocks.
        </p>
      </div>

      {/* ── Why this matters ─────────────────────────────────────────────── */}
      <InfoBox>
        <p className="font-semibold text-white/85 mb-2">Why this matters</p>
        <p>
          Average returns can hide path fragility. A fund can look viable in expectation
          while individual companies experience one irreversible path through time. Losses
          compound, and failure is often an absorbing boundary. This module uses Monte Carlo
          simulation to compare the baseline model against a pooled-reserve model.
        </p>
        <p className="mt-3 text-white/55 italic">
          The pooled reserve is not charity outside the model. It is a resilience mechanism
          inside the model: by helping viable companies survive shocks, it improves both
          mission outcomes and long-term fund performance.
        </p>
      </InfoBox>

      {/* ── Global toggle ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl"
        style={{ background: "hsl(237 28% 9%)", border: "1px solid hsl(237 22% 20%)" }}
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-white/90">
            Include pooling-adjusted survival in main results
          </p>
          <p className="text-xs text-white/50">
            When <strong className="text-white/65">OFF</strong>, this tab is a preview only — the main dashboard continues to use
            the baseline model. When <strong className="text-white/65">ON</strong>, survival-dependent dashboard results (M, I, S,
            Repayment) use a <em>pooling-adjusted survival estimate</em>: Case B&apos;s mean survival from a one-cycle
            Monte Carlo run, genuinely a per-cycle rate. This is a solidarity-pooling adjustment, not an
            &ldquo;ergodicity correction.&rdquo;
          </p>
          {toggleOn && (
            <p className="text-xs font-medium" style={{ color: "hsl(142 70% 65%)" }}>
              Pooling-adjusted survival = {pct(result.effectiveSurvivalRateWithPooling)} (one-cycle MC pooled mean)
              &nbsp;vs. baseline {pct(ep.baseSurvivalRate)}.
            </p>
          )}
        </div>
        <button
          onClick={handleToggle}
          className="shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={
            toggleOn
              ? { background: "hsl(142 55% 25%)", color: "hsl(142 70% 70%)", border: "1px solid hsl(142 50% 35%)" }
              : { background: "hsl(237 22% 14%)", color: "hsl(235 90% 74%)", border: "1px solid hsl(237 22% 26%)" }
          }
        >
          {toggleOn ? "ON — Pooling included" : "OFF — Baseline only"}
        </button>
      </div>

      {/* ── Baseline vs pooled-reserve: two-card quick comparison ─────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <ComparisonCard
          title="Without pooled reserve"
          color="hsl(237 40% 65%)"
          survivalRate={pct(result.caseA.meanSurvivalRate)}
          medianSurviving={String(result.caseA.medianSurvivingCompanies)}
          p5Surviving={String(result.caseA.p5SurvivingCompanies)}
          p25Surviving={String(result.caseA.p25SurvivingCompanies)}
          severeProbability={pct(result.caseA.probSevereDownside)}
          depletionProbability={null}
          note="Baseline model — no solidarity pool."
        />
        <ComparisonCard
          title="With pooled reserve"
          color={RESCUE}
          survivalRate={pct(result.caseB.meanSurvivalRate)}
          medianSurviving={String(result.caseB.medianSurvivingCompanies)}
          p5Surviving={String(result.caseB.p5SurvivingCompanies)}
          p25Surviving={String(result.caseB.p25SurvivingCompanies)}
          severeProbability={pct(result.caseB.probSevereDownside)}
          depletionProbability={pct(result.caseB.probReserveDepletion)}
          note="Solidarity reserve supports viable companies in shock."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* ── Left rail: inputs ────────────────────────────────────────── */}
        <aside className="space-y-6">

          {/* From model (read-only) */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <SectionTitle>From model (read-only)</SectionTitle>
            <div className="space-y-1 text-sm">
              {[
                { label: "Portfolio size (N)", value: ep.portfolioSize },
                { label: "Base survival rate (p)", value: pct(ep.baseSurvivalRate) },
                { label: "Repayment cap (r)", value: ep.repaymentCap.toFixed(2) + "×" },
                { label: "Evergreen cycles (c)", value: ep.evergreenCycles },
                { label: "Years per cycle", value: ep.yearsPerCycle },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1" style={{ borderBottom: "1px solid hsl(237 22% 12%)" }}>
                  <span className="text-white/55">{label}</span>
                  <span className="num text-white/80">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulation settings */}
          <div
            className="rounded-xl p-5 space-y-5"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <SectionTitle>Simulation settings</SectionTitle>
            <SliderField
              label="Simulation runs"
              value={ep.simulationRuns}
              onChange={(v) => patch("simulationRuns", v)}
              min={100} max={5000} step={100}
              format={(v) => String(v)}
              hint="More runs = more accurate distribution. 1000 is a good balance."
            />
            <SliderField
              label="Time horizon (years)"
              value={ep.timeHorizonYears}
              onChange={(v) => patch("timeHorizonYears", v)}
              min={1} max={50} step={1}
              format={(v) => `${v}y`}
            />
          </div>

          {/* Failure decomposition */}
          <div
            className="rounded-xl p-5 space-y-5"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <SectionTitle>Failure decomposition</SectionTitle>
            <SliderField
              label="Share of failures that are shock-type / rescuable"
              value={ep.shockShare}
              onChange={(v) => patch("shockShare", v)}
              min={0} max={1} step={0.05}
              format={pct}
              hint="Fraction of total mortality attributable to rescuable shock events — the only branch where the pooled reserve can intervene. Does not change Case A's survival."
            />
          </div>

          {/* Pooling / reserve settings */}
          <div
            className="rounded-xl p-5 space-y-5"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <SectionTitle>Pooling / reserve settings</SectionTitle>
            <SliderField
              label="Pooling allocation"
              value={ep.poolingReserveAllocation}
              onChange={(v) => patch("poolingReserveAllocation", v)}
              min={0} max={1} step={0.01}
              format={pct}
              hint="Fraction of repayments / surplus allocated to the shared reserve."
            />
            <SliderField
              label="Max support per company (€)"
              value={ep.maxSupportPerCompany}
              onChange={(v) => patch("maxSupportPerCompany", v)}
              min={0} max={500_000} step={10_000}
              format={(v) => `€${(v / 1000).toFixed(0)}K`}
            />
            <SliderField
              label="Reserve floor (€)"
              value={ep.reserveFloor}
              onChange={(v) => patch("reserveFloor", v)}
              min={0} max={500_000} step={10_000}
              format={(v) => `€${(v / 1000).toFixed(0)}K`}
              hint="Minimum reserve level not to spend below."
            />
          </div>

          {/* Rescue settings */}
          <div
            className="rounded-xl p-5 space-y-5"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <SectionTitle>Rescue settings</SectionTitle>
            <SliderField
              label="Rescue effectiveness"
              value={ep.rescueEffectiveness}
              onChange={(v) => patch("rescueEffectiveness", v)}
              min={0} max={1} step={0.01}
              format={pct}
              hint="Probability that support successfully prevents a fatal shock."
            />
            <SliderField
              label="Loan recovery rate"
              value={ep.supportAsLoanRecoveryRate}
              onChange={(v) => patch("supportAsLoanRecoveryRate", v)}
              min={0} max={1} step={0.01}
              format={pct}
              hint="Share of support recovered when a rescued company survives."
            />
          </div>

        </aside>

        {/* ── Main results area ────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* Outcome KPI cards (6) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ValueCard
              label="Survival uplift"
              value={result.survivalUplift >= 0 ? `+${pct(result.survivalUplift)}` : pct(result.survivalUplift)}
              channel="finance"
              sub="Ensemble-mean survival uplift from pooling"
            />
            <ValueCard
              label="Companies rescued"
              value={result.caseB.meanCompaniesRescued.toFixed(1)}
              channel="impact"
              sub="Rescues per run (ensemble mean)"
            />
            <ValueCard
              label="Repayments preserved"
              value={fmtCompact(result.repaymentsPreserved)}
              channel="finance"
              sub="Additional repayments (ensemble mean)"
            />
            <ValueCard
              label="Impact preserved"
              value={result.impactPreserved >= 0 ? `+${result.impactPreserved.toFixed(0)}` : result.impactPreserved.toFixed(0)}
              channel="impact"
              sub="Extra impact units (ensemble mean)"
            />
            <ValueCard
              label="Reserve depletion prob."
              value={pct(result.caseB.probReserveDepletion)}
              channel="theology"
              sub="Prob. reserve runs out (Case B)"
            />
            <ValueCard
              label="Resilience score"
              value={`${result.resilienceScore}/100`}
              channel="theology"
              sub="Composite resilience indicator"
            />
          </div>

          {/* Distributional outcomes */}
          <div
            className="rounded-xl p-5"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <SectionTitle>Distributional outcomes</SectionTitle>
            <p className="text-xs text-white/45 mb-4">
              Survival distribution across all simulation runs. The gap between mean and median
              is the <em>average vs typical path gap</em> — it reveals path-fragility that
              expectation-based models hide.
            </p>
            <div className="grid grid-cols-3 gap-2 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
              <span>Metric</span>
              <span className="text-center" style={{ color: "hsl(237 40% 65%)" }}>Without reserve</span>
              <span className="text-center" style={{ color: RESCUE }}>With reserve</span>
            </div>
            <StatRow label="Mean survival rate" a={pct(result.caseA.meanSurvivalRate)} b={pct(result.caseB.meanSurvivalRate)} highlight />
            <StatRow label="Mean surviving companies" a={result.caseA.meanSurvivingCompanies.toFixed(1)} b={result.caseB.meanSurvivingCompanies.toFixed(1)} />
            <StatRow label="Median surviving companies" a={String(result.caseA.medianSurvivingCompanies)} b={String(result.caseB.medianSurvivingCompanies)} />
            <StatRow label="Avg vs typical path gap (mean − median)" a={result.caseA.meanVsTypicalGap.toFixed(1)} b={result.caseB.meanVsTypicalGap.toFixed(1)} />
            <StatRow label="P5 / P95 (worst / best)" a={`${result.caseA.p5SurvivingCompanies} / ${result.caseA.p95SurvivingCompanies}`} b={`${result.caseB.p5SurvivingCompanies} / ${result.caseB.p95SurvivingCompanies}`} />
            <StatRow label="P25 / P75 (interquartile)" a={`${result.caseA.p25SurvivingCompanies} / ${result.caseA.p75SurvivingCompanies}`} b={`${result.caseB.p25SurvivingCompanies} / ${result.caseB.p75SurvivingCompanies}`} />
            <StatRow label="Prob. severe downside" a={pct(result.caseA.probSevereDownside)} b={pct(result.caseB.probSevereDownside)} />
            <StatRow label="Prob. reserve depletion" a="—" b={pct(result.caseB.probReserveDepletion)} />
            <StatRow label="Mean repayments" a={fmtCompact(result.caseA.meanRepayments)} b={fmtCompact(result.caseB.meanRepayments)} />
            <StatRow label="Mean impact" a={result.caseA.meanImpact.toFixed(0)} b={result.caseB.meanImpact.toFixed(0)} />
            <StatRow label="Avg final reserve" a="—" b={fmtCompact(result.caseB.meanFinalReserve)} />
          </div>

          {/* Chart 1: survival distribution */}
          <div
            className="rounded-xl p-5"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <SectionTitle>Survival distribution — no pooling vs pooled reserve</SectionTitle>
            <p className="text-xs text-white/45 mb-4">
              Each bar shows the number of surviving companies at that percentile across all runs.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distributionData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(237 22% 14%)" />
                <XAxis dataKey="pct" tick={{ fontSize: 11, fill: "hsl(237 22% 55%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(237 22% 55%)" }} domain={[0, ep.portfolioSize]} />
                <RTooltip
                  contentStyle={{ background: "hsl(237 30% 9%)", border: "1px solid hsl(237 22% 22%)", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="noPool" name="No pooling" fill="hsl(237 40% 45%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pool" name="With reserve" fill={RESCUE} radius={[3, 3, 0, 0]} />
                <ReferenceLine y={ep.portfolioSize} stroke="hsl(237 22% 35%)" strokeDasharray="4 2" label={{ value: "Full portfolio", fill: "hsl(237 22% 50%)", fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: pooled reserve trajectory */}
          {reserveTrajectory.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
            >
              <SectionTitle>Average pooled reserve trajectory (with reserve)</SectionTitle>
              <p className="text-xs text-white/45 mb-4">
                Mean reserve balance year-by-year, showing how repayment pooling accumulates over time.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={reserveTrajectory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(237 22% 14%)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(237 22% 55%)" }} label={{ value: "Year", position: "insideBottomRight", offset: -4, fill: "hsl(237 22% 55%)", fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(237 22% 55%)" }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
                  <RTooltip
                    contentStyle={{ background: "hsl(237 30% 9%)", border: "1px solid hsl(237 22% 22%)", fontSize: 12 }}
                    formatter={(v: number) => [fmtCompact(v), "Reserve"]}
                  />
                  <Line dataKey="reserve" name="Pooled reserve" stroke={POOLED} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart 3: repayments comparison */}
          <div
            className="rounded-xl p-5"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <SectionTitle>Mean repayments — baseline vs pooled reserve</SectionTitle>
            <p className="text-xs text-white/45 mb-4">
              Additional repayments preserved when the solidarity reserve rescues viable companies from shocks.
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={repaymentsData} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(237 22% 14%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(237 22% 55%)" }} tickFormatter={(v) => fmtCompact(v)} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "hsl(237 22% 60%)" }} width={68} />
                <RTooltip
                  contentStyle={{ background: "hsl(237 30% 9%)", border: "1px solid hsl(237 22% 22%)", fontSize: 12 }}
                  formatter={(v: number) => [fmtCompact(v), "Repayments"]}
                />
                <Bar dataKey="repayments" fill={FINANCE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Advanced / assumptions collapsible */}
          <details
            className="rounded-xl"
            style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}
          >
            <summary
              className="px-5 py-4 cursor-pointer text-sm font-semibold text-white/60 hover:text-white/85 transition-colors select-none"
            >
              Advanced assumptions &amp; model caveats
            </summary>
            <div className="px-5 pb-5 space-y-4 text-xs text-white/55 leading-relaxed">
              <p className="text-white/70 font-medium">
                Caveat: This is an MVP Monte Carlo model using simplified assumptions.
                It is designed to show directional resilience effects, not to produce
                final investment-risk forecasts.
              </p>
              <div className="space-y-2">
                <p className="font-semibold text-white/65">Simplified formulas (placeholder — to be refined)</p>
                <pre
                  className="p-3 rounded-lg text-[11px] overflow-x-auto"
                  style={{ background: "hsl(237 22% 5%)", color: "hsl(235 80% 75%)" }}
                >{`// Total annual mortality from PER-CYCLE survival (one cycle = yearsPerCycle)
q = 1 - baseSurvivalRate^(1/yearsPerCycle)   // Case A reproduces p by construction

// Failure decomposition (no double counting)
nonRescuableFailure = q * (1 - shockShare)
fatalShock          = q * shockShare         // pooled reserve may attempt rescue here

// Repayment timing (cycle-boundary concentration not yet modelled)
yearRepayments = activeCount * (avgRepayment / timeHorizonYears)

// Loan recovery (immediate — delayed recovery not yet modelled)
reserve += supportGiven * supportAsLoanRecoveryRate

// Resilience score (placeholder composite — to be replaced)
resilienceScore = 50
  + survivalUplift * 100 * 20
  + (1 - probSevereDownside) * 20
  + (1 - probReserveDepletion) * 10`}</pre>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-white/65">Not yet implemented (see spec §2)</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Full Φ (Phi) strategy or optimal stopping</li>
                  <li>3D window-of-viability model</li>
                  <li>Network science / ecosystem-level pooling</li>
                  <li>Live accounting integration</li>
                  <li>Multi-fund or cross-portfolio solidarity</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-white/65">Current simulation parameters</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Runs: {ep.simulationRuns.toLocaleString()}</li>
                  <li>Horizon: {ep.timeHorizonYears} years</li>
                  <li>Portfolio: {ep.portfolioSize} companies</li>
                  <li>Base survival (per cycle): {fmtPct2(ep.baseSurvivalRate)}</li>
                  <li>Pooling-adjusted per-cycle survival (one-cycle MC, Case B): {fmtPct2(result.effectiveSurvivalRateWithPooling)}</li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Pack v2 Part II — True ergodicity module (paper §8)
// ════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}>
      <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="num text-xl font-semibold mt-1" style={{ color: accent ?? "white" }}>{value}</p>
      {sub && <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── II.1 Two Averages ───────────────────────────────────────────────────────

function TwoAveragesTab() {
  const T = 100;
  const { meanPerRound, g } = coinTossStats();
  const data = useMemo(() => coinTossTrajectories(T), []);
  const pAhead = useMemo(
    () => [10, 100, 1000].map((t) => ({ t, p: coinTossPAhead(t) })),
    [],
  );
  return (
    <div className="space-y-6">
      <InfoBox>
        <p className="font-semibold text-white/85 mb-2">The two averages</p>
        <p>
          A coin pays +50% on heads, −40% on tails. The <em>ensemble</em> average return is
          +5% per round — a great bet, on average. But no one lives in the ensemble: each
          player follows one path through time, and the <em>time-average</em> growth rate is
          ½ln(1.5·0.6) = −5.3% per round. The gamble that enriches the average player ruins
          almost every actual player. This distinction — ensemble vs time average — is the
          whole module.
        </p>
      </InfoBox>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Ensemble mean ⟨f⟩" value={`${meanPerRound.toFixed(2)}×/round`} sub="looks like a winning game" />
        <StatCard label="Time-average g" value={`${(g * 100).toFixed(2)}%/round`} sub="what one path actually compounds at" accent="hsl(0 70% 65%)" />
        <StatCard label="Ensemble mean at T=100" value={`${data[100].mean.toFixed(1)}×`} sub="ensemble mean — no one gets this" />
        <StatCard label="Median at T=100" value={`${data[100].median.toFixed(3)}×`} sub="the typical player" accent="hsl(0 70% 65%)" />
      </div>
      <div className="rounded-xl p-5" style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}>
        <SectionTitle>Ensemble mean vs median path (log scale)</SectionTitle>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(237 22% 14%)" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "hsl(237 22% 55%)" }} label={{ value: "round", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(237 22% 55%)" }} />
            <YAxis scale="log" domain={[0.0001, 1000]} tickFormatter={(v) => (v >= 1 ? `${v}×` : `${v}×`)} tick={{ fontSize: 10, fill: "hsl(237 22% 55%)" }} width={56} />
            <RTooltip contentStyle={{ background: "hsl(237 30% 9%)", border: "1px solid hsl(237 22% 22%)", fontSize: 12 }} formatter={(v: number, name: string) => [v.toExponential(2), name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={1} stroke="hsl(237 22% 40%)" strokeDasharray="3 3" />
            <Line dataKey="mean" name="ensemble mean ⟨V⟩" stroke={POOLED} strokeWidth={2} dot={false} />
            <Line dataKey="median" name="median path" stroke="hsl(0 70% 60%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {pAhead.map(({ t, p }) => (
          <StatCard key={t} label={`P(ahead) at T = ${t}`} value={`${(p * 100).toFixed(p < 0.001 ? 3 : 1)}%`} sub="exact binomial — chance a player is above 1×" />
        ))}
      </div>
      <InfoBox>
        <p className="text-white/55 text-xs">
          <strong className="text-white/70">Recovery θ remark (paper §2.10):</strong> partial
          recovery on failure softens the absorbing boundary but does not repeal it — at θ = 0.2
          a single-company &ldquo;portfolio&rdquo; has a finite but crushing time average,
          g = 0.6·ln 0.2 + 0.4·ln 3 ≈ −0.53/cycle. Diversification, not recovery, is what
          rescues the time average.
        </p>
      </InfoBox>
    </div>
  );
}

// ── II.2 Fund Kelly ─────────────────────────────────────────────────────────

function FundKellyTab() {
  const { params, set } = useDsf();
  const r = computeR(params);
  const N = params.N, p = params.p, k = params.k, eta = params.eta, icc = params.icc;
  const fk = useMemo(() => fundKelly(N, p, k, r, Math.max(eta, 1e-9), icc), [N, p, k, r, eta, icc]);
  const stakeCurve = useMemo(() => {
    const rows: { f: number; fund: number; coin: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const f = i / 100;
      rows.push({ f, fund: fundGOfF(N, p, k, r, Math.max(eta, 1e-9), f, icc) * 100, coin: coinGOfF(f) * 100 });
    }
    return rows;
  }, [N, p, k, r, eta, icc]);
  const fStar = useMemo(() => fundFStar(N, p, k, r, Math.max(eta, 1e-9), icc), [N, p, k, r, eta, icc]);
  const dragTable = useMemo(
    () => [10, 25, 40, 100, 400].map((n) => ({ n, drag: fundKelly(n, p, k, r, 1, icc).drag })),
    [p, k, r, icc],
  );
  const evergreen = useMemo(() => {
    const rows: { c: number; reported: number; typical: number }[] = [];
    for (let c = 1; c <= Math.max(3, params.c); c++) {
      rows.push({ c, reported: Math.pow(fk.M, c), typical: Math.exp(fk.ElnMcond * c) });
    }
    return rows;
  }, [fk, params.c]);

  return (
    <div className="space-y-6">
      <InfoBox>
        <p className="font-semibold text-white/85 mb-2">The fund&apos;s own time-average growth</p>
        <p>
          The reported multiple M uses the expected survivor count. But each cycle realizes a
          random survivor count Ŝ ~ Bin(N, p), and the fund compounds through the <em>realized</em>{" "}
          multiple M̂ = rkŜ/(N+(k−1)Ŝ). Volatility drag = ln M − E[ln M̂] is the gap between the
          brochure and the path. Diversification (N) is what closes it — that is the Kelly-side
          argument for portfolio breadth.
        </p>
      </InfoBox>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Reported M (live params)" value={`${fk.M.toFixed(3)}×`} sub={`ln M = ${fk.lnM.toFixed(4)}`} />
        <StatCard label="E[ln M̂ | Ŝ≥1]" value={fk.ElnMcond.toFixed(4)} sub={`typical factor ${fk.typicalFactor.toFixed(3)}×`} accent={RESCUE} />
        <StatCard label="Volatility drag" value={fk.drag.toFixed(4)} sub="ln M − E[ln M̂ | Ŝ≥1]" accent="hsl(38 85% 62%)" />
        <StatCard label="P(all fail)" value={fk.pAllFail.toExponential(1)} sub={icc > 0 ? `beta-binomial at icc=${icc.toFixed(2)}` : `(1−p)^N at N=${N}`} />
      </div>

      {/* Correlated survivals (pack v3 III.1) + Kelly-derived reserve (III.2) */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}>
        <SectionTitle>Correlated survivals &amp; the Kelly-derived reserve</SectionTitle>
        {icc > 0 && (
          <div className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "hsl(38 60% 16%)", border: "1px solid hsl(38 60% 32%)", color: "hsl(38 85% 68%)" }}>
            One recession is one draw against all of them at once.
          </div>
        )}
        <SliderField
          label="Intra-class correlation of survivals (icc)"
          value={icc}
          min={0} max={0.45} step={0.01}
          onChange={(v) => set("icc", v)}
          format={(v) => v.toFixed(2)}
          hint="0 = independent binomial; > 0 switches Ŝ to beta-binomial (a = p(1/icc−1), b = (1−p)(1/icc−1)). The same math prices estimation risk on p — a Beta posterior gives an identical pmf."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Kelly f★ (η, icc live)" value={fStar.fStar.toFixed(3)} sub={`g(f★) = ${(fStar.gStar * 100).toFixed(2)}%/cycle`} accent={RESCUE} />
          <StatCard label="Reserve floor 1 − f★" value={`${((1 - fStar.fStar) * 100).toFixed(1)}%`} sub="Kelly-derived E★ share of the pot" accent="hsl(38 85% 62%)" />
          <StatCard label="g(1)" value="−∞" sub="full deployment is Kelly-forbidden (Ŝ = 0 has positive probability)" />
        </div>
        <p className="text-[11px] text-white/40 leading-snug">
          The honest reading (paper §8.4): independent worlds barely need a reserve;
          correlation is what makes E★ material. Acceptance at η = 0.7: f★ ≈ 0.999 / 0.988 /
          0.897 at icc = 0 / 0.10 / 0.20 (floors 0.1% / 1.2% / 10.3%).
        </p>
      </div>
      <div className="rounded-xl p-5" style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}>
        <SectionTitle>Stake-fraction curve g(f) — fund vs coin-toss reference</SectionTitle>
        <p className="text-xs text-white/45 mb-3">
          g(f) = E[ln((1−f) + f·M̂)] — the time-average growth of deploying fraction f each cycle
          (η = 1 reference). Fund f★ = {fStar.fStar.toFixed(2)} at g = {(fStar.gStar * 100).toFixed(2)}%;
          coin-toss f★ = 0.25 at +0.62%/round, g(0.5) = 0, g(1) = −5.27%.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={stakeCurve} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(237 22% 14%)" />
            <XAxis dataKey="f" tick={{ fontSize: 10, fill: "hsl(237 22% 55%)" }} tickFormatter={(v) => v.toFixed(2)} label={{ value: "deployment fraction f", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(237 22% 55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(237 22% 55%)" }} tickFormatter={(v) => `${v.toFixed(0)}%`} width={44} label={{ value: "g (%/cycle)", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(237 22% 55%)" }} />
            <RTooltip contentStyle={{ background: "hsl(237 30% 9%)", border: "1px solid hsl(237 22% 22%)", fontSize: 12 }} formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]} labelFormatter={(f) => `f = ${f}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="hsl(237 22% 40%)" strokeDasharray="3 3" />
            <ReferenceLine x={fStar.fStar} stroke={RESCUE} strokeDasharray="4 3" label={{ value: `f★ = ${fStar.fStar.toFixed(2)}`, fontSize: 10, fill: RESCUE, position: "top" }} />
            <Line dataKey="fund" name="fund g(f)" stroke={RESCUE} strokeWidth={2} dot={false} />
            <Line dataKey="coin" name="coin-toss reference" stroke="hsl(237 40% 60%)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}>
          <SectionTitle>Drag vs portfolio size (p, k, r live)</SectionTitle>
          <table className="w-full text-xs">
            <thead><tr className="text-white/40 uppercase tracking-wider text-[10px]"><th className="text-left py-1">N</th><th className="text-right">volatility drag</th></tr></thead>
            <tbody>
              {dragTable.map(({ n, drag }) => (
                <tr key={n} className="border-t" style={{ borderColor: "hsl(237 22% 14%)" }}>
                  <td className="py-1.5 num">{n}</td>
                  <td className="py-1.5 num text-right" style={{ color: n === N ? RESCUE : undefined }}>{drag.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-white/40 mt-2">Acceptance at p=0.4, k=5, r=3: 0.0549 / 0.0211 / 0.0125 / 0.0048 / 0.0012.</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}>
          <SectionTitle>The honest evergreen line</SectionTitle>
          <p className="text-xs text-white/45 mb-2">Reported Mᶜ vs typical e^(E[ln M̂]·c). At c=3, N=25, p=0.4, r=3: 12.29× vs ≈11.5×.</p>
          <table className="w-full text-xs">
            <thead><tr className="text-white/40 uppercase tracking-wider text-[10px]"><th className="text-left py-1">c</th><th className="text-right">reported Mᶜ</th><th className="text-right">typical e^(gc)</th></tr></thead>
            <tbody>
              {evergreen.map(({ c, reported, typical }) => (
                <tr key={c} className="border-t" style={{ borderColor: "hsl(237 22% 14%)" }}>
                  <td className="py-1.5 num">{c}</td>
                  <td className="py-1.5 num text-right">{reported.toFixed(2)}×</td>
                  <td className="py-1.5 num text-right" style={{ color: RESCUE }}>{typical.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── II.3 Pooling — the cooperation theorem ──────────────────────────────────

const POOLING_NS = [1, 2, 5, 10, 25, 100];

function PoolingTab() {
  const rows = useMemo(
    () => POOLING_NS.map((n) => ({ n: String(n), g: poolingGn(n) * 100 })),
    [],
  );
  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-4 text-sm font-semibold"
        style={{ background: "hsl(142 55% 14%)", border: "1px solid hsl(142 50% 30%)", color: "hsl(142 70% 70%)" }}
      >
        Five sharers turn a losing game into a winning one.
      </div>
      <InfoBox>
        <p className="font-semibold text-white/85 mb-2">The cooperation theorem</p>
        <p>
          n players each toss the same coin and pool outcomes equally: each receives
          0.6 + 0.9·U/n where U ~ Bin(n, ½). Alone (n = 1) the time average is −5.27%/round.
          Two sharers nearly break even. Five turn it positive. As n grows, the time average
          approaches the ensemble mean ln(1.05) = +4.88% — pooling is how a group gets to
          <em> live in</em> the ensemble average that no individual path can reach.
        </p>
        <p className="mt-3 text-white/55 italic">
          DSF runs this theorem at three layers (paper §8.6): the portfolio pools company
          outcomes into one fund path; open-ended vintages pool across time so no cohort rides
          one cycle alone; and the solidarity reserve pools rescue capacity against
          path-killing shocks. Same mathematics each time: share the multiplicative risk,
          keep the time average.
        </p>
      </InfoBox>
      <div className="rounded-xl p-5" style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}>
        <SectionTitle>Time-average growth g_n vs number of sharers (exact binomial)</SectionTitle>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(237 22% 14%)" vertical={false} />
            <XAxis dataKey="n" tick={{ fontSize: 11, fill: "hsl(237 22% 55%)" }} label={{ value: "sharers n", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(237 22% 55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(237 22% 55%)" }} tickFormatter={(v) => `${v.toFixed(0)}%`} width={44} />
            <RTooltip contentStyle={{ background: "hsl(237 30% 9%)", border: "1px solid hsl(237 22% 22%)", fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(2)}%/round`, "g_n"]} labelFormatter={(n) => `n = ${n}`} />
            <ReferenceLine y={0} stroke="hsl(0 60% 55%)" strokeDasharray="3 3" />
            <ReferenceLine y={POOLING_LIMIT * 100} stroke={POOLED} strokeDasharray="4 3" label={{ value: "limit ln(1.05) = +4.88%", fontSize: 10, fill: POOLED, position: "insideTopRight" }} />
            <Bar dataKey="g" radius={[3, 3, 0, 0]}>
              {rows.map((row, i) => (
                <Cell key={i} fill={row.g >= 0 ? "hsl(142 55% 45%)" : "hsl(0 60% 50%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-white/40 mt-2">
          Acceptance: −5.27 / −0.20 / +2.95 / +3.94 / +4.51 / +4.79 (%/round), limit +4.88%.
        </p>
      </div>
    </div>
  );
}

// ── II.4 Borrower & Lender — delivers φ_dyn ─────────────────────────────────

function BorrowerLenderTab() {
  const { params } = useDsf();
  const [highPrecision, setHighPrecision] = useState(false);
  const paths = highPrecision ? 100_000 : 20_000;
  const bl = useMemo(() => runBorrowerLender(paths, 20260702), [paths]);
  const phiState = params.phi;

  const fmtP = (v: number) => `${(v * 100).toFixed(1)}%`;
  const rows: [string, string, string][] = [
    ["Borrower ruined", fmtP(bl.A.ruined), fmtP(bl.B.ruined)],
    ["Fully repaid", fmtP(bl.A.fullyRepaid), fmtP(bl.B.fullyRepaid)],
    ["Median years to repay", String(bl.A.medianYearsToRepay ?? "—"), String(bl.B.medianYearsToRepay ?? "—")],
    ["Median V₂₅ (ruined = 0)", bl.A.medianV.toFixed(2), bl.B.medianV.toFixed(2)],
    ["Median-path growth", `${(bl.A.medianPathGrowth * 100).toFixed(1)}%/yr`, `${(bl.B.medianPathGrowth * 100).toFixed(1)}%/yr`],
    ["Lender collects (mean)", bl.A.lenderCollects.toFixed(3), bl.B.lenderCollects.toFixed(3)],
  ];

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-4 text-sm font-semibold"
        style={{ background: "hsl(142 55% 14%)", border: "1px solid hsl(142 50% 30%)", color: "hsl(142 70% 70%)" }}
      >
        Same lender collection ({bl.A.lenderCollects.toFixed(3)} vs {bl.B.lenderCollects.toFixed(3)}); ruin {fmtP(bl.A.ruined)} → {fmtP(bl.B.ruined)}.
      </div>
      <InfoBox>
        <p className="font-semibold text-white/85 mb-2">Fixed schedule vs conditional sharing</p>
        <p>
          A borrower (V₀ = 1, ×1.5 or ×0.75 each year) owes Ω = 0.8. Contract A demands 0.10
          every year — miss a payment and the company is gone. Contract B (the DSF shape) takes
          30% of up-year gains and nothing in down years. Over {bl.paths.toLocaleString()} seeded
          paths the lender collects the same either way — but A ruins a quarter of borrowers
          while B ruins none. The fixed claim, not the amount, is what kills.
        </p>
      </InfoBox>
      <div className="rounded-xl p-5" style={{ background: "hsl(237 28% 7%)", border: "1px solid hsl(237 22% 16%)" }}>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>A (fixed schedule) vs B (conditional, DSF)</SectionTitle>
          <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
            <input type="checkbox" checked={highPrecision} onChange={(e) => setHighPrecision(e.target.checked)} />
            high precision (10⁵ paths)
          </label>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40">
              <th className="text-left py-2">metric</th>
              <th className="text-right py-2">A — fixed</th>
              <th className="text-right py-2" style={{ color: RESCUE }}>B — conditional (DSF)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, a, b]) => (
              <tr key={label} className="border-t" style={{ borderColor: "hsl(237 22% 14%)" }}>
                <td className="py-2 text-white/70">{label}</td>
                <td className="py-2 num text-right">{a}</td>
                <td className="py-2 num text-right" style={{ color: RESCUE }}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-white/40 mt-2">
          Free-company benchmark: median V₂₅ = {bl.freeMedianV.toFixed(2)} (g_med {(bl.freeMedianGrowth * 100).toFixed(1)}%/yr).
          Seeded MC (mulberry32, seed {bl.seed}); acceptance tolerance ±0.5pp at 10⁵ paths.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Δg_A (fixed-claim drag)" value={`${(bl.dgA * 100).toFixed(1)}pp/yr`} sub="free growth minus contract-A growth" />
        <StatCard label="Δg_B (DSF drag)" value={`${(bl.dgB * 100).toFixed(1)}pp/yr`} sub="free growth minus contract-B growth" />
        <StatCard label="φ_dyn = 1 − Δg_B/Δg_A" value={bl.phiDyn.toFixed(2)} sub={`vs φ_state = ${phiState.toFixed(2)} (theology rail)`} accent={RESCUE} />
      </div>
      <InfoBox>
        <p className="text-white/55">
          <strong className="text-white/75">φ_state vs φ_dyn (paper §8.7):</strong> φ_state
          classifies the <em>form</em> of the claim — the Naviganti test — and is what feeds the
          usury pressure U. φ_dyn prices <em>all</em> growth drag, including licit sharing, so it
          is shown for transparency only and never enters U. A contract can be formally contingent
          (high φ_state) and still carry real drag (φ_dyn &lt; 1) — that gap is the honest price
          of the capital.
        </p>
        <p className="mt-3 text-white/55">
          <strong className="text-white/75">The practical corollary (paper §8.7):</strong> a fixed
          schedule offers <em>scheduled</em> certainty; what an investor wants is <em>realized</em>{" "}
          certainty — and the table shows the two come apart. The design answer is structural:{" "}
          <strong className="text-white/75">schedule the pool, not the company.</strong>{" "}
          Contingency belongs at the company layer, where it protects the trajectories repayment
          rides on; predictability belongs at the fund layer, where pooling and the reserve make a
          rule-bound distribution cadence possible without any company facing a calendar.
        </p>
      </InfoBox>
    </div>
  );
}

// ── Page shell with tabs ────────────────────────────────────────────────────

const ERGO_TABS = [
  { key: "two-averages", label: "Two Averages" },
  { key: "fund-kelly", label: "Fund Kelly" },
  { key: "pooling", label: "Pooling" },
  { key: "borrower-lender", label: "Borrower & Lender" },
  { key: "solidarity", label: "Solidarity Reserve" },
] as const;

type ErgoTabKey = (typeof ERGO_TABS)[number]["key"];

export default function ErgodicityPage() {
  const [tab, setTab] = useState<ErgoTabKey>("two-averages");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Ergodicity Lab</h1>
        <p className="text-sm text-white/60 max-w-3xl">
          Time-average growth rates, log-wealth trajectories, Kelly stakes, the cooperation
          theorem, and the borrower&apos;s-eye view (paper §8) — plus the operational Solidarity
          Reserve rescue simulation. Medians first; ensemble means are labeled as such.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ERGO_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`ergo-tab-${t.key}`}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              tab === t.key
                ? { background: "hsl(235 60% 30%)", color: "white", border: "1px solid hsl(235 70% 50%)" }
                : { background: "hsl(237 22% 11%)", color: "hsl(237 40% 60%)", border: "1px solid hsl(237 22% 19%)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "two-averages" && <TwoAveragesTab />}
      {tab === "fund-kelly" && <FundKellyTab />}
      {tab === "pooling" && <PoolingTab />}
      {tab === "borrower-lender" && <BorrowerLenderTab />}
      {tab === "solidarity" && <SolidarityReserveTab />}
    </div>
  );
}

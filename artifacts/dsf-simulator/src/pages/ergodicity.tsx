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
  BarChart,
  Bar,
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
  severeProbability,
  depletionProbability,
  note,
}: {
  title: string;
  color: string;
  survivalRate: string;
  medianSurviving: string;
  severeProbability: string;
  depletionProbability: string | null;
  note?: string;
}) {
  const rows: Array<[string, string]> = [
    ["Effective survival rate", survivalRate],
    ["Median surviving companies", medianSurviving],
    ["Prob. severe downside", severeProbability],
    ["Reserve depletion prob.", depletionProbability ?? "—"],
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

export default function ErgodicityPage() {
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
          severeProbability={pct(result.caseA.probSevereDownside)}
          depletionProbability={null}
          note="Baseline model — no solidarity pool."
        />
        <ComparisonCard
          title="With pooled reserve"
          color={RESCUE}
          survivalRate={pct(result.caseB.meanSurvivalRate)}
          medianSurviving={String(result.caseB.medianSurvivingCompanies)}
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
              sub="Extra survival from pooled reserve"
            />
            <ValueCard
              label="Companies rescued"
              value={result.caseB.meanCompaniesRescued.toFixed(1)}
              channel="impact"
              sub="Avg rescues per run"
            />
            <ValueCard
              label="Repayments preserved"
              value={fmtCompact(result.repaymentsPreserved)}
              channel="finance"
              sub="Additional mean repayments"
            />
            <ValueCard
              label="Impact preserved"
              value={result.impactPreserved >= 0 ? `+${result.impactPreserved.toFixed(0)}` : result.impactPreserved.toFixed(0)}
              channel="impact"
              sub="Extra impact units with pooling"
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

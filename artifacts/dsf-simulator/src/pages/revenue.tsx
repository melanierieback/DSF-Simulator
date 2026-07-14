import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import { SliderField } from "@/components/dsf/SliderField";
import { Eq } from "@/components/dsf/Eq";
import {
  ALL_MODEL_TYPES,
  MODEL_META,
  DEFAULT_ALL_PARAMS,
  DEFAULT_OPEX,
  simulateOne,
  simulateAll,
  type RevenueModelType,
  type AllModelParams,
  type OpexConfig,
  type SimResult,
} from "@/lib/revenueModel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEUR(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}k`;
  return `€${v.toFixed(0)}`;
}
function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
function fmtYr(v: number | null): string {
  return v == null ? "Never" : `Year ${v}`;
}

const STABILITY_LABELS: Record<string, string> = {
  "very high": "Very stable",
  high: "Stable",
  medium: "Moderate",
  lower: "Lumpy",
};

const SPEED_LABELS: Record<string, string> = {
  slow: "Slow ramp",
  medium: "Medium ramp",
  fast: "Fast ramp",
};

const SCALE_LABELS: Record<string, string> = {
  low: "Limited scale",
  medium: "Medium scale",
  high: "Scales well",
  "very high": "Highly scalable",
};

const CARD_BG = "hsl(235 40% 11%)";
const CARD_BORDER = "1px solid hsl(235 35% 20%)";

function StabilityDots({ score }: { score: number }) {
  const filled = Math.round(score * 5);
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i < filled ? "hsl(235 85% 72%)" : "hsl(235 35% 28%)" }}
        />
      ))}
    </span>
  );
}

function MetricPill({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[9px] uppercase tracking-wider text-white/30">{label}</div>
      <div
        className="text-[13px] font-mono font-semibold"
        style={{ color: good === undefined ? "hsl(237 20% 75%)" : good ? "hsl(148 58% 55%)" : "hsl(0 65% 62%)" }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Model selector card ───────────────────────────────────────────────────────

function ModelButton({
  type,
  active,
  result,
  onClick,
}: {
  type: RevenueModelType;
  active: boolean;
  result: SimResult;
  onClick: () => void;
}) {
  const meta = MODEL_META[type];
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 transition-all hover-elevate"
      style={{
        background: active ? `${meta.color}18` : CARD_BG,
        border: active ? `1.5px solid ${meta.color}88` : CARD_BORDER,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm" style={{ color: active ? meta.color : "hsl(237 20% 72%)" }}>
          {meta.label}
        </span>
        <StabilityDots score={result.stabilityScore} />
      </div>
      <div className="text-[11px] text-white/40 leading-snug mb-3">{meta.tagline}</div>
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Yr 5" value={fmtEUR(result.year5Revenue)} />
        <MetricPill label="Break-even" value={fmtYr(result.breakEvenYear)} good={result.breakEvenYear != null && result.breakEvenYear <= 4} />
        <MetricPill label="CAGR 5yr" value={result.cagr5 > 0 ? `+${fmtPct(result.cagr5)}` : fmtPct(result.cagr5)} />
      </div>
    </button>
  );
}

// ── Main tooltip ──────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-[11px] space-y-1 shadow-xl"
      style={{ background: "hsl(235 45% 10%)", border: "1px solid hsl(235 35% 22%)" }}
    >
      <div className="font-semibold text-white/70 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="font-mono text-white/90">{fmtEUR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── DSF gate badge ────────────────────────────────────────────────────────────

function GateBadge({ label, year, max }: { label: string; year: number | null; max: number }) {
  const pct = year != null ? Math.min(1, year / max) : 1;
  const color = year == null ? "hsl(0 55% 55%)" : year <= 4 ? "hsl(148 58% 55%)" : year <= 7 ? "hsl(38 92% 58%)" : "hsl(148 40% 48%)";
  return (
    <div
      className="rounded-lg p-3.5 flex flex-col gap-2"
      style={{ background: CARD_BG, border: CARD_BORDER }}
    >
      <div className="text-[10px] uppercase tracking-wider text-white/35">{label}</div>
      <div className="text-xl font-mono font-bold" style={{ color }}>
        {fmtYr(year)}
      </div>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "hsl(235 35% 18%)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(1 - pct) * 100}%`, background: color }} />
      </div>
      <div className="text-[10px] text-white/30">{year == null ? "Not reached in horizon" : year <= 4 ? "Early — good" : year <= 7 ? "Mid — acceptable" : "Late — challenging"}</div>
    </div>
  );
}

// ── Parameter panels per model ────────────────────────────────────────────────

function SubscriptionPanel({ params, onChange }: { params: AllModelParams; onChange: (p: AllModelParams) => void }) {
  const p = params.subscription;
  const patch = (k: keyof typeof p, v: number) =>
    onChange({ ...params, subscription: { ...p, [k]: v } });
  return (
    <>
      <SliderField label="Initial orgs" symbol="\text{orgs}_0" value={p.initialOrgs} min={1} max={50} step={1} onChange={v => patch("initialOrgs", v)} channel="finance" format={v => `${v.toFixed(0)}`} />
      <SliderField label="New orgs/yr" symbol="\text{acq}" value={p.newOrgsPerYear} min={1} max={50} step={1} onChange={v => patch("newOrgsPerYear", v)} channel="finance" format={v => `${v.toFixed(0)}/yr`} />
      <SliderField label="Annual churn" symbol="\chi" value={p.annualChurnRate} min={0} max={0.4} step={0.01} onChange={v => patch("annualChurnRate", v)} channel="theology" format={v => `${(v*100).toFixed(0)}%`} />
      <SliderField label="Acq growth" symbol="g_{acq}" value={p.orgGrowthRate} min={0} max={0.5} step={0.01} onChange={v => patch("orgGrowthRate", v)} channel="impact" format={v => `${(v*100).toFixed(0)}%/yr`} />
      <SliderField label="Fee / org / yr" symbol="f" value={p.subscriptionFeeAnnual / 1000} min={1} max={100} step={0.5} onChange={v => patch("subscriptionFeeAnnual", v * 1000)} channel="finance" format={v => `€${v.toFixed(1)}k`} />
    </>
  );
}

function ImplementationPanel({ params, onChange }: { params: AllModelParams; onChange: (p: AllModelParams) => void }) {
  const p = params.implementation;
  const patch = (k: keyof typeof p, v: number) =>
    onChange({ ...params, implementation: { ...p, [k]: v } });
  return (
    <>
      <SliderField label="Projects yr 1" symbol="\text{proj}_1" value={p.initialProjectsPerYear} min={1} max={20} step={1} onChange={v => patch("initialProjectsPerYear", v)} channel="finance" format={v => `${v.toFixed(0)}/yr`} />
      <SliderField label="Project growth" symbol="g_p" value={p.projectGrowthRate} min={0} max={0.6} step={0.01} onChange={v => patch("projectGrowthRate", v)} channel="impact" format={v => `+${(v*100).toFixed(0)}%/yr`} />
      <SliderField label="Avg project value" symbol="\bar{v}" value={p.avgProjectValue / 1000} min={10} max={500} step={5} onChange={v => patch("avgProjectValue", v * 1000)} channel="finance" format={v => `€${v.toFixed(0)}k`} />
      <SliderField label="Capacity growth" symbol="g_c" value={p.deliveryCapacityGrowth} min={0} max={0.5} step={0.01} onChange={v => patch("deliveryCapacityGrowth", v)} channel="impact" format={v => `+${(v*100).toFixed(0)}%/yr`} />
    </>
  );
}

function AdvisoryPanel({ params, onChange }: { params: AllModelParams; onChange: (p: AllModelParams) => void }) {
  const p = params.advisory;
  const patch = (k: keyof typeof p, v: number) =>
    onChange({ ...params, advisory: { ...p, [k]: v } });
  return (
    <>
      <SliderField label="Initial consultants" symbol="C_0" value={p.initialConsultants} min={1} max={20} step={1} onChange={v => patch("initialConsultants", Math.round(v))} channel="finance" format={v => `${v.toFixed(0)} FTE`} />
      <SliderField label="Hires / yr" symbol="\Delta C" value={p.hiresPerYear} min={0} max={5} step={0.5} onChange={v => patch("hiresPerYear", v)} channel="finance" format={v => `${v.toFixed(1)}/yr`} />
      <SliderField label="Target utilisation" symbol="u" value={p.targetUtilisation} min={0.2} max={1.0} step={0.01} onChange={v => patch("targetUtilisation", v)} channel="impact" format={v => `${(v*100).toFixed(0)}%`} />
      <SliderField label="Ramp-up years" symbol="t_{ramp}" value={p.rampUpYears} min={1} max={5} step={1} onChange={v => patch("rampUpYears", Math.round(v))} channel="theology" format={v => `${v.toFixed(0)} yr`} />
      <SliderField label="Day rate" symbol="d" value={p.dayRate} min={400} max={3000} step={50} onChange={v => patch("dayRate", v)} channel="finance" format={v => `€${v.toFixed(0)}/day`} />
    </>
  );
}

function ProcurementPanel({ params, onChange }: { params: AllModelParams; onChange: (p: AllModelParams) => void }) {
  const p = params.procurement;
  const patch = (k: keyof typeof p, v: number) =>
    onChange({ ...params, procurement: { ...p, [k]: v } });
  return (
    <>
      <SliderField label="Contracts yr 1" symbol="\text{cnt}_1" value={p.initialContracts} min={0} max={10} step={0.5} onChange={v => patch("initialContracts", v)} channel="finance" format={v => `${v.toFixed(1)}`} />
      <SliderField label="Growth /yr" symbol="g_{cnt}" value={p.contractsGrowthPerYear} min={0} max={5} step={0.1} onChange={v => patch("contractsGrowthPerYear", v)} channel="impact" format={v => `+${v.toFixed(1)}/yr`} />
      <SliderField label="Avg contract value" symbol="\bar{c}" value={p.avgContractValue / 1000} min={25} max={2000} step={25} onChange={v => patch("avgContractValue", v * 1000)} channel="finance" format={v => `€${v.toFixed(0)}k`} />
      <SliderField label="Procurement access" symbol="P_t" value={p.procurementAccessFactor} min={0.1} max={1.0} step={0.05} onChange={v => patch("procurementAccessFactor", v)} channel="impact" format={v => `${(v*100).toFixed(0)}%`} hint="How favourable is the procurement environment? Linked to Pt in the Impact model." />
      <SliderField label="Win rate" symbol="w" value={p.winRate} min={0.05} max={0.8} step={0.05} onChange={v => patch("winRate", v)} channel="theology" format={v => `${(v*100).toFixed(0)}%`} />
    </>
  );
}

function ManagedServicesPanel({ params, onChange }: { params: AllModelParams; onChange: (p: AllModelParams) => void }) {
  const p = params.managed_services;
  const patch = (k: keyof typeof p, v: number) =>
    onChange({ ...params, managed_services: { ...p, [k]: v } });
  return (
    <>
      <SliderField label="Initial clients" symbol="\text{cli}_0" value={p.initialClients} min={1} max={30} step={1} onChange={v => patch("initialClients", Math.round(v))} channel="finance" format={v => `${v.toFixed(0)}`} />
      <SliderField label="New clients / yr" symbol="\text{acq}" value={p.newClientsPerYear} min={1} max={30} step={1} onChange={v => patch("newClientsPerYear", Math.round(v))} channel="finance" format={v => `${v.toFixed(0)}/yr`} />
      <SliderField label="Client churn" symbol="\chi" value={p.annualChurnRate} min={0} max={0.3} step={0.01} onChange={v => patch("annualChurnRate", v)} channel="theology" format={v => `${(v*100).toFixed(0)}%/yr`} />
      <SliderField label="Acq growth" symbol="g_{acq}" value={p.clientGrowthRate} min={0} max={0.4} step={0.01} onChange={v => patch("clientGrowthRate", v)} channel="impact" format={v => `+${(v*100).toFixed(0)}%/yr`} />
      <SliderField label="Monthly fee / client" symbol="f_m" value={p.monthlyFeePerClient / 1000} min={0.2} max={20} step={0.1} onChange={v => patch("monthlyFeePerClient", v * 1000)} channel="finance" format={v => `€${v.toFixed(1)}k/mo`} />
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [activeModel, setActiveModel] = useState<RevenueModelType>("subscription");
  const [params, setParams] = useState<AllModelParams>(DEFAULT_ALL_PARAMS);
  const [opex, setOpex] = useState<OpexConfig>(DEFAULT_OPEX);
  const [horizon] = useState(10);
  const [showAll, setShowAll] = useState(true);

  const patchOpex = (k: keyof OpexConfig, v: number) =>
    setOpex(o => ({ ...o, [k]: v }));

  const allResults = useMemo(
    () => simulateAll(params, opex, horizon),
    [params, opex, horizon],
  );

  const activeResult = useMemo(
    () => simulateOne(activeModel, params, opex, horizon),
    [activeModel, params, opex, horizon],
  );

  // Chart data: revenue trajectory for all models
  const revenueChartData = useMemo(() => {
    return Array.from({ length: horizon }, (_, i) => {
      const pt: Record<string, number | string> = { label: `Y${i + 1}` };
      allResults.forEach(r => { pt[r.modelType] = Math.round(r.rows[i]?.revenue ?? 0); });
      return pt;
    });
  }, [allResults, horizon]);

  // Chart data: FCF for active model
  const fcfChartData = useMemo(() =>
    activeResult.rows.map(r => ({
      label: r.label,
      FCF: Math.round(r.fcf),
      EBITDA: Math.round(r.ebitda),
      Revenue: Math.round(r.revenue),
    })),
    [activeResult],
  );

  // Chart data: cumulative redeemable for all models
  const redemptionChartData = useMemo(() => {
    return Array.from({ length: horizon }, (_, i) => {
      const pt: Record<string, number | string> = { label: `Y${i + 1}` };
      allResults.forEach(r => { pt[r.modelType] = Math.round(r.rows[i]?.cumRedeemable ?? 0); });
      pt["Omega"] = Math.round(activeResult.omega);
      return pt;
    });
  }, [allResults, horizon, activeResult.omega]);

  const activeMeta = MODEL_META[activeModel];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="lg:col-span-12 space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] text-finance">Business Model Validation</div>
        <h2 className="font-serif text-3xl font-semibold">Revenue model testing</h2>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mt-1">
          Five non-extractive open-source revenue models — simulated year by year. Each model has different
          ramp speed, stability, and scalability characteristics. The DSF question is not "how much revenue?"
          but "when does FCF become large enough to pass the resilience gate and begin redemption?"
        </p>
      </div>

      {/* ── Left rail ────────────────────────────────────────────────────── */}
      <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-24 self-start">

        {/* Model selector */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground px-0.5">Select model</div>
          {allResults.map(r => (
            <ModelButton
              key={r.modelType}
              type={r.modelType}
              active={activeModel === r.modelType}
              result={r}
              onClick={() => setActiveModel(r.modelType)}
            />
          ))}
        </div>

        {/* Active model parameters */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-serif text-base font-semibold" style={{ color: activeMeta.color }}>
              {activeMeta.label} parameters
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <Eq tex={activeMeta.formula} />
            </p>
          </div>
          {activeModel === "subscription" && <SubscriptionPanel params={params} onChange={setParams} />}
          {activeModel === "implementation" && <ImplementationPanel params={params} onChange={setParams} />}
          {activeModel === "advisory" && <AdvisoryPanel params={params} onChange={setParams} />}
          {activeModel === "procurement" && <ProcurementPanel params={params} onChange={setParams} />}
          {activeModel === "managed_services" && <ManagedServicesPanel params={params} onChange={setParams} />}
        </div>

        {/* Shared opex + DSF parameters */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-serif text-base font-semibold">Shared assumptions</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Applied to all models for comparison fairness.
            </p>
          </div>
          <SliderField label="Fixed opex (€k/yr)" symbol="O^{fixed}" value={opex.fixedOpexAnnual / 1000} min={50} max={1000} step={10} onChange={v => patchOpex("fixedOpexAnnual", v * 1000)} channel="theology" format={v => `€${v.toFixed(0)}k`} hint="Team salaries + base costs. Grows at the opex growth rate." />
          <SliderField label="Opex growth /yr" symbol="g_O" value={opex.opexGrowthRate} min={0} max={0.25} step={0.01} onChange={v => patchOpex("opexGrowthRate", v)} channel="theology" format={v => `+${(v*100).toFixed(0)}%`} />
          <SliderField label="Variable opex rate" symbol="\phi" value={opex.variableOpexRate} min={0} max={0.5} step={0.01} onChange={v => patchOpex("variableOpexRate", v)} channel="theology" format={v => `${(v*100).toFixed(0)}% of rev`} hint="Delivery, infra, and variable cost as % of revenue." />
          <SliderField label="Tax rate τ" symbol="\tau" value={opex.taxRate} min={0} max={0.4} step={0.01} onChange={v => patchOpex("taxRate", v)} channel="finance" format={v => `${(v*100).toFixed(0)}%`} />
          <div className="rule-top pt-3 space-y-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">DSF parameters</div>
            <SliderField label="DSF investment I (€k)" symbol="I" value={opex.dsfInvestment / 1000} min={100} max={2000} step={25} onChange={v => patchOpex("dsfInvestment", v * 1000)} channel="finance" format={v => `€${v.toFixed(0)}k`} />
            <SliderField label="Cap multiple κ" symbol="\kappa" value={opex.kappa} min={1} max={5} step={0.1} onChange={v => patchOpex("kappa", v)} channel="finance" hint={`Ω = κ × I = ${fmtEUR(opex.kappa * opex.dsfInvestment)}`} />
            <SliderField label="Reserve floor L* (€k)" symbol="L^{\star}" value={opex.reserveFloor / 1000} min={10} max={500} step={5} onChange={v => patchOpex("reserveFloor", v * 1000)} channel="theology" format={v => `€${v.toFixed(0)}k`} hint="Minimum FCF above which redemption can begin." />
          </div>
        </div>

        <div
          className="text-[11px] leading-relaxed rounded-md px-3 py-2.5"
          style={{ background: "hsl(var(--theology)/0.07)", border: "1px solid hsl(var(--theology)/0.18)" }}
        >
          <span className="font-semibold" style={{ color: "hsl(var(--theology))" }}>NEC alignment:</span>{" "}
          <span className="text-muted-foreground">
            All five models are non-extractive. Excluded: freemium conversion pressure, ad-based,
            proprietary lock-in. Revenue must be earned from genuine value — service, expertise, or managed operations.{" "}
          </span>
          <Link href="/theology" className="underline underline-offset-2 text-muted-foreground hover:text-white/80">
            See Theology tab →
          </Link>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="lg:col-span-9 space-y-6">

        {/* DSF gate summary for active model */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold flex items-center gap-2">
              <span style={{ color: activeMeta.color }}>{activeMeta.label}</span>
              <span className="text-muted-foreground font-normal text-base">— DSF milestone analysis</span>
            </h3>
            <button
              onClick={() => setShowAll(s => !s)}
              className="text-xs px-3 py-1.5 rounded-md transition-colors"
              style={{
                background: showAll ? "hsl(235 50% 18%)" : "hsl(235 35% 12%)",
                border: "1px solid hsl(235 40% 26%)",
                color: "hsl(235 70% 70%)",
              }}
            >
              {showAll ? "Show active only" : "Show all models"}
            </button>
          </div>
          <p className="text-[13px] text-muted-foreground">
            {activeMeta.tagline} · Stability:{" "}
            <span className="text-white/60">{STABILITY_LABELS[activeMeta.stability]}</span> ·{" "}
            Ramp: <span className="text-white/60">{SPEED_LABELS[activeMeta.speed]}</span> ·{" "}
            Scale: <span className="text-white/60">{SCALE_LABELS[activeMeta.scalability]}</span>
          </p>
        </div>

        {/* Gate milestones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GateBadge label="Operating break-even" year={activeResult.breakEvenYear} max={horizon} />
          <GateBadge label="FCF turns positive" year={activeResult.fcfPositiveYear} max={horizon} />
          <GateBadge label="Redemption begins" year={activeResult.redemptionReadyYear} max={horizon} />
          <GateBadge label="Full repayment Ω" year={activeResult.fullRepayYear} max={horizon} />
        </div>

        {/* Summary metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Year-5 revenue", value: fmtEUR(activeResult.year5Revenue) },
            { label: "Year-10 revenue", value: fmtEUR(activeResult.year10Revenue) },
            { label: "Revenue CAGR (5yr)", value: activeResult.cagr5 > 0 ? `+${fmtPct(activeResult.cagr5)}` : "—" },
            { label: "Total FCF (10yr)", value: fmtEUR(activeResult.totalFcf), highlight: activeResult.totalFcf > 0 },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">{m.label}</div>
              <div
                className="text-lg font-mono font-bold"
                style={{
                  color: m.highlight === undefined
                    ? activeMeta.color
                    : m.highlight ? "hsl(148 58% 55%)" : "hsl(0 60% 60%)",
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Revenue trajectory */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold">Revenue trajectory</h3>
            <span className="text-xs text-muted-foreground">Year 1 – {horizon} · {showAll ? "all models" : activeMeta.label + " only"}</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <LineChart data={revenueChartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(237 15% 55%)" }} />
                <YAxis tickFormatter={v => fmtEUR(v)} tick={{ fontSize: 10, fill: "hsl(237 15% 55%)" }} width={52} />
                <RTooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {ALL_MODEL_TYPES.map(t => (
                  <Line
                    key={t}
                    dataKey={t}
                    name={MODEL_META[t].label}
                    stroke={MODEL_META[t].color}
                    strokeWidth={t === activeModel ? 2.5 : 1}
                    strokeOpacity={showAll ? (t === activeModel ? 1 : 0.4) : t === activeModel ? 1 : 0}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FCF detail for active model */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold">
              <span style={{ color: activeMeta.color }}>{activeMeta.label}</span>
              {" "}— FCF and break-even
            </h3>
            <span className="text-xs text-muted-foreground">
              Fixed opex {fmtEUR(opex.fixedOpexAnnual)}/yr · variable {fmtPct(opex.variableOpexRate)}
            </span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <AreaChart data={fcfChartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="fcfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeMeta.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={activeMeta.color} stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="ebitdaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(148 58% 55%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(148 58% 55%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(237 15% 55%)" }} />
                <YAxis tickFormatter={v => fmtEUR(v)} tick={{ fontSize: 10, fill: "hsl(237 15% 55%)" }} width={52} />
                <RTooltip content={<ChartTip />} />
                <ReferenceLine y={0} stroke="hsl(0 60% 55%)" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: "Break-even", position: "insideTopLeft", fontSize: 10, fill: "hsl(0 55% 65%)" }} />
                <ReferenceLine y={opex.reserveFloor} stroke="hsl(38 92% 58%)" strokeDasharray="3 3" strokeWidth={1} label={{ value: "L* floor", position: "insideBottomRight", fontSize: 10, fill: "hsl(38 82% 65%)" }} />
                <Area type="monotone" dataKey="EBITDA" name="EBITDA" stroke="hsl(148 58% 55%)" fill="url(#ebitdaGrad)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="FCF" name="Operating FCF (pre-capex, after tax)" stroke={activeMeta.color} fill="url(#fcfGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            The amber dashed line is the resilience reserve floor L* = {fmtEUR(opex.reserveFloor)}.
            Redemption can only begin when FCF consistently exceeds this threshold.
            Tax (τ = {fmtPct(opex.taxRate)}) is applied to positive EBITDA only.
            &ldquo;FCF&rdquo; here is operating FCF (EBITDA − tax, pre-capex, no ΔNWC) — optimistic
            relative to the Company page&apos;s full FCF chain.
          </p>
        </div>

        {/* Cumulative redeemable vs cap */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold">Cumulative redeemable vs cap Ω</h3>
            <span className="text-xs text-muted-foreground">
              Ω = κ{opex.kappa.toFixed(1)} × {fmtEUR(opex.dsfInvestment)} = {fmtEUR(activeResult.omega)}
            </span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={redemptionChartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(237 15% 55%)" }} />
                <YAxis tickFormatter={v => fmtEUR(v)} tick={{ fontSize: 10, fill: "hsl(237 15% 55%)" }} width={52} />
                <RTooltip content={<ChartTip />} />
                <ReferenceLine y={activeResult.omega} stroke="hsl(38 92% 58%)" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: `Ω ${fmtEUR(activeResult.omega)}`, position: "insideTopRight", fontSize: 10, fill: "hsl(38 82% 65%)" }} />
                {ALL_MODEL_TYPES.map(t => (
                  <Line
                    key={t}
                    dataKey={t}
                    name={MODEL_META[t].label}
                    stroke={MODEL_META[t].color}
                    strokeWidth={t === activeModel ? 2.5 : 1}
                    strokeOpacity={showAll ? (t === activeModel ? 1 : 0.35) : t === activeModel ? 1 : 0}
                    dot={false}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Shows FCF available for redemption (above L* floor), cumulated over time. The fund is fully
            repaid when this line crosses Ω. Models that never cross Ω in the horizon period will not
            achieve full repayment — which is a structural signal, not a failure.
          </p>
        </div>

        {/* Cross-model comparison table */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">Model comparison</h3>
          <p className="text-[12px] text-muted-foreground mb-4">
            All five models with shared opex assumptions. Highlighted row = currently selected.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm border-collapse">
              <thead>
                <tr>
                  {["Model", "Yr-5 Rev", "Yr-10 Rev", "CAGR 5yr", "Break-even", "FCF+", "Rdempt ready", "Full repay", "Stability"].map(h => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 text-[10px] uppercase tracking-wider font-normal text-white/30 border-b"
                      style={{ borderColor: "hsl(235 35% 18%)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allResults.map(r => {
                  const isActive = r.modelType === activeModel;
                  const meta = MODEL_META[r.modelType];
                  const rowBg = isActive ? `${meta.color}10` : "transparent";
                  return (
                    <tr
                      key={r.modelType}
                      onClick={() => setActiveModel(r.modelType)}
                      className="cursor-pointer transition-colors"
                      style={{ background: rowBg, borderBottom: "1px solid hsl(235 35% 16%)" }}
                    >
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[12px]" style={{ color: meta.color }}>{meta.label}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[12px] text-white/70">{fmtEUR(r.year5Revenue)}</td>
                      <td className="py-2.5 px-3 font-mono text-[12px] text-white/70">{fmtEUR(r.year10Revenue)}</td>
                      <td className="py-2.5 px-3 font-mono text-[12px] text-white/70">
                        {r.cagr5 > 0 ? `+${fmtPct(r.cagr5)}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[12px]" style={{ color: r.breakEvenYear && r.breakEvenYear <= 4 ? "hsl(148 58% 55%)" : r.breakEvenYear ? "hsl(38 92% 58%)" : "hsl(0 60% 60%)" }}>
                        {fmtYr(r.breakEvenYear)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[12px]" style={{ color: r.fcfPositiveYear && r.fcfPositiveYear <= 5 ? "hsl(148 58% 55%)" : r.fcfPositiveYear ? "hsl(38 92% 58%)" : "hsl(0 60% 60%)" }}>
                        {fmtYr(r.fcfPositiveYear)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[12px]" style={{ color: r.redemptionReadyYear && r.redemptionReadyYear <= 6 ? "hsl(148 58% 55%)" : r.redemptionReadyYear ? "hsl(38 92% 58%)" : "hsl(0 60% 60%)" }}>
                        {fmtYr(r.redemptionReadyYear)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[12px]" style={{ color: r.fullRepayYear ? "hsl(148 58% 55%)" : "hsl(0 60% 60%)" }}>
                        {fmtYr(r.fullRepayYear)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StabilityDots score={r.stabilityScore} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Structuring guide */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <h3 className="font-serif text-lg font-semibold">Structuring guide — matching model to company archetype</h3>
          <p className="text-[12px] text-muted-foreground">
            Not all companies can use all models. The choice is constrained by the company's market,
            team composition, and the DSF's non-extractive principles.
          </p>
          <div className="space-y-3">
            {[
              {
                model: "Subscription" as const,
                color: MODEL_META.subscription.color,
                when: "Best for: platforms, tools, and infrastructure with multiple institutional users",
                dsf: "Highest predictability — easiest to model redemption schedule against. Works when the organisation has many users, not one large client.",
                risk: "Slow start — early churn can delay break-even if acquisition is weak.",
              },
              {
                model: "Implementation" as const,
                color: MODEL_META.implementation.color,
                when: "Best for: technical teams with delivery capacity, open-source products requiring customisation",
                dsf: "Fast cash generation — implementation projects can produce positive FCF early. But revenue is lumpy and capacity-constrained.",
                risk: "Does not scale without growing the team. Redemption capacity is bounded by delivery throughput.",
              },
              {
                model: "Advisory" as const,
                color: MODEL_META.advisory.color,
                when: "Best for: companies where the founders are the product — rare expertise in digital sovereignty, procurement, compliance",
                dsf: "Revenue can start quickly with just 2–3 senior consultants. Utilisation is the key variable — aim above 65%.",
                risk: "Hard to scale. If key consultants leave, revenue collapses. Not suitable as a primary model for evergreen fund logic.",
              },
              {
                model: "Procurement" as const,
                color: MODEL_META.procurement.color,
                when: "Best for: companies targeting EU / national government digital infrastructure contracts",
                dsf: "Strategically the most important — largest contract values, aligned with digital sovereignty mission. DSF's P_t (procurement access) variable is directly linked.",
                risk: "Slowest ramp. Win rates are low (20–40%). Revenue is highly lumpy. Company needs runway of 18–36 months before first contract.",
              },
              {
                model: "Managed Services" as const,
                color: MODEL_META.managed_services.color,
                when: "Best for: companies operating open-source infrastructure for public bodies or cooperative networks",
                dsf: "Highest stability once client base is established. Low churn, predictable cash flow — ideal for long-term redemption planning.",
                risk: "High infrastructure cost base. Variable opex rate can be 25–40%. Break-even requires a critical mass of clients.",
              },
            ].map(({ model, color, when, dsf, risk }) => (
              <div key={model} className="rounded-lg p-4 space-y-1.5" style={{ background: "hsl(235 40% 9%)", border: `1px solid ${color}28` }}>
                <div className="font-semibold text-sm" style={{ color }}>{model}</div>
                <p className="text-[12px] text-white/55 leading-relaxed">{when}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: "hsl(148 40% 60%)" }}>
                  <span className="font-medium">DSF angle: </span>{dsf}
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: "hsl(38 72% 60%)" }}>
                  <span className="font-medium">Watch for: </span>{risk}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-links */}
        <div
          className="rounded-lg px-4 py-3.5 text-[12px] leading-relaxed flex flex-wrap gap-4 items-center"
          style={{ background: CARD_BG, border: CARD_BORDER }}
        >
          <span className="text-white/50">Take this further:</span>
          <Link href="/company" className="underline underline-offset-2 text-white/60 hover:text-white/90">
            Portfolio tab — plug year-by-year revenue into the full company redemption model →
          </Link>
          <Link href="/tax" className="underline underline-offset-2 text-white/60 hover:text-white/90">
            Tax tab — test how model type affects fund-level tax treatment →
          </Link>
          <Link href="/impact" className="underline underline-offset-2 text-white/60 hover:text-white/90">
            Impact tab — see how procurement access (Pₜ) links to this model →
          </Link>
        </div>
      </div>
    </div>
  );
}

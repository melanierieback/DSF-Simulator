import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { SliderField } from "@/components/dsf/SliderField";
import {
  ALL_CONCEPTS,
  CONCEPT_META,
  NEC_CLAUSES,
  DEFAULT_SCENARIO,
  computeDamages,
  computeLosses,
  computeIndemnities,
  computeMaterialBreach,
  computeForceM,
  computeAllExtractions,
  type LegalConcept,
  type LiabilityScenario,
} from "@/lib/legalModel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEUR(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}k`;
  return `€${v.toFixed(0)}`;
}
function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

const CONVENTIONAL = "hsl(0 60% 58%)";
const NEC_COLOR = "hsl(148 58% 52%)";
const AMBER = "hsl(38 92% 58%)";
const CARD_BG = "hsl(235 40% 11%)";
const CARD_BORDER = "1px solid hsl(235 35% 20%)";
const THEOLOGY = "hsl(var(--theology))";

// ── Concept colour ────────────────────────────────────────────────────────────

const CONCEPT_COLOR: Record<LegalConcept, string> = {
  damages: "hsl(235 85% 72%)",
  losses: "hsl(148 58% 52%)",
  indemnities: "hsl(270 58% 70%)",
  material_breach: "hsl(38 92% 58%)",
  force_majeure: "hsl(180 55% 52%)",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
      {children}
    </div>
  );
}

function DualBar({
  label,
  conventional,
  nec,
  max,
}: {
  label: string;
  conventional: number;
  nec: number;
  max: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/50">{label}</span>
        <span className="font-mono text-[11px]" style={{ color: NEC_COLOR }}>
          saves {fmtEUR(conventional - nec)}
        </span>
      </div>
      <div className="flex gap-1 h-5">
        <div className="flex-1 rounded-sm overflow-hidden" style={{ background: "hsl(235 35% 16%)" }}>
          <div
            className="h-full rounded-sm transition-all"
            style={{ width: `${Math.min(100, (conventional / max) * 100)}%`, background: CONVENTIONAL }}
          />
        </div>
        <div className="flex-1 rounded-sm overflow-hidden" style={{ background: "hsl(235 35% 16%)" }}>
          <div
            className="h-full rounded-sm transition-all"
            style={{ width: `${Math.min(100, (nec / max) * 100)}%`, background: NEC_COLOR }}
          />
        </div>
      </div>
      <div className="flex gap-1 text-[10px]">
        <div className="flex-1 font-mono text-center" style={{ color: CONVENTIONAL }}>{fmtEUR(conventional)}</div>
        <div className="flex-1 font-mono text-center" style={{ color: NEC_COLOR }}>{fmtEUR(nec)}</div>
      </div>
    </div>
  );
}

function ClauseCompare({ clause }: { clause: typeof NEC_CLAUSES[number] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-lg p-4 space-y-2" style={{ background: "hsl(0 30% 8%)", border: "1px solid hsl(0 40% 22%)" }}>
        <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: CONVENTIONAL }}>
          Conventional clause
        </div>
        <p className="text-[12px] leading-relaxed text-white/60 italic">
          "{clause.conventional}"
        </p>
      </div>
      <div className="rounded-lg p-4 space-y-2" style={{ background: "hsl(148 30% 7%)", border: "1px solid hsl(148 40% 20%)" }}>
        <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: NEC_COLOR }}>
          NEC clause (Dutch law anchored)
        </div>
        <p className="text-[12px] leading-relaxed text-white/60 italic">
          "{clause.nec}"
        </p>
        <div
          className="text-[10px] leading-relaxed pt-1 mt-1"
          style={{ borderTop: "1px solid hsl(148 30% 16%)", color: "hsl(148 40% 50%)" }}
        >
          {clause.dutchAnchor}
        </div>
      </div>
    </div>
  );
}

function PrincipleCard({
  thomist,
  dutch,
  color,
}: {
  thomist: string;
  dutch: string;
  color: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-lg p-4 space-y-1.5" style={{ background: `${color}0d`, border: `1px solid ${color}30` }}>
        <div className="text-[10px] uppercase tracking-wider" style={{ color }}>Thomistic principle</div>
        <p className="text-[13px] text-white/70 leading-relaxed">{thomist}</p>
      </div>
      <div className="rounded-lg p-4 space-y-1.5" style={{ background: "hsl(235 40% 9%)", border: "1px solid hsl(235 40% 20%)" }}>
        <div className="text-[10px] uppercase tracking-wider text-white/35">Dutch law equivalent</div>
        <p className="text-[13px] text-white/70 leading-relaxed">{dutch}</p>
      </div>
    </div>
  );
}

function ConventionalBiasNote({ text }: { text: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-[12px] leading-relaxed"
      style={{ background: "hsl(0 25% 8%)", border: "1px solid hsl(0 40% 22%)" }}
    >
      <span className="font-semibold" style={{ color: CONVENTIONAL }}>Conventional default: </span>
      <span className="text-white/55">{text}</span>
    </div>
  );
}

function NecPathNote({ text }: { text: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-[12px] leading-relaxed"
      style={{ background: "hsl(148 25% 7%)", border: "1px solid hsl(148 40% 20%)" }}
    >
      <span className="font-semibold" style={{ color: NEC_COLOR }}>NEC path (within Dutch law): </span>
      <span className="text-white/55">{text}</span>
    </div>
  );
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
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

// ── Concept detail panels ─────────────────────────────────────────────────────

function DamagesPanel({ s }: { s: LiabilityScenario }) {
  const r = computeDamages(s);
  const meta = CONCEPT_META.damages;
  const color = CONCEPT_COLOR.damages;
  const clause = NEC_CLAUSES.find(c => c.concept === "damages")!;
  const max = r.conventional * 1.1;

  return (
    <div className="space-y-5">
      <PrincipleCard thomist={meta.thomistPrinciple} dutch={meta.dutchPrinciple} color={color} />
      <ConventionalBiasNote text={meta.conventionalBias} />
      <NecPathNote text={meta.necPath} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Direct loss", value: fmtEUR(r.directLoss), note: "Actual harm" },
          { label: "Conventional total", value: fmtEUR(r.conventional), note: `${fmtPct(r.extractionRatio - 1)} extraction premium`, col: CONVENTIONAL },
          { label: "NEC total", value: fmtEUR(r.nec), note: `Extraction averted: ${fmtEUR(r.saving)}`, col: NEC_COLOR },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
            <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">{m.label}</div>
            <div className="text-xl font-mono font-bold" style={{ color: m.col ?? "hsl(237 20% 75%)" }}>{m.value}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{m.note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg p-4 space-y-3" style={{ background: CARD_BG, border: CARD_BORDER }}>
        <div className="flex gap-4 text-[10px] uppercase tracking-wider">
          <span style={{ color: CONVENTIONAL }}>● Conventional</span>
          <span style={{ color: NEC_COLOR }}>● NEC</span>
        </div>
        <DualBar label="Direct loss" conventional={r.conventionalBreakdown.direct} nec={r.nec} max={max} />
        <DualBar label="+ Consequential losses" conventional={r.conventionalBreakdown.consequential} nec={0} max={max} />
        <DualBar label="+ Legal cost loading" conventional={r.conventionalBreakdown.legal} nec={0} max={max} />
      </div>

      <ClauseCompare clause={clause} />
    </div>
  );
}

function LossesPanel({ s }: { s: LiabilityScenario }) {
  const r = computeLosses(s);
  const meta = CONCEPT_META.losses;
  const color = CONCEPT_COLOR.losses;
  const clause = NEC_CLAUSES.find(c => c.concept === "losses")!;

  return (
    <div className="space-y-5">
      <PrincipleCard thomist={meta.thomistPrinciple} dutch={meta.dutchPrinciple} color={color} />
      <ConventionalBiasNote text={meta.conventionalBias} />
      <NecPathNote text={meta.necPath} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { label: "Gross loss claim", sub: "Before mitigation", v: fmtEUR(r.grossClaim), c: "hsl(237 20% 70%)" },
          { label: "Mitigated by claimant", sub: "Art. 6:101 BW effort", v: `−${fmtEUR(r.mitigated)}`, c: NEC_COLOR },
          { label: "Future revenue (conventional)", sub: "18 months projected", v: fmtEUR(r.futureRevenueConventional), c: CONVENTIONAL },
          { label: "Future revenue (NEC)", sub: "6 months · objective rate", v: fmtEUR(r.futureRevenueNEC), c: NEC_COLOR },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
            <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">{m.label}</div>
            <div className="text-xl font-mono font-bold" style={{ color: m.c }}>{m.v}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "hsl(0 25% 8%)", border: `1px solid ${CONVENTIONAL}44` }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: CONVENTIONAL }}>Conventional total claim</div>
          <div className="text-2xl font-mono font-bold" style={{ color: CONVENTIONAL }}>{fmtEUR(r.conventional)}</div>
          <div className="text-[11px] text-white/40 mt-0.5">{fmtPct(r.extractionRatio)}× direct loss</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "hsl(148 25% 7%)", border: `1px solid ${NEC_COLOR}44` }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: NEC_COLOR }}>NEC total claim</div>
          <div className="text-2xl font-mono font-bold" style={{ color: NEC_COLOR }}>{fmtEUR(r.nec)}</div>
          <div className="text-[11px] text-white/40 mt-0.5">Saves {fmtEUR(r.saving)}</div>
        </div>
      </div>

      <ClauseCompare clause={clause} />
    </div>
  );
}

function IndemnitiesPanel({ s }: { s: LiabilityScenario }) {
  const r = computeIndemnities(s);
  const meta = CONCEPT_META.indemnities;
  const color = CONCEPT_COLOR.indemnities;
  const clause = NEC_CLAUSES.find(c => c.concept === "indemnities")!;

  return (
    <div className="space-y-5">
      <PrincipleCard thomist={meta.thomistPrinciple} dutch={meta.dutchPrinciple} color={color} />
      <ConventionalBiasNote text={meta.conventionalBias} />
      <NecPathNote text={meta.necPath} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Third-party claim", v: fmtEUR(r.thirdPartyClaim), note: "Direct verified claim" },
          { label: "Uncapped exposure (conventional)", v: fmtEUR(r.uncappedExposure), note: "After legal escalation", c: CONVENTIONAL },
          { label: "NEC cap (indemnity ceiling)", v: fmtEUR(r.necCap), note: `${fmtPct(s.indemnityCapFraction)} of contract value`, c: color },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
            <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">{m.label}</div>
            <div className="text-xl font-mono font-bold" style={{ color: m.c ?? "hsl(237 20% 70%)" }}>{m.v}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{m.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "hsl(0 25% 8%)", border: `1px solid ${CONVENTIONAL}44` }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: CONVENTIONAL }}>Conventional indemnity exposure</div>
          <div className="text-2xl font-mono font-bold" style={{ color: CONVENTIONAL }}>{fmtEUR(r.conventional)}</div>
          <div className="text-[11px] text-white/40 mt-0.5">{fmtPct(r.extractionRatio)}× the actual claim</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "hsl(148 25% 7%)", border: `1px solid ${NEC_COLOR}44` }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: NEC_COLOR }}>NEC capped exposure</div>
          <div className="text-2xl font-mono font-bold" style={{ color: NEC_COLOR }}>{fmtEUR(r.nec)}</div>
          <div className="text-[11px] text-white/40 mt-0.5">Extraction averted: {fmtEUR(r.saving)}</div>
        </div>
      </div>

      <ClauseCompare clause={clause} />
    </div>
  );
}

function MaterialBreachPanel({ s }: { s: LiabilityScenario }) {
  const r = computeMaterialBreach(s);
  const meta = CONCEPT_META.material_breach;
  const color = CONCEPT_COLOR.material_breach;
  const clause = NEC_CLAUSES.find(c => c.concept === "material_breach")!;

  return (
    <div className="space-y-5">
      <PrincipleCard thomist={meta.thomistPrinciple} dutch={meta.dutchPrinciple} color={color} />
      <ConventionalBiasNote text={meta.conventionalBias} />
      <NecPathNote text={meta.necPath} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(0 25% 8%)", border: `1px solid ${CONVENTIONAL}44` }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: CONVENTIONAL }}>
            Conventional remedy
          </div>
          <div className="text-[13px] font-semibold text-white/70">{r.conventional.remedy}</div>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-white/40">Breach damages</span><span className="font-mono" style={{ color: CONVENTIONAL }}>{fmtEUR(r.conventional.terminationDamages)}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Accelerated future claims</span><span className="font-mono" style={{ color: CONVENTIONAL }}>{fmtEUR(r.conventional.acceleratedClaims)}</span></div>
            <div className="flex justify-between border-t pt-2" style={{ borderColor: "hsl(0 30% 20%)" }}><span className="text-white/60 font-semibold">Total extraction</span><span className="font-mono font-bold" style={{ color: CONVENTIONAL }}>{fmtEUR(r.conventional.total)}</span></div>
          </div>
        </div>

        <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(148 25% 7%)", border: `1px solid ${NEC_COLOR}44` }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: NEC_COLOR }}>
            NEC remedy sequence
          </div>
          <div className="text-[13px] font-semibold text-white/70">{r.nec.remedy}</div>
          <div className="space-y-1.5 text-[12px]">
            {[
              `① Written notice + ${r.nec.curePeriodDays}-day cure period`,
              "② Mediation (NVM protocol)",
              "③ Specific performance (nakoming)",
              "④ Proportionate partial remedy only",
            ].map(step => (
              <div key={step} className="flex items-start gap-2">
                <span className="text-white/30 shrink-0 mt-0.5">→</span>
                <span className="text-white/55">{step}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t pt-2 text-[12px]" style={{ borderColor: "hsl(148 30% 16%)" }}>
            <span className="text-white/60 font-semibold">Max remedy</span>
            <span className="font-mono font-bold" style={{ color: NEC_COLOR }}>{fmtEUR(r.nec.total)}</span>
          </div>
        </div>
      </div>

      <div
        className="rounded-lg px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${color}10`, border: `1px solid ${color}30` }}
      >
        <span className="font-semibold" style={{ color }}>Extraction averted: </span>
        <span className="font-mono font-bold" style={{ color }}>{fmtEUR(r.saving)}</span>
        <span className="text-white/50"> — the difference between a failure event becoming a maximum-extraction event vs a restoration event.</span>
      </div>

      <ClauseCompare clause={clause} />
    </div>
  );
}

function ForceMajeurePanel({ s }: { s: LiabilityScenario }) {
  const r = computeForceM(s);
  const meta = CONCEPT_META.force_majeure;
  const color = CONCEPT_COLOR.force_majeure;
  const clause = NEC_CLAUSES.find(c => c.concept === "force_majeure")!;

  return (
    <div className="space-y-5">
      <PrincipleCard thomist={meta.thomistPrinciple} dutch={meta.dutchPrinciple} color={color} />
      <ConventionalBiasNote text={meta.conventionalBias} />
      <NecPathNote text={meta.necPath} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "FM period value", v: fmtEUR(r.fmPeriodValue), note: `${s.fmDurationMonths} months affected` },
          { label: "Remaining contract value", v: fmtEUR(r.remainingValue), note: `${s.fmTotalMonths - s.fmDurationMonths} months unaffected` },
          { label: "Extraction averted", v: fmtEUR(r.saving), note: "By choosing NEC path", c: NEC_COLOR },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BORDER }}>
            <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">{m.label}</div>
            <div className="text-xl font-mono font-bold" style={{ color: m.c ?? "hsl(237 20% 70%)" }}>{m.v}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{m.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(0 25% 8%)", border: `1px solid ${CONVENTIONAL}44` }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: CONVENTIONAL }}>Conventional: FM = extraction event</div>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-white/40">FM party absorbs</span><span className="font-mono text-white/70">{fmtPct(r.fmShareConventional)} of risk</span></div>
            <div className="flex justify-between"><span className="text-white/40">Termination claim</span><span className="font-mono" style={{ color: CONVENTIONAL }}>{fmtEUR(r.conventional.terminationValue)}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Accelerated obligations</span><span className="font-mono" style={{ color: CONVENTIONAL }}>{fmtEUR(r.conventional.acceleratedClaims)}</span></div>
            <div className="flex justify-between border-t pt-2" style={{ borderColor: "hsl(0 30% 20%)" }}><span className="font-semibold text-white/60">Total extracted</span><span className="font-mono font-bold" style={{ color: CONVENTIONAL }}>{fmtEUR(r.conventional.total)}</span></div>
          </div>
        </div>

        <div className="rounded-xl p-5 space-y-3" style={{ background: "hsl(148 25% 7%)", border: `1px solid ${NEC_COLOR}44` }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: NEC_COLOR }}>NEC path: FM = shared suspension</div>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-white/40">FM cost shared</span><span className="font-mono text-white/70">{fmtPct(r.fmShareNEC)} each party</span></div>
            <div className="flex justify-between"><span className="text-white/40">Suspension cost (shared)</span><span className="font-mono" style={{ color: NEC_COLOR }}>{fmtEUR(r.nec.suspensionCost)}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Contract status</span><span className="font-mono" style={{ color: NEC_COLOR }}>Continues</span></div>
            <div className="flex justify-between border-t pt-2" style={{ borderColor: "hsl(148 30% 16%)" }}><span className="font-semibold text-white/60">Total cost of NEC path</span><span className="font-mono font-bold" style={{ color: NEC_COLOR }}>{fmtEUR(r.nec.total)}</span></div>
          </div>
        </div>
      </div>

      <ClauseCompare clause={clause} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LegalPage() {
  const [activeConcept, setActiveConcept] = useState<LegalConcept>("damages");
  const [s, setS] = useState<LiabilityScenario>(DEFAULT_SCENARIO);

  const patch = (k: keyof LiabilityScenario, v: number) =>
    setS(prev => ({ ...prev, [k]: v }));

  const extractions = useMemo(() => computeAllExtractions(s), [s]);

  const activeConceptIdx = ALL_CONCEPTS.indexOf(activeConcept);
  const meta = CONCEPT_META[activeConcept];
  const color = CONCEPT_COLOR[activeConcept];

  // Bar chart data
  const chartData = extractions.map(e => ({
    name: e.label,
    Conventional: Math.round(e.conventional),
    NEC: Math.round(e.nec),
    Averted: Math.round(e.extractionAverted),
  }));

  const totalConventional = extractions.reduce((s, e) => s + e.conventional, 0);
  const totalNEC = extractions.reduce((s, e) => s + e.nec, 0);
  const totalAverted = totalConventional - totalNEC;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-12 space-y-2">
        <div className="text-xs uppercase tracking-[0.2em] text-theology">Legal Framework</div>
        <h2 className="font-serif text-3xl font-semibold">Liability regime that protects without extracting</h2>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Dutch civil law and Thomistic moral theology are not in conflict — they converge on the same
          principle:{" "}
          <span className="text-white/70 font-medium">redelijkheid en billijkheid</span>{" "}
          (reasonableness and fairness, Art. 6:2 BW) is Thomistic commutative justice encoded in statute.
          The conventional legal default is extractive. The NEC path is already available within Dutch law —
          we simply have to choose it deliberately in each contract.
        </p>

        {/* Core equivalence banner */}
        <div
          className="rounded-lg px-5 py-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ background: `${THEOLOGY}0d`, border: `1px solid ${THEOLOGY}28` }}
        >
          {[
            {
              left: "Thomism",
              right: "Dutch law",
              l: "Restitutio in integrum — restoration, not punishment",
              r: "Vermogensschade only · No punitive damages · Art. 6:95 BW",
            },
            {
              left: "Thomism",
              right: "Dutch law",
              l: "Prudentia — proportionality in all remedies",
              r: "Matiging (Art. 6:94 BW) · Redelijkheid en billijkheid (Art. 6:248 BW)",
            },
            {
              left: "Thomism",
              right: "Dutch law",
              l: "No obligation under impossibility",
              r: "Overmacht (Art. 6:75 BW) · Onvoorziene omstandigheden (Art. 6:258 BW)",
            },
          ].map((row, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                <span style={{ color: THEOLOGY }}>{row.left}</span>
                <span className="text-white/25">↔</span>
                <span className="text-white/40">{row.right}</span>
              </div>
              <div className="text-[12px] leading-snug" style={{ color: THEOLOGY }}>{row.l}</div>
              <div className="text-[11px] leading-snug text-white/40">{row.r}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Left rail ───────────────────────────────────────────────────── */}
      <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-24 self-start">

        {/* Scenario parameters */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-serif text-base font-semibold">Contract scenario</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Shared across all five legal concepts.
            </p>
          </div>
          <SliderField
            label="Contract value"
            symbol="V"
            value={s.contractValue / 1000}
            min={50}
            max={5000}
            step={25}
            onChange={v => patch("contractValue", v * 1000)}
            channel="finance"
            format={v => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="Breach fraction"
            symbol="b"
            value={s.breachFraction}
            min={0.05}
            max={1.0}
            step={0.05}
            onChange={v => patch("breachFraction", v)}
            channel="theology"
            format={v => `${(v * 100).toFixed(0)}% of contract`}
            hint="The fraction of contract value at issue in the dispute."
          />
          <SliderField
            label="Consequential multiple"
            symbol="c"
            value={s.consequentialMultiple}
            min={1.0}
            max={5.0}
            step={0.1}
            onChange={v => patch("consequentialMultiple", v)}
            channel="theology"
            format={v => `${v.toFixed(1)}× direct loss`}
            hint="Conventional: total claim = consequential multiple × direct loss."
          />
          <SliderField
            label="NEC damages cap"
            symbol="\Gamma"
            value={s.necDamagesCap}
            min={0.1}
            max={1.5}
            step={0.05}
            onChange={v => patch("necDamagesCap", v)}
            channel="finance"
            format={v => `${(v * 100).toFixed(0)}% of contract`}
          />
          <SliderField
            label="Indemnity cap"
            symbol="\Lambda"
            value={s.indemnityCapFraction}
            min={0.1}
            max={2.0}
            step={0.1}
            onChange={v => patch("indemnityCapFraction", v)}
            channel="finance"
            format={v => `${(v * 100).toFixed(0)}% of contract`}
          />
          <SliderField
            label="Cure period (days)"
            symbol="t_{cure}"
            value={s.curePeroidDays}
            min={14}
            max={180}
            step={7}
            onChange={v => patch("curePeroidDays", Math.round(v))}
            channel="impact"
            format={v => `${v.toFixed(0)} days`}
          />
          <SliderField
            label="FM duration (months)"
            symbol="t_{FM}"
            value={s.fmDurationMonths}
            min={1}
            max={18}
            step={1}
            onChange={v => patch("fmDurationMonths", Math.round(v))}
            channel="impact"
            format={v => `${v.toFixed(0)} months`}
          />
          <SliderField
            label="Total contract (months)"
            symbol="T"
            value={s.fmTotalMonths}
            min={6}
            max={60}
            step={6}
            onChange={v => patch("fmTotalMonths", Math.round(v))}
            channel="finance"
            format={v => `${v.toFixed(0)} months`}
          />
          <SliderField
            label="Mitigation effort"
            symbol="\mu"
            value={s.mitigationEffort}
            min={0}
            max={1.0}
            step={0.05}
            onChange={v => patch("mitigationEffort", v)}
            channel="impact"
            format={v => `${(v * 100).toFixed(0)}% of loss`}
            hint="Art. 6:101 BW: fraction of loss claimant actively mitigates."
          />
        </div>

        {/* Aggregate summary */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
          <h3 className="font-serif text-base font-semibold">Total extraction across all concepts</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-white/50">Conventional total</span>
              <span className="font-mono font-semibold" style={{ color: CONVENTIONAL }}>{fmtEUR(totalConventional)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-white/50">NEC total</span>
              <span className="font-mono font-semibold" style={{ color: NEC_COLOR }}>{fmtEUR(totalNEC)}</span>
            </div>
            <div
              className="flex justify-between text-[12px] pt-2 mt-1"
              style={{ borderTop: CARD_BORDER }}
            >
              <span className="text-white/70 font-semibold">Extraction averted</span>
              <span className="font-mono font-bold" style={{ color: NEC_COLOR }}>{fmtEUR(totalAverted)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-white/40">As % of contract value</span>
              <span className="font-mono" style={{ color: AMBER }}>
                {fmtPct(totalAverted / s.contractValue)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            This is the financial value of consciously choosing the NEC path in five standard contract situations.
          </p>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-9 space-y-6">

        {/* Overview chart */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold">Extraction comparison across all five concepts</h3>
            <div className="flex gap-4 text-[10px] uppercase tracking-wider">
              <span style={{ color: CONVENTIONAL }}>● Conventional</span>
              <span style={{ color: NEC_COLOR }}>● NEC</span>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(237 15% 55%)" }} />
                <YAxis tickFormatter={v => fmtEUR(v)} tick={{ fontSize: 10, fill: "hsl(237 15% 55%)" }} width={56} />
                <RTooltip content={<ChartTip />} />
                <Bar dataKey="Conventional" fill={CONVENTIONAL} radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="NEC" fill={NEC_COLOR} radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Concept tabs */}
        <div>
          <div className="flex gap-1 flex-wrap mb-5">
            {ALL_CONCEPTS.map((c, i) => {
              const m = CONCEPT_META[c];
              const col = CONCEPT_COLOR[c];
              const isActive = c === activeConcept;
              return (
                <button
                  key={c}
                  onClick={() => setActiveConcept(c)}
                  className="px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: isActive ? `${col}18` : "hsl(235 40% 11%)",
                    border: isActive ? `1.5px solid ${col}70` : CARD_BORDER,
                    color: isActive ? col : "hsl(237 15% 55%)",
                  }}
                >
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{i + 1}. {m.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Active concept */}
          <div className="rounded-xl p-5 space-y-5" style={{ background: CARD_BG, border: `1.5px solid ${color}35` }}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SectionLabel>{meta.dutchLabel}</SectionLabel>
                <span className="text-[10px] text-muted-foreground">{meta.dutchLawAnchor}</span>
              </div>
              <h3 className="font-serif text-xl font-semibold" style={{ color }}>
                {meta.label}
              </h3>
              <p className="text-[13px] text-muted-foreground">{meta.subtitle}</p>
            </div>

            {activeConcept === "damages" && <DamagesPanel s={s} />}
            {activeConcept === "losses" && <LossesPanel s={s} />}
            {activeConcept === "indemnities" && <IndemnitiesPanel s={s} />}
            {activeConcept === "material_breach" && <MaterialBreachPanel s={s} />}
            {activeConcept === "force_majeure" && <ForceMajeurePanel s={s} />}
          </div>
        </div>

        {/* Extraction summary table */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">Extraction averted — all five concepts</h3>
          <p className="text-[12px] text-muted-foreground mb-4">
            For a {fmtEUR(s.contractValue)} contract with {fmtPct(s.breachFraction)} at issue.
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {["Concept", "Dutch law article", "Conventional", "NEC", "Averted", "Averted %"].map(h => (
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
              {extractions.map(e => {
                const m = CONCEPT_META[e.concept];
                const col = CONCEPT_COLOR[e.concept];
                const isActive = e.concept === activeConcept;
                return (
                  <tr
                    key={e.concept}
                    onClick={() => setActiveConcept(e.concept)}
                    className="cursor-pointer transition-colors"
                    style={{
                      background: isActive ? `${col}0d` : "transparent",
                      borderBottom: "1px solid hsl(235 35% 16%)",
                    }}
                  >
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[12px]" style={{ color: col }}>{e.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-white/35">{m.dutchLawAnchor}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px]" style={{ color: CONVENTIONAL }}>{fmtEUR(e.conventional)}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px]" style={{ color: NEC_COLOR }}>{fmtEUR(e.nec)}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px]" style={{ color: NEC_COLOR }}>{fmtEUR(e.extractionAverted)}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px]" style={{ color: AMBER }}>{fmtPct(e.extractionAvertedPct)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "1px solid hsl(235 35% 22%)" }}>
                <td className="py-2.5 px-3 font-semibold text-[12px] text-white/70" colSpan={2}>Total</td>
                <td className="py-2.5 px-3 font-mono font-bold text-[13px]" style={{ color: CONVENTIONAL }}>{fmtEUR(totalConventional)}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-[13px]" style={{ color: NEC_COLOR }}>{fmtEUR(totalNEC)}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-[13px]" style={{ color: NEC_COLOR }}>{fmtEUR(totalAverted)}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-[13px]" style={{ color: AMBER }}>{fmtPct(totalAverted / totalConventional)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Structuring principle */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <h3 className="font-serif text-lg font-semibold">How to use this in your contracts</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            The NEC legal framework is not a deviation from Dutch law — it is a deliberate choice of the
            non-extractive path <em>within</em> Dutch law. Every clause above is enforceable under the
            Burgerlijk Wetboek. The argument to counterparties is simple:
          </p>
          <div className="space-y-3">
            {[
              {
                title: "To investors (LP agreements, fund documents)",
                body: "The fund's instruments are structured as equity participation with defined redemption caps. Indemnities are capped at the investment value. Force majeure triggers renegotiation, not acceleration. This is a coherent legal position, not a gap — it is the application of Art. 6:258 BW and redelijkheid en billijkheid to fund structures.",
                color: "hsl(235 85% 72%)",
              },
              {
                title: "To portfolio companies (investment agreements)",
                body: "Material breach is narrowly defined and triggers cure, not termination. Damages are capped at direct loss. The fund explicitly waives consequential loss claims against portfolio companies — this is a structural non-extraction commitment, not mere goodwill.",
                color: "hsl(148 58% 52%)",
              },
              {
                title: "To consultants and advisors (service agreements)",
                body: "Indemnities are bilateral and capped. IP indemnities are limited to verified infringement claims from materials the consultant actually provided. Force majeure means shared suspension, not the consultant bearing 100% of the risk of an event beyond their control.",
                color: "hsl(270 58% 70%)",
              },
              {
                title: "To public procurement counterparties",
                body: "Dutch public procurement law (Aanbestedingswet 2012) already embeds proportionality requirements. NEC contracts are structurally aligned with the 'proportionaliteitsbeginsel' in public procurement. This is a competitive advantage in tendering, not a constraint.",
                color: "hsl(38 92% 58%)",
              },
            ].map(item => (
              <div
                key={item.title}
                className="rounded-lg p-4 space-y-1.5"
                style={{ background: `${item.color}0c`, border: `1px solid ${item.color}25` }}
              >
                <div className="font-semibold text-[13px]" style={{ color: item.color }}>{item.title}</div>
                <p className="text-[12px] text-white/55 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
          <div
            className="rounded-lg px-4 py-3 text-[12px] leading-relaxed"
            style={{ background: `${THEOLOGY}0d`, border: `1px solid ${THEOLOGY}28` }}
          >
            <span className="font-semibold" style={{ color: THEOLOGY }}>The Thomism–Dutch law bridge: </span>
            <span className="text-white/55">
              Thomistic commutative justice requires that exchanges be equal in value, that remedies restore
              rather than punish, and that no party profit from another's misfortune. Dutch civil law
              expresses this as <em>redelijkheid en billijkheid</em> (Art. 6:2 BW), <em>matiging</em>
              (Art. 6:94 BW), and <em>onvoorziene omstandigheden</em> (Art. 6:258 BW). A counterparty who
              does not accept Thomism will accept Dutch law. The substantive result is identical.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

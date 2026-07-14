import { ArrowRight, AlertTriangle, BookOpen, BarChart2, Layers, Map } from "lucide-react";
import { useGuidedMode } from "@/contexts/guidedMode";
import { useDsf } from "@/hooks/useDsfStore";
import { GuidedWalkthrough, useModuleDefs } from "@/components/dsf/GuidedWalkthrough";
import { getDriftStatus, getDriftNote, getModuleLiveDisplay } from "@/lib/driftDetection";
import type { DriftStatus } from "@/lib/driftDetection";

const MODULE_META = [
  {
    index: 0,
    title: "Survival",
    subtitle: "The Only Free Lever",
    question: "Can we improve returns without increasing extraction?",
    persona: "Elena Sørensen",
    variables: ["p", "k", "N"],
    channel: "finance" as const,
    channelLabel: "Financial",
  },
  {
    index: 1,
    title: "Repayment Cap",
    subtitle: "What Are You Charging For?",
    question: "Is the investor repaid for service, risk, or opportunity cost?",
    persona: "Fr. Tomás Brennan",
    variables: ["δ", "π", "ρ", "λ", "U", "T"],
    channel: "theology" as const,
    channelLabel: "Theological",
  },
  {
    index: 2,
    title: "Impact",
    subtitle: "Does the Money Become Infrastructure?",
    question: "Does survival translate into open, sovereign, adopted infrastructure?",
    persona: "Dr. Yaw Asante",
    variables: ["L", "o", "d", "a", "e", "I"],
    channel: "impact" as const,
    channelLabel: "Impact",
  },
  {
    index: 3,
    title: "Repayment Timing",
    subtitle: "When Is It Safe?",
    question: "Can the company repay without being weakened?",
    persona: "Miriam Osei-Bonsu",
    variables: ["EBITDA", "L*", "FCF", "Ω"],
    channel: "finance" as const,
    channelLabel: "Operations",
  },
  {
    index: 4,
    title: "Cooperative Waterfall",
    subtitle: "Who Gets Paid First?",
    question: "Does capital stay in circulation or flow out to investors?",
    persona: "Beatriz Santos",
    variables: ["η", "reserve", "dist. cap"],
    channel: "impact" as const,
    channelLabel: "Operations",
  },
  {
    index: 5,
    title: "System Coupling",
    subtitle: "Why Everything Is Connected",
    question: "What happens when we optimise one account at the expense of another?",
    persona: "Lena Hoffmann",
    variables: ["M", "I", "T", "U"],
    channel: "neutral" as const,
    channelLabel: "Unified",
  },
];

const CHOICE_LABEL_MAP: Record<number, Record<string, string>> = {
  0: {
    deepen_support:    "Deepen operational support",
    tighten_selection: "Tighten portfolio selection",
    raise_cap:         "Raise the repayment cap",
  },
  1: {
    mission_aligned: "Mission-aligned (λ = 0)",
    compromise:      "Compromise (λ = 0.1)",
    market_rate:     "Market-rate (λ = 0.5)",
  },
  2: {
    full_guarantees: "Full structural guarantees",
    raise_adoption:  "Raise adoption standard",
    accept_erosion:  "Accept current openness",
  },
  3: {
    enforce_gates: "Enforce all gates",
    partial_early: "Allow partial early repayment",
    full_early:    "Authorise full early repayment",
  },
  4: {
    reserve_first:       "Reserve fully funded first",
    partial_reinvest:    "30% reinvested",
    distributions_first: "Maximise distributions",
  },
  5: {
    raise_p: "Raise survival (p)",
    raise_r: "Raise cap via λ",
    raise_k: "Concentrate follow-on (k)",
  },
};

const CHANNEL_ACCENT: Record<string, string> = {
  finance: "hsl(var(--finance))",
  impact: "hsl(var(--impact))",
  theology: "hsl(var(--theology))",
  neutral: "hsl(235 80% 68%)",
};

const CHANNEL_BG: Record<string, string> = {
  finance: "hsl(var(--finance)/0.07)",
  impact: "hsl(var(--impact)/0.07)",
  theology: "hsl(var(--theology)/0.07)",
  neutral: "hsl(235 95% 62% / 0.07)",
};

const CHANNEL_BORDER: Record<string, string> = {
  finance: "hsl(var(--finance)/0.25)",
  impact: "hsl(var(--impact)/0.25)",
  theology: "hsl(var(--theology)/0.25)",
  neutral: "hsl(235 95% 62% / 0.2)",
};

function StatusBadge({ status }: { status: DriftStatus }) {
  if (status === "not_started") return null;
  if (status === "drifted") {
    return (
      <div
        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: "hsl(38 92% 50% / 0.18)", border: "1px solid hsl(38 92% 50% / 0.45)" }}
        title="Drifted — Explore changes have moved outside your guided choice"
      >
        <AlertTriangle className="w-2.5 h-2.5" style={{ color: "hsl(38 92% 60%)" }} />
      </div>
    );
  }
  return (
    <div
      className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
      style={{ background: "hsl(var(--impact)/0.2)", color: "hsl(var(--impact))", border: "1px solid hsl(var(--impact)/0.4)" }}
    >
      ✓
    </div>
  );
}

interface ModuleCardProps {
  meta: typeof MODULE_META[0];
  onStart: () => void;
  driftStatus: DriftStatus;
  liveDisplay: { primaryLabel: string; primaryValue: string; secondaryLabel?: string; secondaryValue?: string };
  choiceLabel?: string;
}

function ModuleCard({ meta, onStart, driftStatus, liveDisplay, choiceLabel }: ModuleCardProps) {
  const accent = CHANNEL_ACCENT[meta.channel];
  const bg = CHANNEL_BG[meta.channel];
  const border = CHANNEL_BORDER[meta.channel];
  const completed = driftStatus !== "not_started";
  const drifted = driftStatus === "drifted";

  return (
    <div
      className="rounded-xl flex flex-col gap-4 p-5 transition-all group hover:-translate-y-0.5 cursor-pointer relative"
      style={{
        background: drifted ? "hsl(38 25% 10%)" : completed ? "hsl(237 28% 10%)" : "hsl(237 28% 9%)",
        border: drifted
          ? "1px solid hsl(38 92% 50% / 0.3)"
          : completed
          ? "1px solid hsl(var(--impact)/0.25)"
          : "1px solid hsl(237 22% 18%)",
      }}
      onClick={onStart}
    >
      <StatusBadge status={driftStatus} />

      <div className="flex items-start justify-between gap-3">
        <div
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded"
          style={{ background: bg, color: accent, border: `1px solid ${border}` }}
        >
          {meta.channelLabel}
        </div>
        {!completed && (
          <span className="text-[10px] text-white/45 font-mono tabular-nums">
            {String(meta.index + 1).padStart(2, "0")} / {MODULE_META.length}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <h3 className="font-serif text-base font-semibold text-white/90 leading-snug">{meta.title}</h3>
        <p className="text-xs font-medium" style={{ color: accent }}>{meta.subtitle}</p>
      </div>

      <p className="text-xs text-white/65 leading-relaxed flex-1">{meta.question}</p>

      {/* Live values — always visible */}
      <div
        className="rounded-lg px-3 py-2 flex items-center justify-between gap-3"
        style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 20%)" }}
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">{liveDisplay.primaryLabel}</div>
          <div className="font-mono text-xs font-bold text-white/88 tabular-nums">{liveDisplay.primaryValue}</div>
        </div>
        {liveDisplay.secondaryLabel && (
          <div className="min-w-0 text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">{liveDisplay.secondaryLabel}</div>
            <div className="font-mono text-xs font-bold text-white/88 tabular-nums">{liveDisplay.secondaryValue}</div>
          </div>
        )}
      </div>

      {/* Drift detail row */}
      {drifted && choiceLabel && (
        <div className="text-[10px] leading-relaxed" style={{ color: "hsl(38 92% 60%)" }}>
          Guided choice: <span className="font-semibold">{choiceLabel}</span> — explore freely, or review to realign.
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {meta.variables.map((v) => (
            <span
              key={v}
              className="font-mono text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "hsl(237 28% 17%)", color: "hsl(235 80% 78%)", border: "1px solid hsl(237 22% 30%)" }}
            >
              {v}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[10px] text-white/55">{meta.persona}</span>
          <div
            className="flex items-center gap-1 text-[11px] font-medium transition-colors group-hover:gap-2"
            style={{ color: drifted ? "hsl(38 92% 60%)" : accent }}
          >
            {completed ? "Revisit" : "Start"} <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuidedPage() {
  const { activeModule, startModule, completedModules, moduleChoices, resetProgress } = useGuidedMode();
  const { params, derived } = useDsf();
  const modules = useModuleDefs();
  const completedCount = completedModules.size;

  if (activeModule !== null) {
    const mod = modules[activeModule];
    return <GuidedWalkthrough module={mod} />;
  }

  return (
    <div className="space-y-10 max-w-[1100px]">
      {/* Header */}
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <Map className="w-3.5 h-3.5" style={{ color: "hsl(235 80% 68%)" }} />
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: "hsl(235 80% 68%)" }}
          >
            Guided Mode
          </span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white/90 leading-tight">
          Designing a Non-Extractive Fund
        </h1>
        <p className="text-lg text-white/50 leading-relaxed">
          Can you make money, build infrastructure, and remain non-extractive — all at the same time?
        </p>
        <p className="text-sm text-white/40 leading-relaxed max-w-xl">
          This walkthrough guides you through the six core design decisions behind the Digital Sovereignty Fund.
          Each module combines a narrative, a choice, and a live consequence in the model.
          The same sliders and outputs you see in Explore drive everything here.
        </p>
      </div>

      {/* How it works */}
      <div
        className="flex flex-wrap gap-0 rounded-xl overflow-hidden"
        style={{ border: "1px solid hsl(237 22% 16%)" }}
      >
        {[
          { icon: <BookOpen className="w-3.5 h-3.5" />, step: "Story", desc: "A character presents a real dilemma" },
          { icon: <Layers className="w-3.5 h-3.5" />, step: "Decision", desc: "You choose from concrete options" },
          { icon: <BarChart2 className="w-3.5 h-3.5" />, step: "Consequence", desc: "The live model responds immediately" },
          { icon: <ArrowRight className="w-3.5 h-3.5" />, step: "Reflection", desc: "The lesson is made explicit" },
        ].map((item, i) => (
          <div
            key={item.step}
            className="flex items-center gap-3 px-4 py-3 flex-1 min-w-[160px]"
            style={{
              background: "hsl(237 28% 8%)",
              borderRight: i < 3 ? "1px solid hsl(237 22% 16%)" : "none",
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "hsl(235 95% 62% / 0.12)", color: "hsl(235 90% 78%)" }}
            >
              {item.icon}
            </div>
            <div>
              <div className="text-xs font-semibold text-white/80">{item.step}</div>
              <div className="text-[11px] text-white/58">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xs uppercase tracking-widest text-white/50 font-semibold">Six core decisions</h2>
          <div className="flex-1 h-px" style={{ background: "hsl(237 22% 16%)" }} />
          {completedCount > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: "hsl(var(--impact)/0.12)",
                  color: "hsl(var(--impact))",
                  border: "1px solid hsl(var(--impact)/0.3)",
                }}
              >
                {completedCount} of 6 complete
              </span>
              {completedCount === 6 && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded"
                  style={{
                    background: "hsl(235 95% 62% / 0.12)",
                    color: "hsl(235 90% 78%)",
                    border: "1px solid hsl(235 95% 62% / 0.3)",
                  }}
                >
                  Course complete
                </span>
              )}
              <button
                onClick={resetProgress}
                className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
              >
                Reset
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_META.map((meta) => {
            const choiceId = moduleChoices[meta.index] as string | undefined;
            const completed = completedModules.has(meta.index);
            const driftStatus = choiceId && completed
              ? getDriftStatus(meta.index, choiceId, params)
              : completed ? "complete" : "not_started";
            const liveDisplay = getModuleLiveDisplay(meta.index, params, derived);
            const choiceLabel = choiceId
              ? (CHOICE_LABEL_MAP[meta.index]?.[choiceId] ?? choiceId)
              : undefined;
            return (
              <ModuleCard
                key={meta.index}
                meta={meta}
                onStart={() => startModule(meta.index)}
                driftStatus={driftStatus}
                liveDisplay={liveDisplay}
                choiceLabel={choiceLabel}
              />
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-white/30 italic border-l-2 border-white/10 pl-3 max-w-lg">
        Explore mode remains fully intact. Switch at any time — all parameters are shared between modes.
        Choices made here are reflected immediately in Explore.
      </p>
    </div>
  );
}

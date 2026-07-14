import { useState } from "react";
import { useLocation } from "wouter";
import { useDsf } from "@/hooks/useDsfStore";
import { computeAll, DEFAULTS, type DsfParams, type Derived } from "@/lib/dsfModel";
import { BarChart2, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Archetype presets ─────────────────────────────────────────────────────────

type ArchetypeKey = "stewardship" | "balanced" | "returnPriority" | "vcLike" | "extractionDrift";

type Archetype = {
  key: ArchetypeKey;
  name: string;
  tagline: string;
  bestFor: string;
  warning: string;
  narrative: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  params: Partial<DsfParams>;
};

const ARCHETYPES: Archetype[] = [
  {
    key: "stewardship",
    name: "Stewardship Infrastructure Fund",
    tagline: "A patient, protected fund that turns capital into durable open-source infrastructure.",
    bestFor: "Digital sovereignty, public-interest technology, long-term ecosystem building.",
    warning: "Returns are deliberately sufficient rather than maximized.",
    narrative:
      "This fund treats capital as a servant of infrastructure. It keeps repayment capped, reinvests heavily, and protects openness and sovereignty. It is financially viable, but its purpose is not to chase the highest possible investor return. Its purpose is to help companies survive long enough to become part of the public-interest technology base.",
    accent: "hsl(152 60% 54%)",
    accentBg: "hsl(152 60% 54% / 0.08)",
    accentBorder: "hsl(152 60% 54% / 0.30)",
    params: {
      p: 0.55, k: 4.0, N: 25, c: 3,
      eta: 0.85, mu: 0.90,
      delta: 1.25, pi: 0.20, rho: 0.20, lambda: 0.00, composeR: true,
      L0: 9.0, o0: 1.0, d0: 1.0, a: 2.3, e: 1.4,
      alpha: 0.12, beta: 0.10, gamma: 0.12,
      stewardOwnership: true, openSource: true, euRetention: true,
    },
  },
  {
    key: "balanced",
    name: "Balanced Stewardship Fund",
    tagline: "A realistic middle path: financially viable, impact-oriented, and morally disciplined.",
    bestFor: "Explaining the model to investors, policymakers, and serious partners.",
    warning:
      "It works because all parts remain balanced. Push repayment too high, or weaken safeguards, and the system drifts.",
    narrative:
      "This fund is viable without becoming extractive. It produces solid financial returns, creates meaningful infrastructure, and keeps theological integrity above the floor. Its strength is balance: enough investor return to attract capital, enough reinvestment to keep the system alive, and enough structural protection to prevent mission drift.",
    accent: "hsl(213 88% 70%)",
    accentBg: "hsl(213 88% 70% / 0.08)",
    accentBorder: "hsl(213 88% 70% / 0.30)",
    params: {
      p: 0.40, k: 5.0, N: 25, c: 3,
      eta: 0.70, mu: 0.70,
      delta: 1.30, pi: 0.20, rho: 0.30, lambda: 0.10, composeR: true,
      L0: 8.0, o0: 1.0, d0: 1.0, a: 2.0, e: 1.2,
      alpha: 0.20, beta: 0.15, gamma: 0.20,
      stewardOwnership: true, openSource: true, euRetention: true,
    },
  },
  {
    key: "returnPriority",
    name: "Return-Priority Fund",
    tagline: "A fund that pushes harder on repayment while keeping some safeguards intact.",
    bestFor: "Testing how far investor expectations can rise before the model becomes fragile.",
    warning: "Higher repayment pressure may reduce company lifetime, openness, and infrastructure impact.",
    narrative:
      "This fund asks more from companies. Financial returns rise, but the pressure also begins to affect the conditions that make infrastructure possible. The model may still pass, but the moral and impact margins are thinner. This is the zone where discipline can quietly become extraction.",
    accent: "hsl(38 92% 60%)",
    accentBg: "hsl(38 92% 60% / 0.08)",
    accentBorder: "hsl(38 92% 60% / 0.30)",
    params: {
      p: 0.35, k: 5.5, N: 25, c: 3,
      eta: 0.55, mu: 0.45,
      delta: 1.25, pi: 0.20, rho: 0.55, lambda: 0.40, composeR: true,
      L0: 7.0, o0: 1.0, d0: 1.0, a: 1.8, e: 1.1,
      alpha: 0.30, beta: 0.25, gamma: 0.30,
      stewardOwnership: true, openSource: true, euRetention: false,
    },
  },
  {
    key: "vcLike",
    name: "VC-Like Unicorn Fund",
    tagline: "A high-risk, high-concentration model that depends on a small number of exceptional outcomes.",
    bestFor: "Comparison with conventional venture logic.",
    warning: "This can look attractive financially, but it is fragile and poorly aligned with infrastructure creation.",
    narrative:
      "This fund depends on a small number of winners carrying the whole system. It pushes capital toward concentration, tolerates high failure, and expects large repayment outcomes. Financial upside may look strong, but the system becomes less patient, less resilient, and less suited to building durable public-interest infrastructure.",
    accent: "hsl(271 60% 74%)",
    accentBg: "hsl(271 60% 74% / 0.08)",
    accentBorder: "hsl(271 60% 74% / 0.30)",
    params: {
      p: 0.15, k: 10.0, N: 25, c: 3,
      eta: 0.35, mu: 0.20,
      delta: 1.10, pi: 0.10, rho: 0.90, lambda: 1.00, composeR: true,
      L0: 5.0, o0: 1.0, d0: 1.0, a: 1.5, e: 0.9,
      alpha: 0.45, beta: 0.40, gamma: 0.45,
      stewardOwnership: false, openSource: false, euRetention: false,
    },
  },
  {
    key: "extractionDrift",
    name: "Extraction Drift Fund",
    tagline: "A fund that speaks the language of impact, but increasingly behaves like an extraction machine.",
    bestFor: "Showing why governance, caps, and reinvestment rules matter.",
    warning: "The system may remain financially attractive while impact and integrity collapse.",
    narrative:
      "This fund still has the vocabulary of mission, but its economic logic has changed. Repayment expectations rise, reinvestment falls, safeguards weaken, and companies are placed under pressure. The result may still look financially successful, but the system stops producing durable infrastructure. Capital begins to leave faster than it regenerates the commons.",
    accent: "hsl(0 72% 60%)",
    accentBg: "hsl(0 72% 60% / 0.08)",
    accentBorder: "hsl(0 72% 60% / 0.30)",
    params: {
      p: 0.30, k: 6.0, N: 25, c: 3,
      eta: 0.25, mu: 0.15,
      delta: 0.80, pi: 0.10, rho: 0.80, lambda: 0.70, composeR: true,
      L0: 6.0, o0: 1.0, d0: 1.0, a: 1.5, e: 0.8,
      alpha: 0.45, beta: 0.45, gamma: 0.45,
      stewardOwnership: false, openSource: false, euRetention: false,
    },
  },
];

// ── Refinement choices ────────────────────────────────────────────────────────

type ChoiceOption = { label: string; params: Partial<DsfParams>; note: string };

const RETURN_CHOICES: ChoiceOption[] = [
  {
    label: "Sufficient return",
    note: "Investors receive a fair, capped return. Companies are under minimal pressure.",
    params: { composeR: true, delta: 1.25, pi: 0.20, rho: 0.20, lambda: 0.00 },
  },
  {
    label: "Strong return",
    note: "Returns rise. The system remains viable, but some companies face higher expectations.",
    params: { composeR: true, delta: 1.30, pi: 0.20, rho: 0.30, lambda: 0.10 },
  },
  {
    label: "Aggressive return",
    note: "Returns are pushed hard. Extraction pressure rises and integrity begins to erode.",
    params: { composeR: true, delta: 1.10, pi: 0.15, rho: 0.70, lambda: 0.50 },
  },
];

const REINVEST_CHOICES: ChoiceOption[] = [
  {
    label: "Mostly reinvest",
    note: "Capital compounds inside the system. Future infrastructure creation strengthens.",
    params: { eta: 0.85, mu: 0.90 },
  },
  {
    label: "Balanced",
    note: "Capital is split between reinvestment and distribution. The evergreen engine stays active.",
    params: { eta: 0.70, mu: 0.70 },
  },
  {
    label: "Mostly distribute",
    note: "More money leaves the system early. Long-term infrastructure creation weakens.",
    params: { eta: 0.35, mu: 0.25 },
  },
];

const SAFEGUARD_CHOICES: ChoiceOption[] = [
  {
    label: "Strong safeguards",
    note: "Open-source, steward ownership, and EU retention all enforced. Mission is protected.",
    params: {
      stewardOwnership: true, openSource: true, euRetention: true,
      alpha: 0.12, beta: 0.10, gamma: 0.12,
    },
  },
  {
    label: "Partial safeguards",
    note: "Some protections in place. EU retention is weakened. Drift risk is moderate.",
    params: {
      stewardOwnership: true, openSource: true, euRetention: false,
      alpha: 0.25, beta: 0.20, gamma: 0.30,
    },
  },
  {
    label: "Weak safeguards",
    note: "Protections removed. Companies can close code, be acquired, or leave. Impact collapses over time.",
    params: {
      stewardOwnership: false, openSource: false, euRetention: false,
      alpha: 0.45, beta: 0.45, gamma: 0.45,
    },
  },
];

// ── Label helpers ─────────────────────────────────────────────────────────────

type LabelResult = { text: string; color: string; bg: string; border: string; icon: "pass" | "warn" | "fail" };

function mLabel(M: number, Fmin: number): LabelResult {
  if (M < Fmin) return { text: "Below floor", color: "hsl(0 72% 60%)", bg: "hsl(0 72% 60% / 0.08)", border: "hsl(0 72% 60% / 0.30)", icon: "fail" };
  if (M < 2.2) return { text: "Viable", color: "hsl(38 92% 60%)", bg: "hsl(38 92% 60% / 0.08)", border: "hsl(38 92% 60% / 0.30)", icon: "warn" };
  if (M < 3.0) return { text: "Strong", color: "hsl(213 88% 70%)", bg: "hsl(213 88% 70% / 0.08)", border: "hsl(213 88% 70% / 0.30)", icon: "pass" };
  return { text: "High", color: "hsl(152 60% 54%)", bg: "hsl(152 60% 54% / 0.08)", border: "hsl(152 60% 54% / 0.30)", icon: "pass" };
}

function iLabel(I: number): LabelResult {
  if (I < 80) return { text: "Weak", color: "hsl(0 72% 60%)", bg: "hsl(0 72% 60% / 0.08)", border: "hsl(0 72% 60% / 0.30)", icon: "fail" };
  if (I < 160) return { text: "Moderate", color: "hsl(38 92% 60%)", bg: "hsl(38 92% 60% / 0.08)", border: "hsl(38 92% 60% / 0.30)", icon: "warn" };
  if (I < 320) return { text: "Strong", color: "hsl(213 88% 70%)", bg: "hsl(213 88% 70% / 0.08)", border: "hsl(213 88% 70% / 0.30)", icon: "pass" };
  return { text: "Transformative", color: "hsl(152 60% 54%)", bg: "hsl(152 60% 54% / 0.08)", border: "hsl(152 60% 54% / 0.30)", icon: "pass" };
}

function tLabel(T: number, Tmin: number): LabelResult {
  if (T < Tmin) return { text: "Failing", color: "hsl(0 72% 60%)", bg: "hsl(0 72% 60% / 0.08)", border: "hsl(0 72% 60% / 0.30)", icon: "fail" };
  if (T < Tmin + 0.2) return { text: "Borderline", color: "hsl(38 92% 60%)", bg: "hsl(38 92% 60% / 0.08)", border: "hsl(38 92% 60% / 0.30)", icon: "warn" };
  if (T < Tmin + 0.7) return { text: "Acceptable", color: "hsl(213 88% 70%)", bg: "hsl(213 88% 70% / 0.08)", border: "hsl(213 88% 70% / 0.30)", icon: "pass" };
  return { text: "Strong", color: "hsl(152 60% 54%)", bg: "hsl(152 60% 54% / 0.08)", border: "hsl(152 60% 54% / 0.30)", icon: "pass" };
}

function burdenLabel(U: number): LabelResult {
  if (U < 0.2) return { text: "Light", color: "hsl(152 60% 54%)", bg: "hsl(152 60% 54% / 0.08)", border: "hsl(152 60% 54% / 0.30)", icon: "pass" };
  if (U < 0.45) return { text: "Healthy", color: "hsl(213 88% 70%)", bg: "hsl(213 88% 70% / 0.08)", border: "hsl(213 88% 70% / 0.30)", icon: "pass" };
  if (U < 0.75) return { text: "Strained", color: "hsl(38 92% 60%)", bg: "hsl(38 92% 60% / 0.08)", border: "hsl(38 92% 60% / 0.30)", icon: "warn" };
  return { text: "Extractive", color: "hsl(0 72% 60%)", bg: "hsl(0 72% 60% / 0.08)", border: "hsl(0 72% 60% / 0.30)", icon: "fail" };
}

function circulationLabel(eta: number): LabelResult {
  if (eta < 0.3) return { text: "Leaking", color: "hsl(0 72% 60%)", bg: "hsl(0 72% 60% / 0.08)", border: "hsl(0 72% 60% / 0.30)", icon: "fail" };
  if (eta < 0.5) return { text: "Balanced", color: "hsl(38 92% 60%)", bg: "hsl(38 92% 60% / 0.08)", border: "hsl(38 92% 60% / 0.30)", icon: "warn" };
  if (eta < 0.75) return { text: "Strong", color: "hsl(213 88% 70%)", bg: "hsl(213 88% 70% / 0.08)", border: "hsl(213 88% 70% / 0.30)", icon: "pass" };
  return { text: "Evergreen", color: "hsl(152 60% 54%)", bg: "hsl(152 60% 54% / 0.08)", border: "hsl(152 60% 54% / 0.30)", icon: "pass" };
}

// ── Narrator text ─────────────────────────────────────────────────────────────

function buildNarrator(p: DsfParams, d: Derived): string {
  const Mpass = d.M >= p.Fmin;
  const Tpass = d.T >= p.Tmin;

  if (!Mpass && !Tpass)
    return "This configuration is below both the financial floor and the moral integrity threshold. Returns are insufficient and extraction pressure is too high to sustain the system.";
  if (!Mpass)
    return "This fund does not yet generate sufficient returns to be self-sustaining. Survival probability may be too low, or capital concentration needs adjustment.";
  if (!Tpass)
    return "This fund is financially viable but morally fragile. Extraction pressure has pushed integrity below the acceptable threshold. The system may degrade over time.";

  if (d.U > 0.9)
    return "This fund is passing its floors, but extraction pressure is very high. Impact and integrity are sustained by momentum, not structure. Mission drift is likely over time.";
  if (d.U < 0.15 && p.eta > 0.75 && d.I > 250)
    return "This is a patient, infrastructure-building fund. Capital circulates rather than extracts. Companies survive, repay gradually, and become part of the shared digital commons.";
  if (p.p > 0.45 && p.eta > 0.65)
    return "This fund relies on steady survival rather than rare wins. Returns are healthy, infrastructure creation is strong, and capital keeps circulating inside the system.";
  if (p.eta < 0.40)
    return "This fund distributes more than it reinvests. Returns look solid, but the evergreen engine is weakening. Less capital will be available for future infrastructure.";
  if (p.p < 0.22)
    return "This fund depends on a small number of exceptional outcomes. Most companies fail. Financial returns may hold, but infrastructure creation and moral integrity are at serious risk.";

  return "This fund is balanced and viable. It produces solid financial returns, creates meaningful infrastructure, and keeps investor repayment within moral limits. It does not depend on unicorn exits — it depends on enough companies surviving and repaying steadily.";
}

// ── Delta message ─────────────────────────────────────────────────────────────

type Snapshot = { M: number; I: number; T: number };

function buildDelta(before: Snapshot, after: Snapshot, Fmin: number, Tmin: number): string {
  const dM = after.M - before.M;
  const dI = after.I - before.I;
  const dT = after.T - before.T;

  const parts: string[] = [];

  if (Math.abs(dM) > 0.05)
    parts.push(`Financial multiple ${dM > 0 ? "rose" : "fell"} from ${before.M.toFixed(2)}× to ${after.M.toFixed(2)}×`);
  if (Math.abs(dI) > 5)
    parts.push(`Infrastructure impact ${dI > 0 ? "increased" : "decreased"} from ${Math.round(before.I)} to ${Math.round(after.I)}`);
  if (Math.abs(dT) > 0.05)
    parts.push(`Theological integrity ${dT > 0 ? "improved" : "declined"} from ${before.T.toFixed(2)} to ${after.T.toFixed(2)}`);

  if (parts.length === 0) return "The change had minimal effect on the three core outputs.";

  let summary = parts.join(". ") + ".";

  if (dM > 0 && dT < -0.1)
    summary += " Returns improved, but moral integrity weakened. The model is showing a trade-off between investor repayment and non-extractive discipline.";
  else if (dI > 20 && dM >= -0.05)
    summary += " This is a constructive movement — more infrastructure is created without falling below the financial floor.";
  else if (dT > 0 && after.M < Fmin)
    summary += " The structure is more morally conservative, but the fund may no longer attract enough capital to sustain itself.";
  else if (dI < -30)
    summary += " Infrastructure creation is weakening. Because impact is multiplicative, one weak factor can collapse the whole result.";
  else if (dM > 0.1 && dT < 0 && after.T < Tmin)
    summary += " The fund is now financially stronger but morally failing. Higher returns are being purchased through extraction pressure.";

  return summary;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LabelIcon({ icon }: { icon: "pass" | "warn" | "fail" }) {
  if (icon === "pass") return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (icon === "warn") return <AlertCircle className="w-3.5 h-3.5" />;
  return <XCircle className="w-3.5 h-3.5" />;
}

function ConsequenceCard({
  title,
  value,
  sub,
  label,
}: {
  title: string;
  value: string;
  sub?: string;
  label: LabelResult;
}) {
  return (
    <div
      className="rounded-xl px-4 py-4 flex flex-col gap-2"
      style={{ background: label.bg, border: `1px solid ${label.border}` }}
    >
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/50">{title}</div>
      <div className="text-2xl font-black num" style={{ color: label.color }}>{value}</div>
      {sub && <div className="text-[11px] text-white/45 leading-snug">{sub}</div>}
      <div
        className="flex items-center gap-1.5 text-xs font-medium mt-auto pt-1"
        style={{ color: label.color }}
      >
        <LabelIcon icon={label.icon} />
        {label.text}
      </div>
    </div>
  );
}

function ChoiceGroup({
  title,
  subtitle,
  options,
  active,
  onSelect,
}: {
  title: string;
  subtitle: string;
  options: ChoiceOption[];
  active: number | null;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-white/90">{title}</div>
        <div className="text-xs text-white/45 mt-0.5">{subtitle}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className="px-3 py-2 rounded-lg text-xs text-left transition-all"
            style={{
              background: active === i ? "hsl(235 95% 62% / 0.18)" : "hsl(237 28% 14%)",
              border: `1px solid ${active === i ? "hsl(235 95% 62% / 0.55)" : "hsl(237 22% 22%)"}`,
              color: active === i ? "hsl(235 90% 82%)" : "hsl(0 0% 70%)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {active !== null && (
        <p className="text-xs text-white/50 leading-relaxed pl-1">{options[active].note}</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StoryPage() {
  const { params, derived, patch } = useDsf();
  const [, navigate] = useLocation();

  const [activeArchetype, setActiveArchetype] = useState<ArchetypeKey | null>(null);
  const [returnIdx, setReturnIdx] = useState<number | null>(null);
  const [reinvestIdx, setReinvestIdx] = useState<number | null>(null);
  const [safeguardIdx, setSafeguardIdx] = useState<number | null>(null);
  const [delta, setDelta] = useState<string | null>(null);
  const [compareLeft, setCompareLeft] = useState<ArchetypeKey>("balanced");
  const [compareRight, setCompareRight] = useState<ArchetypeKey>("extractionDrift");

  function applyArchetype(key: ArchetypeKey) {
    const arch = ARCHETYPES.find((a) => a.key === key)!;
    const newP = { ...DEFAULTS, ...arch.params };
    const newD = computeAll(newP);
    setDelta(buildDelta({ M: derived.M, I: derived.I, T: derived.T }, { M: newD.M, I: newD.I, T: newD.T }, params.Fmin, params.Tmin));
    patch(arch.params);
    setActiveArchetype(key);
    setReturnIdx(null);
    setReinvestIdx(null);
    setSafeguardIdx(null);
  }

  function applyChoice(choice: ChoiceOption, setter: (i: number) => void, idx: number) {
    const newP = { ...params, ...choice.params };
    const newD = computeAll(newP);
    setDelta(buildDelta({ M: derived.M, I: derived.I, T: derived.T }, { M: newD.M, I: newD.I, T: newD.T }, params.Fmin, params.Tmin));
    patch(choice.params);
    setter(idx);
  }

  const mL = mLabel(derived.M, params.Fmin);
  const iL = iLabel(derived.I);
  const tL = tLabel(derived.T, params.Tmin);
  const bL = burdenLabel(derived.U);
  const cL = circulationLabel(params.eta);

  const leftArch = ARCHETYPES.find((a) => a.key === compareLeft)!;
  const rightArch = ARCHETYPES.find((a) => a.key === compareRight)!;
  const leftDerived = computeAll({ ...DEFAULTS, ...leftArch.params });
  const rightDerived = computeAll({ ...DEFAULTS, ...rightArch.params });

  const narrator = buildNarrator(params, derived);

  const currentArchData = activeArchetype ? ARCHETYPES.find((a) => a.key === activeArchetype) : null;

  return (
    <div className="space-y-10 pb-16">

      {/* ── Hero + narrator ── */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            What kind of fund are we building?
          </h1>
          <p className="text-sm text-white/55 mt-1 max-w-2xl">
            Choose a fund philosophy. The simulator translates it into financial, impact, theological, company, and cooperative outcomes.
          </p>
        </div>

        <div
          className="rounded-xl px-5 py-4 space-y-1"
          style={{ background: "hsl(237 35% 13%)", border: "1px solid hsl(235 95% 62% / 0.25)" }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2"
            style={{ color: "hsl(235 90% 74%)" }}
          >
            Right now, you are building a system that
          </div>
          <p className="text-sm text-white/80 leading-relaxed">
            {narrator}
          </p>
          {currentArchData && (
            <div className="pt-2 mt-2 border-t border-white/8 text-xs text-white/40">
              Active philosophy: <span style={{ color: currentArchData.accent }}>{currentArchData.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Archetype picker ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Choose a fund philosophy</h2>
          <p className="text-xs text-white/45 mt-0.5">
            Each archetype applies a complete set of parameters. Refine them below after choosing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ARCHETYPES.map((arch) => {
            const ad = computeAll({ ...DEFAULTS, ...arch.params });
            const isActive = activeArchetype === arch.key;
            return (
              <div
                key={arch.key}
                className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all"
                style={{
                  background: isActive ? arch.accentBg : "hsl(237 28% 11%)",
                  border: `1px solid ${isActive ? arch.accentBorder : "hsl(237 22% 18%)"}`,
                }}
                onClick={() => applyArchetype(arch.key)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="text-sm font-bold leading-tight"
                    style={{ color: arch.accent }}
                  >
                    {arch.name}
                  </div>
                  {isActive && (
                    <div
                      className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold shrink-0"
                      style={{ background: arch.accentBorder, color: arch.accent }}
                    >
                      Active
                    </div>
                  )}
                </div>

                <p className="text-xs text-white/60 leading-relaxed flex-1">{arch.tagline}</p>

                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="rounded px-2 py-1.5 text-center" style={{ background: "hsl(237 28% 16%)" }}>
                    <div className="text-white/40 mb-0.5">M</div>
                    <div className="font-bold num text-white/80">{ad.M.toFixed(2)}×</div>
                  </div>
                  <div className="rounded px-2 py-1.5 text-center" style={{ background: "hsl(237 28% 16%)" }}>
                    <div className="text-white/40 mb-0.5">I</div>
                    <div className="font-bold num text-white/80">{Math.round(ad.I)}</div>
                  </div>
                  <div className="rounded px-2 py-1.5 text-center" style={{ background: "hsl(237 28% 16%)" }}>
                    <div className="text-white/40 mb-0.5">T</div>
                    <div
                      className="font-bold num"
                      style={{ color: ad.T >= DEFAULTS.Tmin ? "hsl(152 60% 54%)" : "hsl(0 72% 60%)" }}
                    >
                      {ad.T.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="text-white/40">
                    <span className="text-white/25 mr-1">Best for</span>{arch.bestFor}
                  </div>
                  <div style={{ color: arch.accent + "bb" }}>
                    <span className="text-white/25 mr-1">Note</span>{arch.warning}
                  </div>
                </div>

                <button
                  className="w-full text-center text-xs py-2 rounded-lg font-medium transition-colors mt-1"
                  style={{
                    background: isActive ? arch.accentBorder : "hsl(237 22% 20%)",
                    color: isActive ? arch.accent : "hsl(0 0% 65%)",
                  }}
                  onClick={(e) => { e.stopPropagation(); applyArchetype(arch.key); }}
                >
                  {isActive ? "Applied" : "Apply this scenario"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Consequence dashboard ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Current consequences</h2>
          <p className="text-xs text-white/45 mt-0.5">What this configuration creates in the world.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <ConsequenceCard
            title="Financial viability"
            value={derived.M.toFixed(2) + "×"}
            sub="Single-cycle multiple"
            label={mL}
          />
          <ConsequenceCard
            title="Infrastructure creation"
            value={Math.round(derived.I).toString()}
            sub="Impact score"
            label={iL}
          />
          <ConsequenceCard
            title="Moral integrity"
            value={derived.T.toFixed(2)}
            sub="Theological score"
            label={tL}
          />
          <ConsequenceCard
            title="Company burden"
            value={bL.text}
            sub={`Extraction pressure U = ${derived.U.toFixed(2)}`}
            label={bL}
          />
          <ConsequenceCard
            title="Capital circulation"
            value={cL.text}
            sub={`Reinvestment ratio η = ${params.eta.toFixed(2)}`}
            label={cL}
          />
        </div>
      </div>

      {/* ── Refinement choices ── */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-white">Refine the design</h2>
          <p className="text-xs text-white/45 mt-0.5">
            Three high-level decisions. Each one adjusts the underlying model without exposing raw sliders.
          </p>
        </div>

        <div
          className="rounded-xl p-5 space-y-6"
          style={{ background: "hsl(237 28% 11%)", border: "1px solid hsl(237 22% 18%)" }}
        >
          <ChoiceGroup
            title="How much should investors be allowed to take back?"
            subtitle="Controls the repayment cap and the moral composition of that return."
            options={RETURN_CHOICES}
            active={returnIdx}
            onSelect={(i) => applyChoice(RETURN_CHOICES[i], setReturnIdx, i)}
          />
          <div style={{ borderTop: "1px solid hsl(237 22% 16%)" }} />
          <ChoiceGroup
            title="What happens when money comes back?"
            subtitle="Controls reinvestment ratio — whether capital compounds inside the system or leaves."
            options={REINVEST_CHOICES}
            active={reinvestIdx}
            onSelect={(i) => applyChoice(REINVEST_CHOICES[i], setReinvestIdx, i)}
          />
          <div style={{ borderTop: "1px solid hsl(237 22% 16%)" }} />
          <ChoiceGroup
            title="How strongly should the fund protect its mission over time?"
            subtitle="Controls open-source, steward ownership, and EU retention safeguards."
            options={SAFEGUARD_CHOICES}
            active={safeguardIdx}
            onSelect={(i) => applyChoice(SAFEGUARD_CHOICES[i], setSafeguardIdx, i)}
          />
        </div>
      </div>

      {/* ── What changed ── */}
      {delta && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-white">What changed?</h2>
          <div
            className="rounded-xl px-5 py-4"
            style={{ background: "hsl(237 35% 13%)", border: "1px solid hsl(235 95% 62% / 0.20)" }}
          >
            <p className="text-sm text-white/75 leading-relaxed">{delta}</p>
          </div>
        </div>
      )}

      {/* ── Scenario comparison ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Compare two fund philosophies</h2>
          <p className="text-xs text-white/45 mt-0.5">
            Two systems can look similar financially but create completely different worlds.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/45">Left</span>
            <select
              value={compareLeft}
              onChange={(e) => setCompareLeft(e.target.value as ArchetypeKey)}
              className="text-xs rounded-md px-2.5 py-1.5 text-white/85"
              style={{ background: "hsl(237 28% 16%)", border: "1px solid hsl(237 22% 24%)" }}
            >
              {ARCHETYPES.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
            </select>
          </div>
          <span className="text-white/25 text-xs">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/45">Right</span>
            <select
              value={compareRight}
              onChange={(e) => setCompareRight(e.target.value as ArchetypeKey)}
              className="text-xs rounded-md px-2.5 py-1.5 text-white/85"
              style={{ background: "hsl(237 28% 16%)", border: "1px solid hsl(237 22% 24%)" }}
            >
              {ARCHETYPES.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid hsl(237 22% 18%)" }}
        >
          <div className="grid grid-cols-3 text-[10px] uppercase tracking-wider">
            <div className="px-4 py-2.5 text-white/35" style={{ background: "hsl(237 28% 10%)" }}>Metric</div>
            <div
              className="px-4 py-2.5 font-semibold"
              style={{ background: leftArch.accentBg, color: leftArch.accent, borderLeft: `1px solid ${leftArch.accentBorder}` }}
            >
              {leftArch.name}
            </div>
            <div
              className="px-4 py-2.5 font-semibold"
              style={{ background: rightArch.accentBg, color: rightArch.accent, borderLeft: `1px solid ${rightArch.accentBorder}` }}
            >
              {rightArch.name}
            </div>
          </div>

          {[
            {
              label: "Financial multiple",
              left: leftDerived.M.toFixed(2) + "×",
              right: rightDerived.M.toFixed(2) + "×",
              leftL: mLabel(leftDerived.M, DEFAULTS.Fmin),
              rightL: mLabel(rightDerived.M, DEFAULTS.Fmin),
            },
            {
              label: "Infrastructure impact",
              left: Math.round(leftDerived.I).toString(),
              right: Math.round(rightDerived.I).toString(),
              leftL: iLabel(leftDerived.I),
              rightL: iLabel(rightDerived.I),
            },
            {
              label: "Moral integrity",
              left: leftDerived.T.toFixed(2),
              right: rightDerived.T.toFixed(2),
              leftL: tLabel(leftDerived.T, DEFAULTS.Tmin),
              rightL: tLabel(rightDerived.T, DEFAULTS.Tmin),
            },
            {
              label: "Company burden",
              left: burdenLabel(leftDerived.U).text,
              right: burdenLabel(rightDerived.U).text,
              leftL: burdenLabel(leftDerived.U),
              rightL: burdenLabel(rightDerived.U),
            },
            {
              label: "Capital circulation",
              left: circulationLabel(leftArch.params.eta ?? DEFAULTS.eta).text,
              right: circulationLabel(rightArch.params.eta ?? DEFAULTS.eta).text,
              leftL: circulationLabel(leftArch.params.eta ?? DEFAULTS.eta),
              rightL: circulationLabel(rightArch.params.eta ?? DEFAULTS.eta),
            },
          ].map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-3 text-xs"
              style={{ borderTop: "1px solid hsl(237 22% 14%)" }}
            >
              <div className="px-4 py-3 text-white/45" style={{ background: "hsl(237 28% 9%)" }}>
                {row.label}
              </div>
              <div
                className="px-4 py-3 flex items-center gap-2 font-semibold num"
                style={{ color: row.leftL.color, background: row.leftL.bg, borderLeft: `1px solid ${row.leftL.border}` }}
              >
                <LabelIcon icon={row.leftL.icon} />
                {row.left}
              </div>
              <div
                className="px-4 py-3 flex items-center gap-2 font-semibold num"
                style={{ color: row.rightL.color, background: row.rightL.bg, borderLeft: `1px solid ${row.rightL.border}` }}
              >
                <LabelIcon icon={row.rightL.icon} />
                {row.right}
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl px-5 py-4 text-sm text-white/65 leading-relaxed"
          style={{ background: "hsl(237 28% 11%)", border: "1px solid hsl(237 22% 18%)" }}
        >
          {compareLeft === compareRight
            ? "Select two different philosophies to see how they diverge."
            : `These two funds may look similar from a narrow financial perspective. But they create different worlds. ${leftArch.name} ${leftDerived.I > rightDerived.I ? "creates more infrastructure" : "creates less infrastructure"} and ${leftDerived.T > rightDerived.T ? "maintains stronger moral integrity" : "carries lower moral integrity"}. The numbers tell the full story above.`}
        </div>
      </div>

      {/* ── CTA ── */}
      <div
        className="rounded-xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: "hsl(237 35% 13%)", border: "1px solid hsl(235 95% 62% / 0.20)" }}
      >
        <div>
          <div className="text-sm font-semibold text-white/90">Want to inspect the assumptions?</div>
          <div className="text-xs text-white/45 mt-0.5">
            Switch to Analyst Mode to access full equations, sliders, charts, and model decomposition.
          </div>
        </div>
        <Button
          onClick={() => navigate("/overview")}
          className="shrink-0 flex items-center gap-2 text-sm"
          style={{
            background: "hsl(235 95% 62% / 0.15)",
            border: "1px solid hsl(235 95% 62% / 0.45)",
            color: "hsl(235 90% 80%)",
          }}
        >
          <BarChart2 className="w-4 h-4" />
          Open in Analyst Mode
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

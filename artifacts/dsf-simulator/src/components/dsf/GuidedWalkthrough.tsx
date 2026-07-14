import { useState } from "react";
import { ArrowRight, CheckCircle2, RotateCcw, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDsf } from "@/hooks/useDsfStore";
import { useGuidedMode, type GuidedStep } from "@/contexts/guidedMode";
import { SliderField } from "./SliderField";
import { ValueCard } from "./ValueCard";
import { Eq } from "./Eq";
import {
  fmtMultiple,
  fmtNum,
  fmtPct,
} from "@/lib/dsfModel";

const STEPS: GuidedStep[] = ["story", "decision", "consequence", "reflection"];
const STEP_LABELS: Record<GuidedStep, string> = {
  story: "Story",
  decision: "Decision",
  consequence: "Consequence",
  reflection: "Reflection",
};

const CHANNEL_BORDER: Record<string, string> = {
  finance: "border-[hsl(var(--finance)/0.3)] bg-[hsl(var(--finance)/0.05)]",
  impact: "border-[hsl(var(--impact)/0.3)] bg-[hsl(var(--impact)/0.05)]",
  theology: "border-[hsl(var(--theology)/0.3)] bg-[hsl(var(--theology)/0.05)]",
  neutral: "border-white/12 bg-white/[0.03]",
};
const CHANNEL_TEXT: Record<string, string> = {
  finance: "text-[hsl(var(--finance))]",
  impact: "text-[hsl(var(--impact))]",
  theology: "text-[hsl(var(--theology))]",
  neutral: "text-white/75",
};

type DecisionOption = {
  id: string;
  label: string;
  description: string;
  tag?: string;
  tagColor?: "finance" | "impact" | "theology" | "warning";
  onApply: () => void;
};

type ModuleDef = {
  index: number;
  title: string;
  question: string;
  persona: { name: string; role: string; initials: string; color: string };
  scene: string;
  storyParagraphs: Array<{ text: string; liveValue?: () => string; liveLabel?: string }>;
  decisions: DecisionOption[];
  decisionQuestion: string;
  consequenceCards: Array<{
    label: string;
    getValue: () => string;
    channel: "finance" | "impact" | "theology" | "neutral";
    note?: string;
  }>;
  sliders: React.ReactNode;
  reflectionText: string;
  onReset: () => void;
};

function StepBar({ current, onClick }: { current: GuidedStep; onClick: (s: GuidedStep) => void }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = s === current;
        return (
          <button
            key={s}
            onClick={() => onClick(s)}
            className="flex items-center gap-0"
          >
            <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-md ${
              active
                ? "text-white bg-[hsl(235_95%_62%/0.18)]"
                : done
                ? "text-white/55 hover:text-white/80"
                : "text-white/30"
            }`}>
              <span
                className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${
                  done
                    ? "bg-[hsl(var(--impact)/0.25)] text-[hsl(var(--impact))]"
                    : active
                    ? "bg-[hsl(235_95%_62%/0.3)] text-[hsl(235_90%_80%)]"
                    : "bg-white/10 text-white/30"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {STEP_LABELS[s]}
            </div>
            {i < STEPS.length - 1 && (
              <span className="w-4 h-px mx-0.5 shrink-0" style={{ background: "hsl(237 22% 20%)" }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function PersonaCard({ persona, scene }: { persona: ModuleDef["persona"]; scene: string }) {
  const colorRing: Record<string, string> = {
    finance: "ring-[hsl(var(--finance)/0.5)] bg-[hsl(var(--finance)/0.12)] text-[hsl(var(--finance))]",
    impact: "ring-[hsl(var(--impact)/0.5)] bg-[hsl(var(--impact)/0.12)] text-[hsl(var(--impact))]",
    theology: "ring-[hsl(var(--theology)/0.5)] bg-[hsl(var(--theology)/0.12)] text-[hsl(var(--theology))]",
    neutral: "ring-white/20 bg-white/5 text-white/70",
  };
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3"
      style={{ background: "hsl(237 28% 10%)", border: "1px solid hsl(237 22% 18%)" }}
    >
      <div className={`w-9 h-9 rounded-full ring-2 flex items-center justify-center text-xs font-bold shrink-0 ${colorRing[persona.color]}`}>
        {persona.initials}
      </div>
      <div>
        <div className="text-sm font-semibold text-white/90">{persona.name}</div>
        <div className="text-xs text-white/50">{persona.role}</div>
        <div className="text-xs text-white/35 italic mt-0.5">{scene}</div>
      </div>
    </div>
  );
}

export function GuidedWalkthrough({ module }: { module: ModuleDef }) {
  const { step, setStep, setActiveModule, setChosenOption, chosenOption, markModuleComplete, recordChoice } = useGuidedMode();
  const stepIdx = STEPS.indexOf(step);

  const handleChoose = (opt: DecisionOption) => {
    setChosenOption(opt.id);
    recordChoice(module.index, opt.id);
    opt.onApply();
  };

  const next = () => {
    if (stepIdx < STEPS.length - 1) {
      const nextStep = STEPS[stepIdx + 1];
      if (nextStep === "reflection") markModuleComplete(module.index);
      setStep(nextStep);
    }
  };
  const prev = () => {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left panel — narrative / steps */}
      <div className="lg:col-span-7 space-y-5">
        {/* Module header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveModule(null); module.onReset(); }}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            All modules
          </button>
          <span className="text-white/20">·</span>
          <span className="text-xs text-white/40 italic">{module.title}</span>
        </div>

        <StepBar current={step} onClick={setStep} />

        {/* Step content */}
        <div
          className="rounded-xl p-5 space-y-4 min-h-[320px]"
          style={{ background: "hsl(237 28% 8%)", border: "1px solid hsl(237 22% 16%)" }}
        >
          {step === "story" && (
            <div className="space-y-4">
              <PersonaCard persona={module.persona} scene={module.scene} />
              <div className="space-y-3">
                {module.storyParagraphs.map((p, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm text-white/72 leading-relaxed">{p.text}</p>
                    {p.liveValue && (
                      <div
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs"
                        style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 20%)" }}
                      >
                        <span className="text-white/35 uppercase tracking-wider">{p.liveLabel}</span>
                        <span className="font-mono font-semibold text-white/80 ml-auto">{p.liveValue()}</span>
                        <span className="text-[10px] text-white/25 uppercase tracking-wider">live</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "decision" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-white/35">Decision</div>
                <p className="text-sm font-semibold text-white/85">{module.decisionQuestion}</p>
              </div>
              <div className="space-y-2.5">
                {module.decisions.map((opt) => {
                  const isChosen = chosenOption === opt.id;
                  const tagColors: Record<string, string> = {
                    finance: "bg-[hsl(var(--finance)/0.15)] text-[hsl(var(--finance))] border-[hsl(var(--finance)/0.3)]",
                    impact: "bg-[hsl(var(--impact)/0.15)] text-[hsl(var(--impact))] border-[hsl(var(--impact)/0.3)]",
                    theology: "bg-[hsl(var(--theology)/0.15)] text-[hsl(var(--theology))] border-[hsl(var(--theology)/0.3)]",
                    warning: "bg-amber-400/10 text-amber-400 border-amber-400/30",
                  };
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleChoose(opt)}
                      className={`w-full text-left rounded-xl border px-4 py-3 space-y-1.5 transition-all ${
                        isChosen
                          ? "border-[hsl(235_95%_62%/0.55)] bg-[hsl(235_95%_62%/0.10)]"
                          : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-white/85 leading-snug">{opt.label}</span>
                        {opt.tag && (
                          <span className={`shrink-0 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${tagColors[opt.tagColor ?? "finance"]}`}>
                            {opt.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/45 leading-relaxed">{opt.description}</p>
                      {isChosen && (
                        <div className="flex items-center gap-1 text-[10px] text-[hsl(235_90%_80%)] pt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Applied — see the model respond on the right
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "consequence" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-white/35">Consequence</div>
                <p className="text-sm text-white/60 leading-relaxed">
                  {chosenOption
                    ? "You made a choice. These are the live model outputs right now."
                    : "Use the sliders on the right to explore the model. These outputs update in real time."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {module.consequenceCards.map((c, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-4 py-3 space-y-1 ${CHANNEL_BORDER[c.channel]}`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{c.label}</div>
                    <div className={`text-xl font-mono font-semibold ${CHANNEL_TEXT[c.channel]}`}>
                      {c.getValue()}
                    </div>
                    {c.note && <p className="text-[10px] text-white/35 leading-relaxed">{c.note}</p>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/40 italic border-l-2 border-white/12 pl-3">
                Use the sliders on the right. Every output above is live.
              </p>
            </div>
          )}

          {step === "reflection" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-white/35">Reflection</div>
              </div>
              <p className="text-sm text-white/72 leading-relaxed">{module.reflectionText}</p>
              <div
                className="rounded-lg px-4 py-3 space-y-1"
                style={{ background: "hsl(237 28% 10%)", border: "1px solid hsl(237 22% 18%)" }}
              >
                <p className="text-xs text-white/50 italic">
                  Would you still make this choice? Return to Decision to try another path, or continue to the next module.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {module.consequenceCards.map((c, i) => (
                  <div key={i} className={`rounded-lg border px-4 py-3 space-y-1 ${CHANNEL_BORDER[c.channel]}`}>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{c.label}</div>
                    <div className={`text-lg font-mono font-semibold ${CHANNEL_TEXT[c.channel]}`}>{c.getValue()}</div>
                    {c.note && <p className="text-[10px] text-white/35">{c.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          {stepIdx > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={prev}
              className="text-xs text-white/40 hover:text-white/70 h-8 px-3"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {step === "decision" && chosenOption && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { module.onReset(); setChosenOption(null); }}
              className="text-xs text-white/40 hover:text-white/70 h-8 px-3"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Try again
            </Button>
          )}
          {stepIdx < STEPS.length - 1 && (
            <Button
              size="sm"
              onClick={next}
              className="text-xs h-8 px-4 bg-[hsl(235_95%_62%/0.18)] hover:bg-[hsl(235_95%_62%/0.28)] text-[hsl(235_90%_80%)] border border-[hsl(235_95%_62%/0.35)] hover:border-[hsl(235_95%_62%/0.55)]"
            >
              {STEP_LABELS[STEPS[stepIdx + 1]]} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
          {step === "reflection" && (
            <Button
              size="sm"
              onClick={() => {
                const next = (module.index + 1) % 6;
                setActiveModule(next);
                setStep("story");
                setChosenOption(null);
              }}
              className="text-xs h-8 px-4 bg-[hsl(235_95%_62%/0.18)] hover:bg-[hsl(235_95%_62%/0.28)] text-[hsl(235_90%_80%)] border border-[hsl(235_95%_62%/0.35)]"
            >
              Next module <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Right panel — always-live sliders + output */}
      <div className="lg:col-span-5">
        <div
          className="rounded-xl p-5 space-y-5 lg:sticky lg:top-40"
          style={{ background: "hsl(237 28% 8%)", border: "1px solid hsl(237 22% 16%)" }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/30 mb-3">Live model · adjust freely</div>
            {module.sliders}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useModuleDefs(): ModuleDef[] {
  const { params, derived, set, patch, reset } = useDsf();

  return [
    {
      index: 0,
      title: "Survival: The Only Free Lever",
      question: "Can we improve returns without increasing extraction?",
      persona: { name: "Elena Sørensen", role: "Fund manager, Nordica DSF", initials: "ES", color: "finance" },
      scene: "Presenting to the investment committee after year-two results",
      storyParagraphs: [
        {
          text: "Elena opens her laptop. The committee expects hockey sticks. What she shows them instead is a survival curve. 'We started with 25 companies,' she says. 'We expect around 10 to survive long enough to repay us. That is the design — not a failure rate.'",
          liveValue: () => `${Math.round(params.N * params.p)} of ${params.N}`,
          liveLabel: "Expected survivors",
        },
        {
          text: "A committee member asks: 'Why not raise the repayment cap to improve the multiple?' Elena pauses. 'We can. But every point we add to the cap falls on surviving companies that are already working hard. Improving survival costs us nothing morally — and helps all three accounts.'",
          liveValue: () => fmtMultiple(derived.M),
          liveLabel: "Financial multiple M",
        },
        {
          text: "'Survival is the only lever that improves M, I, and T simultaneously. It is the Pareto-improving move. Everything else involves a trade-off.'",
        },
      ],
      decisionQuestion: "Company survival is below 40%. What do you prioritise?",
      decisions: [
        {
          id: "deepen_support",
          label: "Deepen operational support",
          description: "Assign fund staff to struggling companies. Improves survival with no moral penalty. The mission-consistent move.",
          tag: "Mission-first",
          tagColor: "impact",
          onApply: () => set("p", Math.min(1, params.p + 0.1)),
        },
        {
          id: "tighten_selection",
          label: "Tighten portfolio selection",
          description: "Accept fewer companies, but choose those with stronger survival prospects. Reduces N, improves p.",
          tag: "Portfolio design",
          tagColor: "finance",
          onApply: () => { set("p", Math.min(1, params.p + 0.06)); set("N", Math.max(5, params.N - 4)); },
        },
        {
          id: "raise_cap",
          label: "Accept low survival and raise the repayment cap",
          description: "Compensate for fewer survivors by extracting more from those who do repay. The financial cost is moral.",
          tag: "Extraction risk",
          tagColor: "warning",
          onApply: () => set("rDirect", Math.min(8, params.rDirect + 0.5)),
        },
      ],
      consequenceCards: [
        { label: "Financial M", getValue: () => fmtMultiple(derived.M), channel: "finance", note: "Per cycle" },
        { label: "Impact I", getValue: () => fmtNum(derived.I, 0), channel: "impact", note: "Infrastructure units" },
        { label: "Integrity T", getValue: () => fmtNum(derived.T, 2), channel: "theology", note: "Theological score" },
        { label: "Survivors", getValue: () => `${Math.round(params.N * params.p)} / ${params.N}`, channel: "neutral", note: "Companies" },
      ],
      sliders: (
        <div className="space-y-5">
          <SliderField
            label="Survival probability"
            symbol="p"
            value={params.p}
            onChange={(v) => set("p", v)}
            min={0.05} max={1} step={0.01}
            channel="finance"
            hint="Fraction of portfolio companies that survive long enough to repay."
          />
          <SliderField
            label="Portfolio companies"
            symbol="N"
            value={params.N}
            onChange={(v) => set("N", v)}
            min={5} max={60} step={1}
            format={(v) => String(Math.round(v))}
            channel="finance"
          />
          <SliderField
            label="Follow-on concentration"
            symbol="k"
            value={params.k}
            onChange={(v) => set("k", v)}
            min={1} max={15} step={0.5}
            channel="finance"
          />
          <div className="pt-3 border-t border-white/[0.07] space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-white/30">Live outputs</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "M", value: fmtMultiple(derived.M), color: "text-[hsl(var(--finance))]" },
                { label: "I", value: fmtNum(derived.I, 0), color: "text-[hsl(var(--impact))]" },
                { label: "T", value: fmtNum(derived.T, 2), color: "text-[hsl(var(--theology))]" },
                { label: "U", value: fmtNum(derived.U, 2), color: "text-white/60" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 20%)" }}>
                  <span className="text-[10px] text-white/35 uppercase tracking-wider">{item.label}</span>
                  <div className={`font-mono font-semibold text-base ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      reflectionText: "Survival is the only lever in the DSF model that makes all three accounts better at the same time. Raising the repayment cap improves M — but at the direct cost of surviving companies, and indirectly at the cost of T. Improving p costs nothing morally. It requires investment in operational depth, not financial engineering.",
      onReset: () => { set("p", 0.4); set("N", 25); set("k", 5); },
    },

    {
      index: 1,
      title: "Repayment Cap: What Are You Charging For?",
      question: "Is the investor being repaid for service, risk, or opportunity cost?",
      persona: { name: "Fr. Tomás Brennan", role: "Ethics advisor, DSF Investment Committee", initials: "TB", color: "theology" },
      scene: "Reviewing a proposed increase in the repayment cap before the committee vote",
      storyParagraphs: [
        {
          text: "Father Brennan is not opposed to the fund making money. What he is examining this morning is the composition — not the amount, but what it is made of.",
          liveValue: () => fmtNum(derived.r, 2) + "×",
          liveLabel: "Repayment cap r",
        },
        {
          text: "'The scholastic tradition gives us a framework. δ — real costs incurred helping the company: clearly licit. π — a modest late-payment penalty: bounded and fair. ρ — real risk taken: partially legitimate. But λ — this is the one I examine most carefully. It says: we charge more because we could have earned more elsewhere. That is the definition of lucrum cessans, and it sits close to the classical prohibition on usury.'",
          liveValue: () => fmtPct(derived.r > 1 ? params.lambda / (derived.r - 1) : 0),
          liveLabel: "λ share of premium",
        },
        {
          text: "'The usury score U maps the moral risk. It does not condemn — it asks us to be awake. If we raise the cap to meet the benchmark, we should ask: are we doing so because the service justifies it, or because capital expects it?'",
          liveValue: () => fmtNum(derived.U, 2),
          liveLabel: "Usury pressure U",
        },
      ],
      decisionQuestion: "The committee proposes raising the repayment cap. How do you respond?",
      decisions: [
        {
          id: "mission_aligned",
          label: "Keep λ at zero — mission-aligned",
          description: "No opportunity-cost markup. The repayment cap reflects only real costs, risk, and discipline. Usury pressure stays low.",
          tag: "Mission-first",
          tagColor: "theology",
          onApply: () => patch({ lambda: 0, delta: 1.3, pi: 0.2, rho: 0.3 }),
        },
        {
          id: "compromise",
          label: "Set λ = 0.1 — modest compromise",
          description: "A small opportunity-cost markup. Acknowledges investor expectations while keeping U in the mixed zone.",
          tag: "Compromise",
          tagColor: "finance",
          onApply: () => patch({ lambda: 0.1, delta: 1.3, pi: 0.2, rho: 0.3 }),
        },
        {
          id: "market_rate",
          label: "Set λ = 0.5 — market-rate pressure",
          description: "Match the benchmark return. Usury pressure rises sharply. T drops. The composition has drifted toward extraction.",
          tag: "Extraction risk",
          tagColor: "warning",
          onApply: () => patch({ lambda: 0.5, delta: 1.3, pi: 0.2, rho: 0.3 }),
        },
      ],
      consequenceCards: [
        { label: "Repayment cap r", getValue: () => fmtNum(derived.r, 2) + "×", channel: "finance" },
        { label: "Usury pressure U", getValue: () => fmtNum(derived.U, 2), channel: "theology", note: "< 0.3 licit · > 0.7 extractive" },
        { label: "Integrity T", getValue: () => fmtNum(derived.T, 2), channel: "theology" },
        { label: "Financial M", getValue: () => fmtMultiple(derived.M), channel: "finance" },
      ],
      sliders: (
        <div className="space-y-5">
          <SliderField label="Real costs (licit)" symbol="\delta" value={params.delta}
            onChange={(v) => set("delta", v)} min={0} max={3} step={0.05} channel="theology"
            hint="Genuine fund costs incurred in supporting the company." />
          <SliderField label="Discipline premium (fair)" symbol="\pi" value={params.pi}
            onChange={(v) => set("pi", v)} min={0} max={1} step={0.05} channel="theology"
            hint="Modest late-payment penalty providing order without exploitation." />
          <SliderField label="Risk premium (partial)" symbol="\rho" value={params.rho}
            onChange={(v) => set("rho", v)} min={0} max={2} step={0.05} channel="theology"
            hint="Risk pricing. Legitimate in principle; a pretext in excess." />
          <SliderField label="Opportunity-cost markup (danger)" symbol="\lambda" value={params.lambda}
            onChange={(v) => set("lambda", v)} min={0} max={1} step={0.05} channel="theology"
            hint="'We charge more because we could have earned more elsewhere.' Keep near zero." />
          <div className="pt-3 border-t border-white/[0.07] space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-white/30">Live outputs</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "r", value: fmtNum(derived.r, 2) + "×", color: "text-[hsl(var(--finance))]" },
                { label: "U", value: fmtNum(derived.U, 2), color: derived.U > 0.7 ? "text-red-400" : derived.U > 0.3 ? "text-amber-400" : "text-[hsl(var(--impact))]" },
                { label: "T", value: fmtNum(derived.T, 2), color: "text-[hsl(var(--theology))]" },
                { label: "M", value: fmtMultiple(derived.M), color: "text-[hsl(var(--finance))]" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 20%)" }}>
                  <span className="text-[10px] text-white/35 uppercase tracking-wider">{item.label}</span>
                  <div className={`font-mono font-semibold text-base ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      reflectionText: "The repayment cap can look identical on paper while being morally different in composition. A cap of 2.9× built from real costs and patient risk is different from a cap of 2.9× built from opportunity-cost markup. The usury score makes that difference visible. Composition matters more than magnitude.",
      onReset: () => patch({ delta: 1.3, pi: 0.2, rho: 0.3, lambda: 0.1 }),
    },

    {
      index: 2,
      title: "Impact: Does the Money Become Infrastructure?",
      question: "Does survival translate into open, sovereign, adopted infrastructure?",
      persona: { name: "Dr. Yaw Asante", role: "Mission director, DSF Foundation", initials: "YA", color: "impact" },
      scene: "Reviewing the annual impact report with the steering committee",
      storyParagraphs: [
        {
          text: "'We made money this year. The financial multiple is healthy. But I want to ask a harder question: did the money become infrastructure?'",
          liveValue: () => fmtNum(derived.I, 0),
          liveLabel: "Infrastructure impact I",
        },
        {
          text: "'The impact number is a multiplication of six conditions. A company has to survive long enough — L. Stay open-source — o. Remain European-controlled — d. Be actually adopted — a. Generate spillover — e. Remove any one of these, and the multiplication collapses.'",
        },
        {
          text: "'Here is the risk I want to flag. Our usury pressure is rising. That number does not just affect theology — it directly erodes company lifetimes, openness, and sovereignty. We may be generating financial returns that quietly undermine the infrastructure we are trying to build.'",
          liveValue: () => fmtNum(derived.U, 2),
          liveLabel: "Usury pressure U",
        },
      ],
      decisionQuestion: "Impact is lower than expected. Where is the erosion?",
      decisions: [
        {
          id: "full_guarantees",
          label: "Enable all structural guarantees",
          description: "Steward ownership, open-source license, EU retention — all locked into investment agreements. Protects o and d from erosion.",
          tag: "Full protection",
          tagColor: "impact",
          onApply: () => patch({ stewardOwnership: true, openSource: true, euRetention: true }),
        },
        {
          id: "raise_adoption",
          label: "Raise the adoption standard",
          description: "Require production adoption (a = 3.0) rather than proof-of-concept. Higher bar, higher mission score.",
          tag: "Higher bar",
          tagColor: "impact",
          onApply: () => set("a", 3.0),
        },
        {
          id: "accept_erosion",
          label: "Accept current openness and focus on survival",
          description: "Best-efforts openness. Impact depends on founders' goodwill without structural enforcement.",
          tag: "Fragile",
          tagColor: "warning",
          onApply: () => patch({ stewardOwnership: false, openSource: false, euRetention: false }),
        },
      ],
      consequenceCards: [
        { label: "Impact I", getValue: () => fmtNum(derived.I, 0), channel: "impact", note: "Infrastructure units" },
        { label: "Lifetime L", getValue: () => fmtNum(derived.L, 1) + " yrs", channel: "impact", note: "Eroded by U" },
        { label: "Openness o", getValue: () => fmtNum(derived.o, 2), channel: "impact" },
        { label: "Usury U", getValue: () => fmtNum(derived.U, 2), channel: "neutral", note: "Erodes L, o, d" },
      ],
      sliders: (
        <div className="space-y-5">
          <SliderField label="Adoption multiplier" symbol="a" value={params.a}
            onChange={(v) => set("a", v)} min={0.5} max={5} step={0.1} channel="impact"
            hint="Real production adoption. Unused code is not infrastructure." />
          <SliderField label="Ecosystem spillover" symbol="e" value={params.e}
            onChange={(v) => set("e", v)} min={0.5} max={3} step={0.1} channel="impact"
            hint="Forks, contributors, downstream standards generated." />
          <SliderField label="Base longevity" symbol="L_0" value={params.L0}
            onChange={(v) => set("L0", v)} min={1} max={20} step={0.5} channel="impact"
            hint="Years a company would survive without financial pressure." />
          <div className="pt-3 border-t border-white/[0.07] space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-white/30">Live outputs</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "I", value: fmtNum(derived.I, 0), color: "text-[hsl(var(--impact))]" },
                { label: "L", value: fmtNum(derived.L, 1) + " yr", color: "text-[hsl(var(--impact))]" },
                { label: "o", value: fmtNum(derived.o, 2), color: "text-[hsl(var(--impact))]" },
                { label: "d", value: fmtNum(derived.d, 2), color: "text-[hsl(var(--impact))]" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 20%)" }}>
                  <span className="text-[10px] text-white/35 uppercase tracking-wider">{item.label}</span>
                  <div className={`font-mono font-semibold text-base ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      reflectionText: "Impact is the hardest account to defend because it is invisible in the short term. A company can remain open-source on paper while being nudged toward closure by financial pressure. The model makes that erosion legible: U above 0.6 quietly shortens L, reduces o, and weakens d. Financial returns may mask mission failure.",
      onReset: () => patch({ stewardOwnership: true, openSource: true, euRetention: true, a: 2.0, e: 1.2 }),
    },

    {
      index: 3,
      title: "Repayment Timing: When Is It Safe?",
      question: "Can the company repay without being weakened?",
      persona: { name: "Miriam Osei-Bonsu", role: "Portfolio director, company-level oversight", initials: "MO", color: "finance" },
      scene: "Reviewing a company's repayment readiness before the committee authorises redemption",
      storyParagraphs: [
        {
          text: "Miriam places the company model on the table. 'The question is not whether the company can repay. The question is whether repayment leaves them viable. Extraction that weakens the company before it matures is not stewardship — it is liquidation at a discount.'",
          liveValue: () => fmtMultiple(derived.M),
          liveLabel: "Portfolio multiple M",
        },
        {
          text: "'We run the repayment through three gates. First: does EBITDA exceed the minimum operating threshold? Second: is the resilience reserve fully funded? Third: does free cash flow remain positive after the redemption payment? All three gates must pass before we authorise.'",
        },
        {
          text: "'If a company repays early — before these gates are satisfied — the fund gets its money back, but the company loses the stability it needs to scale. We may generate a good return and destroy the asset that produced it.'",
          liveValue: () => fmtNum(derived.T, 2),
          liveLabel: "Integrity T",
        },
      ],
      decisionQuestion: "A company wants to begin repayment. Their EBITDA is positive but the resilience reserve is not yet fully funded. What do you decide?",
      decisions: [
        {
          id: "enforce_gates",
          label: "Enforce all three gates — no early repayment",
          description: "EBITDA, reserve, and FCF must all clear before redemption. The company waits. Mission continuity is protected.",
          tag: "Stewardship",
          tagColor: "theology",
          onApply: () => set("eta", Math.min(1, params.eta + 0.05)),
        },
        {
          id: "partial_early",
          label: "Allow partial repayment while reserve builds",
          description: "A proportional redemption as the reserve accumulates. Slower return, lower risk of weakening the company.",
          tag: "Compromise",
          tagColor: "finance",
          onApply: () => {},
        },
        {
          id: "full_early",
          label: "Authorise full repayment now",
          description: "The fund recovers its capital. The company continues without reserve protection. Extraction risk is immediate.",
          tag: "Extraction risk",
          tagColor: "warning",
          onApply: () => set("eta", Math.max(0, params.eta - 0.1)),
        },
      ],
      consequenceCards: [
        { label: "Financial M", getValue: () => fmtMultiple(derived.M), channel: "finance", note: "Per cycle" },
        { label: "Integrity T", getValue: () => fmtNum(derived.T, 2), channel: "theology" },
        { label: "Usury U", getValue: () => fmtNum(derived.U, 2), channel: "neutral" },
        { label: "Reinvestment η", getValue: () => fmtPct(params.eta), channel: "impact", note: "Capital recirculated" },
      ],
      sliders: (
        <div className="space-y-5">
          <SliderField label="Reinvestment rate" symbol="\eta" value={params.eta}
            onChange={(v) => set("eta", v)} min={0} max={1} step={0.01} channel="impact"
            hint="Share of returns recycled into new companies rather than distributed." />
          <SliderField label="Evergreen cycles" symbol="c" value={params.c}
            onChange={(v) => set("c", v)} min={1} max={5} step={1}
            format={(v) => String(Math.round(v))} channel="finance"
            hint="Number of reinvestment cycles the fund commits to." />
          <SliderField label="Survival probability" symbol="p" value={params.p}
            onChange={(v) => set("p", v)} min={0.05} max={1} step={0.01} channel="finance" />
          <div className="pt-3 border-t border-white/[0.07] space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-white/30">Live outputs</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "M", value: fmtMultiple(derived.M), color: "text-[hsl(var(--finance))]" },
                { label: "Mtotal", value: fmtMultiple(derived.Mtotal), color: "text-[hsl(var(--finance))]" },
                { label: "T", value: fmtNum(derived.T, 2), color: "text-[hsl(var(--theology))]" },
                { label: "η", value: fmtPct(params.eta), color: "text-[hsl(var(--impact))]" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 20%)" }}>
                  <span className="text-[10px] text-white/35 uppercase tracking-wider">{item.label}</span>
                  <div className={`font-mono font-semibold text-base ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      reflectionText: "Timing is the hidden dimension of extraction. A fund can charge a fair cap and still extract — by collecting early, before the company has built its resilience. The three-gate sequence (EBITDA → reserve → FCF) is not bureaucracy: it is the practical definition of stewardship over capital extraction.",
      onReset: () => patch({ eta: 0.7, c: 3, p: 0.4 }),
    },

    {
      index: 4,
      title: "Cooperative Waterfall: Who Gets Paid First?",
      question: "Does capital stay in circulation or flow out to investors?",
      persona: { name: "Beatriz Santos", role: "Member representative, DSF Cooperative Council", initials: "BS", color: "impact" },
      scene: "Presenting the year-five waterfall report to all member categories",
      storyParagraphs: [
        {
          text: "Beatriz begins with the question she knows the investor members will ask: 'When do we get paid?' She does not dodge it. 'You get paid through the waterfall. The model shows exactly when, how much, and what conditions must be met first.'",
        },
        {
          text: "'Here is the order. First: debt service. Second: the evergreen reserve. Before anyone is paid, the reserve must reach its target. Capital that stays in the cooperative is capital that keeps investing. Third: reinvestment into new companies. Fourth: distributions to members — capped at 3× for investor members.'",
          liveValue: () => fmtPct(params.eta),
          liveLabel: "Reinvestment rate η",
        },
        {
          text: "'What makes this non-extractive is not the governance structure — it is the waterfall order. If we reordered it — distributions first, reserve after — we would have a conventional fund with cooperative branding.'",
        },
      ],
      decisionQuestion: "Returns are coming in. How do you set the waterfall priority?",
      decisions: [
        {
          id: "reserve_first",
          label: "Reserve fully funded before any distribution",
          description: "Honour the waterfall order. Investor members wait. Mission continuity and future generations are protected.",
          tag: "Steward",
          tagColor: "impact",
          onApply: () => set("eta", 0.7),
        },
        {
          id: "partial_reinvest",
          label: "30% reinvested, 70% distributed",
          description: "Investor-friendly. Distributions are substantial but reinvestment remains meaningful. Gradual drift risk.",
          tag: "Compromise",
          tagColor: "finance",
          onApply: () => set("eta", 0.3),
        },
        {
          id: "distributions_first",
          label: "Maximise distributions, minimal reinvestment",
          description: "Investors are satisfied now. The fund loses its evergreen character without new external capital.",
          tag: "Extraction risk",
          tagColor: "warning",
          onApply: () => set("eta", 0.1),
        },
      ],
      consequenceCards: [
        { label: "Integrity T", getValue: () => fmtNum(derived.T, 2), channel: "theology" },
        { label: "Reinvestment η", getValue: () => fmtPct(params.eta), channel: "impact", note: "Capital recirculated" },
        { label: "Financial M", getValue: () => fmtMultiple(derived.M), channel: "finance" },
        { label: "Usury U", getValue: () => fmtNum(derived.U, 2), channel: "neutral" },
      ],
      sliders: (
        <div className="space-y-5">
          <SliderField label="Reinvestment rate" symbol="\eta" value={params.eta}
            onChange={(v) => set("eta", v)} min={0} max={1} step={0.01} channel="impact"
            hint="Share of returns recycled into new companies. 70% is the mission-aligned target." />
          <SliderField label="Opportunity-cost markup" symbol="\lambda" value={params.lambda}
            onChange={(v) => set("lambda", v)} min={0} max={1} step={0.05} channel="theology"
            hint="Lower λ → lower U → higher T. The waterfall is more meaningful when the cap is fair." />
          <SliderField label="Survival probability" symbol="p" value={params.p}
            onChange={(v) => set("p", v)} min={0.05} max={1} step={0.01} channel="finance" />
          <div className="pt-3 border-t border-white/[0.07] space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-white/30">Live outputs</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "T", value: fmtNum(derived.T, 2), color: "text-[hsl(var(--theology))]" },
                { label: "M", value: fmtMultiple(derived.M), color: "text-[hsl(var(--finance))]" },
                { label: "η·M", value: fmtMultiple(derived.M * params.eta), color: "text-[hsl(var(--impact))]" },
                { label: "U", value: fmtNum(derived.U, 2), color: derived.U > 0.7 ? "text-red-400" : derived.U > 0.3 ? "text-amber-400" : "text-white/60" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 20%)" }}>
                  <span className="text-[10px] text-white/35 uppercase tracking-wider">{item.label}</span>
                  <div className={`font-mono font-semibold text-base ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      reflectionText: "The cooperative waterfall is not a governance structure — it is a promise about order. If that order changes, the cooperative becomes a conventional fund with better branding. η = 0.7 keeps capital in motion. η = 0.1 is distribution with evergreen aesthetics.",
      onReset: () => patch({ eta: 0.7, lambda: 0.1 }),
    },

    {
      index: 5,
      title: "System Coupling: Why Everything Is Connected",
      question: "What happens when we optimise one account at the expense of another?",
      persona: { name: "Lena Hoffmann", role: "Quantitative analyst, DSF Model Office", initials: "LH", color: "neutral" },
      scene: "Presenting the unified model output to the full investment and ethics committee",
      storyParagraphs: [
        {
          text: "Lena puts three numbers on the screen: M, I, and T. 'These are not three separate scorecards. They are three projections of the same underlying system. Every slider in this model affects all three — sometimes in the same direction, sometimes in opposite directions.'",
          liveValue: () => `${fmtMultiple(derived.M)} · ${fmtNum(derived.I, 0)} · ${fmtNum(derived.T, 2)}`,
          liveLabel: "M · I · T",
        },
        {
          text: "'Survival is the Pareto-improving move — it makes all three better. Raising p costs nothing morally and gains everywhere. Everything else involves a trade-off. Raising the repayment cap (r) improves M but increases U, which reduces T and erodes I.'",
        },
        {
          text: "'The guardrail question is not which number is highest. It is whether all three numbers stay above their floors simultaneously. M above 1.5×. T above 0.8. I above 100. That is the feasibility region — and it is smaller than people expect.'",
          liveValue: () => {
            const mOk = derived.M >= 1.5;
            const tOk = derived.T >= 0.8;
            const iOk = derived.I >= 100;
            return mOk && tOk && iOk ? "All pass" : `${[mOk ? "" : "M", tOk ? "" : "T", iOk ? "" : "I"].filter(Boolean).join(", ")} below floor`;
          },
          liveLabel: "Floor check",
        },
      ],
      decisionQuestion: "M is below target. Which lever do you reach for?",
      decisions: [
        {
          id: "raise_p",
          label: "Raise survival probability (p)",
          description: "Improve operational support. M, I, and T all improve. The Pareto-improving lever — no trade-offs.",
          tag: "Pareto move",
          tagColor: "impact",
          onApply: () => set("p", Math.min(1, params.p + 0.1)),
        },
        {
          id: "raise_r",
          label: "Raise the repayment cap (r)",
          description: "M improves mechanically. U rises. T drops. I erodes over time. The trade-off is immediate and visible.",
          tag: "Trade-off",
          tagColor: "finance",
          onApply: () => patch({ lambda: Math.min(1, params.lambda + 0.2) }),
        },
        {
          id: "raise_k",
          label: "Concentrate follow-on (raise k)",
          description: "M improves without raising the moral cap. But it requires skill in identifying which survivors to back.",
          tag: "Skill-dependent",
          tagColor: "theology",
          onApply: () => set("k", Math.min(15, params.k + 2)),
        },
      ],
      consequenceCards: [
        { label: "Financial M", getValue: () => fmtMultiple(derived.M), channel: "finance" },
        { label: "Impact I", getValue: () => fmtNum(derived.I, 0), channel: "impact" },
        { label: "Integrity T", getValue: () => fmtNum(derived.T, 2), channel: "theology" },
        { label: "Usury U", getValue: () => fmtNum(derived.U, 2), channel: "neutral", note: "Coupling agent" },
      ],
      sliders: (
        <div className="space-y-5">
          <SliderField label="Survival probability" symbol="p" value={params.p}
            onChange={(v) => set("p", v)} min={0.05} max={1} step={0.01} channel="finance" />
          <SliderField label="Follow-on concentration" symbol="k" value={params.k}
            onChange={(v) => set("k", v)} min={1} max={15} step={0.5} channel="finance" />
          <SliderField label="Opportunity-cost markup" symbol="\lambda" value={params.lambda}
            onChange={(v) => set("lambda", v)} min={0} max={1} step={0.05} channel="theology"
            hint="The primary coupling agent: raises M, raises U, drops T, erodes I." />
          <SliderField label="Reinvestment rate" symbol="\eta" value={params.eta}
            onChange={(v) => set("eta", v)} min={0} max={1} step={0.01} channel="impact" />
          <div className="pt-3 border-t border-white/[0.07] space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-white/30">All three accounts live</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "M", value: fmtMultiple(derived.M), color: derived.M >= 1.5 ? "text-[hsl(var(--finance))]" : "text-red-400", floor: "≥ 1.5×" },
                { label: "I", value: fmtNum(derived.I, 0), color: derived.I >= 100 ? "text-[hsl(var(--impact))]" : "text-red-400", floor: "≥ 100" },
                { label: "T", value: fmtNum(derived.T, 2), color: derived.T >= 0.8 ? "text-[hsl(var(--theology))]" : "text-red-400", floor: "≥ 0.8" },
                { label: "U", value: fmtNum(derived.U, 2), color: derived.U > 0.7 ? "text-red-400" : derived.U > 0.3 ? "text-amber-400" : "text-white/60", floor: "< 0.7" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 20%)" }}>
                  <span className="text-[10px] text-white/35 uppercase tracking-wider">{item.label}</span>
                  <div className={`font-mono font-semibold text-base ${item.color}`}>{item.value}</div>
                  <div className="text-[9px] text-white/25">{item.floor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      reflectionText: "The unified model shows that the feasibility region — where M, I, and T all pass their floors simultaneously — is achievable but not spacious. There is no combination of parameters that makes all three large at the same time. The model is not a maximisation problem. It is a design problem: can you find the configuration where all three accounts survive?",
      onReset: reset,
    },
  ];
}

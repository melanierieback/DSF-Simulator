/**
 * PageScenario — decision-based scenario walkthrough for each analyst page.
 */

import { useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, RotateCcw, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoryMode } from "@/contexts/storyMode";

export interface ConsequenceCard {
  label: string;
  value: string;
  delta?: string;
  direction?: "up" | "down" | "neutral";
  channel?: "finance" | "impact" | "theology" | "neutral";
  note?: string;
}

export interface ParamChange {
  label: string;
  value: string;
}

export interface ScenarioOption {
  id: string;
  label: string;
  description: string;
  tag?: string;
  tagColor?: "finance" | "impact" | "theology" | "warning";
  paramChanges?: ParamChange[];
  onApply: () => void;
}

export interface ScenarioStep {
  id: string;
  question: string;
  subtitle?: string;
  options: ScenarioOption[];
}

export interface GuidedPreselection {
  stepId: string;
  optionId: string;
}

interface PageScenarioProps {
  title: string;
  description: string;
  steps: ScenarioStep[];
  consequences: ConsequenceCard[];
  narratorLine: string;
  onReset?: () => void;
  guidedPreselection?: GuidedPreselection;
}

const CHANNEL_VALUE: Record<NonNullable<ConsequenceCard["channel"]>, string> = {
  finance: "text-[hsl(var(--finance))]",
  impact: "text-[hsl(var(--impact))]",
  theology: "text-[hsl(var(--theology))]",
  neutral: "text-white/75",
};

const CHANNEL_BORDER: Record<NonNullable<ConsequenceCard["channel"]>, string> = {
  finance: "border-[hsl(var(--finance)/0.3)] bg-[hsl(var(--finance)/0.05)]",
  impact: "border-[hsl(var(--impact)/0.3)] bg-[hsl(var(--impact)/0.05)]",
  theology: "border-[hsl(var(--theology)/0.3)] bg-[hsl(var(--theology)/0.05)]",
  neutral: "border-white/12 bg-white/[0.03]",
};

const TAG_CLS: Record<NonNullable<ScenarioOption["tagColor"]>, string> = {
  finance: "bg-[hsl(var(--finance)/0.15)] text-[hsl(var(--finance))] border-[hsl(var(--finance)/0.3)]",
  impact: "bg-[hsl(var(--impact)/0.15)] text-[hsl(var(--impact))] border-[hsl(var(--impact)/0.3)]",
  theology: "bg-[hsl(var(--theology)/0.15)] text-[hsl(var(--theology))] border-[hsl(var(--theology)/0.3)]",
  warning: "bg-amber-400/10 text-amber-400 border-amber-400/30",
};

const DELTA_CLS: Record<NonNullable<ConsequenceCard["direction"]>, string> = {
  up: "text-emerald-400",
  down: "text-red-400",
  neutral: "text-white/40",
};

export function PageScenario({
  title,
  description,
  steps,
  consequences,
  narratorLine,
  onReset,
  guidedPreselection,
}: PageScenarioProps) {
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [chosenChanges, setChosenChanges] = useState<Record<string, ParamChange[]>>({});
  const { setMode } = useStoryMode();

  const totalChosen = Object.keys(chosen).length;

  const handleChoose = (stepId: string, optId: string, onApply: () => void, paramChanges?: ParamChange[]) => {
    setChosen((prev) => ({ ...prev, [stepId]: optId }));
    setChosenChanges((prev) => ({ ...prev, [stepId]: paramChanges ?? [] }));
    onApply();
  };

  const handleReset = () => {
    setChosen({});
    setChosenChanges({});
    onReset?.();
  };

  const allChanges = Object.values(chosenChanges).flat();

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-1.5 max-w-2xl">
        <h3 className="font-serif text-xl font-semibold text-white/90">{title}</h3>
        <p className="text-sm text-white/55 leading-relaxed">{description}</p>
      </div>

      {/* Decision steps */}
      <div className="space-y-5">
        {steps.map((step, stepIdx) => {
          const stepChosen = chosen[step.id];
          return (
            <div
              key={step.id}
              className="rounded-xl border transition-opacity"
              style={{
                background: "hsl(237 28% 10%)",
                borderColor: stepChosen
                  ? "hsl(235 95% 62% / 0.35)"
                  : "hsl(237 22% 18%)",
              }}
            >
              <div className="px-5 py-3.5 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      stepChosen
                        ? "bg-[hsl(235_95%_62%/0.25)] text-[hsl(235_90%_80%)]"
                        : "bg-white/10 text-white/40"
                    }`}
                  >
                    {stepIdx + 1}
                  </span>
                  <span className="text-sm font-semibold text-white/85">{step.question}</span>
                  {stepChosen && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />}
                </div>
                {step.subtitle && (
                  <p className="text-xs text-white/40 mt-1 ml-7">{step.subtitle}</p>
                )}
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {step.options.map((opt) => {
                  const isActive = stepChosen === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleChoose(step.id, opt.id, opt.onApply, opt.paramChanges)}
                      className={`text-left rounded-lg border px-4 py-3 space-y-1.5 transition-all ${
                        isActive
                          ? "border-[hsl(235_95%_62%/0.55)] bg-[hsl(235_95%_62%/0.10)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-white/85 leading-snug">
                          {opt.label}
                        </span>
                        {opt.tag && (
                          <span
                            className={`shrink-0 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${
                              TAG_CLS[opt.tagColor ?? "finance"]
                            }`}
                          >
                            {opt.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/45 leading-relaxed">{opt.description}</p>

                      {/* Param changes — visible when active */}
                      {isActive && opt.paramChanges && opt.paramChanges.length > 0 && (
                        <div className="pt-1.5 border-t border-white/[0.08] flex flex-wrap gap-1.5">
                          {opt.paramChanges.map((pc, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{
                                background: "hsl(237 28% 14%)",
                                color: "hsl(235 90% 78%)",
                                border: "1px solid hsl(235 95% 62% / 0.2)",
                              }}
                            >
                              <span className="text-white/40">{pc.label}</span>
                              <span className="text-white/20">→</span>
                              <span>{pc.value}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {isActive && (!opt.paramChanges || opt.paramChanges.length === 0) && (
                        <div className="flex items-center gap-1 text-[10px] text-[hsl(235_90%_80%)]">
                          <CheckCircle2 className="w-3 h-3" /> Applied
                        </div>
                      )}
                      {!isActive && guidedPreselection?.stepId === step.id && guidedPreselection?.optionId === opt.id && (
                        <div className="flex items-center gap-1 text-[10px] pt-1 border-t border-white/[0.06]" style={{ color: "hsl(235 90% 72%)" }}>
                          <BookOpen className="w-3 h-3" /> Your guided choice
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Consequence dashboard */}
      {totalChosen > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs uppercase tracking-wider text-white/40">
              Current model state · {totalChosen} of {steps.length} decisions made
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="text-xs text-white/40 hover:text-white/70 h-6 px-2"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Reset
              </Button>
              <Button
                size="sm"
                onClick={() => setMode("analyst")}
                className="text-xs h-6 px-3 bg-[hsl(235_95%_62%/0.18)] hover:bg-[hsl(235_95%_62%/0.28)] text-[hsl(235_90%_80%)] border border-[hsl(235_95%_62%/0.35)] hover:border-[hsl(235_95%_62%/0.55)]"
              >
                <BarChart2 className="w-3 h-3 mr-1" /> Explore in Analyst
              </Button>
            </div>
          </div>

          {/* Applied parameter summary */}
          {allChanges.length > 0 && (
            <div
              className="rounded-lg px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5"
              style={{ background: "hsl(237 28% 9%)", border: "1px solid hsl(237 22% 16%)" }}
            >
              <span className="text-[10px] uppercase tracking-wider text-white/30 w-full mb-0.5">
                Sliders now set to
              </span>
              {allChanges.map((pc, i) => (
                <span key={i} className="text-[11px] font-mono text-white/60">
                  <span className="text-white/35">{pc.label}</span>
                  <span className="text-white/20 mx-1">→</span>
                  <span className="text-white/80">{pc.value}</span>
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {consequences.map((c, i) => (
              <div
                key={i}
                className={`rounded-lg border px-4 py-3 space-y-1 ${
                  CHANNEL_BORDER[c.channel ?? "neutral"]
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-white/40">{c.label}</div>
                <div className={`text-xl font-mono font-semibold ${CHANNEL_VALUE[c.channel ?? "neutral"]}`}>
                  {c.value}
                </div>
                {c.delta && (
                  <div className={`text-[11px] font-medium ${DELTA_CLS[c.direction ?? "neutral"]}`}>
                    {c.delta}
                  </div>
                )}
                {c.note && <p className="text-[10px] text-white/35 leading-relaxed">{c.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narrator reflection */}
      <div
        className="flex items-start gap-3 rounded-lg px-4 py-3"
        style={{ background: "hsl(237 28% 11%)", border: "1px solid hsl(237 22% 18%)" }}
      >
        <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />
        <p className="text-xs text-white/50 leading-relaxed italic">{narratorLine}</p>
      </div>
    </div>
  );
}

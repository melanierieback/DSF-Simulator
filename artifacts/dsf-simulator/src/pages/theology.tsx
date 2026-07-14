import { useMemo } from "react";
import { useDsf } from "@/hooks/useDsfStore";
import { useStoryMode } from "@/contexts/storyMode";
import { useGuidedMode } from "@/contexts/guidedMode";
import { GlossaryTab } from "@/components/dsf/GlossaryTab";
import { StoryStrip, StoryDiagnosis, StoryAnnotation } from "@/components/dsf/StoryComponents";
import { PageStory } from "@/components/dsf/PageStory";
import { PageScenario } from "@/components/dsf/PageScenario";
import { GuidedContextBanner } from "@/components/dsf/GuidedContextBanner";
import { getDriftStatus, getDriftNote } from "@/lib/driftDetection";
import { StoryClosingPrompt } from "@/components/dsf/StoryClosingPrompt";
import { ScenarioBanner } from "@/components/dsf/ScenarioBanner";
import { getTheologySeams, STORY_CLOSING, CLOSING_PROMPT_TEXT, SCENARIO_BANNER_TEXT } from "@/lib/storyVariants";
import { Eq } from "@/components/dsf/Eq";
import { ValueCard } from "@/components/dsf/ValueCard";
import { SliderField } from "@/components/dsf/SliderField";
import {
  THEOLOGY_SCENARIOS,
  THEOLOGICAL_MODES,
  computeUsuryByMode,
  computeTheologicalModeComparison,
  getTheologicalModeConfig,
  fmtMultiple,
  fmtNum,
  fmtPct,
} from "@/lib/dsfModel";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

const FINANCE = "hsl(var(--finance))";
const THEO = "hsl(var(--theology))";

export default function TheologyPage() {
  const { params, derived, set, applyScenario } = useDsf();

  const usuryFrac = (params.rho + params.lambda) / Math.max(derived.r, 0.0001);
  const totalR = derived.r;

  const usuryZone =
    derived.U < 0.3 ? "licit" : derived.U < 0.7 ? "mixed" : "extractive";

  const { mode } = useStoryMode();
  const isStory = mode === "story";
  const { moduleChoices, completedModules } = useGuidedMode();
  const guided1 = moduleChoices[1] as string | undefined;

  const GUIDED_LABELS_1: Record<string, string> = {
    mission_aligned: "Keep λ at zero (mission-aligned)",
    compromise: "Set λ = 0.1 (modest compromise)",
    market_rate: "Set λ = 0.5 (market-rate pressure)",
  };

  const SCENARIO_MAP_1: Record<string, { stepId: string; optionId: string }> = {
    mission_aligned: { stepId: "opp_cost", optionId: "zero_lambda" },
    compromise: { stepId: "opp_cost", optionId: "low_lambda" },
    market_rate: { stepId: "opp_cost", optionId: "high_lambda" },
  };

  const isHighLambda = guided1 === "market_rate" || (!guided1 && params.lambda >= 0.35);
  const isZeroLambda = guided1 === "mission_aligned" || (!guided1 && params.lambda <= 0.02);

  const mod1Completed = completedModules.has(1);
  const mod1DriftStatus = guided1 && mod1Completed ? getDriftStatus(1, guided1, params) : "not_started";
  const mod1Drifted = mod1DriftStatus === "drifted";
  const mod1DriftNote = mod1Drifted && guided1 ? getDriftNote(1, guided1, params) : undefined;

  const theoDiagnosis = useMemo(() => {
    if (derived.U < 0.3) return {
      text: `This return is mostly stewardship-oriented. The usury pressure is low (U = ${fmtNum(derived.U, 2)}). Most of the return is tied to real costs, patient support, and bounded discipline. The "because we could have earned more elsewhere" markup (λ = ${fmtNum(params.lambda, 2)}) is modest. The fund should remain alert: reinvestment helps, but does not automatically cancel extraction.`,
      status: "good" as const,
    };
    if (derived.U < 0.7) return {
      text: `This return is mixed. The usury pressure (U = ${fmtNum(derived.U, 2)}) is in the grey zone. Some of the return is grounded in real costs and risk, but the opportunity-cost markup (λ = ${fmtNum(params.lambda, 2)}) is becoming significant. Consider whether the return can be reoriented toward real service rather than investor expectations.`,
      status: "stressed" as const,
    };
    return {
      text: `This return is drifting toward extraction. Usury pressure is high (U = ${fmtNum(derived.U, 2)}). Too much of the return is coming from risk pricing and the "because we could have earned more elsewhere" markup (λ = ${fmtNum(params.lambda, 2)}). The repayment cap may look moderate on paper while being morally unjustified in composition.`,
      status: "warning" as const,
    };
  }, [derived.U, derived.r, params.lambda]);

  const theoSeams = getTheologySeams(params.lambda, derived.U, params.eta);

  const modeConfig = getTheologicalModeConfig(params.theologicalMode);
  const modeComparison = useMemo(
    () => computeTheologicalModeComparison(
      params.delta, params.pi, params.rho, params.lambda, params.mu, params.eta,
    ),
    [params.delta, params.pi, params.rho, params.lambda, params.mu, params.eta],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {mode === "story" && (
        <div className="lg:col-span-12">
          {guided1 && (
            <GuidedContextBanner
              moduleTitle="Repayment Cap"
              choiceLabel={GUIDED_LABELS_1[guided1] ?? guided1}
              channel="theology"
              moduleIndex={1}
              drifted={mod1Drifted}
              driftNote={mod1DriftNote}
            />
          )}
          <PageStory
            character={{ name: "Fr. Tomás Brennan", role: "Ethics advisor, DSF Investment Committee", initials: "TB", color: "theology" }}
            scene="Reviewing a proposed increase in the repayment cap before the committee vote"
            paragraphs={[
              { text: "Father Brennan is not opposed to the fund making money. He has said this many times. What he is examining this morning is the composition of that money — not the amount, but what it is made of.", liveValue: fmtNum(derived.r, 2) + "×", liveLabel: "Repayment cap r" },
              { text: "'The scholastic tradition gives us a useful framework. Some premium is clearly justified: δ — the real costs the fund incurred helping the company. Some is bounded and fair: π — a modest late-payment penalty. Some is partially legitimate: ρ — we took real risk, so some return is owed. But the fourth component — λ — this is the one I examine most carefully. It says: we charge more because we could have earned more elsewhere. That is the definition of lucrum cessans, and it sits close to the classical prohibition on usury.'", liveValue: fmtPct(derived.r > 1 ? params.lambda / (derived.r - 1) : 0), liveLabel: "λ share of premium" },
              { text: "'The usury score U does not condemn the fund. It maps the moral risk. Right now, U = ' + the number on screen. 'That places us in the grey zone. The model does not say we must act — but it says we should be awake. And we should ask: if we raise the cap to meet the benchmark, are we doing so because the service justifies it, or because capital expects it?'", liveValue: fmtNum(derived.U, 2), liveLabel: "Usury pressure U" },
              ...theoSeams.filter(Boolean).map((text) => ({ text: text as string })),
              { text: STORY_CLOSING.theology },
            ]}
            insights={[
              { label: "δ — clearly licit", body: `Real costs incurred: ${fmtPct(derived.r > 1 ? params.delta / (derived.r - 1) : 0)} of the premium. Directly reimbursing the fund for genuine service.`, status: "good" },
              { label: "π — bounded and fair", body: `Late-payment discipline: ${fmtPct(derived.r > 1 ? params.pi / (derived.r - 1) : 0)} of the premium. Provides order without exploitation.`, status: "good" },
              { label: "ρ — partially legitimate", body: `Risk pricing: ${fmtPct(derived.r > 1 ? params.rho / (derived.r - 1) : 0)} of the premium. Under the current mode (${modeConfig.label}), ρ carries a weight of ${fmtNum(modeConfig.wRho, 2)} in U. Legitimate in principle; a pretext in excess.`, status: params.rho > 0.8 ? "stressed" : "balanced" },
              { label: "λ — the dangerous component", body: `Opportunity-cost markup: ${fmtPct(derived.r > 1 ? params.lambda / (derived.r - 1) : 0)} of the premium. Under the current mode (${modeConfig.label}), λ carries a weight of ${fmtNum(modeConfig.wLambda, 2)} in U. The model recommends keeping λ near zero.`, status: params.lambda > 0.2 ? "warning" : params.lambda > 0.05 ? "stressed" : "good" },
            ]}
          />
          <StoryClosingPrompt text={CLOSING_PROMPT_TEXT.theology} channel="theology" />
        </div>
      )}
      {mode === "scenario" && (
        <div className="lg:col-span-12">
          {guided1 && (
            <GuidedContextBanner
              moduleTitle="Repayment Cap"
              choiceLabel={GUIDED_LABELS_1[guided1] ?? guided1}
              channel="theology"
              moduleIndex={1}
              drifted={mod1Drifted}
              driftNote={mod1DriftNote}
            />
          )}
          <ScenarioBanner text={SCENARIO_BANNER_TEXT.theology} channel="theology" />
          <PageScenario
            guidedPreselection={guided1 ? SCENARIO_MAP_1[guided1] : undefined}
            title="How do you justify the repayment cap?"
            description="A company is due to begin repayment. The investment committee must set the repayment terms. Each component of r must be individually justified — or you cross a moral line."
            steps={[
              {
                id: "real_costs",
                question: "What real costs did the fund incur supporting this company?",
                subtitle: "δ — damnum emergens. This is the clearly licit component.",
                options: [
                  { id: "high_delta", label: "Intensive support (δ = 1.8)", description: "The fund provided mentorship, technical resources, and two staff members for 18 months. Clearly reimbursable.", tag: "Well-justified", tagColor: "impact", paramChanges: [{ label: "δ", value: "1.8" }], onApply: () => set("delta", 1.8) },
                  { id: "mid_delta", label: "Standard support (δ = 1.3)", description: "Normal advisory relationship. Reasonable cost recovery.", tag: "Standard", tagColor: "finance", paramChanges: [{ label: "δ", value: "1.3" }], onApply: () => set("delta", 1.3) },
                  { id: "low_delta", label: "Minimal involvement (δ = 0.5)", description: "Capital was provided; little else. The premium must come from other components.", tag: "Low basis", tagColor: "warning", paramChanges: [{ label: "δ", value: "0.5" }], onApply: () => set("delta", 0.5) },
                ],
              },
              {
                id: "opp_cost",
                question: "How large is your opportunity-cost markup λ?",
                subtitle: "The 'we could have earned more elsewhere' component. Full weight in U.",
                options: [
                  { id: "zero_lambda", label: "No markup (λ = 0)", description: "The fund does not claim what it could have earned elsewhere. Capital serves the mission, not market rates.", tag: "Mission-aligned", tagColor: "theology", paramChanges: [{ label: "λ", value: "0.00" }], onApply: () => set("lambda", 0) },
                  { id: "low_lambda", label: "Modest markup (λ = 0.1)", description: "A small concession to investor expectations. Raises U slightly.", tag: "Cautious", tagColor: "finance", paramChanges: [{ label: "λ", value: "0.10" }], onApply: () => set("lambda", 0.1) },
                  { id: "high_lambda", label: "Market-rate markup (λ = 0.5)", description: "Benchmarking to VC returns. The model classifies this as a significant usury risk.", tag: "High risk", tagColor: "warning", paramChanges: [{ label: "λ", value: "0.50" }], onApply: () => set("lambda", 0.5) },
                ],
              },
              {
                id: "reinvest",
                question: "How much of the return is recycled back into new companies?",
                subtitle: "η — reinvestment rate. A moral offset to usury pressure.",
                options: [
                  { id: "high_eta", label: "High reinvestment (η = 0.85)", description: "Most returns are recycled. Strongly offsets U in the T formula. Fund behaves as a steward.", tag: "Steward", tagColor: "impact", paramChanges: [{ label: "η", value: "0.85" }], onApply: () => set("eta", 0.85) },
                  { id: "mid_eta", label: "Moderate reinvestment (η = 0.7)", description: "Balanced. Some distribution, mostly recycled. Default configuration.", tag: "Balanced", tagColor: "finance", paramChanges: [{ label: "η", value: "0.70" }], onApply: () => set("eta", 0.7) },
                  { id: "low_eta", label: "Low reinvestment (η = 0.4)", description: "Most returns distributed to investors. Moral offset is weak. T becomes sensitive to any U increase.", tag: "Extractor risk", tagColor: "warning", paramChanges: [{ label: "η", value: "0.40" }], onApply: () => set("eta", 0.4) },
                ],
              },
            ]}
            consequences={[
              { label: "Usury U", value: fmtNum(derived.U, 2), channel: "theology", direction: derived.U < 0.3 ? "up" : derived.U < 0.7 ? "neutral" : "down", note: derived.U < 0.3 ? "Licit" : derived.U < 0.7 ? "Mixed" : "Extractive" },
              { label: "Integrity T", value: fmtNum(derived.T, 2), channel: "theology", direction: derived.T >= params.Tmin ? "up" : "down", note: `floor ${fmtNum(params.Tmin, 2)}` },
              { label: "Cap r", value: fmtNum(derived.r, 2) + "×", channel: "finance" },
              { label: "λ share", value: fmtPct(derived.r > 1 ? params.lambda / (derived.r - 1) : 0), channel: "neutral", note: "of premium" },
            ]}
            narratorLine="The repayment cap is not morally neutral. Its justification lies in its composition. A fund that cannot explain each component — δ, π, ρ, λ — is making a claim it cannot defend."
            onReset={() => { set("delta", 1.3); set("lambda", 0.1); set("eta", 0.7); }}
          />
        </div>
      )}
      {mode === "analyst" && (
        <div className="lg:col-span-12">
          <StoryStrip
            humanQuestion="What is the investor being paid for?"
            opening="When the fund asks a company to repay more than it received, that extra amount is not morally self-explanatory. The model breaks it into four components. Real costs (δ) and bounded late-payment discipline (π) are clearly justifiable. Risk allowance (ρ) is partly justified but can become a pretext. The opportunity-cost markup (λ) — 'we charge more because we could have earned more elsewhere' — is the most morally suspect component. Use the sliders to see what share of the total return each component represents. Then ask: is this premium justified by genuine service, or by capital's expectations?"
            diagnosis={theoDiagnosis}
            guidedQuestions={[
              "Did the fund incur real costs helping companies (δ)?",
              "Is the late-payment penalty fair and bounded (π)?",
              "How much of the return is driven by risk pricing (ρ)?",
              "How large is the opportunity-cost markup (λ) — and is it justified?",
              "Is recycling (η) offsetting the usury pressure?",
            ]}
          />
        </div>
      )}
      {mode === "analyst" && (<><div className="lg:col-span-12 space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] text-theology">Engine III</div>
        <h2 className="font-serif text-3xl font-semibold">Thomistic theology of capital</h2>
      </div><aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 self-start">
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-5">
          <div>
            <h3 className="font-serif text-lg font-semibold">Decompose <Eq tex="r" /></h3>
            <p className="text-xs text-muted-foreground mt-0.5 equation">
              <Eq tex="r = 1 + \delta + \pi + \rho + \lambda" />
            </p>
            {mode === "analyst" && (
              <StoryAnnotation channel="theology" className="mt-2">
                These four sliders set the moral composition of the repayment cap. Watch the stacked bar on the right update live. Real costs (δ) and bounded discipline (π) are clearly justified. Risk pricing (ρ) is partly justified. The opportunity-cost markup (λ) is the most morally suspect — the paper recommends keeping it near zero.
              </StoryAnnotation>
            )}
          </div>
          <SliderField
            label="Damnum emergens"
            symbol="\delta"
            value={params.delta}
            min={0}
            max={3}
            step={0.05}
            onChange={(v) => set("delta", v)}
            channel="finance"
            hint={isStory ? `real costs · ${fmtPct(derived.r > 1 ? params.delta / (derived.r - 1) : 0)} of the total premium — clearly licit` : "Real expenses incurred — clearly licit."}
          />
          <SliderField
            label="Poena conventionalis"
            symbol="\pi"
            value={params.pi}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set("pi", v)}
            channel="finance"
            hint={isStory ? `bounded late-payment discipline · ${fmtPct(derived.r > 1 ? params.pi / (derived.r - 1) : 0)} of the premium — licit` : "Bounded penalty for late repayment — licit."}
          />
          <SliderField
            label="Periculum sortis"
            symbol="\rho"
            value={params.rho}
            min={0}
            max={1.5}
            step={0.01}
            onChange={(v) => set("rho", v)}
            channel="theology"
            hint={isStory ? `risk pricing · ${fmtPct(derived.r > 1 ? params.rho / (derived.r - 1) : 0)} of the premium — weight in U = ${fmtNum(modeConfig.wRho, 2)} under ${modeConfig.label}` : `Risk-of-default pricing — weight in U = ${fmtNum(modeConfig.wRho, 2)} (${modeConfig.label}).`}
          />
          <SliderField
            label="Lucrum cessans"
            symbol="\lambda"
            value={params.lambda}
            min={0}
            max={1.5}
            step={0.01}
            onChange={(v) => set("lambda", v)}
            channel="theology"
            hint={isStory ? `opportunity-cost markup · ${fmtPct(derived.r > 1 ? params.lambda / (derived.r - 1) : 0)} of the premium — the most morally suspect component` : "Opportunity-cost markup — paper recommends ≈ 0."}
          />

          <div className="rule-top pt-4 space-y-3">
            <h4 className="text-sm font-medium">Reinvestment</h4>
            <SliderField
              label="μ (weight)"
              symbol="\mu"
              value={params.mu}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => set("mu", v)}
              channel="theology"
            />
            <SliderField
              label="η (ratio)"
              symbol="\eta"
              value={params.eta}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set("eta", v)}
              channel="theology"
              format={fmtPct}
            />
          </div>

          {/* Theological mode selector */}
          <div className="rule-top pt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <h4 className="text-sm font-medium">Theological mode</h4>
              <span className="text-[10px] font-mono tracking-wide text-theology px-1.5 py-0.5 rounded bg-theology/10">
                w_ρ={fmtNum(modeConfig.wRho, 2)} · w_λ={fmtNum(modeConfig.wLambda, 2)}
              </span>
            </div>
            <select
              value={params.theologicalMode}
              onChange={(e) => set("theologicalMode", e.target.value)}
              className="w-full text-sm bg-background border border-card-border rounded px-2 py-1.5 text-foreground cursor-pointer"
            >
              {THEOLOGICAL_MODES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              {modeConfig.rationale}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed opacity-70">
              {modeConfig.source}
            </p>
          </div>
        </div>
        {mode === "analyst" && <StoryDiagnosis diagnosis={theoDiagnosis} />}
      </aside>

      <div className="lg:col-span-9 space-y-6">
        {/* r decomposition stacked bar */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold">
              Repayment cap <Eq tex="r" /> ={" "}
              <span className="num text-finance">{fmtNum(totalR, 2)}</span>
            </h3>
            <span className="text-xs text-muted-foreground num">
              licit {fmtPct((1 + params.delta + params.pi) / totalR)} · usury-linked{" "}
              {fmtPct(usuryFrac)}
            </span>
          </div>
          <RBar
            parts={[
              { label: "1 (principal)", value: 1, color: "hsl(var(--muted-foreground))" },
              { label: "δ damnum", value: params.delta, color: FINANCE, intensity: 0.85 },
              { label: "π poena", value: params.pi, color: FINANCE, intensity: 0.55 },
              { label: "ρ periculum", value: params.rho, color: THEO, intensity: 0.55 },
              { label: "λ lucrum", value: params.lambda, color: THEO, intensity: 0.85 },
            ]}
          />
        </div>

        {/* M decomposition + U + T */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ValueCard
            label="Mode-weighted licit"
            symbol="M_{licit}"
            value={fmtMultiple(derived.MlicitMode)}
            channel="finance"
            size="lg"
            sub={`licit under ${modeConfig.label}`}
          />
          <ValueCard
            label="Mode-weighted usury"
            symbol="M_{usury}"
            value={fmtMultiple(derived.MusuryMode)}
            channel="theology"
            size="lg"
            sub={`usury-linked (w_ρ=${fmtNum(modeConfig.wRho,2)}, w_λ=${fmtNum(modeConfig.wLambda,2)})`}
          />
          <ValueCard
            label="M total"
            symbol="M"
            value={fmtMultiple(derived.M)}
            channel="finance"
            size="lg"
            sub={`identity: ${fmtMultiple(derived.MlicitMode + derived.MusuryMode)}`}
          />
        </div>

        {/* U gauge + T */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold">
                Usury index <Eq tex={`U = ${fmtNum(modeConfig.wRho,2)}\\rho + ${fmtNum(modeConfig.wLambda,2)}\\lambda`} />
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{modeConfig.label}</p>
              <span
                className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded ${
                  usuryZone === "licit"
                    ? "bg-finance/15 text-finance"
                    : usuryZone === "mixed"
                      ? "bg-impact/15 text-impact"
                      : "bg-destructive/15 text-destructive"
                }`}
              >
                {usuryZone}
              </span>
            </div>
            <Gauge value={derived.U} max={1.5} thresholds={[0.3, 0.7]} />
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-3 num">
              <div>licit &lt; 0.30</div>
              <div className="text-center">mixed 0.30 – 0.70</div>
              <div className="text-right">extractive &gt; 0.70</div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold">
                Integrity <Eq tex="T = 1 - U + \mu\eta" />
              </h3>
              <span className="num text-2xl font-serif text-theology">
                {fmtNum(derived.T, 2)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Cell label="1" value="1.00" />
              <Cell label="− U" value={`-${fmtNum(derived.U, 2)}`} channel="theology" />
              <Cell label="+ μη" value={`+${fmtNum(params.mu * params.eta, 2)}`} channel="finance" />
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              T &gt; 1 means reinvestment more than offsets the usury pressure
              priced into r.
            </p>
          </div>
        </div>

        {/* Cross-mode comparison */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">
            U and T under all five modes
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Same repayment cap (<Eq tex="r" /> = <span className="num">{fmtNum(derived.r, 2)}</span>) divided differently under five theological traditions. Financial multiple M is unchanged.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 pr-3">School</th>
                  <th className="text-right py-2 pr-3">w_ρ</th>
                  <th className="text-right py-2 pr-3">w_λ</th>
                  <th className="text-right py-2 pr-3">U</th>
                  <th className="text-right py-2">T</th>
                </tr>
              </thead>
              <tbody>
                {modeComparison.map((row) => {
                  const isActive = row.key === params.theologicalMode;
                  const zone = row.U < 0.3 ? "text-finance" : row.U < 0.7 ? "text-impact" : "text-destructive";
                  return (
                    <tr key={row.key} className={`border-t border-card-border ${isActive ? "bg-theology/5" : ""}`}>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => set("theologicalMode", row.key)}
                          className={`font-medium hover:text-theology transition-colors ${isActive ? "text-theology" : ""}`}
                        >
                          {row.label}
                        </button>
                        {isActive && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wider text-theology opacity-70">active</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right num text-muted-foreground">{fmtNum(row.wRho, 2)}</td>
                      <td className="py-2 pr-3 text-right num text-muted-foreground">{fmtNum(row.wLambda, 2)}</td>
                      <td className={`py-2 pr-3 text-right num font-semibold ${zone}`}>{fmtNum(row.U, 2)}</td>
                      <td className="py-2 text-right num">{fmtNum(row.T, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 italic">Click a school name to activate it. Rows are clickable.</p>
        </div>

        {/* DSF / NEC equity-frame callout */}
        <div className="bg-theology/5 border border-theology/20 rounded-lg p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-theology text-lg leading-tight">✦</span>
            <div>
              <h4 className="font-serif font-semibold text-theology">DSF / NEC instrument reading</h4>
              <p className="text-sm mt-2 leading-relaxed">
                DSF / NEC invests through an equity-like partnership frame, not a simple loan.
                Under the <em>Aquinas — partnership (societas)</em> mode, genuine risk-bearing is not charged as usury.
                If the cap has λ = 0, usury pressure can fall to zero under this instrument-aware Thomistic reading.
                This raises theological integrity relative to the DSF working baseline, because the baseline was
                partially penalizing partnership risk as if it were loan risk.
              </p>
              <div className="mt-3 p-3 bg-background/60 border border-theology/15 rounded text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-theology">Important caveat: </span>
                This assumes genuine risk-bearing — no guaranteed principal, no hidden collateral, no put right,
                no disguised debt, and no mechanism that shifts downside risk back onto the company or founders.
                If any of these conditions fail, the instrument is a loan in substance and the mutuum reading applies.
                {/* TODO: surface this caveat in the risk-quality module once implemented */}
              </div>
            </div>
          </div>
        </div>

        {/* Scenario table */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">
            Five scenarios at constant <Eq tex="r" /> ={" "}
            <span className="num">2.90</span>
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            All five preserve <Eq tex="M \approx 2.49\times" /> — the moral
            character lives entirely in <Eq tex="U" /> and the impact it allows.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 pr-3">id</th>
                  <th className="text-left py-2 pr-3">name</th>
                  <th className="text-right py-2 pr-3">δ</th>
                  <th className="text-right py-2 pr-3">π</th>
                  <th className="text-right py-2 pr-3">ρ</th>
                  <th className="text-right py-2 pr-3">λ</th>
                  <th className="text-right py-2 pr-3">U</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {THEOLOGY_SCENARIOS.map((s) => {
                  const U = computeUsuryByMode(s.delta, s.pi, s.rho, s.lambda, params.theologicalMode);
                  const tone =
                    s.tone === "good"
                      ? "text-finance"
                      : s.tone === "ok"
                        ? "text-impact"
                        : s.tone === "warn"
                          ? "text-impact"
                          : s.tone === "bad"
                            ? "text-destructive"
                            : "text-destructive";
                  return (
                    <tr key={s.id} className="border-t border-card-border">
                      <td className={`py-2 pr-3 font-serif font-semibold ${tone}`}>{s.id}</td>
                      <td className="py-2 pr-3">{s.name}</td>
                      <td className="py-2 pr-3 text-right num">{s.delta.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right num">{s.pi.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right num text-theology">{s.rho.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right num text-theology">{s.lambda.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right num">{U.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => applyScenario(s.id)}
                          className="text-xs px-2 py-1 rounded border border-card-border hover-elevate"
                          data-testid={`apply-scenario-${s.id}`}
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>)}
      {mode === "glossary" && <div className="lg:col-span-12"><GlossaryTab sections="theology" /></div>}
    </div>
  );
}

function RBar({
  parts,
}: {
  parts: { label: string; value: number; color: string; intensity?: number }[];
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="space-y-3">
      <div className="flex w-full h-7 rounded-md overflow-hidden border border-card-border">
        {parts.map((p) => {
          const width = (p.value / total) * 100;
          return (
            <div
              key={p.label}
              style={{
                width: `${width}%`,
                background: p.color,
                opacity: p.intensity ?? 1,
              }}
              className="flex items-center justify-center"
              title={`${p.label}: ${p.value.toFixed(2)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground num">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: p.color, opacity: p.intensity ?? 1 }}
            />
            {p.label} = {p.value.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Gauge({
  value,
  max,
  thresholds,
}: {
  value: number;
  max: number;
  thresholds: [number, number];
}) {
  const pct = Math.min(value / max, 1) * 100;
  const t1 = (thresholds[0] / max) * 100;
  const t2 = (thresholds[1] / max) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-serif num text-theology">{value.toFixed(2)}</span>
        <span className="text-xs text-muted-foreground num">/ {max.toFixed(1)}</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden border border-card-border">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${t1}%`, background: "hsl(var(--finance) / 0.55)" }}
        />
        <div
          className="absolute inset-y-0"
          style={{ left: `${t1}%`, width: `${t2 - t1}%`, background: "hsl(var(--impact) / 0.55)" }}
        />
        <div
          className="absolute inset-y-0"
          style={{ left: `${t2}%`, right: 0, background: "hsl(var(--theology) / 0.55)" }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground"
          style={{ left: `calc(${pct}% - 1px)` }}
        />
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  channel = "neutral",
}: {
  label: string;
  value: string;
  channel?: "finance" | "impact" | "theology" | "neutral";
}) {
  const cls =
    channel === "finance"
      ? "text-finance"
      : channel === "impact"
        ? "text-impact"
        : channel === "theology"
          ? "text-theology"
          : "text-foreground";
  return (
    <div className="rounded-md border border-card-border p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num text-xl font-serif ${cls}`}>{value}</div>
    </div>
  );
}


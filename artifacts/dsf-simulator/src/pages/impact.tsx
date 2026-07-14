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
import { getImpactSeams, STORY_CLOSING, CLOSING_PROMPT_TEXT, SCENARIO_BANNER_TEXT } from "@/lib/storyVariants";
import { Eq } from "@/components/dsf/Eq";
import { ValueCard } from "@/components/dsf/ValueCard";
import { SliderField } from "@/components/dsf/SliderField";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  computeDU,
  computeImpact,
  computeLU,
  computeOU,
  fmtNum,
  fmtPct,
} from "@/lib/dsfModel";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErgodicityBadge } from "@/components/dsf/ErgodicityBadge";

const IMPACT = "hsl(var(--impact))";
const FINANCE = "hsl(var(--finance))";
const THEO = "hsl(var(--theology))";

const REQUIREMENTS = [
  ["Survives long enough to mature into infrastructure", "L", "More years means more compounded contribution"],
  ["Stays open-source over time", "o", "Capture risk drops if guardrails (license, steward) hold"],
  ["Stays sovereign / European-controlled", "d", "Acquisition or relocation drains national value"],
  ["Reaches real production adoption", "a", "Unused code is not infrastructure"],
  ["Generates ecosystem spillover", "e", "Forks, contributors, standards downstream"],
  ["Produced enough surviving companies", "p · N", "Volume of survivors that can carry the weight"],
];

export default function ImpactPage() {
  const { params, derived, set } = useDsf();

  const waterfall = useMemo(() => {
    const steps: Array<{ name: string; running: number }> = [];
    let r = params.N;
    steps.push({ name: "N", running: r });
    r *= params.p;
    steps.push({ name: "× p", running: r });
    r *= derived.L;
    steps.push({ name: "× L", running: r });
    r *= derived.o;
    steps.push({ name: "× o", running: r });
    r *= derived.d;
    steps.push({ name: "× d", running: r });
    r *= params.a;
    steps.push({ name: "× a", running: r });
    r *= params.e;
    steps.push({ name: "× e = I", running: r });
    return steps;
  }, [params, derived]);

  const iVsU = useMemo(() => {
    const out: Array<{ U: number; I: number }> = [];
    for (let i = 0; i <= 60; i++) {
      const U = (i / 60) * 1.5;
      const L = computeLU(params.L0, params.alpha, U);
      const o = computeOU(params.o0, params.beta, U, derived.forcedOpenness);
      const d = computeDU(params.d0, params.gamma, U, derived.forcedSovereignty);
      out.push({ U, I: computeImpact(params.N, params.p, L, o, d, params.a, params.e) });
    }
    return out;
  }, [params, derived]);

  const cycleBars = useMemo(() => {
    return Array.from({ length: params.c }, (_, i) => ({
      cycle: `t=${i + 1}`,
      I: derived.I,
    }));
  }, [params.c, derived.I]);

  const allGuarantees = params.stewardOwnership && params.openSource && params.euRetention;

  const { mode } = useStoryMode();
  const isStory = mode === "story";
  const { moduleChoices, completedModules } = useGuidedMode();
  const guided2 = moduleChoices[2] as string | undefined;

  const GUIDED_LABELS_2: Record<string, string> = {
    full_guarantees: "Enable all structural guarantees",
    raise_adoption: "Raise the adoption standard (a = 3.0)",
    accept_erosion: "Accept current openness",
  };

  const SCENARIO_MAP_2: Record<string, { stepId: string; optionId: string }> = {
    full_guarantees: { stepId: "openness", optionId: "all" },
    accept_erosion: { stepId: "openness", optionId: "none" },
    raise_adoption: { stepId: "adoption", optionId: "high_a" },
  };

  const isFullGuarantees = guided2 === "full_guarantees" || (!guided2 && allGuarantees);
  const isAcceptErosion = guided2 === "accept_erosion" || (!guided2 && !params.stewardOwnership && !params.openSource);
  const isRaiseAdoption = guided2 === "raise_adoption" || (!guided2 && params.a >= 2.8);

  const mod2Completed = completedModules.has(2);
  const mod2DriftStatus = guided2 && mod2Completed ? getDriftStatus(2, guided2, params) : "not_started";
  const mod2Drifted = mod2DriftStatus === "drifted";
  const mod2DriftNote = mod2Drifted && guided2 ? getDriftNote(2, guided2, params) : undefined;

  const impDiagnosis = useMemo(() => {
    const highU = derived.U > 0.6;
    if (derived.I >= 150 && !highU) return {
      text: `This scenario creates meaningful infrastructure impact (I = ${fmtNum(derived.I, 0)}). A meaningful share of companies survive, remain open, retain sovereignty, and are adopted in practice. The usury pressure is low (U = ${fmtNum(derived.U, 2)}), so company lifetimes and openness are not being eroded. Money is becoming infrastructure.`,
      status: "good" as const,
    };
    if (derived.I >= 80 && highU) return {
      text: `Impact is present (I = ${fmtNum(derived.I, 0)}) but under pressure. The usury pressure (U = ${fmtNum(derived.U, 2)}) is high enough to be shortening company lifetimes, reducing openness, and weakening sovereignty. Financial success here would come at a mission cost. Reducing moral pressure would do more for impact than any other lever.`,
      status: "stressed" as const,
    };
    if (derived.I < 80) return {
      text: `Impact is weak (I = ${fmtNum(derived.I, 0)}). Too few companies survive long enough, or they are losing openness, sovereignty, or adoption. Improving survival probability and reducing usury pressure would do more for mission than raising the repayment cap.`,
      status: "fragile" as const,
    };
    return {
      text: `Impact is moderate (I = ${fmtNum(derived.I, 0)}). The system is working, but there is room to strengthen survival, adoption, or ecosystem contribution without increasing financial pressure.`,
      status: "balanced" as const,
    };
  }, [derived.I, derived.U]);

  const impSeams = getImpactSeams(derived.U, params.stewardOwnership, params.openSource, params.euRetention, params.a);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-12"><ErgodicityBadge /></div>
      {mode === "story" && (
        <div className="lg:col-span-12">
          {guided2 && (
            <GuidedContextBanner
              moduleTitle="Impact"
              choiceLabel={GUIDED_LABELS_2[guided2] ?? guided2}
              channel="impact"
              moduleIndex={2}
              drifted={mod2Drifted}
              driftNote={mod2DriftNote}
            />
          )}
          <PageStory
            character={{ name: "Dr. Yaw Asante", role: "Mission director, DSF Foundation", initials: "YA", color: "impact" }}
            scene="Reviewing the annual impact report with the steering committee"
            paragraphs={[
              { text: "Yaw places the impact report on the table. 'I want to address something upfront,' he says. 'We made money this year. The financial multiple is healthy. But I want to ask a harder question: did the money become infrastructure?'", liveValue: fmtNum(derived.I, 0), liveLabel: "Infrastructure impact I" },
              { text: "'The impact number is not a marketing figure. It is a multiplication of six separate conditions. A company has to survive long enough — that is L. It has to stay open-source — that is o. It has to remain European-controlled — that is d. It has to be actually adopted — that is a. It has to generate spillover into other projects — that is e. Remove any one of these, and the multiplication collapses.'"},
              { text: "'Here is the risk I want to flag.' He highlights a line in the report. 'Our usury pressure is rising. U is approaching 0.6. That number does not just affect theology — it directly erodes company lifetimes, openness, and sovereignty. We may be generating financial returns that quietly undermine the infrastructure we are trying to build.'", liveValue: fmtNum(derived.U, 2), liveLabel: "Usury pressure U" },
              ...impSeams.filter(Boolean).map((text) => ({ text: text as string })),
              { text: STORY_CLOSING.impact },
            ]}
            insights={[
              { label: "Impact is multiplicative", body: "All six factors must hold together. A company that closes its code, or that nobody adopts, contributes near zero regardless of survival.", status: derived.I >= 150 ? "good" : derived.I >= 80 ? "balanced" : "fragile" },
              { label: "U erodes I silently", body: `Usury pressure U = ${fmtNum(derived.U, 2)} shortens company lifetimes (L) and reduces openness (o) and sovereignty (d). Financial gains may mask mission erosion.`, status: derived.U > 0.6 ? "stressed" : derived.U > 0.3 ? "balanced" : "good" },
              { label: "Open-source is not a checkbox", body: "Openness (o) decays under financial pressure. The guarantees — steward ownership, open license, EU retention — are structural safeguards, not assurances.", status: allGuarantees ? "good" : "warning" },
              { label: "Adoption is the test of reality", body: "A company that survives but is never used by real institutions is not infrastructure. The a and e factors distinguish theoretical from actual mission success.", status: "balanced" },
            ]}
          />
          <StoryClosingPrompt text={CLOSING_PROMPT_TEXT.impact} channel="impact" />
        </div>
      )}
      {mode === "scenario" && (
        <div className="lg:col-span-12">
          {guided2 && (
            <GuidedContextBanner
              moduleTitle="Impact"
              choiceLabel={GUIDED_LABELS_2[guided2] ?? guided2}
              channel="impact"
              moduleIndex={2}
              drifted={mod2Drifted}
              driftNote={mod2DriftNote}
            />
          )}
          <ScenarioBanner text={SCENARIO_BANNER_TEXT.impact} channel="impact" />
          <PageScenario
            guidedPreselection={guided2 ? SCENARIO_MAP_2[guided2] : undefined}
            title="Is your fund actually building infrastructure?"
            description="The impact score I is a product of six conditions — each must hold. Walk through a portfolio review: make structural commitments and see which conditions your fund currently satisfies."
            steps={[
              {
                id: "openness",
                question: "What legal safeguards govern openness and sovereignty?",
                subtitle: "These are structural guarantees, not annual commitments.",
                options: [
                  { id: "all", label: "All three guarantees active", description: "Steward ownership, open-source license, EU retention clauses — all locked into investment agreements.", tag: "Full protection", tagColor: "impact", paramChanges: [{ label: "stewardOwnership", value: "on" }, { label: "openSource", value: "on" }, { label: "euRetention", value: "on" }], onApply: () => { set("stewardOwnership", true); set("openSource", true); set("euRetention", true); } },
                  { id: "partial", label: "Open-source only", description: "License is open but steward ownership and EU retention are not contractually required.", tag: "Partial", tagColor: "finance", paramChanges: [{ label: "stewardOwnership", value: "off" }, { label: "openSource", value: "on" }, { label: "euRetention", value: "off" }], onApply: () => { set("stewardOwnership", false); set("openSource", true); set("euRetention", false); } },
                  { id: "none", label: "No structural guarantees", description: "Best-efforts commitments only. The mission depends on founders' goodwill.", tag: "Fragile", tagColor: "warning", paramChanges: [{ label: "stewardOwnership", value: "off" }, { label: "openSource", value: "off" }, { label: "euRetention", value: "off" }], onApply: () => { set("stewardOwnership", false); set("openSource", false); set("euRetention", false); } },
                ],
              },
              {
                id: "adoption",
                question: "What adoption requirement do you set for portfolio companies?",
                options: [
                  { id: "high_a", label: "Production adoption required (a = 3.0)", description: "Companies must demonstrate real institutional use. Higher bar, higher mission score.", tag: "High bar", tagColor: "impact", paramChanges: [{ label: "adoption a", value: "3.0" }], onApply: () => set("a", 3.0) },
                  { id: "mid_a", label: "Proof-of-concept adoption (a = 2.0)", description: "Evidence of use by at least one organisation in production. Reasonable default.", tag: "Standard", tagColor: "finance", paramChanges: [{ label: "adoption a", value: "2.0" }], onApply: () => set("a", 2.0) },
                  { id: "low_a", label: "No adoption requirement (a = 1.0)", description: "The technology exists and is open. Adoption is not measured or required.", tag: "Low bar", tagColor: "warning", paramChanges: [{ label: "adoption a", value: "1.0" }], onApply: () => set("a", 1.0) },
                ],
              },
              {
                id: "usury",
                question: "Usury pressure U is rising. What do you do?",
                options: [
                  { id: "reduce_lambda", label: "Reduce the opportunity-cost markup λ", description: "Lower the 'because we could have earned more elsewhere' component. Direct moral improvement.", tag: "Mission-first", tagColor: "impact", paramChanges: [{ label: "λ", value: fmtNum(Math.max(0, params.lambda - 0.05), 2) }], onApply: () => set("lambda", Math.max(0, params.lambda - 0.05)) },
                  { id: "raise_eta", label: "Increase reinvestment rate η", description: "Recycle more capital into new companies. Partially offsets usury in T; also keeps mission alive.", tag: "Structural offset", tagColor: "impact", paramChanges: [{ label: "η", value: fmtNum(Math.min(1, params.eta + 0.1), 2) }], onApply: () => set("eta", Math.min(1, params.eta + 0.1)) },
                  { id: "ignore_u", label: "Accept current U and watch I", description: "Monitor for erosion in L, o, d rather than adjusting the financial structure now.", tag: "Wait and see", tagColor: "warning", onApply: () => {} },
                ],
              },
            ]}
            consequences={[
              { label: "Impact I", value: fmtNum(derived.I, 0), channel: "impact", direction: derived.I >= 150 ? "up" : derived.I >= 80 ? "neutral" : "down", note: "Infrastructure units" },
              { label: "Lifetime L", value: fmtNum(derived.L, 1) + " yrs", channel: "impact", note: "Eroded by U" },
              { label: "Openness o", value: fmtNum(derived.o, 2), channel: "impact", direction: derived.forcedOpenness ? "up" : "neutral" },
              { label: "Usury U", value: fmtNum(derived.U, 2), channel: "neutral", direction: derived.U > 0.6 ? "down" : derived.U > 0.3 ? "neutral" : "up", note: "Erodes L, o, d" },
            ]}
            narratorLine="Impact is the hardest account to defend because it is invisible in the short term. A company can stay open-source on paper while being nudged toward closure by financial pressure. The model makes that erosion visible."
            onReset={() => { set("stewardOwnership", true); set("openSource", true); set("euRetention", true); set("a", 2.0); }}
          />
        </div>
      )}
      {mode === "analyst" && (
        <div className="lg:col-span-12">
          <StoryStrip
            humanQuestion="Does the money become infrastructure?"
            opening="A fund can make money and still fail its mission. The Digital Sovereignty Fund is trying to create durable open-source digital infrastructure — code that stays open, is widely adopted, retains European sovereignty, and generates spillover value for others. Impact is multiplicative: all the factors must hold together. A company that survives but closes its code is not infrastructure. A company that stays open but is never adopted does not matter at scale. Move the sliders and watch: the mission is brittle in the way a product is not."
            diagnosis={impDiagnosis}
            guidedQuestions={[
              "How many of the N companies survive long enough to matter?",
              "Does the technology stay genuinely open-source?",
              "Does governance stay in Europe or the intended mission community?",
              "Do real institutions or communities adopt the technology?",
              "Is usury pressure shortening useful lifetimes?",
            ]}
          />
        </div>
      )}
      {mode === "analyst" && (<><div className="lg:col-span-12 space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] text-impact">Engine II</div>
        <h2 className="font-serif text-3xl font-semibold">Infrastructure impact</h2>
      </div><aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 self-start">
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-5">
          <div>
            <h3 className="font-serif text-lg font-semibold">Impact ingredients</h3>
            <p className="text-xs text-muted-foreground equation mt-0.5">
              <Eq tex="I = N\,p\,L\,o\,d\,a\,e" />
            </p>
            {mode === "analyst" && (
              <StoryAnnotation channel="impact" className="mt-2">
                Impact is multiplicative — all factors must hold together. A company that survives but closes its code contributes near zero. Start by checking openness, sovereignty, and adoption before raising N or p.
              </StoryAnnotation>
            )}
          </div>
          <SliderField
            label="Companies N"
            symbol="N"
            value={params.N}
            min={1}
            max={200}
            step={1}
            onChange={(v) => set("N", v)}
            channel="impact"
            hint={isStory ? `${params.N} companies · ${Math.round(params.N * params.p)} survivors if p = ${fmtPct(params.p)}` : undefined}
          />
          <SliderField
            label="Base lifetime L₀"
            symbol="L_0"
            value={params.L0}
            min={1}
            max={30}
            step={0.5}
            onChange={(v) => set("L0", v)}
            channel="impact"
            hint={isStory
              ? `each survivor stays active up to ${fmtNum(params.L0, 0)} yrs — usury pressure shortens this`
              : "Years a survivor remains open & active before usury pressure."}
          />
          <SliderField
            label="Adoption a"
            symbol="a"
            value={params.a}
            min={0.5}
            max={5}
            step={0.05}
            onChange={(v) => set("a", v)}
            channel="impact"
            hint={isStory ? `${fmtNum(params.a, 1)}× — real institutions or communities using the technology` : undefined}
          />
          <SliderField
            label="Spillover e"
            symbol="e"
            value={params.e}
            min={0.5}
            max={3}
            step={0.05}
            onChange={(v) => set("e", v)}
            channel="impact"
            hint={isStory ? `${fmtNum(params.e, 2)}× ecosystem multiplier — how much others build on or fork this technology` : undefined}
          />
          <div className="rule-top pt-4 space-y-3">
            <h4 className="text-sm font-medium">Coupling sensitivities</h4>
            <SliderField
              label="α (lifetime ↔ U)"
              symbol="\alpha"
              value={params.alpha}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set("alpha", v)}
              channel="neutral"
            />
            <SliderField
              label="β (openness ↔ U)"
              symbol="\beta"
              value={params.beta}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set("beta", v)}
              channel="neutral"
            />
            <SliderField
              label="γ (sovereignty ↔ U)"
              symbol="\gamma"
              value={params.gamma}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set("gamma", v)}
              channel="neutral"
            />
          </div>
          <div className="rule-top pt-4 space-y-3">
            <h4 className="text-sm font-medium">Structural guarantees</h4>
            <p className="text-xs text-muted-foreground">
              When all three lock in, the model collapses to{" "}
              <Eq tex="I \approx N p L a e" /> (o = d = 1).
            </p>
            <GuaranteeRow
              label="Steward ownership"
              checked={params.stewardOwnership}
              onChange={(v) => set("stewardOwnership", v)}
            />
            <GuaranteeRow
              label="Open-source license"
              checked={params.openSource}
              onChange={(v) => set("openSource", v)}
            />
            <GuaranteeRow
              label="EU retention"
              checked={params.euRetention}
              onChange={(v) => set("euRetention", v)}
            />
          </div>
        </div>
        {mode === "analyst" && <StoryDiagnosis diagnosis={impDiagnosis} />}
      </aside>

      <div className="lg:col-span-9 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ValueCard
            label="Impact"
            symbol="I"
            value={fmtNum(derived.I, 0)}
            channel="impact"
            size="lg"
            sub={`per cycle · total ${fmtNum(derived.Itotal, 0)} over ${params.c}`}
            testId="kpi-impact-i"
          />
          <ValueCard
            label="Lifetime L(U)"
            symbol="L(U)"
            value={`${fmtNum(derived.L, 1)} yrs`}
            channel="impact"
            size="md"
            sub={`from L₀ = ${params.L0}, α = ${params.alpha}, U = ${fmtNum(derived.U, 2)}`}
          />
          <ValueCard
            label="Openness o(U)"
            symbol="o(U)"
            value={fmtPct(derived.o)}
            channel="impact"
            size="md"
            sub={derived.forcedOpenness ? "forced ON · open-source guarantee" : `β = ${params.beta}`}
          />
          <ValueCard
            label="Sovereignty d(U)"
            symbol="d(U)"
            value={fmtPct(derived.d)}
            channel="impact"
            size="md"
            sub={derived.forcedSovereignty ? "forced ON · steward + EU" : `γ = ${params.gamma}`}
          />
        </div>

        {/* Waterfall */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">
            Contribution waterfall
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Multiplicative — each step shows the running value after the next
            factor is applied.
          </p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={waterfall} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  stroke="hsl(var(--rule))"
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  stroke="hsl(var(--rule))"
                />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--popover-border))",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmtNum(v, 1)}
                />
                <Bar dataKey="running" radius={[4, 4, 0, 0]}>
                  {waterfall.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === waterfall.length - 1 ? IMPACT : "hsl(var(--impact) / 0.55)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-2">
              <Eq tex="I" /> as <Eq tex="U" /> sweeps
            </h3>
            <p className="text-xs text-muted-foreground mb-3 num">
              vertical line marks current U = {fmtNum(derived.U, 2)}
            </p>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <LineChart data={iVsU} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="U"
                    tickFormatter={(v) => v.toFixed(2)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke="hsl(var(--rule))"
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke="hsl(var(--rule))"
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtNum(v, 1)}
                    labelFormatter={(v: number) => `U = ${v.toFixed(2)}`}
                  />
                  <ReferenceLine x={derived.U} stroke={THEO} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="I" stroke={IMPACT} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-2">
              Impact per evergreen cycle
            </h3>
            <p className="text-xs text-muted-foreground mb-3 num">
              total over c = {params.c} cycles: {fmtNum(derived.Itotal, 0)}
            </p>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <BarChart data={cycleBars} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="cycle"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke="hsl(var(--rule))"
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke="hsl(var(--rule))"
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtNum(v, 0)}
                  />
                  <Bar dataKey="I" fill={IMPACT} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Requirements table */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">
            Variable mapping (§3 of the paper)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 pr-3">Qualitative requirement</th>
                  <th className="text-left py-2 pr-3">Variable</th>
                  <th className="text-left py-2 pr-3">Implication</th>
                </tr>
              </thead>
              <tbody>
                {REQUIREMENTS.map((row, i) => (
                  <tr key={i} className="border-t border-card-border align-top">
                    <td className="py-2 pr-3">{row[0]}</td>
                    <td className="py-2 pr-3 text-impact">
                      <Eq tex={row[1]} />
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>)}
      {mode === "glossary" && <div className="lg:col-span-12"><GlossaryTab sections="impact" /></div>}
    </div>
  );
}

function GuaranteeRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        data-testid={`switch-${label.replace(/\s+/g, "-").toLowerCase()}`}
      />
    </div>
  );
}

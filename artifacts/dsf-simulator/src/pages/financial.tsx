import { useMemo } from "react";
import { Link } from "wouter";
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
import { getFinancialSeams, STORY_CLOSING, CLOSING_PROMPT_TEXT, SCENARIO_BANNER_TEXT } from "@/lib/storyVariants";
import { Eq } from "@/components/dsf/Eq";
import { ValueCard } from "@/components/dsf/ValueCard";
import { SliderField } from "@/components/dsf/SliderField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeM,
  evergreenWealthSeries,
  vcBenchmarkSeries,
  fmtMultiple,
  fmtNum,
  fmtEUR,
  fmtPct,
  WORKED_EXAMPLES,
} from "@/lib/dsfModel";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Legend,
  Bar,
  BarChart,
} from "recharts";

import { ErgodicityBadge } from "@/components/dsf/ErgodicityBadge";

const FINANCE = "hsl(var(--finance))";
const BENCH = "hsl(var(--benchmark))";
const IMPACT = "hsl(var(--impact))";

export default function FinancialPage() {
  const { params, derived, set, applyExample } = useDsf();

  const mVsP = useMemo(() => {
    const out: Array<Record<string, number>> = [];
    for (let i = 0; i <= 50; i++) {
      const p = i / 50;
      out.push({
        p,
        "k=3": computeM(derived.r, 3, p),
        "k=5": computeM(derived.r, 5, p),
        "k=8": computeM(derived.r, 8, p),
      });
    }
    return out;
  }, [derived.r]);

  const mVsR = useMemo(() => {
    const out: Array<{ r: number; M: number }> = [];
    for (let i = 0; i <= 60; i++) {
      const r = 1 + (i / 60) * 7;
      out.push({ r, M: computeM(r, params.k, params.p) });
    }
    return out;
  }, [params.k, params.p]);

  const wealthSeries = useMemo(() => {
    const ev = evergreenWealthSeries(derived.M, params.eta, params.c, 100);
    const vc = vcBenchmarkSeries(params.rVC, params.c, params.yearsPerCycle, 100);
    return ev.map((row, i) => ({
      cycle: row.cycle,
      Evergreen: row.wealth,
      VC: vc[i]?.wealth ?? null,
    }));
  }, [derived.M, params.eta, params.c, params.rVC, params.yearsPerCycle]);

  const passFailRows = useMemo(() => {
    const ps = [0.1, 0.2, 0.4, 0.6];
    const cs = [1, 2, 3];
    const benchYears = params.yearsPerCycle;
    return ps.map((p) => {
      const m = computeM(derived.r, params.k, p);
      const cells = cs.map((c) => {
        const total = Math.pow(m, c);
        const bench = Math.pow(1 + params.rVC, benchYears * c);
        return { c, total, pass: total >= bench, bench };
      });
      return { p, m, cells };
    });
  }, [derived.r, params.k, params.rVC, params.yearsPerCycle]);

  const { mode } = useStoryMode();
  const isStory = mode === "story";
  const { moduleChoices, completedModules } = useGuidedMode();
  const guided0 = moduleChoices[0] as string | undefined;

  const GUIDED_LABELS_0: Record<string, string> = {
    deepen_support: "Deepen operational support",
    tighten_selection: "Tighten portfolio selection",
    raise_cap: "Accept low survival and raise the cap",
  };

  const SCENARIO_MAP_0: Record<string, { stepId: string; optionId: string }> = {
    deepen_support: { stepId: "survival", optionId: "op_support" },
    tighten_selection: { stepId: "survival", optionId: "selection" },
    raise_cap: { stepId: "survival", optionId: "ignore" },
  };

  const isDeepenSupport = guided0 === "deepen_support" || (!guided0 && params.p >= 0.52);
  const isRaiseCap = guided0 === "raise_cap" || (!guided0 && params.p < 0.28 && params.rDirect > 3.2);
  const isTightenSelection = guided0 === "tighten_selection";

  const mod0Completed = completedModules.has(0);
  const mod0DriftStatus = guided0 && mod0Completed ? getDriftStatus(0, guided0, params) : "not_started";
  const mod0Drifted = mod0DriftStatus === "drifted";
  const mod0DriftNote = mod0Drifted && guided0 ? getDriftNote(0, guided0, params) : undefined;

  const finDiagnosis = useMemo(() => {
    const survivors = Math.round(params.N * params.p);
    if (derived.M >= 2.0 && params.p >= 0.3) return {
      text: `Strong result. ${survivors} of ${params.N} companies survive and repay enough to produce ${fmtMultiple(derived.M)} per cycle. Over ${params.c} evergreen cycles, patient compounding becomes powerful. This fund does not need a unicorn exit — it needs enough survivors and disciplined capital deployment.`,
      status: "balanced" as const,
    };
    if (derived.M >= 1.5) return {
      text: `Plausible but not yet robust. ${survivors} survivors out of ${params.N} produce ${fmtMultiple(derived.M)} per cycle. The financial logic works if the survival assumption holds. Consider whether ${fmtPct(params.p)} survival is operationally realistic and whether follow-on concentration k = ${fmtNum(params.k, 1)} is achievable.`,
      status: "fragile" as const,
    };
    return {
      text: `This scenario is financially fragile. Only ${survivors} of ${params.N} companies survive in this model, and the resulting multiple of ${fmtMultiple(derived.M)} may not sustain the fund. Improving survival probability is the most mission-consistent lever — it is better than raising the repayment cap.`,
      status: "warning" as const,
    };
  }, [derived.M, params.N, params.p, params.k, params.c]);

  const finSeams = getFinancialSeams(params.p, params.k, params.c);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-12"><ErgodicityBadge /></div>
      {mode === "story" && (
        <div className="lg:col-span-12">
          {guided0 && (
            <GuidedContextBanner
              moduleTitle="Survival"
              choiceLabel={GUIDED_LABELS_0[guided0] ?? guided0}
              channel="finance"
              moduleIndex={0}
              drifted={mod0Drifted}
              driftNote={mod0DriftNote}
            />
          )}
          <PageStory
            character={{ name: "Elena Sørensen", role: "Fund manager, Nordica DSF", initials: "ES", color: "finance" }}
            scene="Presenting to the investment committee after year-two results"
            paragraphs={[
              { text: "Elena opens her laptop and pulls up the model. The committee expects a deck full of hockey sticks. What she shows them instead is a survival curve. 'We started with 25 companies,' she says. 'We expect around 10 to survive long enough to repay us. That is not a failure rate — that is the design.'", liveValue: `${Math.round(params.N * params.p)} survivors`, liveLabel: `of ${params.N} companies` },
              { text: "'Conventional VC bets that one company will return 100×. We bet that ten companies will return 3×. The math works differently — and so does the moral logic. We know every company's name. We know why some will struggle. We invest more in the ones that prove themselves, not the ones that spike.'", liveValue: fmtMultiple(derived.M), liveLabel: "Current M per cycle" },
              { text: "A committee member asks: 'Why not raise the repayment cap to improve the multiple?' Elena pauses. 'We can. But raising it puts more pressure on the companies already working hard to repay us. The model shows exactly what that trade-off looks like — more money in, higher burden on every surviving company. We treat the repayment cap as a last resort, not a first lever.'", liveValue: fmtNum(derived.r, 2) + "×", liveLabel: "Repayment cap r" },
              ...finSeams.filter(Boolean).map((text) => ({ text: text as string })),
              { text: STORY_CLOSING.financial },
            ]}
            insights={[
              { label: "Survival is the lever", body: `${Math.round(params.N * params.p)} of ${params.N} companies survive. Improving p strengthens M, I, and T simultaneously — no trade-offs.`, status: derived.M >= 2.0 ? "good" : derived.M >= 1.5 ? "balanced" : "fragile" },
              { label: "Concentration amplifies", body: `k = ${fmtNum(params.k, 1)}× — survivors receive more capital, amplifying the multiple without raising the moral cap.`, status: "balanced" },
              { label: "Evergreen compounding", body: `Over ${params.c} cycles, M compounds to ${fmtMultiple(derived.Mtotal)}. Patient capital outlasts extractive vehicles.`, status: "good" },
              { label: "No unicorn dependency", body: "The model does not require a single extraordinary exit. It requires enough ordinary survivors and disciplined recycling.", status: "good" },
            ]}
          />
          <StoryClosingPrompt text={CLOSING_PROMPT_TEXT.financial} channel="finance" />
        </div>
      )}
      {mode === "scenario" && (
        <div className="lg:col-span-12">
          {guided0 && (
            <GuidedContextBanner
              moduleTitle="Survival"
              choiceLabel={GUIDED_LABELS_0[guided0] ?? guided0}
              channel="finance"
              moduleIndex={0}
              drifted={mod0Drifted}
              driftNote={mod0DriftNote}
            />
          )}
          <ScenarioBanner text={SCENARIO_BANNER_TEXT.financial} channel="finance" />
          <PageScenario
            guidedPreselection={guided0 ? SCENARIO_MAP_0[guided0] : undefined}
            title="How do you improve the financial multiple?"
            description="You manage the DSF portfolio. M is below target. Walk through your available levers — each has a different effect on the mission accounts."
            steps={[
              {
                id: "survival",
                question: "Company survival is below 40%. What do you prioritise?",
                subtitle: "This is the mission-consistent lever — it improves M, I, and T simultaneously.",
                options: [
                  { id: "op_support", label: "Deepen operational support", description: "Assign fund staff to struggling companies. Costs time, improves survival, no moral penalty.", tag: "Mission-first", tagColor: "impact", paramChanges: [{ label: "p", value: fmtNum(Math.min(1, params.p + 0.08), 2) }], onApply: () => set("p", Math.min(1, params.p + 0.08)) },
                  { id: "selection", label: "Tighten portfolio selection", description: "Accept fewer companies, but choose those with stronger survival prospects. Reduces N, improves p.", tag: "Portfolio design", tagColor: "finance", paramChanges: [{ label: "p", value: fmtNum(Math.min(1, params.p + 0.05), 2) }, { label: "N", value: String(Math.max(5, params.N - 3)) }], onApply: () => { set("p", Math.min(1, params.p + 0.05)); set("N", Math.max(5, params.N - 3)); } },
                  { id: "ignore", label: "Accept current survival and raise r", description: "Compensate for low survival by extracting more from the survivors. Moral cost is immediate.", tag: "Financial-first", tagColor: "warning", paramChanges: [{ label: "r", value: fmtNum(Math.min(8, params.rDirect + 0.3), 2) + "×" }], onApply: () => set("rDirect", Math.min(8, params.rDirect + 0.3)) },
                ],
              },
              {
                id: "concentration",
                question: "Survivors have been identified. How do you allocate follow-on capital?",
                options: [
                  { id: "high_k", label: "Concentrate heavily (k = 8×)", description: "Put most capital into your strongest survivors. High amplification, higher risk concentration.", tag: "High conviction", tagColor: "finance", paramChanges: [{ label: "k", value: "8×" }], onApply: () => set("k", 8) },
                  { id: "balanced_k", label: "Moderate concentration (k = 5×)", description: "Balanced follow-on. Proven default — enough amplification without over-concentrating.", tag: "Balanced", tagColor: "impact", paramChanges: [{ label: "k", value: "5×" }], onApply: () => set("k", 5) },
                  { id: "low_k", label: "Spread capital widely (k = 3×)", description: "Lower concentration. Safer but reduces the portfolio multiple meaningfully.", tag: "Conservative", tagColor: undefined, paramChanges: [{ label: "k", value: "3×" }], onApply: () => set("k", 3) },
                ],
              },
              {
                id: "cycles",
                question: "The evergreen mechanism — how many cycles do you commit to?",
                options: [
                  { id: "c3", label: "Three full cycles", description: `Compound M over 3 cycles: ${fmtMultiple(Math.pow(derived.M, 3))} total. Long-term patient capital.`, tag: "Evergreen", tagColor: "impact", paramChanges: [{ label: "cycles c", value: "3" }], onApply: () => set("c", 3) },
                  { id: "c2", label: "Two cycles", description: `${fmtMultiple(Math.pow(derived.M, 2))} total. Reasonable commitment with a defined endpoint.`, tag: "Standard", tagColor: "finance", paramChanges: [{ label: "cycles c", value: "2" }], onApply: () => set("c", 2) },
                  { id: "c1", label: "Single cycle only", description: `${fmtMultiple(derived.M)} — no compounding. Closest to a conventional vehicle.`, tag: "Short-term", tagColor: "warning", paramChanges: [{ label: "cycles c", value: "1" }], onApply: () => set("c", 1) },
                ],
              },
            ]}
            consequences={[
              { label: "Multiple M", value: fmtMultiple(derived.M), channel: "finance", direction: derived.M >= 2.0 ? "up" : derived.M >= 1.5 ? "neutral" : "down", note: "Per cycle" },
              { label: "Total M", value: fmtMultiple(derived.Mtotal), channel: "finance", note: `Over ${params.c} cycles` },
              { label: "Survivors", value: `${Math.round(params.N * params.p)}`, channel: "impact", note: `of ${params.N} companies` },
            ]}
            narratorLine="The mission-consistent path is: improve survival first, concentrate into proven survivors second, commit to multiple cycles third. Raising the repayment cap is a last resort — it improves M but increases the burden on every surviving company."
            onReset={() => { set("p", 0.4); set("k", 5); set("c", 3); }}
          />
        </div>
      )}
      {mode === "analyst" && (
        <div className="lg:col-span-12">
          <StoryStrip
            humanQuestion="Can the fund work without chasing unicorn exits?"
            opening="Conventional venture capital assumes a few spectacular exits cover all failures. This fund runs a different logic: lose small on companies that stall, invest more in companies that prove durable, cap what successful companies can repay, and recycle capital into the next generation. Move the survival slider first — it is the lever that improves the financial multiple without increasing burden on any individual company. Raising the repayment cap improves M mechanically, but the cost falls on surviving companies."
            diagnosis={finDiagnosis}
            guidedQuestions={[
              "How many of the N companies survive long enough to repay?",
              "How much more capital goes into survivors versus failures?",
              "What is the maximum a successful company can repay?",
              "Over how many cycles is capital reinvested?",
              "Does the result beat the benchmark?",
            ]}
          />
        </div>
      )}
      {/* Left rail */}
      {mode === "analyst" && (<><div className="lg:col-span-12 space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] text-finance">Engine I</div>
        <h2 className="font-serif text-3xl font-semibold">Financial portfolio</h2>
      </div><aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 self-start">
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-5">
          <div>
            <h3 className="font-serif text-lg font-semibold">Portfolio shape</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drives <Eq tex="M = \dfrac{r k p}{1+(k-1)p}" />
            </p>
            {mode === "analyst" && (
              <StoryAnnotation channel="finance" className="mt-2">
                Start here. Survival (p) is the mission-consistent lever — raising it improves all three accounts at once. Concentration (k) amplifies survivors without requiring any extraction. Portfolio size (N) sets the scale.
              </StoryAnnotation>
            )}
          </div>
          <SliderField
            label="Survival p"
            symbol="p"
            value={params.p}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set("p", v)}
            channel="finance"
            format={fmtPct}
            hint={isStory ? `${Math.round(params.N * params.p)} of ${params.N} companies survive long enough to repay` : undefined}
          />
          <SliderField
            label="Concentration k"
            symbol="k"
            value={params.k}
            min={1}
            max={15}
            step={0.5}
            onChange={(v) => set("k", v)}
            channel="finance"
            hint={isStory ? `surviving companies receive ${fmtNum(params.k, 1)}× the initial check size` : undefined}
          />
          <SliderField
            label="Companies N"
            symbol="N"
            value={params.N}
            min={1}
            max={200}
            step={1}
            onChange={(v) => set("N", v)}
            channel="finance"
            hint={isStory ? `${params.N} companies in the portfolio · ${Math.round(params.N * (1 - params.p))} losses` : undefined}
          />
          <div className="rule-top pt-4 space-y-3">
            <SliderField
              label="Repayment cap r"
              symbol="r"
              value={derived.r}
              min={1}
              max={8}
              step={0.05}
              onChange={(v) => { set("rDirect", v); set("composeR", false); }}
              channel="finance"
              hint={isStory ? `each surviving company repays up to ${fmtNum(derived.r, 2)}× its investment` : "Maximum repayment multiple — higher values improve M but increase burden on surviving companies."}
            />
          </div>
          <div className="rule-top pt-4 space-y-3">
            <h4 className="text-sm font-medium">Evergreen</h4>
            {mode === "analyst" && (
              <StoryAnnotation channel="finance">
                These controls determine how long the fund runs and how much of each cycle's proceeds flow back into mission rather than out to investors. Higher reinvestment keeps capital compounding inside the fund.
              </StoryAnnotation>
            )}
            <SliderField
              label="Cycles c"
              symbol="c"
              value={params.c}
              min={1}
              max={8}
              step={1}
              onChange={(v) => set("c", v)}
              channel="finance"
              hint={isStory ? `capital recycled ${params.c} time${params.c !== 1 ? "s" : ""} · ${params.c * params.yearsPerCycle} years of investing` : undefined}
            />
            <SliderField
              label="Reinvestment η"
              symbol="\eta"
              value={params.eta}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set("eta", v)}
              channel="finance"
              format={fmtPct}
              hint={isStory ? `${fmtPct(params.eta)} of returned capital flows back into new investments` : undefined}
            />
            <SliderField
              label="Years / cycle"
              symbol="t"
              value={params.yearsPerCycle}
              min={3}
              max={15}
              step={1}
              onChange={(v) => set("yearsPerCycle", v)}
              channel="finance"
              hint={isStory ? `${params.yearsPerCycle} years per cycle · ${params.c * params.yearsPerCycle} years total horizon` : undefined}
            />
            <SliderField
              label="VC benchmark"
              symbol="r_{VC}"
              value={params.rVC}
              min={0}
              max={0.3}
              step={0.005}
              onChange={(v) => set("rVC", v)}
              channel="neutral"
              format={fmtPct}
              hint="Annual return of the comparison vehicle."
            />
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
          <h3 className="font-serif text-lg font-semibold">Worked examples</h3>
          <p className="text-xs text-muted-foreground">
            From §2 of the paper. Click to load and verify.
          </p>
          <div className="space-y-1">
            {WORKED_EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => applyExample(ex.id)}
                className="w-full text-left rounded-md border border-card-border px-3 py-2 hover-elevate"
                data-testid={`example-${ex.id}`}
              >
                <div className="text-sm font-medium">{ex.name}</div>
                <div className="text-xs text-muted-foreground">{ex.description}</div>
                <div className="text-xs text-finance num mt-0.5">
                  expected: {fmtMultiple(ex.expected.multiple)} · invest{" "}
                  {fmtEUR(ex.expected.investmentEUR)} · repay{" "}
                  {fmtEUR(ex.expected.repaymentEUR)}
                </div>
              </button>
            ))}
          </div>
        </div>
        {mode === "analyst" && <StoryDiagnosis diagnosis={finDiagnosis} />}
      </aside>

      {/* Main */}
      <div className="lg:col-span-9 space-y-6">
        {/* Headline values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ValueCard
            label="Single-cycle multiple"
            symbol="M"
            value={fmtMultiple(derived.M)}
            channel="finance"
            size="lg"
            testId="kpi-financial-m"
          />
          <ValueCard
            label="Evergreen total"
            symbol="M^c"
            value={fmtMultiple(derived.Mtotal)}
            channel="finance"
            size="lg"
            sub={`over ${params.c} cycles · ${params.c * params.yearsPerCycle} yrs`}
            testId="kpi-financial-mc"
          />
          <ValueCard
            label="Successes"
            symbol="S = pN"
            value={`${derived.S}`}
            channel="finance"
            size="lg"
            sub={`${derived.F} losses out of ${params.N}`}
          />
          <ValueCard
            label="Repayment claim"
            symbol="rkI_f S"
            value={fmtEUR(derived.Repayment)}
            channel="finance"
            size="lg"
            sub={`investment: ${fmtEUR(derived.Investment)}`}
          />
        </div>
        {mode === "analyst" && (
          <StoryAnnotation channel="finance">
            M = {fmtMultiple(derived.M)} per cycle. With {params.c} evergreen cycles the fund grows to {fmtMultiple(derived.Mtotal)} total. The single-cycle multiple depends entirely on how many companies survive (p) and how much more capital went into those survivors (k) — not on any one spectacular exit.
          </StoryAnnotation>
        )}
        {mode === "analyst" && (
          <div
            className="text-xs rounded-md px-3 py-2.5"
            style={{ background: "hsl(var(--theology)/0.07)", border: "1px solid hsl(var(--theology)/0.18)" }}
          >
            <span className="font-semibold" style={{ color: "hsl(var(--theology))" }}>Tax note:</span>{" "}
            <span className="text-muted-foreground">
              M is a gross portfolio multiple — company-level tax (τ) reduces each company's FCF and therefore
              what it can actually afford to repay. You can stress-test τ on the Portfolio tab.
              For fund-level tax (participation exemption vs debt-like treatment) and withholding tax,{" "}
            </span>
            <Link href="/tax" className="underline underline-offset-2 text-muted-foreground hover:text-white/80 transition-colors">
              see the Tax tab →
            </Link>
          </div>
        )}


        {/* M vs p chart */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-serif text-lg font-semibold">
              <Eq tex="M" /> as <Eq tex="p" /> sweeps, for three concentrations
            </h3>
            <span className="text-xs text-muted-foreground num">r = {fmtNum(derived.r, 2)}</span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={mVsP} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                <XAxis
                  dataKey="p"
                  tickFormatter={(v) => v.toFixed(1)}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  stroke="hsl(var(--rule))"
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  stroke="hsl(var(--rule))"
                  tickFormatter={(v) => `${v.toFixed(1)}×`}
                />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--popover-border))",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmtMultiple(v)}
                  labelFormatter={(v: number) => `p = ${v.toFixed(2)}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="k=3" stroke={FINANCE} strokeWidth={1.4} dot={false} strokeDasharray="2 3" />
                <Line type="monotone" dataKey="k=5" stroke={FINANCE} strokeWidth={2.2} dot={false} />
                <Line type="monotone" dataKey="k=8" stroke={FINANCE} strokeWidth={1.4} dot={false} strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {mode === "analyst" && (
          <StoryAnnotation channel="finance">
            This chart shows how the multiple changes as survival improves (x-axis). Your current setting (p = {fmtPct(params.p)}) is somewhere along these curves. The bold middle line is your concentration (k = {fmtNum(params.k, 1)}). Move the survival slider and watch your position on this chart shift.
          </StoryAnnotation>
        )}

        {/* M vs r */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-2">
              <Eq tex="M" /> vs <Eq tex="r" />
            </h3>
            <p className="text-xs text-muted-foreground mb-3 num">
              p = {fmtPct(params.p)} · k = {fmtNum(params.k, 1)}
            </p>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <LineChart data={mVsR} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="r"
                    tickFormatter={(v) => v.toFixed(1)}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke="hsl(var(--rule))"
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke="hsl(var(--rule))"
                    tickFormatter={(v) => `${v.toFixed(1)}×`}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtMultiple(v)}
                    labelFormatter={(v: number) => `r = ${v.toFixed(2)}`}
                  />
                  <Line type="monotone" dataKey="M" stroke={FINANCE} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-2">
              Evergreen wealth <Eq tex="W_t" /> vs VC benchmark
            </h3>
            <p className="text-xs text-muted-foreground mb-3 num">
              W₀ = 100 · cycle = {params.yearsPerCycle} yrs · η = {fmtPct(params.eta)}
            </p>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <LineChart data={wealthSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
                    formatter={(v: number) => fmtNum(v, 1)}
                    labelFormatter={(v: number) => `cycle ${v}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Evergreen" stroke={FINANCE} strokeWidth={2.2} dot={{ r: 2 }} />
                  <Line
                    type="monotone"
                    dataKey="VC"
                    stroke={BENCH}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pass / Fail table */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">
            Pass / Fail vs benchmark
          </h3>
          <p className="text-xs text-muted-foreground mb-3 num">
            cells: <Eq tex="M^c" /> with PASS if it beats <Eq tex="(1+r_{VC})^{c\cdot t}" /> · r ={" "}
            {fmtNum(derived.r, 2)}, k = {fmtNum(params.k, 1)}, t = {params.yearsPerCycle} yrs
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 pr-3">p</th>
                  <th className="text-left py-2 pr-3">M</th>
                  {[1, 2, 3].map((c) => (
                    <th key={c} className="text-left py-2 pr-3">c = {c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {passFailRows.map((row) => (
                  <tr key={row.p} className="border-t border-card-border">
                    <td className="py-2 pr-3 num">{fmtPct(row.p)}</td>
                    <td className="py-2 pr-3 num text-finance">{fmtMultiple(row.m)}</td>
                    {row.cells.map((cell) => (
                      <td key={cell.c} className="py-2 pr-3">
                        <span className="num mr-2">{fmtMultiple(cell.total)}</span>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            cell.pass
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {cell.pass ? "pass" : "fail"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash flow */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-5">
          <div>
            <h3 className="font-serif text-lg font-semibold">Cash-flow extension</h3>
            <p className="text-xs text-muted-foreground equation">
              <Eq tex="\text{Cash}_y = \dfrac{rkI_fS}{T_{repay}} - C_{ops} - mF_{size} - \text{Loan}_y" />
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NumberInput label="I_f (€)" value={params.If} step={5000} onChange={(v) => set("If", v)} />
            <NumberInput label="T_repay (yr)" value={params.Trepay} step={1} onChange={(v) => set("Trepay", v)} />
            <NumberInput label="C_ops (€/yr)" value={params.Cops} step={50000} onChange={(v) => set("Cops", v)} />
            <NumberInput label="Fund size (€)" value={params.fundSize} step={1000000} onChange={(v) => set("fundSize", v)} />
            <NumberInput label="Mgmt fee m" value={params.m} step={0.005} onChange={(v) => set("m", v)} />
            <NumberInput label="L loan (€)" value={params.Lloan} step={500000} onChange={(v) => set("Lloan", v)} />
            <NumberInput label="i loan" value={params.iLoan} step={0.005} onChange={(v) => set("iLoan", v)} />
            <NumberInput label="d_LP" value={params.dLP} step={0.05} onChange={(v) => set("dLP", v)} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rule-top pt-4">
            <CashCell label="R_year" value={fmtEUR(derived.Ryear)} channel="finance" />
            <CashCell label="C_mgmt" value={`-${fmtEUR(derived.Cmgmt)}`} />
            <CashCell label="Loan_year" value={`-${fmtEUR(derived.LoanYear)}`} />
            <CashCell
              label="Cash_year"
              value={fmtEUR(derived.CashYear)}
              channel={derived.CashYear >= 0 ? "finance" : "neutral"}
            />
            <CashCell label="Recycle" value={fmtEUR(derived.Recycle)} channel="impact" />
          </div>
        </div>
      </div>
    </>)}
      {mode === "glossary" && <div className="lg:col-span-12"><GlossaryTab sections="financial" /></div>}
    </div>
  );
}

function NumberInput({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="num text-sm"
        data-testid={`input-${label}`}
      />
    </div>
  );
}

function CashCell({
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
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num text-base font-medium ${cls}`}>{value}</div>
    </div>
  );
}

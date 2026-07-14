import { useMemo } from "react";
import { Link } from "wouter";
import { useDsf } from "@/hooks/useDsfStore";
import { useStoryMode } from "@/contexts/storyMode";
import { GlossaryTab } from "@/components/dsf/GlossaryTab";
import { StoryAnnotation } from "@/components/dsf/StoryComponents";
import { PageStory } from "@/components/dsf/PageStory";
import { PageScenario } from "@/components/dsf/PageScenario";
import { Eq } from "@/components/dsf/Eq";
import { ValueCard } from "@/components/dsf/ValueCard";
import { SliderField } from "@/components/dsf/SliderField";
import { Button } from "@/components/ui/button";
import {
  computeAll,
  fmtMultiple,
  fmtNum,
  fmtPct,
  SCENARIO_BASE,
  THEOLOGY_SCENARIOS,
} from "@/lib/dsfModel";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { ErgodicityBadge } from "@/components/dsf/ErgodicityBadge";

export default function OverviewPage() {
  const { params, derived, set, applyScenario } = useDsf();

  const passF = derived.M >= params.Fmin;
  const passI = derived.I >= params.Imin;
  const passT = derived.T >= params.Tmin;
  const allPass = passF && passI && passT;

  const { mode } = useStoryMode();
  const isStory = mode === "story";
  const ovDiagnosis = useMemo(() => {
    if (passF && passI && passT) return {
      text: `This design passes all three guardrails. It is financially viable (M = ${fmtMultiple(derived.M)}), creating meaningful infrastructure impact (I = ${fmtNum(derived.I, 0)}), and morally disciplined (T = ${fmtNum(derived.T, 2)}). The model relies on a ${fmtPct(params.p)} survival rate, ${fmtNum(params.k, 1)}× follow-on concentration, and a ${fmtNum(derived.r, 2)}× repayment cap. The next question is whether those assumptions hold in practice.`,
      status: "balanced" as const,
    };
    if (!passF && !passT) return {
      text: `This design fails both guardrails. It is financially fragile and morally stressed. Improving company survival is the most mission-consistent first step — it strengthens both the money and infrastructure accounts without increasing moral pressure.`,
      status: "warning" as const,
    };
    if (!passF) return {
      text: `This design is morally disciplined (T = ${fmtNum(derived.T, 2)}) but financially fragile (M = ${fmtMultiple(derived.M)}, below the floor of ${fmtMultiple(params.Fmin)}). Try increasing company survival or the repayment cap — but check the Theology tab to ensure the cap remains morally grounded.`,
      status: "fragile" as const,
    };
    return {
      text: `This design is financially strong (M = ${fmtMultiple(derived.M)}) but morally stressed (T = ${fmtNum(derived.T, 2)}, below the floor of ${fmtNum(params.Tmin, 2)}). Too much of the return may come from morally dangerous components. Open the Theology tab to inspect the opportunity-cost markup and risk allowance.`,
      status: "stressed" as const,
    };
  }, [passF, passI, passT, derived, params]);

  const triData = [
    {
      axis: "Financial",
      value: Math.min(1, derived.M / 5),
      full: 1,
    },
    {
      axis: "Impact",
      value: Math.min(1, derived.I / 600),
      full: 1,
    },
    {
      axis: "Theology",
      value: Math.min(1, Math.max(0, derived.T / 2)),
      full: 1,
    },
  ];

  return (
    <div className="space-y-10">
      <div><ErgodicityBadge /></div>
      {mode === "story" && (
        <section>
          <PageStory
            character={{ name: "Ingrid Halvorsen", role: "Chief investment officer, Nordica DSF", initials: "IH", color: "neutral" }}
            scene="Opening address at the annual limited partner meeting"
            paragraphs={[
              { text: "Ingrid begins with a single sentence: 'This fund has one objective — to build digital infrastructure in Europe without becoming what we are funding companies not to be.' A pause. 'That means we are accountable to three numbers, not one. And all three are on the screen right now.'" },
              { text: "'M is whether we make money. I is whether that money becomes infrastructure. T is whether the way we made it was moral. These three numbers do not move independently. Improve survival probability and all three go up. Raise the repayment cap and M rises — but T is under pressure. That coupling is the intellectual core of this model.'", liveValue: fmtMultiple(derived.M), liveLabel: "Financial multiple M" },
              { text: "'We have spent two years asking: what is the design space where all three pass their floor? This simulator is that question made visible. The three guardrails on screen are not aspirational. They are enforced by the model. Any design that fails one of them shows up red — and we do not deploy capital into red.'", liveValue: allPass ? "All pass" : "Check failing", liveLabel: "Guardrail status" },
            ]}
            insights={[
              { label: "M — financial multiple", body: `Currently ${fmtMultiple(derived.M)}. Must stay above ${fmtMultiple(params.Fmin)}. Driven by survival (p), concentration (k), and the repayment cap (r).`, status: passF ? "good" : "fragile" },
              { label: "I — infrastructure impact", body: `Currently ${fmtNum(derived.I, 0)}. A multiplicative score: all six factors (L, o, d, a, e, p) must hold. Any single failure collapses the product.`, status: passI ? "good" : "fragile" },
              { label: "T — theological integrity", body: `Currently ${fmtNum(derived.T, 2)}. Measures the moral composition of the return. T = 1 − U + μη. The usury score U is the risk; reinvestment η is the offset.`, status: passT ? "good" : "stressed" },
              { label: "The coupling", body: "p (survival) is the only lever that improves all three simultaneously. r (repayment cap) creates a trade-off between M and T. The model makes both visible.", status: "balanced" },
            ]}
            cta="Move a slider on this page and watch all three accounts update together. Then visit each specialist tab for the full decomposition."
          />
        </section>
      )}
      {mode === "scenario" && (
        <section>
          <PageScenario
            title="Can you pass all three guardrails simultaneously?"
            description="You are designing a new DSF fund vehicle. Walk through the key structural decisions — each choice updates the live model. Your goal: M ≥ 2×, I ≥ 100, T ≥ 1.0."
            steps={[
              {
                id: "survival_target",
                question: "What survival probability do you design the portfolio for?",
                subtitle: "This is the most consequential single assumption in the model.",
                options: [
                  { id: "p_high", label: "Ambitious (p = 55%)", description: "Requires strong selection, deep operational support. Expensive but mission-optimal if achieved.", tag: "High conviction", tagColor: "impact", paramChanges: [{ label: "p", value: "0.55" }], onApply: () => set("p", 0.55) },
                  { id: "p_mid", label: "Realistic (p = 40%)", description: "Evidence-based default from comparable portfolios. Delivers a workable M with disciplined concentration.", tag: "Proven", tagColor: "finance", paramChanges: [{ label: "p", value: "0.40" }], onApply: () => set("p", 0.40) },
                  { id: "p_low", label: "Conservative (p = 25%)", description: "Honest about failure rates. Requires a higher r or k to remain financially viable.", tag: "Conservative", tagColor: "warning", paramChanges: [{ label: "p", value: "0.25" }], onApply: () => set("p", 0.25) },
                ],
              },
              {
                id: "moral_cap",
                question: "How do you justify the repayment cap?",
                subtitle: "Every premium above principal must be morally grounded.",
                options: [
                  { id: "cost_based", label: "Cost-based only (r ≈ 2.0×)", description: "The cap covers real costs (δ) and bounded discipline (π). Near-zero λ. Clear moral grounding.", tag: "Stewardship", tagColor: "theology", paramChanges: [{ label: "λ", value: "0.00" }, { label: "δ", value: "0.8" }, { label: "π", value: "0.1" }, { label: "ρ", value: "0.1" }], onApply: () => { set("lambda", 0.0); set("delta", 0.8); set("pi", 0.1); set("rho", 0.1); } },
                  { id: "balanced_r", label: "Balanced (r ≈ 2.9×)", description: "Default composition. Some risk pricing (ρ), modest λ. Defensible with strong reinvestment.", tag: "Balanced", tagColor: "finance", paramChanges: [{ label: "λ", value: "0.10" }, { label: "δ", value: "1.3" }, { label: "π", value: "0.2" }, { label: "ρ", value: "0.3" }], onApply: () => { set("lambda", 0.1); set("delta", 1.3); set("pi", 0.2); set("rho", 0.3); } },
                  { id: "market_r", label: "Market-rate (r ≈ 4.5×)", description: "Higher λ to match benchmark expectations. Raises U significantly — T becomes the binding constraint.", tag: "Pressure", tagColor: "warning", paramChanges: [{ label: "λ", value: "0.50" }, { label: "δ", value: "1.3" }, { label: "π", value: "0.2" }, { label: "ρ", value: "0.5" }], onApply: () => { set("lambda", 0.5); set("delta", 1.3); set("pi", 0.2); set("rho", 0.5); } },
                ],
              },
              {
                id: "recycle",
                question: "What fraction of returns do you recycle into new companies?",
                options: [
                  { id: "high_eta", label: "80% reinvestment (η = 0.8)", description: "Strong evergreen commitment. Maximises I over time and provides the best T offset against usury.", tag: "Evergreen", tagColor: "impact", paramChanges: [{ label: "η", value: "0.80" }], onApply: () => set("eta", 0.8) },
                  { id: "mid_eta", label: "70% reinvestment (η = 0.7)", description: "Standard configuration. Distributes some return to investors while maintaining mission continuity.", tag: "Standard", tagColor: "finance", paramChanges: [{ label: "η", value: "0.70" }], onApply: () => set("eta", 0.7) },
                  { id: "low_eta", label: "50% reinvestment (η = 0.5)", description: "More distribution-oriented. Works for T only if λ is very low. Weakens long-term I trajectory.", tag: "Caution", tagColor: "warning", paramChanges: [{ label: "η", value: "0.50" }], onApply: () => set("eta", 0.5) },
                ],
              },
            ]}
            consequences={[
              { label: "Financial M", value: fmtMultiple(derived.M), channel: "finance", direction: passF ? "up" : "down", note: `floor ${fmtMultiple(params.Fmin)}` },
              { label: "Impact I", value: fmtNum(derived.I, 0), channel: "impact", direction: passI ? "up" : "down", note: `floor ${params.Imin}` },
              { label: "Integrity T", value: fmtNum(derived.T, 2), channel: "theology", direction: passT ? "up" : "down", note: `floor ${fmtNum(params.Tmin, 2)}` },
              { label: "Usury U", value: fmtNum(derived.U, 2), channel: "neutral", direction: derived.U < 0.3 ? "up" : derived.U > 0.6 ? "down" : "neutral" },
            ]}
            narratorLine="The model has one pass/fail test: can you defend all three numbers simultaneously? If not, the failure is a signal — not about ambition, but about design."
            onReset={() => { set("p", 0.4); set("eta", 0.7); set("lambda", 0.1); set("delta", 1.3); }}
          />
        </section>
      )}
      {mode === "analyst" && (<>{/* Hero */}
      <section className="space-y-3 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Working paper · v2.5.8
        </div>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight font-semibold">
          DSF Model Simulator
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          A live instrument for the Digital Sovereignty Fund — a non-extractive
          European venture model. Every parameter below is a knob in a single
          coupled system: financial multiple <Eq tex="M" />, infrastructure
          impact <Eq tex="I" />, and theological integrity <Eq tex="T" />. Move
          a slider; watch all three accounts respond.
        </p>
      </section>

      {/* Three engine cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ValueCard
          label="Financial multiple"
          symbol="M"
          value={fmtMultiple(derived.M)}
          channel="finance"
          size="xl"
          sub={`per cycle · evergreen ${fmtMultiple(derived.Mtotal)} over ${params.c} cycles`}
          testId="kpi-overview-m"
        >
          <div className="text-xs text-muted-foreground equation">
            <Eq tex="M = \dfrac{r\,k\,p}{1+(k-1)p}" />
          </div>
        </ValueCard>
        <ValueCard
          label="Infrastructure impact"
          symbol="I"
          value={fmtNum(derived.I, 0)}
          channel="impact"
          size="xl"
          sub={`coupled to U=${fmtNum(derived.U, 2)} via L, o, d`}
          testId="kpi-overview-i"
        >
          <div className="text-xs text-muted-foreground equation">
            <Eq tex="I = N\,p\,L\,o\,d\,a\,e" />
          </div>
        </ValueCard>
        <ValueCard
          label="Theological integrity"
          symbol="T"
          value={fmtNum(derived.T, 2)}
          channel="theology"
          size="xl"
          sub={`U = ${fmtNum(derived.U, 2)} · μη = ${fmtNum(params.mu * params.eta, 2)}`}
          testId="kpi-overview-t"
        >
          <div className="text-xs text-muted-foreground equation">
            <Eq tex="T = 1 - U + \mu\eta" />
          </div>
        </ValueCard>
      </section>

      {mode === "analyst" && (
        <StoryAnnotation channel="neutral">
          These three numbers update together. Move a slider below and watch all three respond. The goal is not to maximise any one number — it is to find a design where M stays above its floor, T stays above its floor, and I is as large as possible within those constraints.
        </StoryAnnotation>
      )}
      {mode === "analyst" && (
        <div
          className="text-xs rounded-md px-3 py-2.5 max-w-2xl"
          style={{ background: "hsl(var(--theology)/0.07)", border: "1px solid hsl(var(--theology)/0.18)" }}
        >
          <span className="font-semibold" style={{ color: "hsl(var(--theology))" }}>Tax layer:</span>{" "}
          <span className="text-muted-foreground">
            M here is the portfolio-level gross multiple. Company-level tax (τ) reduces FCF and therefore what each
            company can afford to repay — explore this on the Portfolio tab. For fund-level tax (participation exemption
            vs debt-like re-characterisation) and withholding tax analysis,{" "}
          </span>
          <Link href="/tax" className="underline underline-offset-2 text-muted-foreground hover:text-white/80 transition-colors">
            see the Tax tab →
          </Link>
        </div>
      )}

      {/* Quick controls + viability + radar */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-card-border rounded-lg p-5 space-y-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-lg font-semibold">Quick controls</h3>
            <span className="text-xs text-muted-foreground">
              dive into each engine for the full panel
            </span>
          </div>
          {mode === "analyst" && (
            <StoryAnnotation channel="finance">
              Start with survival (p) — it is the mission-consistent lever. It improves all three accounts at once. Raising the repayment cap (r) improves M but may damage T. Concentration (k) amplifies the effect of survivors without extraction.
            </StoryAnnotation>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SliderField
              label="Survival probability"
              symbol="p"
              value={params.p}
              onChange={(v) => set("p", v)}
              min={0}
              max={1}
              step={0.01}
              channel="finance"
              format={fmtPct}
              hint={isStory
                ? `${Math.round(params.N * params.p)} of ${params.N} companies survive — the good lever`
                : "Share of portfolio that survives & repays."}
            />
            <SliderField
              label="Capital concentration"
              symbol="k"
              value={params.k}
              onChange={(v) => set("k", v)}
              min={1}
              max={15}
              step={0.5}
              channel="finance"
              hint={isStory
                ? `survivors receive ${fmtNum(params.k, 1)}× the initial check — amplifies p without extraction`
                : "Follow-on multiple poured into survivors."}
            />
            <SliderField
              label="Repayment cap"
              symbol="r"
              value={derived.r}
              onChange={(v) => set("rDirect", v)}
              min={1}
              max={8}
              step={0.05}
              disabled={params.composeR}
              channel="finance"
              hint={
                params.composeR
                  ? "Composed from δ + π + ρ + λ on the Theology page."
                  : isStory
                    ? `cap of ${fmtNum(derived.r, 2)}× — companies repay at most ${fmtNum(derived.r, 2)} euros per euro received`
                    : "Direct override: total repayment claim per success."
              }
            />
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-lg font-semibold">Design objective</h3>
            {allPass ? (
              <span className="flex items-center gap-1.5 text-xs text-finance">
                <CheckCircle2 className="w-4 h-4" /> viable
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="w-4 h-4" /> below floor
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground equation">
            <Eq tex="\max\; I \quad \text{s.t.}\quad M \ge F_{\min},\; T \ge T_{\min}" />
          </div>
          <SliderField
            label="Floor on M"
            symbol="F_{\min}"
            value={params.Fmin}
            onChange={(v) => set("Fmin", v)}
            min={1}
            max={5}
            step={0.05}
            format={fmtMultiple}
          />
          <SliderField
            label="Floor on T"
            symbol="T_{\min}"
            value={params.Tmin}
            onChange={(v) => set("Tmin", v)}
            min={0}
            max={2}
            step={0.05}
          />
          <div className="grid grid-cols-3 gap-2 pt-2 rule-top">
            <Indicator label="M" pass={passF} value={fmtMultiple(derived.M)} />
            <Indicator label="I" pass={passI} value={fmtNum(derived.I, 0)} />
            <Indicator label="T" pass={passT} value={fmtNum(derived.T, 2)} />
          </div>
        </div>
      </section>

      {/* Triangle radar + scenarios */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">
            Trade-off triangle
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Each axis is normalized to its working ceiling.
          </p>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <RadarChart data={triData} outerRadius="75%">
                <PolarGrid stroke="hsl(var(--rule))" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 1]} />
                <Radar
                  name="Current"
                  dataKey="value"
                  stroke="hsl(var(--foreground))"
                  fill="hsl(var(--foreground))"
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">
            Theology scenarios
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Five points on the licit ↔ usurious spectrum. All five hold{" "}
            <Eq tex="r = 2.90" />, <Eq tex="M \approx 2.56\times" />, yet their
            impact spreads from <span className="text-impact">~448</span> to{" "}
            <span className="text-theology">~234</span>. Structural guarantees
            are relaxed in this illustration so the U-coupling on openness and
            sovereignty is visible. Click to apply.
          </p>
          <div className="space-y-1.5">
            {THEOLOGY_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => applyScenario(s.id)}
                className="w-full grid grid-cols-12 gap-3 items-center text-left rounded-md border border-card-border px-3 py-2 hover-elevate"
                data-testid={`scenario-${s.id}`}
              >
                <div className="col-span-1 font-serif font-semibold">{s.id}</div>
                <div className="col-span-3 text-sm">{s.name}</div>
                <div className="col-span-5 num text-xs text-muted-foreground">
                  δ={s.delta.toFixed(2)} · π={s.pi.toFixed(2)} · ρ=
                  {s.rho.toFixed(2)} · λ={s.lambda.toFixed(2)}
                </div>
                <div className="col-span-2 num text-xs text-impact text-right">
                  {/* Scenario badge convention (pack v3 III.3 / paper §6.4
                      note): the table value keeps ε_p = 0; the coupled value
                      is shown alongside rather than silently switching. */}
                  I≈
                  {Math.round(
                    computeAll({
                      ...params,
                      ...SCENARIO_BASE,
                      delta: s.delta,
                      pi: s.pi,
                      rho: s.rho,
                      lambda: s.lambda,
                      epsP: 0,
                    }).I,
                  )}
                  {params.epsP > 0 && (
                    <span className="block text-[10px] text-muted-foreground">
                      w/ coupling:{" "}
                      {Math.round(
                        computeAll({
                          ...params,
                          ...SCENARIO_BASE,
                          delta: s.delta,
                          pi: s.pi,
                          rho: s.rho,
                          lambda: s.lambda,
                        }).I,
                      )}
                    </span>
                  )}
                </div>
                <div className="col-span-1 text-right">
                  <ArrowRight className="w-4 h-4 inline-block text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Engine portals */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PortalCard
          href="/financial"
          channel="finance"
          title="Financial Engine"
          desc="Single-cycle multiple, evergreen compounding, cash-flow extension, benchmark vs VC."
        />
        <PortalCard
          href="/impact"
          channel="impact"
          title="Impact Engine"
          desc="Infrastructure impact contribution waterfall, structural-guarantee toggles, U-coupling."
        />
        <PortalCard
          href="/theology"
          channel="theology"
          title="Theology Engine"
          desc="Decompose r, the usury index U, the licit / usury split of M, scenario presets A–E."
        />
      </section>
    </>)}
      {mode === "glossary" && <div className="lg:col-span-12"><GlossaryTab sections="all" showEquations /></div>}
    </div>
  );
}

function Indicator({ label, pass, value }: { label: string; pass: boolean; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num text-sm font-medium ${pass ? "text-emerald-400" : "text-destructive"}`}>
        {value}
      </div>
      <div className={`text-[10px] ${pass ? "text-emerald-400" : "text-destructive"}`}>
        {pass ? "above floor" : "below floor"}
      </div>
    </div>
  );
}

function PortalCard({
  href,
  channel,
  title,
  desc,
}: {
  href: string;
  channel: "finance" | "impact" | "theology";
  title: string;
  desc: string;
}) {
  const accent =
    channel === "finance" ? "border-finance" : channel === "impact" ? "border-impact" : "border-theology";
  return (
    <Link
      href={href}
      data-testid={`portal-${channel}`}
      className={`block bg-card border border-card-border rounded-lg p-5 hover-elevate transition-colors border-l-4 ${accent}`}
    >
      <div className="flex items-baseline justify-between">
        <h4 className="font-serif text-lg font-semibold">{title}</h4>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{desc}</p>
    </Link>
  );
}

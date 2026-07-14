import { useMemo, useState } from "react";
import { useDsf } from "@/hooks/useDsfStore";
import { useStoryMode } from "@/contexts/storyMode";
import { GlossaryTab } from "@/components/dsf/GlossaryTab";
import { StoryStrip, StoryAnnotation } from "@/components/dsf/StoryComponents";
import { PageStory } from "@/components/dsf/PageStory";
import { PageScenario } from "@/components/dsf/PageScenario";
import { StoryClosingPrompt } from "@/components/dsf/StoryClosingPrompt";
import { ScenarioBanner } from "@/components/dsf/ScenarioBanner";
import { getUnifiedSeams, STORY_CLOSING, CLOSING_PROMPT_TEXT, SCENARIO_BANNER_TEXT } from "@/lib/storyVariants";
import { Eq } from "@/components/dsf/Eq";
import { ValueCard } from "@/components/dsf/ValueCard";
import {
  THEOLOGY_SCENARIOS,
  computeDU,
  computeImpact,
  computeLU,
  computeM,
  computeOU,
  computeT,
  computeU,
  fmtMultiple,
  fmtNum,
  fmtPct,
} from "@/lib/dsfModel";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceArea,
  Legend,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { ErgodicityBadge } from "@/components/dsf/ErgodicityBadge";

const FINANCE = "hsl(var(--finance))";
const IMPACT = "hsl(var(--impact))";
const THEO = "hsl(var(--theology))";

export default function UnifiedPage() {
  const { params, derived, set } = useDsf();
  const [aId, setAId] = useState<"A" | "B" | "C" | "D" | "E">("A");
  const [bId, setBId] = useState<"A" | "B" | "C" | "D" | "E">("E");

  // Scatter: sweep r ∈ [1, 8], compute (M, I, T) at fixed p, k, U
  const scatter = useMemo(() => {
    const out: Array<{ M: number; I: number; T: number; r: number }> = [];
    const Lc = derived.L;
    const oc = derived.o;
    const dc = derived.d;
    for (let i = 0; i <= 50; i++) {
      const r = 1 + (i / 50) * 7;
      const M = computeM(r, params.k, params.p);
      const I = computeImpact(params.N, params.p, Lc, oc, dc, params.a, params.e);
      const T = derived.T;
      out.push({ M, I, T, r });
    }
    return out;
  }, [derived, params]);

  // Heatmap: I across (p, U) — render as scatter grid
  const heatmap = useMemo(() => {
    const out: Array<{ p: number; U: number; I: number }> = [];
    for (let pi = 0; pi <= 20; pi++) {
      const p = pi / 20;
      for (let ui = 0; ui <= 20; ui++) {
        const U = (ui / 20) * 1.5;
        const L = computeLU(params.L0, params.alpha, U);
        const o = computeOU(params.o0, params.beta, U, derived.forcedOpenness);
        const d = computeDU(params.d0, params.gamma, U, derived.forcedSovereignty);
        out.push({ p, U, I: computeImpact(params.N, p, L, o, d, params.a, params.e) });
      }
    }
    return out;
  }, [params, derived.forcedOpenness, derived.forcedSovereignty]);

  const heatMax = Math.max(...heatmap.map((d) => d.I));

  const couplingData = useMemo(() => {
    const out: Array<Record<string, number>> = [];
    for (let i = 0; i <= 60; i++) {
      const U = (i / 60) * 1.5;
      out.push({
        U,
        L: computeLU(params.L0, params.alpha, U),
        o: computeOU(params.o0, params.beta, U, false),
        d: computeDU(params.d0, params.gamma, U, false),
      });
    }
    return out;
  }, [params.L0, params.o0, params.d0, params.alpha, params.beta, params.gamma]);

  const { mode } = useStoryMode();
  const isStory = mode === "story";
  const uniDiagnosis = useMemo(() => {
    const passF2 = derived.M >= params.Fmin;
    const passT2 = derived.T >= params.Tmin;
    const highU = derived.U > 0.6;
    if (passF2 && passT2 && !highU) return {
      text: `This scenario is balanced. The financial account (M = ${fmtMultiple(derived.M)}) and the moral account (T = ${fmtNum(derived.T, 2)}) are both above their floors. Usury pressure is manageable (U = ${fmtNum(derived.U, 2)}). Improving company survival would strengthen all three accounts simultaneously without trade-offs.`,
      status: "balanced" as const,
    };
    if (passF2 && !passT2) return {
      text: `The fund is financially strong (M = ${fmtMultiple(derived.M)}) but the moral account is stressed (T = ${fmtNum(derived.T, 2)}). Raising the repayment cap improves the money account while damaging the conscience account. The system is being pulled out of shape. Try improving survival probability instead — it helps both.`,
      status: "stressed" as const,
    };
    if (!passF2 && passT2) return {
      text: `The fund is morally disciplined (T = ${fmtNum(derived.T, 2)}) but financially fragile (M = ${fmtMultiple(derived.M)}). The system may be too conservative. Try increasing company survival or the repayment cap — but watch the Theology tab as the cap rises.`,
      status: "fragile" as const,
    };
    return {
      text: `This scenario fails both guardrails. The system is both financially fragile (M = ${fmtMultiple(derived.M)}) and morally stressed (T = ${fmtNum(derived.T, 2)}). Improving company survival is the most mission-consistent first step: it strengthens the financial account and the infrastructure account simultaneously.`,
      status: "warning" as const,
    };
  }, [derived, params]);

  const uniSeams = getUnifiedSeams(params.p, derived.U, derived.M, derived.T, params.Fmin, params.Tmin);

  const a = THEOLOGY_SCENARIOS.find((s) => s.id === aId)!;
  const b = THEOLOGY_SCENARIOS.find((s) => s.id === bId)!;

  const scComputed = (s: typeof a) => {
    const r = 1 + s.delta + s.pi + s.rho + s.lambda;
    const M = computeM(r, 5, 0.6);
    const U = computeU(s.rho, s.lambda);
    const T = computeT(U, params.mu, params.eta, params.Umax);
    const L = computeLU(8, params.alpha, U);
    const o = computeOU(1, params.beta, U, true);
    const d = computeDU(1, params.gamma, U, true);
    const I = computeImpact(40, 0.6, L, o, d, 2, 1.2);
    return { r, M, U, T, I };
  };

  const ac = scComputed(a);
  const bc = scComputed(b);

  const radarData = [
    { axis: "p", value: Math.min(1, params.p) },
    { axis: "M", value: Math.min(1, derived.M / 5) },
    { axis: "I", value: Math.min(1, derived.I / 600) },
    { axis: "T", value: Math.max(0, Math.min(1, derived.T / 2)) },
    { axis: "η", value: Math.min(1, params.eta) },
    { axis: "Open", value: Math.min(1, derived.o) },
    { axis: "Sov", value: Math.min(1, derived.d) },
  ];

  return (
    <div className="space-y-6">
      <div><ErgodicityBadge /></div>
      {mode === "story" && (
        <>
          <PageStory
            character={{ name: "Prof. Lena Kowalski", role: "Systems economist, EU Digital Policy Institute", initials: "LK", color: "neutral" }}
            scene="Teaching a seminar on coupled financial-ethical systems"
            paragraphs={[
              { text: "Lena draws three intersecting circles on the board. 'Most models have one objective,' she says. 'Maximise return. Minimise risk. Here, we have three. And the interesting thing — the thing this model captures — is that you cannot maximise any one of them without affecting the other two.'" },
              { text: "'Watch what happens when you raise the repayment cap r. M goes up — you are extracting more per company. But r is built from components, and one of them — the opportunity-cost markup λ — goes straight into the usury score U. U feeds into T directly. And U also erodes company lifetimes, openness, sovereignty — so I drops. One lever, three consequences.'", liveValue: fmtNum(derived.U, 2), liveLabel: "Usury pressure U" },
              { text: "'The only lever that escapes this coupling is p. Improve survival and you get more money from more companies without increasing any individual company's burden. T is unaffected. I improves because more companies live long enough to matter. It is the only Pareto improvement in the design space.'", liveValue: fmtMultiple(derived.M) + " / " + fmtNum(derived.I, 0) + " / " + fmtNum(derived.T, 2), liveLabel: "M / I / T" },
              ...uniSeams.filter(Boolean).map((text) => ({ text: text as string })),
              { text: STORY_CLOSING.unified },
            ]}
            insights={[
              { label: "The only free lever", body: "p (survival) improves M, I, and T simultaneously. It is the only design choice with no trade-offs. All other levers involve coupling costs.", status: "good" },
              { label: "r creates a trade-off", body: `Current r = ${fmtNum(derived.r, 2)}×. Raising it improves M but increases U, which damages T and erodes I through L, o, d coupling.`, status: derived.T >= params.Tmin ? "balanced" : "stressed" },
              { label: "η repairs damage", body: `Reinvestment η = ${fmtPct(params.eta)} partially offsets usury pressure in the T formula. It is structural repair — not a substitute for low λ.`, status: params.eta >= 0.7 ? "good" : "balanced" },
              { label: "The guardrail zone", body: `M ≥ ${fmtMultiple(params.Fmin)} and T ≥ ${fmtNum(params.Tmin, 2)} define the feasible region. Designs outside both fail. The scatter chart on this page maps the full space.`, status: derived.M >= params.Fmin && derived.T >= params.Tmin ? "good" : "warning" },
            ]}
          />
          <StoryClosingPrompt text={CLOSING_PROMPT_TEXT.unified} channel="neutral" />
        </>
      )}
      {mode === "scenario" && (
        <>
          <ScenarioBanner text={SCENARIO_BANNER_TEXT.unified} channel="neutral" />
          <PageScenario
          title="Can you find the design that passes all three simultaneously?"
          description="The three accounts are coupled. Explore the trade-offs: each decision affects M, I, and T. Your target: pass all three guardrails — M ≥ 2×, T ≥ 1.0, I ≥ 100."
          steps={[
            {
              id: "priority",
              question: "Which account are you most willing to sacrifice if you have to choose?",
              subtitle: "This reveals your implicit design philosophy.",
              options: [
                { id: "never_t", label: "Never sacrifice T (moral floor is absolute)", description: "You treat theological integrity as a hard constraint. M and I must be maximised within it.", tag: "Ethics-first", tagColor: "theology", paramChanges: [{ label: "λ", value: "0.05" }], onApply: () => set("lambda", 0.05) },
                { id: "never_m", label: "Never sacrifice M (financial floor is absolute)", description: "You treat financial viability as a hard constraint. Moral optimisation is secondary.", tag: "Finance-first", tagColor: "finance", paramChanges: [{ label: "p", value: fmtNum(Math.max(0.4, params.p), 2) }], onApply: () => set("p", Math.max(0.4, params.p)) },
                { id: "balance", label: "Balance all three — no absolute priority", description: "You treat all three floors as binding. You look for the design that passes all three simultaneously.", tag: "Tri-objective", tagColor: "impact", paramChanges: [{ label: "p", value: "0.40" }, { label: "λ", value: "0.10" }, { label: "η", value: "0.75" }], onApply: () => { set("p", 0.4); set("lambda", 0.1); set("eta", 0.75); } },
              ],
            },
            {
              id: "coupling_lever",
              question: "r is below 2×. M does not pass its floor. What do you do?",
              options: [
                { id: "raise_p", label: "Improve survival p first", description: "More survivors means more repayments without extracting more from each. M improves, T is safe.", tag: "Mission-consistent", tagColor: "impact", paramChanges: [{ label: "p", value: fmtNum(Math.min(1, params.p + 0.08), 2) }], onApply: () => set("p", Math.min(1, params.p + 0.08)) },
                { id: "raise_r", label: "Raise the repayment cap r", description: "Immediate M improvement. But U rises — watch T. If T drops below its floor, you have traded one failure for another.", tag: "Fast but costly", tagColor: "warning", paramChanges: [{ label: "r", value: fmtNum(Math.min(8, (params.rDirect || 2.9) + 0.4), 2) + "×" }], onApply: () => set("rDirect", Math.min(8, (params.rDirect || 2.9) + 0.4)) },
                { id: "raise_k", label: "Increase concentration k", description: "Amplify survivors further. No direct moral cost, but assumes you can identify winners reliably.", tag: "Portfolio fix", tagColor: "finance", paramChanges: [{ label: "k", value: String(Math.min(15, params.k + 1)) + "×" }], onApply: () => set("k", Math.min(15, params.k + 1)) },
              ],
            },
          ]}
          consequences={[
            { label: "Financial M", value: fmtMultiple(derived.M), channel: "finance", direction: derived.M >= params.Fmin ? "up" : "down", note: `floor ${fmtMultiple(params.Fmin)}` },
            { label: "Impact I", value: fmtNum(derived.I, 0), channel: "impact", direction: derived.I >= params.Imin ? "up" : "down", note: `floor ${params.Imin}` },
            { label: "Integrity T", value: fmtNum(derived.T, 2), channel: "theology", direction: derived.T >= params.Tmin ? "up" : "down", note: `floor ${fmtNum(params.Tmin, 2)}` },
            { label: "Usury U", value: fmtNum(derived.U, 2), channel: "neutral", direction: derived.U < 0.3 ? "up" : derived.U > 0.6 ? "down" : "neutral" },
          ]}
          narratorLine="The coupled model has a simple diagnostic: if M passes by damaging T, you have not solved the problem — you have shifted it. Find the design where all three pass, and you have found the non-extractive equilibrium."
          onReset={() => { set("p", 0.4); set("lambda", 0.1); set("eta", 0.7); }}
        />
        </>
      )}
      {mode === "analyst" && (
        <StoryStrip
          humanQuestion="How do money, infrastructure, and conscience affect each other?"
          opening="The three accounts are not independent. Improving company survival (p) strengthens all three simultaneously — it is the mission-consistent lever. Raising the repayment cap (r) improves the money account mechanically, but it increases usury pressure, which erodes company lifetimes, openness, and sovereignty — weakening the impact account. Reinvestment (η) can partially repair that damage. This page shows the coupling: pull one lever and watch what happens to all three accounts at once."
          diagnosis={uniDiagnosis}
          guidedQuestions={[
            "Does improving survival strengthen all three accounts at once?",
            "Does a higher repayment cap worsen moral pressure (U)?",
            "Does higher U erode company lifetime, openness, and sovereignty?",
            "Does raising reinvestment (η) restore some mission alignment?",
            "Is the system currently balanced, or is one account winning by damaging another?",
          ]}
        />
      )}
      {mode === "analyst" && (<>

      {/* ── Page header ───────────────────────────────────────────── */}
      <header className="lg:col-span-12 space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Tri-objective design
        </div>
        <h2 className="font-serif text-3xl font-semibold">Unified explorer</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          The fund's design problem in one frame: maximize{" "}
          <Eq tex="I" /> subject to <Eq tex="M \ge F_{\min}" /> and{" "}
          <Eq tex="T \ge T_{\min}" />.
        </p>
      </header>

      {/* ── 1. Current state ──────────────────────────────────────── */}
      <SectionLabel>Current state</SectionLabel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Three account balances */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3 content-start">
          <ValueCard
            label="Financial M"
            symbol="M"
            value={fmtMultiple(derived.M)}
            channel="finance"
            size="lg"
            sub={`floor ${fmtMultiple(params.Fmin)} · ${derived.M >= params.Fmin ? "above" : "below"}`}
          />
          <ValueCard
            label="Impact I"
            symbol="I"
            value={fmtNum(derived.I, 0)}
            channel="impact"
            size="lg"
            sub={`floor ${params.Imin} · ${derived.I >= params.Imin ? "above" : "below"}`}
          />
          <ValueCard
            label="Integrity T"
            symbol="T"
            value={fmtNum(derived.T, 2)}
            channel="theology"
            size="lg"
            sub={`floor ${fmtNum(params.Tmin, 2)} · ${derived.T >= params.Tmin ? "above" : "below"}`}
          />
          <ValueCard label="Usury U" symbol="U" value={fmtNum(derived.U, 2)} channel="neutral" size="md"
            sub={derived.U < 0.3 ? "licit" : derived.U < 0.7 ? "mixed" : "extractive"} />
          <ValueCard label="Repayment cap r" symbol="r" value={fmtNum(derived.r, 2) + "×"} channel="finance" size="md"
            sub={`licit ${fmtPct((1 + params.delta + params.pi) / Math.max(derived.r, 0.001))} · usury ${fmtPct((params.rho + params.lambda) / Math.max(derived.r, 0.001))}`} />
          <ValueCard label="Survivors" symbol="S" value={`${derived.S} / ${params.N}`} channel="impact" size="md"
            sub={`p = ${fmtPct(params.p)}`} />
        </div>

        {/* Radar profile */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-base font-semibold mb-1">Seven-axis profile</h3>
          <p className="text-xs text-muted-foreground mb-2">All axes normalised 0 → 1</p>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="hsl(235 55% 52%)" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 1]} />
                <Radar
                  name="Current"
                  dataKey="value"
                  stroke="hsl(var(--finance))"
                  fill="hsl(var(--finance))"
                  fillOpacity={0.35}
                  strokeWidth={2.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 2. Cross-domain links ─────────────────────────────────── */}
      <SectionLabel>Cross-domain links</SectionLabel>

      {/* M decomposition — financial × theology */}
      <div className="bg-card border border-card-border rounded-lg p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-serif text-lg font-semibold">
            Financial × Theology — M decomposition
          </h3>
          <span className="text-xs text-muted-foreground num">
            r = {fmtNum(derived.r, 2)}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ValueCard label="Mode-weighted licit" symbol="M_{licit}" value={fmtMultiple(derived.MlicitMode)}
            channel="finance" size="md" sub="licit component under selected mode" />
          <ValueCard label="Mode-weighted usury" symbol="M_{usury}" value={fmtMultiple(derived.MusuryMode)}
            channel="theology" size="md" sub="usury-linked under selected mode" />
          <ValueCard label="M total" symbol="M" value={fmtMultiple(derived.M)}
            channel="finance" size="md" sub={`identity: ${fmtMultiple(derived.MlicitMode + derived.MusuryMode)}`} />
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          Both licit and usury-linked configurations can produce the same financial multiple. The moral difference is entirely in the composition of r — not its magnitude.
        </p>
      </div>

      {/* Coupling — theology × impact */}
      <div className="bg-card border border-card-border rounded-lg p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-serif text-lg font-semibold">
            Theology × Impact — how <Eq tex="U" /> erodes infrastructure
          </h3>
          <span className="text-xs text-muted-foreground num">
            current U = {fmtNum(derived.U, 2)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          As usury pressure rises, company lifetime, openness, and sovereignty all degrade — directly reducing impact I regardless of how many companies survive.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CouplingMini data={couplingData} dataKey="L" title="Lifetime L(U)" yFmt={(v) => fmtNum(v, 1)} u={derived.U} />
          <CouplingMini data={couplingData} dataKey="o" title="Openness o(U)" yFmt={fmtPct} u={derived.U} />
          <CouplingMini data={couplingData} dataKey="d" title="Sovereignty d(U)" yFmt={fmtPct} u={derived.U} />
        </div>
      </div>

      {/* ── 3. Design space ───────────────────────────────────────── */}
      <SectionLabel>Design space</SectionLabel>

      {/* Trade-off scatter */}
      <div className="bg-card border border-card-border rounded-lg p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-serif text-lg font-semibold">
            Trade-off space — sweep <Eq tex="r" />
          </h3>
          <span className="text-xs text-muted-foreground">shaded = both guardrails pass</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3 num">
          Each point is a different r value. Color encodes T — warmer = higher integrity. Shaded region: M ≥ {fmtMultiple(params.Fmin)} and I ≥ {params.Imin}.
        </p>
        <div className="h-[300px]">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
              <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
              <XAxis
                dataKey="M"
                type="number"
                domain={["dataMin", "dataMax"]}
                name="M"
                tickFormatter={(v) => `${v.toFixed(1)}×`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                stroke="hsl(var(--rule))"
                label={{ value: "Financial M", position: "insideBottom", offset: -8, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis
                dataKey="I"
                type="number"
                name="I"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                stroke="hsl(var(--rule))"
                label={{ value: "Impact I", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <ZAxis range={[60, 60]} />
              <ReferenceArea x1={params.Fmin} y1={params.Imin} stroke="none" fill="hsl(var(--finance))" fillOpacity={0.07} />
              <RTooltip
                cursor={{ stroke: "hsl(var(--rule))" }}
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--popover-border))", fontSize: 12 }}
                formatter={(v: number, name: string) => [name === "M" ? fmtMultiple(v) : fmtNum(v, 1), name]}
                labelFormatter={() => ""}
              />
              <Scatter data={scatter} fill={IMPACT}>
                {scatter.map((p, i) => {
                  const t = Math.max(0, Math.min(1, p.T / 2));
                  const hue = Math.round(213 + t * 58);
                  const sat = Math.round(88 - t * 18);
                  const lit = Math.round(68 - t * 8);
                  return <Cell key={i} fill={`hsl(${hue}, ${sat}%, ${lit}%)`} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-card border border-card-border rounded-lg p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-serif text-lg font-semibold">
            Impact across <Eq tex="(p,\, U)" />
          </h3>
          <span className="text-xs text-muted-foreground">darker = higher impact · ✕ = current position</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          The two master levers: survival p (move right to improve) and usury pressure U (move down to improve). Top-right is the worst region — low survival and high extraction.
        </p>
        <div className="h-[280px]">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
              <CartesianGrid stroke="hsl(235 55% 42%)" strokeDasharray="3 5" />
              <XAxis dataKey="p" type="number" domain={[0, 1]}
                tickFormatter={(v) => v.toFixed(1)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                stroke="hsl(235 55% 48%)"
                label={{ value: "p  (survival)", position: "insideBottom", offset: -8, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis dataKey="U" type="number" domain={[0, 1.5]}
                tickFormatter={(v) => v.toFixed(1)}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                stroke="hsl(235 55% 48%)"
                label={{ value: "U (usury)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <ZAxis range={[40, 40]} />
              <RTooltip
                cursor={{ stroke: "hsl(235 80% 70%)", strokeWidth: 1.5 }}
                contentStyle={{ background: "hsl(237 35% 14%)", border: "1px solid hsl(235 60% 45%)", borderRadius: "6px", fontSize: 12, color: "hsl(0 0% 92%)" }}
                labelStyle={{ color: "hsl(0 0% 70%)", marginBottom: 2 }}
                itemStyle={{ color: "hsl(0 0% 92%)" }}
                formatter={(v: number, name: string) => [name === "I" ? fmtNum(v, 0) : v.toFixed(2), name === "p" ? "survival p" : name === "U" ? "usury U" : "impact I"]}
                labelFormatter={() => ""}
              />
              <Scatter data={heatmap}>
                {heatmap.map((row, i) => {
                  const t = row.I / Math.max(heatMax, 1);
                  return <Cell key={i} fill={`hsl(var(--impact) / ${0.15 + 0.7 * t})`} />;
                })}
              </Scatter>
              <Scatter data={[{ p: params.p, U: derived.U }]} shape="cross" fill={THEO} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 4. Scenario comparison ────────────────────────────────── */}
      <SectionLabel>Scenario comparison</SectionLabel>

      <div className="bg-card border border-card-border rounded-lg p-5">
        <h3 className="font-serif text-lg font-semibold mb-1">Side-by-side comparator</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Five canonical r compositions — all hold M roughly constant. Compare how the moral composition of r changes I and T while M stays the same.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ScenarioPicker label="Left" value={aId} onChange={setAId} />
          <ScenarioPicker label="Right" value={bId} onChange={setBId} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2 pr-3">Metric</th>
                <th className="text-right py-2 pr-3 font-serif">{a.id} · {a.name}</th>
                <th className="text-right py-2 pr-3 font-serif">{b.id} · {b.name}</th>
                <th className="text-right py-2 pr-3">Δ</th>
              </tr>
            </thead>
            <tbody>
              <Row name="r (repayment cap)" left={fmtNum(ac.r, 2)} right={fmtNum(bc.r, 2)} delta={bc.r - ac.r} />
              <Row name="U (usury pressure)" left={fmtNum(ac.U, 2)} right={fmtNum(bc.U, 2)} delta={bc.U - ac.U} invert />
              <Row name="M (financial multiple)" left={fmtMultiple(ac.M)} right={fmtMultiple(bc.M)} delta={bc.M - ac.M} />
              <Row name="I (impact)" left={fmtNum(ac.I, 0)} right={fmtNum(bc.I, 0)} delta={bc.I - ac.I} />
              <Row name="T (integrity)" left={fmtNum(ac.T, 2)} right={fmtNum(bc.T, 2)} delta={bc.T - ac.T} />
            </tbody>
          </table>
        </div>
      </div>
    </>)}
      {mode === "glossary" && <div className="lg:col-span-12"><GlossaryTab sections="all" showEquations /></div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
        {children}
      </span>
      <div className="flex-1 h-px bg-card-border" />
    </div>
  );
}

function ScenarioPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "A" | "B" | "C" | "D" | "E";
  onChange: (v: "A" | "B" | "C" | "D" | "E") => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={(v) => onChange(v as any)}>
        <SelectTrigger data-testid={`scenario-picker-${label.toLowerCase()}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THEOLOGY_SCENARIOS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.id} · {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CouplingMini({
  data,
  dataKey,
  title,
  yFmt,
  u,
}: {
  data: Array<Record<string, number>>;
  dataKey: string;
  title: string;
  yFmt: (v: number) => string;
  u: number;
}) {
  return (
    <div className="rounded-md border border-card-border p-3">
      <div className="text-xs text-muted-foreground mb-2">{title}</div>
      <div className="h-[140px]">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
            <XAxis
              dataKey="U"
              tickFormatter={(v) => v.toFixed(1)}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--rule))"
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--rule))"
              tickFormatter={yFmt}
              width={40}
            />
            <RTooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--popover-border))",
                fontSize: 11,
              }}
              formatter={(v: number) => yFmt(v)}
              labelFormatter={(v: number) => `U = ${v.toFixed(2)}`}
            />
            <ReferenceLine x={u} stroke={THEO} strokeDasharray="3 3" />
            <Line type="monotone" dataKey={dataKey} stroke={IMPACT} strokeWidth={1.6} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Row({
  name,
  left,
  right,
  delta,
  invert = false,
}: {
  name: string;
  left: string;
  right: string;
  delta: number;
  invert?: boolean;
}) {
  const positive = delta > 0;
  const good = invert ? !positive : positive;
  const dir =
    Math.abs(delta) < 0.005 ? (
      <ArrowRight className="w-3.5 h-3.5 inline text-muted-foreground" />
    ) : positive ? (
      <ArrowUpRight
        className={`w-3.5 h-3.5 inline ${good ? "text-finance" : "text-destructive"}`}
      />
    ) : (
      <ArrowDownRight
        className={`w-3.5 h-3.5 inline ${good ? "text-finance" : "text-destructive"}`}
      />
    );
  return (
    <tr className="border-t border-card-border">
      <td className="py-2 pr-3 text-muted-foreground">{name}</td>
      <td className="py-2 pr-3 text-right num">{left}</td>
      <td className="py-2 pr-3 text-right num">{right}</td>
      <td className="py-2 pr-3 text-right num">
        {dir} {Math.abs(delta) < 0.005 ? "—" : (delta > 0 ? "+" : "") + delta.toFixed(2)}
      </td>
    </tr>
  );
}

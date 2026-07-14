import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useStoryMode } from "@/contexts/storyMode";
import { GlossaryTab } from "@/components/dsf/GlossaryTab";
import { StoryStrip, StoryDiagnosis, StoryAnnotation } from "@/components/dsf/StoryComponents";
import { PageStory } from "@/components/dsf/PageStory";
import { PageScenario } from "@/components/dsf/PageScenario";
import { StoryClosingPrompt } from "@/components/dsf/StoryClosingPrompt";
import { ScenarioBanner } from "@/components/dsf/ScenarioBanner";
import { getOperationsSeams, STORY_CLOSING, CLOSING_PROMPT_TEXT, SCENARIO_BANNER_TEXT } from "@/lib/storyVariants";
import { Eq } from "@/components/dsf/Eq";
import { ValueCard } from "@/components/dsf/ValueCard";
import { SliderField } from "@/components/dsf/SliderField";
import { Input } from "@/components/ui/input";
import { fmtPct, fmtNum } from "@/lib/dsfModel";
import {
  ILLUSTRATIVE_EXAMPLE,
  fmtEURcompact,
  simulateCompany,
} from "@/lib/companyModel";
import {
  LAUNCH_DEFAULTS,
  CORRECTED_LAUNCH_PATCH,
  buildScaledLaunchStream,
  computeCapCoverage,
  computeDynamicFeasibility,
  computeLaunchStack,
  simulateCooperative,
  type CoopParams,
  type Vintage,
} from "@/lib/cooperativeModel";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

const FINANCE = "hsl(var(--finance))";
const IMPACT = "hsl(var(--impact))";
const THEO = "hsl(var(--theology))";
const RULE = "hsl(var(--rule))";

export default function CooperativePage() {
  const [coop, setCoop] = useState<CoopParams>(() => ({
    ...LAUNCH_DEFAULTS,
    members: LAUNCH_DEFAULTS.members.map((m) => ({ ...m })),
    newDeploy: [...LAUNCH_DEFAULTS.newDeploy],
    liquidationProceeds: [...LAUNCH_DEFAULTS.liquidationProceeds],
    otherProceeds: [...LAUNCH_DEFAULTS.otherProceeds],
  }));

  // §15.8 end-to-end feeder: the §12 illustrative company SCALED to the
  // launch ticket (scale = G₁/ΣI_§12), operations held flat after year 4,
  // cumulative redemptions capped at κ·G₁ (pack v3 IV.3).
  const companySim = useMemo(() => simulateCompany(ILLUSTRATIVE_EXAMPLE), []);
  const redemptionStream = useMemo(
    () => buildScaledLaunchStream(coop, coop.yearsToSim, companySim, ILLUSTRATIVE_EXAMPLE.kappa),
    [coop, companySim],
  );

  const launch = useMemo(() => computeLaunchStack(coop), [coop]);
  const sim = useMemo(
    () => simulateCooperative(coop, redemptionStream),
    [coop, redemptionStream],
  );
  // Pack v3 IV.2 — dynamic feasibility (framework eq. 23)
  const feasibility = useMemo(
    () => computeDynamicFeasibility(coop, redemptionStream, coop.yearsToSim),
    [coop, redemptionStream],
  );
  // Pack v3 IV.3 — cap coverage + time-to-cap (framework eq. 24 / §15.8)
  const coverage = useMemo(
    () => computeCapCoverage(coop, redemptionStream, sim, ILLUSTRATIVE_EXAMPLE.kappa),
    [coop, redemptionStream, sim],
  );

  const patch = <K extends keyof CoopParams>(key: K, value: CoopParams[K]) => {
    setCoop((prev) => ({ ...prev, [key]: value }));
  };

  const setVintage = <K extends keyof Vintage>(idx: number, key: K, value: Vintage[K]) => {
    setCoop((prev) => ({
      ...prev,
      members: prev.members.map((m, i) => (i === idx ? { ...m, [key]: value } : m)),
    }));
  };

  const totals = useMemo(() => {
    const totalIn = sim.reduce((s, r) => s + r.GrossProceeds, 0);
    const totalDS = sim.reduce((s, r) => s + r.DSNPV, 0);
    const totalReinvest = sim.reduce((s, r) => s + r.ReinvestFund, 0);
    const totalDist = sim.reduce((s, r) => s + r.DistPool, 0);
    const finalE = sim[sim.length - 1]?.Eclose ?? coop.E0_target;
    // Cash-ledger aggregates (Fix 5, v5.1 §11.2)
    const anyInsolvent = sim.some((r) => r.insolvent);
    const peakArrears = sim.reduce((s, r) => Math.max(s, r.arrearsClose), 0);
    const finalArrears = sim[sim.length - 1]?.arrearsClose ?? 0;
    const totalRaids = sim.reduce((s, r) => s + r.reserveRaid, 0);
    const finalCash = sim[sim.length - 1]?.coopCashClose ?? 0;
    const totalPaidByVintage: Record<string, number> = {};
    coop.members.forEach((m) => {
      totalPaidByVintage[m.id] = sim.reduce(
        (s, r) => s + (r.vintages.find((v) => v.id === m.id)?.paid ?? 0),
        0,
      );
    });
    return { totalIn, totalDS, totalReinvest, totalDist, finalE, anyInsolvent, peakArrears, finalArrears, totalRaids, finalCash, totalPaidByVintage };
  }, [sim, coop]);

  const { mode } = useStoryMode();
  const isStory = mode === "story";

  const etaEffective = (coop.etaEarly + coop.etaLate) / 2;
  const reserveRatio = totals.finalE / Math.max(coop.E0_target, 1);
  const opsSeams = getOperationsSeams(etaEffective, reserveRatio, 3.0);

  const coopDiagnosis = useMemo(() => {
    const reinvestRatio = totals.totalReinvest / Math.max(totals.totalIn, 1);
    const distRatio = totals.totalDist / Math.max(totals.totalIn, 1);
    const evergreen = totals.finalE >= coop.E0_target;
    if (reinvestRatio >= 0.4 && evergreen) return {
      text: `The cooperative is behaving like an evergreen steward. A substantial share of all inflows is being recycled into new companies or held in the evergreen reserve (${fmtEURcompact(totals.finalE)}, above the target of ${fmtEURcompact(coop.E0_target)}). Investor members are receiving capped distributions within their limits. Capital is staying in circulation rather than being extracted.`,
      status: "good" as const,
    };
    if (distRatio > 0.6) return {
      text: `The cooperative is drifting toward extraction. More than 60% of inflows are being distributed to members, leaving too little for reinvestment (${fmtEURcompact(totals.totalReinvest)}). The fund may satisfy investors in the short term while weakening its evergreen logic and mission continuity.`,
      status: "stressed" as const,
    };
    if (!evergreen) return {
      text: `The cooperative waterfall is functioning but the evergreen reserve (${fmtEURcompact(totals.finalE)}) has not reached its target (${fmtEURcompact(coop.E0_target)}). The fund's capacity to continue investing in future generations is limited. Consider adjusting the reinvestment rate or the distribution cap.`,
      status: "fragile" as const,
    };
    return {
      text: `The cooperative waterfall is balanced. Inflows cover debt service, with ${fmtEURcompact(totals.totalReinvest)} reinvested and ${fmtEURcompact(totals.totalDist)} distributed. The evergreen reserve is on track. Monitor whether investor members remain within their caps as the fund matures.`,
      status: "balanced" as const,
    };
  }, [totals, coop]);

  const fundChartData = sim.map((r) => ({
    t: `t = ${r.t}`,
    Π: r.redInflow,
    DSNPV: r.DSNPV,
    Reinvest: r.ReinvestFund,
    DistPool: r.DistPool,
    E: r.Eclose,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {mode === "story" && (
        <div className="lg:col-span-12">
          <PageStory
            character={{ name: "Beatriz Santos", role: "Member representative, DSF Cooperative Council", initials: "BS", color: "impact" }}
            scene="Presenting the year-five waterfall report to all member categories"
            paragraphs={[
              { text: "Beatriz begins with the question she knows the investor members will ask: 'When do we get paid?' She does not dodge it. 'You get paid through the waterfall. The model shows exactly when, how much, and what conditions must be met first.'", liveValue: fmtEURcompact(totals.totalDist), liveLabel: "Total distributed to members" },
              { text: "'Here is the order,' she says, pointing to the waterfall chart. 'First: debt service. The cooperative honours its loan obligations. Second: the evergreen reserve. Before anyone is paid, the reserve must reach its target. Capital that stays in the cooperative is capital that keeps investing. Third: reinvestment into new companies. Fourth: distributions to members — capped at 3× for investor members.'", liveValue: fmtEURcompact(totals.finalE), liveLabel: "Evergreen reserve now" },
              { text: "'What makes this non-extractive is not the governance structure — it is the waterfall order. If we reordered it — distributions first, reserve after — we would have a conventional fund with cooperative branding. The model makes that visible. Change the reinvestment rate and watch where the money goes.'", liveValue: fmtEURcompact(totals.totalReinvest), liveLabel: "Reinvested into new companies" },
              ...opsSeams.filter(Boolean).map((text) => ({ text: text as string })),
              { text: STORY_CLOSING.operations },
            ]}
            insights={[
              { label: "Waterfall order is the mission", body: "Debt → reserve → reinvestment → distributions. If distributions come first, the cooperative has drifted toward extraction regardless of its legal structure.", status: totals.totalReinvest / Math.max(totals.totalIn, 1) >= 0.4 ? "good" : "stressed" },
              { label: "The evergreen reserve", body: `Target: ${fmtEURcompact(coop.E0_target)}. Current: ${fmtEURcompact(totals.finalE)}. A depleted reserve means the cooperative cannot keep investing in future generations without new external capital.`, status: totals.finalE >= coop.E0_target ? "good" : "fragile" },
              { label: "Member distribution caps", body: "Investor members are capped at 3× their contribution. This keeps the return bounded and distinguishes DSF from conventional equity-maximising vehicles.", status: "balanced" },
              { label: "Reinvestment ratio", body: `${(totals.totalReinvest / Math.max(totals.totalIn, 1) * 100).toFixed(0)}% of all inflows are reinvested. A healthy cooperative should be above 40%.`, status: totals.totalReinvest / Math.max(totals.totalIn, 1) >= 0.4 ? "good" : totals.totalReinvest / Math.max(totals.totalIn, 1) >= 0.2 ? "balanced" : "stressed" },
            ]}
          />
          <StoryClosingPrompt text={CLOSING_PROMPT_TEXT.operations} channel="impact" />
        </div>
      )}
      {mode === "scenario" && (
        <div className="lg:col-span-12">
          <ScenarioBanner text={SCENARIO_BANNER_TEXT.operations} channel="impact" />
          <PageScenario
            title="Is this cooperative still a steward?"
            description="Returns are coming in. The waterfall is running. Walk through the key distribution decisions — and see whether the cooperative keeps capital in circulation or drifts toward extraction."
            steps={[
              {
                id: "reserve_target",
                question: "The evergreen reserve has not yet reached its target. How do you proceed?",
                subtitle: "The reserve must be funded before distributions. This is the structural non-extractive guarantee.",
                options: [
                  { id: "reserve_first", label: "Fund the reserve fully before any distribution", description: "Honour the waterfall order. Investor members wait. Mission continuity is protected.", tag: "Steward", tagColor: "impact", onApply: () => {} },
                  { id: "partial_reserve", label: "Fund reserve partially, distribute the rest", description: "A compromise. The reserve grows slowly; investors receive modest distributions. Gradual drift risk.", tag: "Compromise", tagColor: "finance", onApply: () => {} },
                  { id: "skip_reserve", label: "Skip the reserve and distribute immediately", description: "Investors are satisfied now. But the cooperative cannot fund future generations without new external capital.", tag: "Extraction risk", tagColor: "warning", onApply: () => {} },
                ],
              },
              {
                id: "reinvest_rate",
                question: "After the reserve is funded, how much of remaining inflows do you reinvest?",
                options: [
                  { id: "high_reinvest", label: "50% reinvested, 50% distributed", description: "Strong mission orientation. Members are paid but the fund retains substantial capacity for future vintages.", tag: "Mission-first", tagColor: "impact", onApply: () => { patch("etaEarly", 0.5); patch("etaLate", 0.5); } },
                  { id: "mid_reinvest", label: "30% reinvested, 70% distributed", description: "Investor-friendly. Distributions are substantial but reinvestment remains meaningful.", tag: "Balanced", tagColor: "finance", onApply: () => { patch("etaEarly", 0.3); patch("etaLate", 0.3); } },
                  { id: "low_reinvest", label: "10% reinvested, 90% distributed", description: "Extraction risk is high. The cooperative looks financially attractive but loses its evergreen character.", tag: "Extraction risk", tagColor: "warning", onApply: () => { patch("etaEarly", 0.1); patch("etaLate", 0.1); } },
                ],
              },
              {
                id: "member_cap",
                question: "An investor member has reached their 3× cap. They request an exception.",
                options: [
                  { id: "hold_cap", label: "Maintain the cap — no exception", description: "The cap is structural, not negotiable. Granting exceptions erodes the non-extractive model for all members.", tag: "Structural integrity", tagColor: "theology", onApply: () => {} },
                  { id: "one_exception", label: "Grant a one-time exception for this member", description: "The member has been with the fund since inception. A pragmatic acknowledgement of their contribution.", tag: "Discretionary", tagColor: "warning", onApply: () => {} },
                  { id: "raise_cap", label: "Raise the general cap to 4× for all members", description: "Responds to investor pressure. But it fundamentally changes the distribution character of the cooperative.", tag: "Structural change", tagColor: "warning", onApply: () => {} },
                ],
              },
            ]}
            consequences={[
              { label: "Reinvested", value: fmtEURcompact(totals.totalReinvest), channel: "impact", note: `${(totals.totalReinvest / Math.max(totals.totalIn, 1) * 100).toFixed(0)}% of inflows` },
              { label: "Distributed", value: fmtEURcompact(totals.totalDist), channel: "finance", note: `${(totals.totalDist / Math.max(totals.totalIn, 1) * 100).toFixed(0)}% of inflows` },
              { label: "Reserve", value: fmtEURcompact(totals.finalE), channel: "impact", direction: totals.finalE >= coop.E0_target ? "up" : "down", note: `target ${fmtEURcompact(coop.E0_target)}` },
              { label: "Total in", value: fmtEURcompact(totals.totalIn), channel: "neutral" },
            ]}
            narratorLine="The cooperative waterfall is not a governance structure — it is a promise about order. If that order is changed, the cooperative becomes a conventional fund with better branding. The model makes both visible."
          />
        </div>
      )}
      {mode === "analyst" && (
        <div className="lg:col-span-12">
          <StoryStrip
            humanQuestion="Does the cooperative keep capital in circulation, or drift toward extraction?"
            opening="A cooperative structure can be genuinely non-extractive, or it can be a polite wrapper around conventional fund distribution. The difference is in what happens to money when it comes back. If most of it is recycled into future investments and held in an evergreen reserve, the fund remains a steward. If most of it is distributed to investor members, the fund is functioning like a standard vehicle with governance branding. Watch the waterfall chart: where does the money go when it returns?"
            diagnosis={coopDiagnosis}
            guidedQuestions={[
              "What share of all inflows is reinvested into future companies?",
              "What share is distributed to investor members?",
              "Is the evergreen reserve growing toward its target?",
              "Are investor members remaining within their 3x cap?",
              "Would raising the reinvestment rate meaningfully improve the reserve?",
            ]}
          />
        </div>
      )}
      {/* Left rail */}
      {mode === "analyst" && (<><div className="lg:col-span-12 space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] text-finance">Operations</div>
        <h2 className="font-serif text-3xl font-semibold">Fund pot, evergreen, vintages</h2>
      </div><aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 self-start">
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
          <div>
            <h3 className="font-serif text-lg font-semibold">Launch stack (§15)</h3>
            <p className="text-xs text-muted-foreground equation">
              <Eq tex="F^{deploy}_0 = F^{gross}_0 - C^{coop} - C^{stich} - C^{gold} - E^{\star}_0" />
            </p>
          </div>
          <SliderField
            label="NPV loan (€k)"
            symbol="L^{NPV}_0"
            value={coop.L_NPV / 1000}
            min={0}
            max={1000}
            step={25}
            onChange={(v) => patch("L_NPV", v * 1000)}
            channel="finance"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="Coop setup C_coop (€k)"
            symbol="C^{coop}"
            value={coop.C_coopSetup / 1000}
            min={0}
            max={50}
            step={1}
            onChange={(v) => patch("C_coopSetup", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="Stichting (€k)"
            symbol="C^{stich}"
            value={coop.C_stichting / 1000}
            min={0}
            max={30}
            step={1}
            onChange={(v) => patch("C_stichting", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="Golden share (€k)"
            symbol="C^{gold}"
            value={coop.C_golden / 1000}
            min={0}
            max={30}
            step={1}
            onChange={(v) => patch("C_golden", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="E*₀ initial reserve (€k)"
            symbol="E^{\star}_0"
            value={coop.E0_target / 1000}
            min={0}
            max={500}
            step={10}
            onChange={(v) => patch("E0_target", v * 1000)}
            channel="finance"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="G₁ first ticket (€k)"
            symbol="G_1"
            value={coop.G1 / 1000}
            min={0}
            max={1000}
            step={10}
            onChange={(v) => patch("G1", v * 1000)}
            channel="finance"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="C_SO (€k)"
            symbol="C^{SO}"
            value={coop.C_SO / 1000}
            min={0}
            max={150}
            step={5}
            onChange={(v) => patch("C_SO", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="C_inc (€k)"
            symbol="C^{inc}"
            value={coop.C_inc / 1000}
            min={0}
            max={100}
            step={5}
            onChange={(v) => patch("C_inc", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
          <div>
            <h3 className="font-serif text-lg font-semibold">Fund</h3>
            <p className="text-xs text-muted-foreground equation">
              <Eq tex="\mathrm{ReinvestFund}_t = \min(\mathrm{Avail}_t, \max(\eta_t \mathrm{Avail}_t, E^{\star}_t-E_t))" />
            </p>
          </div>
          <SliderField
            label="η_early reinvest"
            symbol="\eta^{early}"
            value={coop.etaEarly}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch("etaEarly", v)}
            channel="impact"
            format={fmtPct}
          />
          <SliderField
            label="η_late reinvest"
            symbol="\eta^{late}"
            value={coop.etaLate}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch("etaLate", v)}
            channel="impact"
            format={fmtPct}
          />
          <SliderField
            label="early/late split"
            symbol="t^{*}"
            value={coop.earlySplit}
            min={0}
            max={4}
            step={1}
            onChange={(v) => patch("earlySplit", Math.round(v))}
            channel="impact"
            format={(v) => `≤ ${v.toFixed(0)}`}
          />
          <SliderField
            label="E* target each year (€k)"
            symbol="E^{\star}"
            value={coop.E_target / 1000}
            min={0}
            max={2000}
            step={25}
            onChange={(v) => patch("E_target", v * 1000)}
            channel="finance"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="Coop opex (€k/yr)"
            symbol="O^{coop}"
            value={coop.coopOpex / 1000}
            min={0}
            max={150}
            step={5}
            onChange={(v) => patch("coopOpex", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="Fund tax (€k/yr)"
            symbol="\tau^{fund}"
            value={coop.coopTax / 1000}
            min={0}
            max={100}
            step={1}
            onChange={(v) => patch("coopTax", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
            hint="Annual tax on the cooperative's net proceeds (currently 0). Deducted before ReinvestFund and DistPool. For rate-based equity vs debt-like analysis, see the Tax tab."
          />
          <SliderField
            label="Reserve alloc (€k/yr)"
            symbol="\mathrm{ResAlloc}"
            value={coop.reserveAlloc / 1000}
            min={0}
            max={100}
            step={5}
            onChange={(v) => patch("reserveAlloc", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="i NPV"
            symbol="i^{NPV}"
            value={coop.iNPV}
            min={0}
            max={0.1}
            step={0.005}
            onChange={(v) => patch("iNPV", v)}
            channel="theology"
            format={fmtPct}
          />
          <SliderField
            label="T_loan (yr)"
            symbol="T^{loan}"
            value={coop.Tloan}
            min={1}
            max={15}
            step={1}
            onChange={(v) => patch("Tloan", Math.round(v))}
            channel="theology"
          />
        </div>
        {mode === "analyst" && <StoryDiagnosis diagnosis={coopDiagnosis} />}
      </aside>

      {/* Main */}
      <div className="lg:col-span-9 space-y-6">
        {/* Launch stack waterfall */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Day-zero capital stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <StackCell label="K_members" value={fmtEURcompact(launch.Kmembers)} channel="finance" />
            <StackCell label="+ L_NPV" value={fmtEURcompact(coop.L_NPV)} channel="finance" />
            <StackCell label="= F_gross" value={fmtEURcompact(launch.Fgross)} channel="finance" emphasis />
            <StackCell
              label="− setup + E*₀"
              value={`−${fmtEURcompact(launch.setupTotal)}`}
              channel="theology"
            />
            <StackCell
              label="= F_deploy"
              value={fmtEURcompact(launch.Fdeploy)}
              channel="finance"
              emphasis
            />
            <StackCell
              label="G₁ ticket"
              value={fmtEURcompact(coop.G1)}
              channel={launch.feasible ? "impact" : "theology"}
              sub={launch.feasible ? `buffer ${fmtEURcompact(launch.buffer)}` : "exceeds F_deploy!"}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm rule-top pt-4">
            <StackCell label="G₁ gross" value={fmtEURcompact(coop.G1)} channel="finance" />
            <StackCell label="− C_SO" value={`−${fmtEURcompact(coop.C_SO)}`} channel="theology" />
            <StackCell label="− C_inc" value={`−${fmtEURcompact(coop.C_inc)}`} channel="theology" />
            <StackCell
              label="= I_net at company"
              value={fmtEURcompact(launch.Inet)}
              channel="finance"
              emphasis
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-snug">
            The €420k headline ticket becomes only <span className="num text-finance">{fmtEURcompact(launch.Inet)}</span> of real
            operating capital once the company is moved into a steward-owned configuration.
          </p>

          {/* Pack v3 IV.2 — dynamic feasibility (framework eq. 23) */}
          <div
            className={`mt-4 rounded-lg p-4 border ${feasibility.feasible ? "border-finance/30 bg-finance/5" : "border-destructive/30 bg-destructive/5"}`}
            data-testid="dynamic-feasibility"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-sm font-semibold ${feasibility.feasible ? "text-finance" : "text-destructive"}`}>
                Dynamic feasibility (eq. 23): {feasibility.feasible ? "FEASIBLE" : "INFEASIBLE"}
              </p>
              <button
                onClick={() => setCoop((prev) => ({ ...prev, ...CORRECTED_LAUNCH_PATCH }))}
                className="text-xs px-2.5 py-1.5 rounded border border-finance/40 text-finance hover-elevate"
                data-testid="corrected-launch-preset"
                title="Framework §15.5 verified solvent variant: G₁ = €280k, buffer €140k, NPV loan interest-only years 0–4, principal years 5–14"
              >
                Corrected-launch preset (§15.5)
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
              Peak cumulative pre-redemption shortfall{" "}
              <span className="num">{fmtEURcompact(feasibility.maxShortfall)}</span> (year {feasibility.peakYear}) vs
              launch buffer <span className="num">{fmtEURcompact(feasibility.buffer)}</span>.
              {!feasibility.feasible && (
                <> Even raiding E★₀ leaves <span className="num text-destructive">{fmtEURcompact(feasibility.unfundedAfterReserve)}</span> unfunded — increase member capital, the loan, or the buffer.</>
              )}
              {feasibility.feasible && coop.loanInterestOnlyYears > 0 && (
                <> Fixes liquidity, widens cap-coverage — capacity falls to {fmtEURcompact(coverage.capacity)}.</>
              )}
            </p>
          </div>

          {/* Pack v3 IV.3 — cap coverage + time-to-cap (framework eq. 24 / §15.8) */}
          <div className="mt-3 rounded-lg p-4 border border-card-border bg-background/40" data-testid="cap-coverage">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <p className="text-sm font-semibold">Cap coverage &amp; time-to-cap (§15.8)</p>
              <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded ${coverage.covered ? "bg-finance/15 text-finance" : "bg-destructive/15 text-destructive"}`}>
                {coverage.covered ? "covered" : `short ${fmtNum(1 / Math.max(coverage.ratio, 1e-9), 1)}×`}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-muted-foreground block">Capacity κ̄·D_total</span><span className="num">{fmtEURcompact(coverage.capacity)}</span></div>
              <div><span className="text-muted-foreground block">Required (eq. 24)</span><span className="num">{fmtEURcompact(coverage.required)}</span></div>
              <div><span className="text-muted-foreground block">First distribution</span><span className="num">{coverage.firstDistYear === null ? "not in horizon" : `year ${coverage.firstDistYear}`}</span></div>
              <div><span className="text-muted-foreground block">Capacity exhausted</span><span className="num">{coverage.exhaustionYear === null ? "not in horizon" : `year ${coverage.exhaustionYear}`}</span></div>
              <div><span className="text-muted-foreground block">Cum. distributions @ horizon</span><span className="num">{fmtEURcompact(coverage.cumDistAtHorizon)} of {fmtEURcompact(coverage.memberCapTotal)} ({fmtPct(coverage.cumDistAtHorizon / Math.max(coverage.memberCapTotal, 1))})</span></div>
              <div><span className="text-muted-foreground block">Caps reached</span><span className="num">{coverage.capsReached ? "yes" : "no"}</span></div>
              <div><span className="text-muted-foreground block">Redemption duration D_red</span><span className="num">{fmtNum(coverage.redemptionDuration, 1)} yrs</span></div>
              <div><span className="text-muted-foreground block">Feeder</span><span className="num">§12 company × {fmtNum(coop.G1 / Math.max(companySim.totalDeployed, 1), 2)}</span></div>
            </div>
          </div>
        </div>

        {/* Members / vintages */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">
            Member vintages and the capped return rule (<Eq tex="r=3" />)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 pr-2">Member · vintage</th>
                  <th className="text-right py-2 px-2">K (€)</th>
                  <th className="text-right py-2 px-2">units u</th>
                  <th className="text-right py-2 px-2">cap r</th>
                  <th className="text-right py-2 px-2">total cap r·K</th>
                  <th className="text-right py-2 px-2 text-finance">cum dist</th>
                  <th className="text-right py-2 px-2">headroom</th>
                  <th className="text-right py-2 px-2">status</th>
                </tr>
              </thead>
              <tbody>
                {coop.members.map((m, idx) => {
                  const paid = totals.totalPaidByVintage[m.id] ?? 0;
                  const totalCap = m.rCap * m.K;
                  const headroom = Math.max(0, totalCap - paid);
                  const exhausted = headroom <= 0;
                  return (
                    <tr key={m.id} className="border-t border-card-border align-middle">
                      <td className="py-2 pr-2 font-medium">
                        {m.member} · {m.vintageLabel}
                      </td>
                      <td className="py-1 px-1">
                        <NumCell
                          value={m.K}
                          step={5000}
                          onChange={(v) => setVintage(idx, "K", v)}
                        />
                      </td>
                      <td className="py-1 px-1">
                        <NumCell
                          value={m.units}
                          step={10}
                          onChange={(v) => setVintage(idx, "units", v)}
                        />
                      </td>
                      <td className="py-1 px-1">
                        <NumCell
                          value={m.rCap}
                          step={0.5}
                          onChange={(v) => setVintage(idx, "rCap", v)}
                        />
                      </td>
                      <td className="num py-2 px-2 text-right">{fmtEURcompact(totalCap)}</td>
                      <td className="num py-2 px-2 text-right text-finance">{fmtEURcompact(paid)}</td>
                      <td className="num py-2 px-2 text-right">{fmtEURcompact(headroom)}</td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            exhausted
                              ? "bg-theology/15 text-theology"
                              : "bg-finance/15 text-finance"
                          }`}
                        >
                          {exhausted ? "exhausted" : "economic"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-snug">
            Provisional payout is pro-rata on units{" "}
            <Eq tex="\widetilde{\mathrm{Dist}}_{m,v,t} = \tfrac{u_{m,v}}{\sum u} \cdot \mathrm{DistPool}_t" />
            , then clipped at headroom <Eq tex="H^{cap}_{m,v,t} = r_{m,v}K_{m,v} - \mathrm{CumDist}_{m,v,t-1}" />. Any
            residual is redistributed across the still-live vintages and otherwise folded back into the evergreen pot.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ValueCard
            label="Π over horizon"
            symbol="\sum_t \Pi_t"
            value={fmtEURcompact(totals.totalIn)}
            channel="finance"
            size="lg"
            sub={`from the §12 company`}
            testId="kpi-coop-pi"
          />
          <ValueCard
            label="NPV debt service"
            symbol="\sum_t \mathrm{DS}^{NPV}_t"
            value={fmtEURcompact(totals.totalDS)}
            channel="theology"
            size="lg"
          />
          <ValueCard
            label="Total reinvested"
            symbol="\sum_t \mathrm{ReinvestFund}_t"
            value={fmtEURcompact(totals.totalReinvest)}
            channel="impact"
            size="lg"
          />
          <ValueCard
            label="Final evergreen pot"
            symbol="E_T"
            value={fmtEURcompact(totals.finalE)}
            channel="finance"
            size="lg"
            sub={`target ${fmtEURcompact(coop.E_target)} · dist ${fmtEURcompact(totals.totalDist)}`}
          />
        </div>

        {/* Insolvency warning banner (Fix 5, v5.1 §11.2) */}
        {totals.anyInsolvent && (
          <div
            className="rounded-lg p-4 border text-sm"
            style={{ background: "hsl(0 55% 12%)", borderColor: "hsl(0 55% 30%)", color: "hsl(0 70% 78%)" }}
            data-testid="coop-insolvency-banner"
          >
            <p className="font-semibold mb-1">
              Launch stack cannot carry the pre-redemption years
            </p>
            <p className="text-xs leading-snug" style={{ color: "hsl(0 45% 70%)" }}>
              Obligations (opex, tax, liabilities, NPV debt service) exceed cash in at least one
              year: peak unfunded arrears {fmtEURcompact(totals.peakArrears)}
              {totals.totalRaids > 0 ? <> after raiding the evergreen reserve for {fmtEURcompact(totals.totalRaids)}</> : null}
              {totals.finalArrears > 1e-6
                ? <>; {fmtEURcompact(totals.finalArrears)} remains unfunded at the end of the run</>
                : <>; the ledger recovers within the run</>}
              . Increase member capital, the NPV loan, or the launch buffer. Distributions are
              gated until arrears are cleared, cash is non-negative, and E ≥ E★ (v5.1 §11.2).
            </p>
          </div>
        )}

        {/* Yearly waterfall table */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">Yearly fund waterfall</h3>
          <p className="text-xs text-muted-foreground mb-3 equation">
            <Eq tex="\mathrm{Def}_t = \max(0,\, O^{coop}_t + \mathrm{Tax}^{coop}_t + \mathrm{Liab}^{other}_t + \mathrm{DS}^{NPV}_t - \mathrm{Gross}_t)" />
            {" "}· deficits met from cash, then E (recorded raid), remainder accrues as arrears; surpluses replenish cash, then flow{" "}
            <Eq tex="\mathrm{Net} \to \mathrm{Reserve} \to \mathrm{Reinvest} \to \mathrm{DistPool}" />
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 pr-2">t</th>
                  <th className="text-right py-2 px-2">Π</th>
                  <th className="text-right py-2 px-2">DS NPV</th>
                  <th className="text-right py-2 px-2 text-theology">Deficit</th>
                  <th className="text-right py-2 px-2">Coop cash</th>
                  <th className="text-right py-2 px-2 text-theology">Arrears</th>
                  <th className="text-right py-2 px-2">Net</th>
                  <th className="text-right py-2 px-2">Avail</th>
                  <th className="text-right py-2 px-2">η</th>
                  <th className="text-right py-2 px-2 text-impact">Reinvest</th>
                  <th className="text-right py-2 px-2 text-finance">DistPool</th>
                  <th className="text-right py-2 px-2">E open</th>
                  <th className="text-right py-2 px-2">E close</th>
                  <th className="text-right py-2 px-2">Loan bal</th>
                </tr>
              </thead>
              <tbody>
                {sim.map((r) => (
                  <tr key={r.t} className={`border-t border-card-border${r.insolvent ? " bg-destructive/5" : ""}`}>
                    <td className="py-1.5 pr-2 font-medium">
                      t = {r.t}
                      {r.insolvent && <span className="ml-1 text-theology" title="Unfunded obligations outstanding">⚠</span>}
                    </td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.redInflow)}</td>
                    <td className="num py-1.5 px-2 text-right text-theology">−{fmtEURcompact(r.DSNPV)}</td>
                    <td className="num py-1.5 px-2 text-right text-theology">{r.Def > 0 ? fmtEURcompact(r.Def) : "—"}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.coopCashClose)}</td>
                    <td className="num py-1.5 px-2 text-right text-theology">{r.arrearsClose > 0 ? fmtEURcompact(r.arrearsClose) : "—"}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.NetProceeds)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.AvailAfterReserve)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtPct(r.etaPolicy)}</td>
                    <td className="num py-1.5 px-2 text-right text-impact">{fmtEURcompact(r.ReinvestFund)}</td>
                    <td className="num py-1.5 px-2 text-right text-finance font-semibold">{fmtEURcompact(r.DistPool)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.Eopen)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.Eclose)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.loanBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-3">Inflow split per period</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={fundChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke={RULE} strokeDasharray="2 4" />
                  <XAxis dataKey="t" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke={RULE} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke={RULE}
                    tickFormatter={(v) => fmtEURcompact(v)}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtEURcompact(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Π" stackId="a" fill={FINANCE} fillOpacity={0.55} />
                  <Bar dataKey="Reinvest" stackId="b" fill={IMPACT} fillOpacity={0.7} />
                  <Bar dataKey="DistPool" stackId="b" fill={FINANCE} />
                  <Bar dataKey="DSNPV" stackId="b" fill={THEO} fillOpacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-3">
              Evergreen pot <Eq tex="E_t" /> trajectory
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <ComposedChart data={fundChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke={RULE} strokeDasharray="2 4" />
                  <XAxis dataKey="t" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke={RULE} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke={RULE}
                    tickFormatter={(v) => fmtEURcompact(v)}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtEURcompact(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Reinvest" name="ReinvestFund" fill={IMPACT} fillOpacity={0.55} />
                  <Line type="monotone" dataKey="E" name="E_t (close)" stroke={FINANCE} strokeWidth={2.4} dot={{ r: 3 }} />
                  <ReferenceLine y={coop.E_target} stroke={THEO} strokeDasharray="4 3" label={{ value: "E*", position: "right", fontSize: 10, fill: THEO }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tie-back */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-2">
          <h3 className="font-serif text-lg font-semibold">Link back to the unified model</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This layer makes the abstract <Eq tex="r" />, <Eq tex="p" />, and <Eq tex="\eta" /> from the{" "}
            <Link href="/financial" className="text-finance hover-elevate rounded px-1">Financial</Link>{" "}
            and <Link href="/theology" className="text-theology hover-elevate rounded px-1">Theology</Link>{" "}
            engines concrete: <Eq tex="\kappa" /> on the company side caps cumulative repayment at{" "}
            <Eq tex="\Omega = \kappa\sum I" />, the cooperative <Eq tex="\eta_t" /> retention enacts the
            wealth recursion <Eq tex="W_{t+1} = \eta\,W_t\,M" />, and the per-vintage cap{" "}
            <Eq tex="r=3" /> bounds investor extraction. Resilience-first sequencing implements the
            theological constraint that capital must serve work before reciprocity becomes due.
          </p>
        </div>
      </div>
    </>)}
      {mode === "glossary" && <div className="lg:col-span-12"><GlossaryTab sections="cooperative" /></div>}
    </div>
  );
}

function StackCell({
  label,
  value,
  sub,
  channel = "finance",
  emphasis = false,
}: {
  label: string;
  value: string;
  sub?: string;
  channel?: "finance" | "impact" | "theology";
  emphasis?: boolean;
}) {
  const cls =
    channel === "finance"
      ? "text-finance"
      : channel === "impact"
        ? "text-impact"
        : "text-theology";
  return (
    <div className={`rounded-md border border-card-border p-3 ${emphasis ? "bg-secondary/40" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num ${emphasis ? "text-lg" : "text-base"} font-medium ${cls}`}>{value}</div>
      {sub ? <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div> : null}
    </div>
  );
}

function NumCell({
  value,
  step,
  onChange,
}: {
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <Input
      type="number"
      value={value}
      step={step}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      className="num h-7 text-xs px-1.5 py-0 text-right tabular-nums w-[90px]"
    />
  );
}

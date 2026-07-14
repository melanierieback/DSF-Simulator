import { useMemo, useState } from "react";
import { useStoryMode } from "@/contexts/storyMode";
import { GlossaryTab } from "@/components/dsf/GlossaryTab";
import { StoryStrip, StoryDiagnosis, StoryAnnotation } from "@/components/dsf/StoryComponents";
import { PageStory } from "@/components/dsf/PageStory";
import { PageScenario } from "@/components/dsf/PageScenario";
import { Eq } from "@/components/dsf/Eq";
import { ValueCard } from "@/components/dsf/ValueCard";
import { SliderField } from "@/components/dsf/SliderField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtPct, fmtNum } from "@/lib/dsfModel";
import {
  ARCHETYPES,
  ILLUSTRATIVE_EXAMPLE,
  fmtEURcompact,
  simulateCompany,
  type Archetype,
  type CompanyParams,
  type CompanyYearInput,
} from "@/lib/companyModel";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "wouter";

const FINANCE = "hsl(var(--finance))";
const IMPACT = "hsl(var(--impact))";
const THEO = "hsl(var(--theology))";
const RULE = "hsl(var(--rule))";

const cloneParams = (p: CompanyParams): CompanyParams => ({
  ...p,
  years: p.years.map((y) => ({ ...y })),
});

export default function CompanyPage() {
  const [activeArch, setActiveArch] = useState<Archetype["id"]>("ILLUSTRATIVE");
  const [params, setParams] = useState<CompanyParams>(() => cloneParams(ILLUSTRATIVE_EXAMPLE));

  const sim = useMemo(() => simulateCompany(params), [params]);

  const loadArch = (a: Archetype) => {
    setActiveArch(a.id);
    setParams(cloneParams(a.params));
  };

  const setYear = <K extends keyof CompanyYearInput>(idx: number, key: K, value: CompanyYearInput[K]) => {
    setParams((prev) => {
      const years = prev.years.map((y, i) => (i === idx ? { ...y, [key]: value } : y));
      return { ...prev, years };
    });
  };

  const patch = <K extends keyof CompanyParams>(key: K, value: CompanyParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const cumRedemptionData = useMemo(
    () =>
      sim.rows.map((r) => ({
        label: r.label,
        cumRed: r.CumRed,
        cap: r.Omega,
      })),
    [sim],
  );

  const fcfData = useMemo(
    () =>
      sim.rows.map((r) => ({
        label: r.label,
        Revenue: r.Revenue,
        CashOpex: r.CashOpex,
        EBITDA: r.EBITDA,
        FCF: r.FCF,
        Reserve: r.Lstar,
        Cash: r.cashClosing,
      })),
    [sim],
  );

  const { mode } = useStoryMode();
  const isStory = mode === "story";
  const compDiagnosis = useMemo(() => {
    const lastRow = sim.rows[sim.rows.length - 1];
    if (!lastRow) return { text: "No simulation data.", status: "balanced" as const };
    const hasRedeemed = sim.totalRedeemed > 0;
    const isOperating = lastRow.EBITDA >= 0;
    if (!hasRedeemed && !isOperating) return {
      text: `This company should not yet begin redemption. It has not reached operating break-even. Cash is still being consumed (closing balance ${fmtEURcompact(lastRow.cashClosing)}). Asking for repayment now would weaken the company and contradict the fund's non-extractive logic. Extend the runway or reduce operating costs first.`,
      status: "fragile" as const,
    };
    if (!hasRedeemed && isOperating) return {
      text: `The company has reached operating sustainability but has not yet triggered redemption. The resilience reserve (${fmtEURcompact(lastRow.Lstar)}) must be filled before any distribution. Once free cash flow exceeds the reserve gap consistently, modest redemption can begin safely.`,
      status: "balanced" as const,
    };
    if (hasRedeemed && lastRow.cashClosing > 0) return {
      text: `This company can and does redeem capital safely. Free cash flow is positive, the resilience reserve is maintained, and ${fmtEURcompact(sim.totalRedeemed)} has been repaid against a cap of ${fmtEURcompact(sim.capOmega)}. The company is paying back only what it can afford — not what investors demand.`,
      status: "good" as const,
    };
    return {
      text: `Redemption has begun but the company's position requires monitoring. The resilience reserve or cash position may be under pressure. The fund should avoid claiming repayment if it risks the company's operating stability.`,
      status: "stressed" as const,
    };
  }, [sim]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {mode === "story" && (
        <div className="lg:col-span-12">
          <PageStory
            character={{ name: "Miriam Osei", role: "CFO, Arkive Technologies (DSF portfolio company)", initials: "MO", color: "finance" }}
            scene="Quarterly check-in with the DSF fund manager, year three"
            paragraphs={[
              { text: "Miriam did not expect this conversation. She expected the usual VC call — the pressure to grow faster, spend more, raise again. What she got instead was a question: 'Can you afford to repay us yet?' She stared at the screen. 'We haven't even thought about repayment,' she said." },
              { text: "'Good,' said the fund manager. 'You shouldn't think about it until the model says you can.' He pulled up the simulator. EBITDA had just gone positive for the first time. Free cash flow was thin but real. The resilience reserve was half-filled. 'The model says not yet,' he said. 'The reserve needs to be full first. Once it is, whatever free cash flow exceeds it — that's what you can repay. Not before.'", liveValue: fmtEURcompact(sim.totalRedeemed), liveLabel: "Cumulative redemption so far" },
              { text: "Miriam looked at the cap. 'And there's a ceiling?' 'Yes. You cannot repay more than Ω — the cap. After that, you're free of the fund. Whatever you build after that belongs to the mission, not to us. That's the design.' She looked at the number on screen. For the first time, she understood what non-extractive meant in practice." },
            ]}
            insights={[
              { label: "Sequence before repayment", body: "Operating break-even → resilience reserve full → positive FCF → only then does repayment begin. The model enforces this order contractually.", status: sim.totalRedeemed > 0 ? "good" : "balanced" },
              { label: "The resilience reserve L*", body: "L* is a required cash buffer, funded from FCF before any repayment. It protects the company from short-term volatility during repayment.", status: "balanced" },
              { label: "The repayment cap Ω", body: `Cap is ${fmtEURcompact(sim.capOmega)}. Once reached, the company is free. No ongoing extraction, no residual claim. Non-extractive is structural, not aspirational.`, status: "good" },
              { label: "What FCF looks like", body: "Revenue minus cash opex. If it is negative, the company is consuming cash. Repayment from a cash-consuming company is extraction — this model refuses it.", status: "balanced" },
            ]}
            cta="Switch to Analyst to adjust revenue growth, margins, and fund terms — and see exactly when the model permits repayment to begin."
          />
        </div>
      )}
      {mode === "scenario" && (
        <div className="lg:col-span-12">
          <PageScenario
            title="Should this company start repaying now?"
            description="You are the fund manager reviewing a portfolio company in year three. Walk through the DSF repayment conditions — make the call on whether redemption can safely begin."
            steps={[
              {
                id: "breakeven",
                question: "Has the company reached operating break-even?",
                subtitle: "EBITDA ≥ 0 is the first gate. Repayment from a loss-making company is extraction.",
                options: [
                  { id: "yes_be", label: "Yes — EBITDA positive for 2 quarters", description: "The company is covering its operating costs. Ready to proceed to the next condition.", tag: "Gate passed", tagColor: "impact", onApply: () => {} },
                  { id: "barely_be", label: "Barely — EBITDA positive by a thin margin", description: "The company has just turned the corner. Prudence suggests waiting for consistency.", tag: "Borderline", tagColor: "warning", onApply: () => {} },
                  { id: "no_be", label: "No — still EBITDA negative", description: "Repayment would require drawing down cash reserves. This is extraction. Wait.", tag: "Gate failed", tagColor: "warning", onApply: () => {} },
                ],
              },
              {
                id: "reserve",
                question: "Is the resilience reserve (L*) fully funded?",
                subtitle: "The reserve must be full before any distribution. It protects against operating shocks.",
                options: [
                  { id: "full_reserve", label: "Reserve fully funded", description: "L* target reached. The company can withstand a revenue shock. Ready for repayment.", tag: "Ready", tagColor: "impact", onApply: () => {} },
                  { id: "partial_reserve", label: "Reserve 60% funded", description: "Close but not there. A modest revenue shock could deplete cash while repaying. Delay recommended.", tag: "Nearly ready", tagColor: "finance", onApply: () => {} },
                  { id: "empty_reserve", label: "Reserve not started", description: "FCF is going elsewhere. Repayment now would leave no buffer. Not permitted.", tag: "Not ready", tagColor: "warning", onApply: () => {} },
                ],
              },
              {
                id: "pace",
                question: "What repayment pace does the company propose?",
                options: [
                  { id: "fcf_based", label: "FCF-based: whatever exceeds the reserve floor", description: "Only free cash flow above L* goes toward repayment. The company keeps everything else.", tag: "Non-extractive", tagColor: "impact", onApply: () => {} },
                  { id: "fixed", label: "Fixed schedule: €50k/quarter regardless of FCF", description: "Simple and predictable. Risk: in a bad quarter, repayment draws down cash.", tag: "Structured", tagColor: "finance", onApply: () => {} },
                  { id: "accelerated", label: "Accelerated: repay as fast as possible to reach Ω", description: "The company wants to be free of the cap obligation quickly. Fund must check if cash is genuinely available.", tag: "Company-driven", tagColor: "warning", onApply: () => {} },
                ],
              },
            ]}
            consequences={[
              { label: "Redeemed so far", value: fmtEURcompact(sim.totalRedeemed), channel: "finance", note: `cap ${fmtEURcompact(sim.capOmega)}` },
              { label: "Cap Ω", value: fmtEURcompact(sim.capOmega), channel: "finance" },
              { label: "Cash balance", value: fmtEURcompact(sim.rows[sim.rows.length - 1]?.cashClosing ?? 0), channel: "neutral", direction: (sim.rows[sim.rows.length - 1]?.cashClosing ?? 0) > 0 ? "up" : "down" },
              { label: "EBITDA (last yr)", value: fmtEURcompact(sim.rows[sim.rows.length - 1]?.EBITDA ?? 0), channel: "impact", direction: (sim.rows[sim.rows.length - 1]?.EBITDA ?? 0) >= 0 ? "up" : "down" },
            ]}
            narratorLine="The non-extractive promise is not just about the cap — it is about timing. A company asked to repay before it is stable will be weakened. The model enforces the sequence so the fund manager does not have to rely on goodwill."
          />
        </div>
      )}
      {mode === "analyst" && (
        <div className="lg:col-span-12">
          <StoryStrip
            humanQuestion="When can a company afford to repay without being harmed?"
            opening="The fund's non-extractive promise is not just about the cap on what can be repaid — it is also about timing. A company asked to repay before it is financially stable will be weakened. The model enforces a sequence: operating break-even first, resilience reserve filled second, positive free cash flow third — and only then can any redemption begin. Move the sliders to stress-test the company and see when and whether redemption becomes safe."
            diagnosis={compDiagnosis}
            guidedQuestions={[
              "Has the company reached operating break-even (EBITDA ≥ 0)?",
              "Is the resilience reserve (L*) fully funded?",
              "Is free cash flow consistently positive before redemption?",
              "How far is cumulative redemption from the cap Ω?",
              "Does the company maintain adequate cash after redemption?",
            ]}
          />
        </div>
      )}
      {/* Left rail */}
      {mode === "analyst" && (<><div className="lg:col-span-12 space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] text-finance">Portfolio company</div>
        <h2 className="font-serif text-3xl font-semibold">One company, year by year</h2>
      </div><aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 self-start">
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
          <div>
            <h3 className="font-serif text-lg font-semibold">Archetype</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Load a parameter bundle from §6, or the §12 worked example.
            </p>
          </div>
          <div className="space-y-1">
            {ARCHETYPES.map((a) => (
              <button
                key={a.id}
                onClick={() => loadArch(a)}
                data-testid={`arch-${a.id}`}
                className={`w-full text-left rounded-md border px-3 py-2 hover-elevate ${
                  activeArch === a.id ? "border-finance" : "border-card-border"
                }`}
              >
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground leading-snug">{a.blurb}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-serif text-lg font-semibold">Resilience &amp; cap</h3>
            <p className="text-xs text-muted-foreground equation">
              <Eq tex="L^{\star}_{i,t} = \max(L_i, \rho_i \tfrac{\text{CashOpex}}{12}, S_{i,t})" />
            </p>
          </div>
          <SliderField
            label="ρ (months runway)"
            symbol="\rho"
            value={params.rhoRes}
            min={0}
            max={12}
            step={0.5}
            onChange={(v) => patch("rhoRes", v)}
            channel="finance"
          />
          <SliderField
            label="L_min (€k floor)"
            symbol="L"
            value={params.Lmin / 1000}
            min={0}
            max={500}
            step={10}
            onChange={(v) => patch("Lmin", v * 1000)}
            channel="finance"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="κ (company cap multiple)"
            symbol="\kappa"
            value={params.kappa}
            min={1}
            max={5}
            step={0.1}
            onChange={(v) => patch("kappa", v)}
            channel="finance"
            hint={`Cap Ω = κ·ΣI = ${fmtEURcompact(sim.capOmega)}`}
          />
          <SliderField
            label="τ (tax rate)"
            symbol="\tau"
            value={params.tau}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => patch("tau", v)}
            channel="finance"
            format={fmtPct}
          />
          <div className="rule-top pt-4 space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Reinvest share γ
            </div>
            <SliderField
              label="γ_early (t ≤ split)"
              symbol="\gamma^{early}"
              value={params.gammaEarly}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patch("gammaEarly", v)}
              channel="impact"
              format={fmtPct}
            />
            <SliderField
              label="γ_late (t > split)"
              symbol="\gamma^{late}"
              value={params.gammaLate}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patch("gammaLate", v)}
              channel="impact"
              format={fmtPct}
            />
            <SliderField
              label="early/late split index"
              symbol="t^{*}"
              value={params.earlySplit}
              min={0}
              max={4}
              step={1}
              onChange={(v) => patch("earlySplit", Math.round(v))}
              channel="impact"
              format={(v) => `≤ ${v.toFixed(0)}`}
            />
          </div>
          <div className="rule-top pt-4 space-y-3">
            <SliderField
              label="C₀ opening cash (€k)"
              symbol="C_0"
              value={params.C0 / 1000}
              min={0}
              max={1000}
              step={10}
              onChange={(v) => patch("C0", v * 1000)}
              channel="finance"
              format={(v) => `€${v.toFixed(0)}k`}
            />
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
          <div>
            <h3 className="font-serif text-lg font-semibold">Steward-ownership transition</h3>
            <p className="text-xs text-muted-foreground equation">
              <Eq tex="I^{net}_i = I^{gross}_i - C^{SO}_i - C^{inc}_i" />
            </p>
          </div>
          <SliderField
            label="C_SO (€k)"
            symbol="C^{SO}"
            value={params.CSO / 1000}
            min={0}
            max={150}
            step={5}
            onChange={(v) => patch("CSO", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <SliderField
            label="C_inc (€k)"
            symbol="C^{inc}"
            value={params.Cinc / 1000}
            min={0}
            max={100}
            step={5}
            onChange={(v) => patch("Cinc", v * 1000)}
            channel="theology"
            format={(v) => `€${v.toFixed(0)}k`}
          />
          <div className="rule-top pt-3 text-xs">
            <div className="text-muted-foreground">Year 1 gross ticket</div>
            <div className="num">{fmtEURcompact(sim.grossYear1)}</div>
            <div className="text-muted-foreground mt-1">Less SO + inc</div>
            <div className="num text-theology">−{fmtEURcompact(sim.inetDeduction)}</div>
            <div className="text-muted-foreground mt-1">Net usable at company</div>
            <div className="num text-finance text-base font-medium">{fmtEURcompact(sim.netUsableYear1)}</div>
          </div>
        </div>
        {mode === "analyst" && <StoryDiagnosis diagnosis={compDiagnosis} />}
      </aside>

      {/* Main */}
      <div className="lg:col-span-9 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ValueCard
            label="Cumulative redemption"
            symbol="\sum \mathrm{Red}_{i,t}"
            value={fmtEURcompact(sim.totalRedeemed)}
            channel="finance"
            size="lg"
            sub={`of cap Ω = ${fmtEURcompact(sim.capOmega)}`}
            testId="kpi-company-cumred"
          />
          <ValueCard
            label="Total DSF deployed"
            symbol="\sum I_{i,t}"
            value={fmtEURcompact(sim.totalDeployed)}
            channel="finance"
            size="lg"
            sub={`κ = ${fmtNum(params.kappa, 1)}`}
          />
          <ValueCard
            label="Year of EBITDA breakeven"
            symbol="t^{*}_{EBITDA}"
            value={
              sim.yearOfBreakeven !== null ? sim.rows[sim.yearOfBreakeven].label : "—"
            }
            channel="impact"
            size="lg"
            sub={
              sim.yearOfFirstRedemption !== null
                ? `first redemption: ${sim.rows[sim.yearOfFirstRedemption].label}`
                : "no redemption yet"
            }
          />
          <ValueCard
            label="Peak monthly burn"
            symbol="B_t"
            value={fmtEURcompact(sim.peakBurnMonthly)}
            channel="theology"
            size="lg"
            sub={`min cash: ${fmtEURcompact(sim.minCash)}`}
          />
        </div>

        {/* Year-by-year table */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-serif text-lg font-semibold">Year-by-year operating profile</h3>
            <span className="text-xs text-muted-foreground equation">
              edit any cell · derived columns recompute live
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 pr-2">Stage</th>
                  <th className="text-right py-2 px-2">N</th>
                  <th className="text-right py-2 px-2">W (€)</th>
                  <th className="text-right py-2 px-2">O (€)</th>
                  <th className="text-right py-2 px-2">R (€)</th>
                  <th className="text-right py-2 px-2">D (€)</th>
                  <th className="text-right py-2 px-2">Capex (€)</th>
                  <th className="text-right py-2 px-2">ΔNWC (€)</th>
                  <th className="text-right py-2 px-2">DSF I (€)</th>
                  <th className="text-right py-2 px-2 text-finance">CashOpex</th>
                  <th className="text-right py-2 px-2 text-finance">EBITDA</th>
                  <th className="text-right py-2 px-2">Tax</th>
                  <th className="text-right py-2 px-2 text-finance">FCF</th>
                  <th className="text-right py-2 px-2 text-impact">L*</th>
                  <th className="text-right py-2 px-2">ResGap</th>
                  <th className="text-right py-2 px-2">DistCash</th>
                  <th className="text-right py-2 px-2">γ</th>
                  <th className="text-right py-2 px-2">Reinvest</th>
                  <th className="text-right py-2 px-2 text-finance font-semibold">Red</th>
                  <th className="text-right py-2 px-2">Cash close</th>
                </tr>
              </thead>
              <tbody>
                {sim.rows.map((r, idx) => (
                  <tr key={r.t} className="border-t border-card-border align-middle">
                    <td className="py-1.5 pr-2 font-medium">{r.label}</td>
                    <td className="py-1.5 px-1">
                      <NumCell value={params.years[idx].N} step={1} onChange={(v) => setYear(idx, "N", v)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <NumCell value={params.years[idx].W} step={1000} onChange={(v) => setYear(idx, "W", v)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <NumCell value={params.years[idx].O} step={5000} onChange={(v) => setYear(idx, "O", v)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <NumCell value={params.years[idx].R} step={10000} onChange={(v) => setYear(idx, "R", v)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <NumCell value={params.years[idx].D} step={1000} onChange={(v) => setYear(idx, "D", v)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <NumCell value={params.years[idx].Capex} step={5000} onChange={(v) => setYear(idx, "Capex", v)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <NumCell value={params.years[idx].dNWC} step={5000} onChange={(v) => setYear(idx, "dNWC", v)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <NumCell value={params.years[idx].I} step={50000} onChange={(v) => setYear(idx, "I", v)} />
                    </td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.CashOpex)}</td>
                    <td className={`num py-1.5 px-2 text-right ${r.EBITDA >= 0 ? "text-finance" : "text-theology"}`}>
                      {fmtEURcompact(r.EBITDA)}
                    </td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.Tax)}</td>
                    <td className={`num py-1.5 px-2 text-right ${r.FCF >= 0 ? "text-finance" : "text-theology"}`}>
                      {fmtEURcompact(r.FCF)}
                    </td>
                    <td className="num py-1.5 px-2 text-right text-impact">{fmtEURcompact(r.Lstar)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.ResGap)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.DistCash)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtPct(r.gamma)}</td>
                    <td className="num py-1.5 px-2 text-right">{fmtEURcompact(r.Reinvest)}</td>
                    <td className="num py-1.5 px-2 text-right text-finance font-semibold">{fmtEURcompact(r.Red)}</td>
                    <td className={`num py-1.5 px-2 text-right ${r.cashClosing >= 0 ? "" : "text-destructive"}`}>
                      {fmtEURcompact(r.cashClosing)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-1">Revenue, CashOpex, FCF</h3>
            <p className="text-xs text-muted-foreground mb-3 equation">
              <Eq tex="\text{FCF}_{i,t} = \text{EBITDA}_{i,t} - \text{Tax}_{i,t} - \text{Capex}_{i,t} - \Delta\text{NWC}_{i,t}" />
            </p>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <ComposedChart data={fcfData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke={RULE} strokeDasharray="2 4" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke={RULE} />
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
                  <Bar dataKey="Revenue" fill={IMPACT} fillOpacity={0.55} />
                  <Bar dataKey="CashOpex" fill={THEO} fillOpacity={0.45} />
                  <Line type="monotone" dataKey="FCF" stroke={FINANCE} strokeWidth={2.4} dot={{ r: 3 }} />
                  <ReferenceLine y={0} stroke={RULE} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-1">
              Cumulative redemption vs cap <Eq tex="\Omega" />
            </h3>
            <p className="text-xs text-muted-foreground mb-3 equation">
              <Eq tex="\Omega_{i,t} = \kappa_i \sum_{\tau \leq t} I_{i,\tau}" />
            </p>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <LineChart data={cumRedemptionData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke={RULE} strokeDasharray="2 4" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke={RULE} />
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
                  <Line type="monotone" dataKey="cap" name="Cap Ω" stroke={THEO} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  <Line type="monotone" dataKey="cumRed" name="Cumulative redemption" stroke={FINANCE} strokeWidth={2.4} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Cash trajectory + waterfall */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">Closing cash and resilience reserve</h3>
          <p className="text-xs text-muted-foreground mb-3 equation">
            Cash never falls below the floor while reserve gap{" "}
            <Eq tex="\mathrm{ResGap}_{i,t} = \max(0, L^{\star}_{i,t} - (C^{pre}_{i,t} + \mathrm{FCF}_{i,t}))" />{" "}
            is non-zero.
          </p>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <LineChart data={fcfData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={RULE} strokeDasharray="2 4" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke={RULE} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke={RULE} tickFormatter={(v) => fmtEURcompact(v)} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--popover-border))",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmtEURcompact(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Cash" name="Closing cash" stroke={FINANCE} strokeWidth={2.4} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Reserve" name="Reserve floor L*" stroke={IMPACT} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                <ReferenceLine y={0} stroke={RULE} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </>)}
      {mode === "glossary" && (
        <div className="lg:col-span-12 space-y-6">
          <GlossaryTab sections="company" />
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold mb-1">Three-layer company waterfall</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Every year, a company's cash flows through three gates in strict sequence before any payment reaches the fund.
            </p>
            <div className="space-y-4 max-w-3xl">
              <div className="flex gap-3">
                <span className="text-finance font-mono text-xs mt-0.5 shrink-0">A</span>
                <div>
                  <p className="text-sm font-medium mb-0.5">Operating cash flow</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    Revenue minus all cash costs — operating expenses, tax, capital investment, and changes in working capital. This is the cash the company actually generated that year.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Eq tex="\mathrm{FCF} = R - \text{CashOpex} - \text{Tax} - \text{Capex} - \Delta\text{NWC}" />
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-finance font-mono text-xs mt-0.5 shrink-0">B</span>
                <div>
                  <p className="text-sm font-medium mb-0.5">Resilience reserve — filled first</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    Before any distribution, the company tops up its cash buffer to the target level <Eq tex="L^{\star}" />. If the buffer is already full, this step costs nothing. If FCF falls short, the entire FCF goes here and nothing flows downstream.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Eq tex="\mathrm{ResGap} = \max(0,\; L^{\star} - (C^{pre} + \mathrm{FCF}))" />
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-finance font-mono text-xs mt-0.5 shrink-0">C</span>
                <div>
                  <p className="text-sm font-medium mb-0.5">Conditional distribution — split between reinvestment and redemption</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    Whatever FCF remains after topping up the reserve is the distributable cash. A share <Eq tex="\gamma" /> is reinvested into the company; the rest <Eq tex="(1-\gamma)" /> flows to the fund as a redemption payment — but only up to the remaining cap <Eq tex="\Omega - \mathrm{CumRed}_{t-1}" />, so the fund can never extract more than was agreed at the outset.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Eq tex="\mathrm{DistCash} = \max(0,\; \mathrm{FCF} - \mathrm{ResGap})" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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

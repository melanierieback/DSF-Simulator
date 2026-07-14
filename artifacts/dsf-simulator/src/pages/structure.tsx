import { Link } from "wouter";
import { useStoryMode } from "@/contexts/storyMode";
import { GlossaryTab } from "@/components/dsf/GlossaryTab";
import { PageStory } from "@/components/dsf/PageStory";
import { PageScenario } from "@/components/dsf/PageScenario";
import { StoryStrip } from "@/components/dsf/StoryComponents";
import { StoryClosingPrompt } from "@/components/dsf/StoryClosingPrompt";
import { ScenarioBanner } from "@/components/dsf/ScenarioBanner";
import { getPortfolioSeams, STORY_CLOSING, CLOSING_PROMPT_TEXT, SCENARIO_BANNER_TEXT } from "@/lib/storyVariants";
import { Eq } from "@/components/dsf/Eq";
import { ArrowRight } from "lucide-react";

function LayerCard({
  href,
  label,
  title,
  subtitle,
  channel,
  layers,
}: {
  href: string;
  label: string;
  title: string;
  subtitle: string;
  channel: "finance" | "impact" | "theology" | "neutral";
  layers: Array<{ step: string; text: string; eq?: string }>;
}) {
  const accent =
    channel === "finance"
      ? "text-finance border-finance"
      : channel === "impact"
      ? "text-impact border-impact"
      : channel === "theology"
      ? "text-theology border-theology"
      : "text-muted-foreground border-card-border";
  const accentText =
    channel === "finance"
      ? "text-finance"
      : channel === "impact"
      ? "text-impact"
      : channel === "theology"
      ? "text-theology"
      : "text-muted-foreground";
  return (
    <div className="bg-card border border-card-border rounded-lg p-6 flex flex-col gap-5">
      <div>
        <div className={`text-xs uppercase tracking-[0.18em] mb-1 ${accentText}`}>{label}</div>
        <h3 className="font-serif text-2xl font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
      </div>

      <div className="space-y-3">
        {layers.map((l, i) => (
          <div key={i} className="flex gap-3">
            <span className={`font-mono text-xs mt-0.5 shrink-0 ${accentText}`}>{l.step}</span>
            <div>
              <p className="text-sm leading-snug">{l.text}</p>
              {l.eq && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Eq tex={l.eq} />
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Link
        href={href}
        className={`mt-auto inline-flex items-center gap-1.5 text-sm font-medium hover-elevate ${accentText}`}
      >
        Open full page <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export default function StructurePage() {
  const { mode } = useStoryMode();

  return (
    <div className="space-y-10">
      {mode === "story" && (() => {
        const portSeams = getPortfolioSeams(75_000, 1.0, 0.1);
        return (
          <>
            <PageStory
              character={{ name: "Miriam Osei", role: "CFO, portfolio company — Archivum Systems", initials: "MO", color: "finance" }}
              scene="Meeting the fund manager for the first quarterly review after the resilience reserve was fully funded"
              paragraphs={[
                { text: "Miriam did not expect this conversation to feel different from a bank meeting. She had been in enough of those. Revenue reported, margin noted, next steps agreed. What she noticed instead was that the fund manager pulled up a simulator rather than a term sheet — and that the first number he pointed to was not her revenue figure. It was her EBITDA." },
                { text: "He pulled up the simulator and walked her through the sequence. 'First gate: operating cash flow. The model checks whether the company is profitable enough to distribute anything at all. If EBITDA is negative, no payment leaves. That is not a penalty — it is a design feature. A company making payments from a cash-negative position is a company being harmed by its investor.' He paused. 'The model does not allow that.'" },
                { text: "'Second gate: the resilience reserve. Before any euro flows to the fund, the reserve must be at its target level. That reserve is yours — it protects you from operating shocks, from a slow quarter, from any event that would otherwise put you under pressure to cut corners or miss a payment.' He pulled up the reserve line. 'When it is full, the distributable calculation begins — and only then.'" },
                ...portSeams.filter(Boolean).map((text) => ({ text: text as string })),
                { text: STORY_CLOSING.portfolio },
              ]}
              insights={[
                { label: "Company waterfall", body: "FCF → resilience reserve first → distributable split → capped redemption. The fund cannot touch the reserve.", status: "good" },
                { label: "Cooperative waterfall", body: "Portfolio inflows → debt service → coop costs → evergreen pot → member distributions. Discipline is structural.", status: "balanced" },
                { label: "The cap is the moral anchor", body: "Both waterfalls carry a redemption cap. It is the legal encoding of the theological constraint: extraction is bounded by contract.", status: "balanced" },
                { label: "Two waterfalls, one mission", body: "The company waterfall protects the company. The cooperative waterfall protects the mission. Neither can be short-circuited without breaking the model.", status: "good" },
              ]}
            />
            <StoryClosingPrompt text={CLOSING_PROMPT_TEXT.portfolio} channel="finance" />
          </>
        );
      })()}
      {mode === "scenario" && (
        <>
          <ScenarioBanner text={SCENARIO_BANNER_TEXT.portfolio} channel="finance" />
          <PageScenario
          title="Where does the money actually flow?"
          description="Trace a euro from a company's revenue all the way to a member's distribution — through two sequential waterfalls."
          steps={[
            {
              id: "company_gate",
              question: "A portfolio company generates €100k FCF in Year 4. Its resilience reserve needs €30k topping up. What happens first?",
              options: [
                { id: "reserve", label: "Fill the reserve to L★ — €30k locked in", description: "The reserve is always filled before anything flows downstream. The company keeps €30k regardless of repayment status.", tag: "Correct", tagColor: "impact", onApply: () => {} },
                { id: "redemption", label: "Pay the fund first — then fill reserve", description: "This is extractive sequencing. It would violate the waterfall contract and the resilience principle.", tag: "Extractive", tagColor: "warning", onApply: () => {} },
                { id: "split", label: "Split 50/50 between reserve and fund", description: "The model doesn't allow this. The reserve gate is binary: fill it entirely before anything else moves.", tag: "Not how it works", tagColor: undefined, onApply: () => {} },
              ],
            },
            {
              id: "coop_gate",
              question: "The cooperative receives €500k aggregate redemption this quarter. What's the correct distribution order?",
              options: [
                { id: "correct_order", label: "Debt service → coop costs → evergreen reserve → member distributions", description: "The cooperative waterfall sequences in strict priority. Members receive only the residual after all obligations are met.", tag: "Correct", tagColor: "finance", onApply: () => {} },
                { id: "members_first", label: "Member distributions first, then expenses", description: "This would breach the NPV loan covenant and undermine the evergreen reinvestment discipline.", tag: "Covenant breach", tagColor: "warning", onApply: () => {} },
              ],
            },
          ]}
          consequences={[
            { label: "Company reserve", value: "Filled first", channel: "impact", note: "Before any payment to fund" },
            { label: "Redemption cap", value: "Ω = κ · I", channel: "finance", note: "Cumulative cap, not annual" },
            { label: "Evergreen pot", value: "η · Avail", channel: "impact", note: "Recycled into new companies" },
            { label: "Member cap", value: "r = 3×", channel: "finance", note: "Per-vintage headroom" },
          ]}
          narratorLine="Two waterfalls, back to back. The company's waterfall protects the company. The cooperative's waterfall protects the mission. Neither can be short-circuited."
        />
        </>
      )}
      {mode === "analyst" && (
        <StoryStrip
          humanQuestion="How does money actually flow from a company's revenue to a member's account?"
          opening="The portfolio model (Financial, Impact, Theology) operates at an abstract level — survival rates, averages, aggregate multiples. These two pages drill into the mechanics: how a real company generates and gates its cash flows, and how those flows are collected, sequenced, and redistributed by the fund cooperative."
          diagnosis={{ text: "Two sequential waterfalls: the company waterfall (FCF → reserve → capped redemption) and the cooperative waterfall (inflows → obligations → evergreen pot → member distributions). Every gate is contractual. Every cap is pre-agreed.", status: "balanced" }}
          guidedQuestions={[
            "What prevents the fund from extracting cash before the company's reserve is full?",
            "What is the difference between the company redemption cap (Ω) and the member distribution cap (r)?",
            "How does the evergreen pot (E) at the cooperative level implement the η parameter in the portfolio model?",
            "At what point does a euro of company FCF become a euro of member distribution?",
          ]}
        />
      )}

      {mode === "analyst" && (
        <>
          <header className="space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Implementation layer
            </div>
            <h2 className="font-serif text-3xl font-semibold">Fund structure</h2>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              The portfolio model sets the design targets — M, I, T. These two pages show how those targets are implemented through contractual cash-flow waterfalls at the company and cooperative level.
            </p>
          </header>

          {/* Layer diagram */}
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h3 className="font-serif text-base font-semibold mb-4">Three abstraction layers</h3>
            <div className="flex flex-col md:flex-row gap-2 items-stretch">
              <div className="flex-1 rounded-md p-4" style={{ background: "hsl(235 60% 12%)", border: "1px solid hsl(235 50% 28%)" }}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Portfolio model</div>
                <p className="text-sm font-medium mb-1">Financial · Impact · Theology · Unified</p>
                <p className="text-xs text-muted-foreground">Abstract averages — survival rate p, repayment cap r, usury pressure U. The design problem.</p>
              </div>
              <div className="flex items-center text-muted-foreground px-1 text-xs self-center shrink-0">↓</div>
              <div className="flex-1 rounded-md p-4" style={{ background: "hsl(235 60% 12%)", border: "1px solid hsl(var(--finance) / 0.35)" }}>
                <div className="text-xs uppercase tracking-wider text-finance mb-2">Micro — company</div>
                <p className="text-sm font-medium mb-1">One portfolio company, year by year</p>
                <p className="text-xs text-muted-foreground">FCF waterfall: operating cash → resilience reserve → capped redemption. Implements p and r at the entity level.</p>
              </div>
              <div className="flex items-center text-muted-foreground px-1 text-xs self-center shrink-0">↓</div>
              <div className="flex-1 rounded-md p-4" style={{ background: "hsl(235 60% 12%)", border: "1px solid hsl(var(--finance) / 0.35)" }}>
                <div className="text-xs uppercase tracking-wider text-finance mb-2">Meta — cooperative</div>
                <p className="text-sm font-medium mb-1">The fund vehicle and its members</p>
                <p className="text-xs text-muted-foreground">Aggregate inflows → debt service → evergreen pot → member distributions. Implements η and the member cap at fund level.</p>
              </div>
            </div>
          </div>

          {/* Two cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LayerCard
              href="/company"
              label="Micro — portfolio company"
              title="Portfolio company"
              subtitle="Simulate a single company year by year. Revenue feeds a three-gate waterfall: operating cash flow, resilience reserve, then conditional distribution. The fund can only receive a redemption payment once the reserve is full and the trigger conditions are met."
              channel="finance"
              layers={[
                { step: "A", text: "Operating cash flow — revenue minus all cash costs.", eq: "\\mathrm{FCF} = R - \\text{CashOpex} - \\text{Tax} - \\text{Capex} - \\Delta\\text{NWC}" },
                { step: "B", text: "Resilience reserve filled before any distribution.", eq: "\\mathrm{ResGap} = \\max(0,\\; L^{\\star} - (C^{pre} + \\mathrm{FCF}))" },
                { step: "C", text: "Distributable cash split between reinvestment and capped redemption.", eq: "\\mathrm{Red} = T_{i,t} \\cdot \\min(\\mathrm{RedBase},\\; \\Omega - \\mathrm{CumRed}_{t-1})" },
              ]}
            />
            <LayerCard
              href="/cooperative"
              label="Meta — fund vehicle"
              title="Operations"
              subtitle="Aggregate company redemptions flow into the cooperative, which sequences them through its own waterfall: debt service first, then operating costs, then the evergreen reinvestment pot, then member distributions subject to per-vintage caps."
              channel="finance"
              layers={[
                { step: "1", text: "Aggregate inflows from all portfolio company redemptions.", eq: "\\Pi_t = \\sum_i \\mathrm{Red}_{i,t}" },
                { step: "2", text: "Debt service, cooperative costs, and liabilities paid first.", eq: "\\mathrm{Net}_t = \\Pi - O^{\\mathrm{coop}} - \\mathrm{Tax} - \\mathrm{Liab} - DS^{\\mathrm{NPV}}" },
                { step: "3", text: "Evergreen pot topped up to floor E★, then member distributions.", eq: "\\mathrm{Dist}_{m,v,t} = \\min\\!\\left(\\tfrac{u_{m,v}}{\\sum u}\\mathrm{DistPool},\\; H^{\\mathrm{cap}}\\right)" },
              ]}
            />
          </div>
        </>
      )}
      {mode === "glossary" && <div className="lg:col-span-12"><GlossaryTab sections={["company", "cooperative"]} /></div>}
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { useDsf } from "@/hooks/useDsfStore";
import { useGuidedMode } from "@/contexts/guidedMode";
import { getDriftStatus } from "@/lib/driftDetection";
import { computeM, fmtNum, fmtPct } from "@/lib/dsfModel";
import { ArrowRight, Map, Compass, AlertTriangle } from "lucide-react";
import { ErgodicityBadge } from "@/components/dsf/ErgodicityBadge";

const MEMBER_CAP = 3;

type LPTab = "your_return" | "the_fund";

function fmtEuro(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}€${Math.round(abs).toLocaleString("en-GB")}`;
  return `${sign}€${Math.round(abs)}`;
}

function fmtIRR(irr: number): string {
  return `${(irr * 100).toFixed(1)}% p.a.`;
}

const CARD_BG = "hsl(237 28% 11%)";
const CARD_BORDER = "1px solid hsl(237 22% 19%)";
const CARD_BORDER_HIGHLIGHT = "1px solid hsl(235 70% 55% / 0.5)";
const ROW_BG = "hsl(237 28% 13%)";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-4"
      style={{ color: "hsl(235 80% 68%)" }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-snug">
      {children}
    </h2>
  );
}

function Divider() {
  return <div className="my-12" style={{ borderTop: "1px solid hsl(237 22% 16%)" }} />;
}

function readTabFromURL(): LPTab {
  try {
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "the_fund" ? "the_fund" : "your_return";
  } catch {
    return "your_return";
  }
}

export default function LPViewPage() {
  const { params, derived } = useDsf();
  const { completedModules, moduleChoices } = useGuidedMode();
  const [commitment, setCommitment] = useState(100_000);
  const [inputRaw, setInputRaw] = useState("100000");

  const hasDrift = Array.from(completedModules).some((idx) => {
    const choiceId = moduleChoices[idx];
    return choiceId && getDriftStatus(idx, choiceId, params) === "drifted";
  });
  const [tab, setTab] = useState<LPTab>(readTabFromURL);

  const switchTab = (t: LPTab) => {
    setTab(t);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", t);
      window.history.replaceState(null, "", url.toString());
    } catch {}
  };

  const M = derived.M;
  const yearsPerCycle = params.yearsPerCycle;
  const c = params.c;
  const rVC = params.rVC;

  const totalReturn = commitment * M;
  const netGain = totalReturn - commitment;
  const irr = Math.pow(M, 1 / yearsPerCycle) - 1;
  const evergreenTotal = commitment * Math.pow(M, c);
  const cappedAt = commitment * MEMBER_CAP;
  const vcReturn = commitment * Math.pow(1 + rVC, yearsPerCycle);
  const vsVC = totalReturn - vcReturn;

  const handleCommitmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setInputRaw(raw);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n > 0) setCommitment(n);
  };

  function calcScenario(pScen: number) {
    const M_s = computeM(derived.r, params.k, pScen);
    const totalReturn_s = commitment * M_s;
    const netGain_s = totalReturn_s - commitment;
    const irr_s = Math.pow(M_s, 1 / yearsPerCycle) - 1;
    const evergreen_s = commitment * Math.pow(M_s, c);
    const vsVC_s = totalReturn_s - vcReturn;
    return { M_s, totalReturn_s, netGain_s, irr_s, evergreen_s, vsVC_s };
  }

  const SCENARIOS = [
    { label: "Conservative", sublabel: `p = ${fmtPct(0.25)}`, p: 0.25, key: "conservative" },
    { label: "Base case",    sublabel: `p = ${fmtPct(0.40)}`, p: 0.40, key: "base" },
    { label: "Ambitious",   sublabel: `p = ${fmtPct(0.55)}`, p: 0.55, key: "ambitious" },
  ];

  function getHighlightedCol(currentP: number) {
    if (currentP < 0.325) return "conservative";
    if (currentP < 0.475) return "base";
    return "ambitious";
  }
  const highlighted = getHighlightedCol(params.p);

  const cards = [
    {
      label: "TOTAL RETURN",
      value: fmtEuro(totalReturn),
      sub: `${fmtNum(M, 2)}× your commitment`,
      color: "hsl(var(--finance))",
    },
    {
      label: "NET GAIN",
      value: fmtEuro(netGain),
      sub: "above your commitment",
      color: "hsl(var(--finance))",
    },
    {
      label: "IRR EQUIVALENT",
      value: fmtIRR(irr),
      sub: `over ${yearsPerCycle} years (one cycle)`,
      color: "hsl(var(--finance))",
    },
    {
      label: `EVERGREEN TOTAL (${c} cycles)`,
      value: fmtEuro(evergreenTotal),
      sub: `over ${c * yearsPerCycle} years`,
      color: "hsl(var(--impact))",
    },
    {
      label: "CAPPED AT",
      value: fmtEuro(cappedAt),
      sub: `${MEMBER_CAP}× your contribution`,
      color: "hsl(237 20% 60%)",
    },
    {
      label: "VS VC BENCHMARK",
      value: (vsVC >= 0 ? "+" : "") + fmtEuro(vsVC),
      sub: `vs ${fmtPct(rVC)} p.a. over ${yearsPerCycle} yrs`,
      color: vsVC >= 0 ? "hsl(var(--impact))" : "hsl(0 70% 62%)",
    },
  ];

  const tableRows = [
    {
      label: "Single-cycle multiple",
      fmt: (s: ReturnType<typeof calcScenario>) => `${fmtNum(s.M_s, 2)}×`,
    },
    {
      label: `Total return (${fmtEuro(commitment)})`,
      fmt: (s: ReturnType<typeof calcScenario>) => fmtEuro(s.totalReturn_s),
    },
    {
      label: "Net gain",
      fmt: (s: ReturnType<typeof calcScenario>) => fmtEuro(s.netGain_s),
    },
    {
      label: `IRR (${yearsPerCycle} yr cycle)`,
      fmt: (s: ReturnType<typeof calcScenario>) => fmtIRR(s.irr_s),
    },
    {
      label: `vs VC (${fmtPct(rVC)} p.a.)`,
      fmt: (s: ReturnType<typeof calcScenario>) =>
        (s.vsVC_s >= 0 ? "+" : "") + fmtEuro(s.vsVC_s),
    },
    {
      label: `Evergreen total (${c} cycles)`,
      fmt: (s: ReturnType<typeof calcScenario>) => fmtEuro(s.evergreen_s),
    },
    {
      label: "Capped at",
      fmt: () => fmtEuro(cappedAt),
    },
  ];

  const scenarioData = SCENARIOS.map((sc) => ({
    ...sc,
    data: calcScenario(sc.p),
  }));

  const VC_ROW_STYLE = { background: ROW_BG, borderBottom: "1px solid hsl(237 22% 16%)" };
  const CELL_BASE = "px-3 py-2.5 text-right font-mono text-sm";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="pt-4 pb-1"><ErgodicityBadge /></div>

      {/* ── Sub-tab nav ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 pt-4 pb-8">
        {(
          [
            { id: "your_return" as LPTab, label: "Your Return" },
            { id: "the_fund"   as LPTab, label: "Explanation" },
          ] as const
        ).map((t, i) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className="px-3.5 py-1.5 text-xs font-medium rounded-md transition-all"
            style={
              tab === t.id
                ? {
                    background: "hsl(235 50% 20% / 0.55)",
                    border: "1px solid hsl(235 60% 48% / 0.45)",
                    color: "hsl(235 85% 80%)",
                  }
                : {
                    background: "transparent",
                    border: "1px solid hsl(237 22% 20%)",
                    color: "hsl(237 15% 55%)",
                  }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: YOUR RETURN
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "your_return" && (
        <div className="space-y-0">

          {/* Section A — Commitment input + output cards */}
          <section>
            <SectionLabel>Return Calculator</SectionLabel>
            <SectionHeading>What does your commitment return?</SectionHeading>

            {/* Drift notice — shown when Explore changes diverge from Guided choices */}
            {hasDrift && (
              <div
                className="flex items-start gap-2.5 mb-6 px-4 py-3 rounded-lg text-[12px] leading-relaxed max-w-2xl"
                style={{
                  background: "hsl(38 40% 10% / 0.6)",
                  border: "1px solid hsl(38 92% 50% / 0.35)",
                  color: "hsl(38 92% 72%)",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(38 92% 60%)" }} />
                <span>
                  Parameters have been modified from your Guided Mode choices. Figures below reflect
                  current settings.{" "}
                  <Link
                    href="/guided"
                    className="underline underline-offset-2 font-medium transition-colors hover:text-white/90"
                  >
                    Review in Guided Mode →
                  </Link>
                </span>
              </div>
            )}

            <div
              className="inline-flex flex-col gap-1.5 mb-8 p-4 rounded-xl"
              style={{ background: CARD_BG, border: CARD_BORDER }}
            >
              <label className="text-[11px] uppercase tracking-wider text-white/40">
                Your commitment
              </label>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-lg font-light">€</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputRaw}
                  onChange={handleCommitmentChange}
                  className="bg-transparent text-white text-xl font-semibold outline-none w-40"
                  style={{ caretColor: "hsl(235 90% 74%)" }}
                />
              </div>
              <p className="text-[11px] text-white/30">
                Minimum: €25,000 · Typical LP: €100,000–€500,000
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl p-4 flex flex-col gap-1"
                  style={{ background: CARD_BG, border: CARD_BORDER }}
                >
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{card.label}</div>
                  <div
                    className="text-xl sm:text-2xl font-bold font-mono leading-none mt-1"
                    style={{ color: card.color }}
                  >
                    {card.value}
                  </div>
                  <div className="text-[11px] text-white/45 mt-0.5">{card.sub}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-white/35 leading-relaxed max-w-2xl italic">
              Total Return and IRR are single-cycle figures based on current model settings
              (p = {fmtPct(params.p)}, r = {fmtNum(derived.r, 2)}×, k = {fmtNum(params.k, 1)}).
              Capped At reflects the maximum total distribution across all cycles — once reached,
              the fund has no further claim. Evergreen Total assumes {c} full cycles over{" "}
              {c * yearsPerCycle} years. To stress-test these figures, use Guided Mode or open
              the full model in Explore.
            </p>

            <div
              className="mt-5 rounded-lg px-4 py-3.5 text-[12px] leading-relaxed max-w-2xl flex items-start gap-2.5"
              style={{ background: "hsl(38 30% 8% / 0.7)", border: "1px solid hsl(38 70% 40% / 0.3)" }}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(38 92% 60%)", opacity: 0.8 }} />
              <span style={{ color: "hsl(38 60% 70%)" }}>
                <span className="font-semibold">Figures above are gross returns before fund-level tax.</span>{" "}
                If the fund's instruments are re-characterised as debt by tax authorities, distributions may be
                subject to additional corporate tax and withholding tax — reducing the effective multiple for
                investors.{" "}
                <Link href="/tax" className="underline underline-offset-2 font-medium hover:opacity-90">
                  See the Tax tab for equity vs debt-like scenario comparison →
                </Link>
              </span>
            </div>
          </section>

          <Divider />

          {/* Section B — Scenario Sensitivity Table */}
          <section>
            <SectionLabel>Scenario Sensitivity</SectionLabel>
            <SectionHeading>How your return changes with portfolio survival</SectionHeading>
            <p className="text-[13px] text-white/50 mb-6 max-w-xl leading-relaxed">
              Survival probability (p) is the share of portfolio companies that survive long
              enough to repay the fund. All other parameters held at current model settings.
            </p>

            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full min-w-[520px] text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-white/30 font-normal w-48" />
                    {scenarioData.map((sc) => (
                      <th
                        key={sc.key}
                        className="py-2.5 px-3 text-center text-xs font-semibold rounded-t-lg"
                        style={{
                          background: highlighted === sc.key ? "hsl(235 50% 20% / 0.6)" : "transparent",
                          borderTop:   highlighted === sc.key ? CARD_BORDER_HIGHLIGHT : "1px solid transparent",
                          borderLeft:  highlighted === sc.key ? CARD_BORDER_HIGHLIGHT : "1px solid transparent",
                          borderRight: highlighted === sc.key ? CARD_BORDER_HIGHLIGHT : "1px solid transparent",
                          color: highlighted === sc.key ? "hsl(235 90% 80%)" : "hsl(237 20% 55%)",
                        }}
                      >
                        {sc.label}
                        <div className="text-[10px] font-normal mt-0.5 opacity-70">{sc.sublabel}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, ri) => (
                    <tr key={ri} style={VC_ROW_STYLE}>
                      <td className="px-3 py-2.5 text-[12px] text-white/55">{row.label}</td>
                      {scenarioData.map((sc) => (
                        <td
                          key={sc.key}
                          className={CELL_BASE}
                          style={{
                            color: highlighted === sc.key ? "hsl(var(--finance))" : "hsl(237 20% 65%)",
                            background:  highlighted === sc.key ? "hsl(235 50% 16% / 0.4)" : "transparent",
                            borderLeft:  highlighted === sc.key ? CARD_BORDER_HIGHLIGHT : "1px solid transparent",
                            borderRight: highlighted === sc.key ? CARD_BORDER_HIGHLIGHT : "1px solid transparent",
                          }}
                        >
                          {row.fmt(sc.data)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td />
                    {scenarioData.map((sc) => (
                      <td
                        key={sc.key}
                        className="h-1 rounded-b-lg"
                        style={{
                          borderBottom: highlighted === sc.key ? CARD_BORDER_HIGHLIGHT : "1px solid transparent",
                          borderLeft:   highlighted === sc.key ? CARD_BORDER_HIGHLIGHT : "1px solid transparent",
                          borderRight:  highlighted === sc.key ? CARD_BORDER_HIGHLIGHT : "1px solid transparent",
                          background:   highlighted === sc.key ? "hsl(235 50% 16% / 0.4)" : "transparent",
                        }}
                      />
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              className="mt-6 rounded-xl px-5 py-4 text-[13px] leading-relaxed text-white/65 max-w-2xl"
              style={{ background: "hsl(235 50% 14% / 0.4)", border: CARD_BORDER_HIGHLIGHT }}
            >
              <span className="font-semibold text-white/80">
                The base case does not require a single exceptional exit.
              </span>{" "}
              At p = {fmtPct(0.40)}, ten out of twenty-five companies survive and repay.
              No company needs to return 100×. The model distributes the work across enough
              ordinary survivors with disciplined capital deployment.
            </div>
          </section>

          <Divider />

          {/* Navigation bridge — Your Return */}
          <section className="pb-4">
            <p className="text-[14px] text-white/55 mb-5">
              Want to understand what drives these figures?
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => switchTab("the_fund")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover-elevate"
                style={{
                  background: "hsl(235 50% 20% / 0.5)",
                  border: "1px solid hsl(235 60% 45% / 0.4)",
                  color: "hsl(235 85% 78%)",
                }}
              >
                Explanation
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </button>
              <Link
                href="/guided"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover-elevate"
                style={{
                  background: "hsl(237 28% 12%)",
                  border: "1px solid hsl(237 22% 22%)",
                  color: "hsl(237 20% 65%)",
                }}
              >
                <Map className="w-4 h-4" />
                Walk me through
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover-elevate"
                style={{
                  background: "hsl(237 28% 12%)",
                  border: "1px solid hsl(237 22% 22%)",
                  color: "hsl(237 20% 65%)",
                }}
              >
                <Compass className="w-4 h-4" />
                Full model
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </Link>
            </div>
          </section>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: THE FUND (Explanation)
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "the_fund" && (
        <div className="space-y-0">

          {/* Section A — The Proposition */}
          <section className="pb-2">
            <SectionLabel>Explanation</SectionLabel>
            <SectionHeading>
              A European venture fund that returns your capital with interest — and stops there.
            </SectionHeading>
            <div className="space-y-4 text-white/70 text-[15px] leading-relaxed max-w-2xl">
              <p>
                The Digital Sovereignty Fund invests in European digital infrastructure
                companies — open-source, sovereign, and built to last. It uses a non-extractive
                model: companies repay the fund from free cash flow, subject to a cap. Once that
                cap is reached, the fund has no further claim. Capital is then recycled into the
                next generation of companies.
              </p>
              <p>
                For a limited partner, this produces a straightforward proposition. You commit
                capital. The fund deploys it into a portfolio of companies that repay as they
                become profitable. You receive distributions from those repayments, up to a capped
                multiple of your contribution. The cap is not a ceiling on the fund's ambition —
                it is a structural commitment that aligns the fund's incentives with the long-term
                health of its portfolio companies rather than with exit maximisation.
              </p>
              <p>
                The financial return this produces is competitive with comparable early-stage
                vehicles over a ten-year horizon.{" "}
                <button
                  onClick={() => switchTab("your_return")}
                  className="font-medium underline underline-offset-2 transition-colors hover:text-white/90"
                  style={{ color: "hsl(235 80% 72%)" }}
                >
                  To see what your specific commitment returns, go to Your Return →
                </button>
              </p>
            </div>
          </section>

          <Divider />

          {/* Section B — How Distributions Work */}
          <section>
            <SectionLabel>Distribution Mechanics</SectionLabel>
            <SectionHeading>When and how you receive distributions</SectionHeading>

            <div className="space-y-6 max-w-2xl">
              {[
                {
                  n: 1,
                  heading: "Companies repay as they become profitable.",
                  body: "Portfolio companies begin making repayments to the fund once three conditions are met: they have reached operating break-even, their cash reserve is fully funded, and their free cash flow is positive. Repayment is drawn only from surplus cash — never from reserves the company needs to operate. A company cannot be forced to repay before it is financially stable.",
                },
                {
                  n: 2,
                  heading: "The fund processes repayments through a structured waterfall.",
                  body: "When repayments arrive at the fund level, they flow in a fixed order: first to service any fund-level loan obligations, then to rebuild the evergreen reserve, then to reinvestment into new companies, and finally to LP distributions. This order is contractual, not discretionary. It ensures the fund's capacity to keep investing is protected before any capital flows out to investors.",
                },
                {
                  n: 3,
                  heading: "Your distributions are pro-rata on your units, capped at 3×.",
                  body: `LP distributions are calculated proportionally to your investment units. You receive your share of whatever is available in the distribution pool after the waterfall has run. Distributions accumulate toward your cap — currently set at ${MEMBER_CAP}× your contributed capital. Once you have received ${MEMBER_CAP}× your contribution in total distributions across all cycles, your entitlement is complete.`,
                },
                {
                  n: 4,
                  heading: "After the cap, capital keeps working.",
                  body: "Once LP members have received their capped return, surplus proceeds stay in the cooperative's evergreen pot and are recycled into the next generation of companies. This is what makes the fund non-extractive in practice: the structure prevents open-ended extraction by any single party, including its investors.",
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-4">
                  <div
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{
                      background: "hsl(235 50% 20% / 0.5)",
                      border: "1px solid hsl(235 60% 50% / 0.35)",
                      color: "hsl(235 85% 72%)",
                    }}
                  >
                    {step.n}
                  </div>
                  <div>
                    <p className="text-white/85 font-semibold text-[14px] mb-1">{step.heading}</p>
                    <p className="text-white/55 text-[13px] leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Distribution arc timeline — static, no live model output */}
            <div className="mt-10 max-w-2xl">
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-6">
                Typical distribution arc — base case (p = 40%, 10-year cycle)
              </p>
              <div className="relative">
                <div
                  className="absolute top-3.5 left-8 right-8"
                  style={{ height: "1px", background: "hsl(237 22% 26%)" }}
                />
                <div className="grid grid-cols-4 gap-2 relative z-10">
                  {[
                    { year: "Year 0",   label: "Capital committed",    desc: "LP contributions deployed into portfolio" },
                    { year: "Year 3–4", label: "First distributions",  desc: "Early survivors begin repaying" },
                    { year: "Year 6–8", label: "Main period",          desc: "Core distributions build" },
                    { year: "Year 10+", label: "Cap reached",          desc: "Or cycle 2 begins (evergreen)" },
                  ].map((m, i) => (
                    <div key={i} className="flex flex-col items-center text-center">
                      <div
                        className="w-3 h-3 rounded-full mb-4 shrink-0"
                        style={{
                          background: i === 0 ? "hsl(237 22% 35%)" : "hsl(235 80% 65%)",
                          border: "2px solid hsl(237 28% 18%)",
                          boxShadow: i > 0 ? "0 0 6px hsl(235 80% 65% / 0.4)" : "none",
                        }}
                      />
                      <div className="text-[11px] font-semibold" style={{ color: "hsl(235 80% 70%)" }}>
                        {m.year}
                      </div>
                      <div className="text-[12px] font-medium text-white/75 mt-1">{m.label}</div>
                      <div className="text-[10px] text-white/35 mt-1 leading-snug">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cap callout */}
            <div
              className="mt-8 rounded-xl px-5 py-4 max-w-2xl"
              style={{ background: CARD_BG, border: CARD_BORDER }}
            >
              <p className="text-[13px] font-semibold text-white/80 mb-1.5">
                The 3× cap is a feature, not a limitation.
              </p>
              <p className="text-[13px] text-white/55 leading-relaxed">
                Conventional VC funds have no upper bound on what they can extract from portfolio
                companies. A DSF investor accepts a defined ceiling in exchange for a structural
                guarantee: the fund cannot pursue returns beyond that ceiling at the expense of
                company health. The cap aligns the fund's incentives with yours — sustainable
                company performance produces your return more reliably than exit-maximisation does.
              </p>
            </div>
          </section>

          <Divider />

          {/* Section C — Structural Comparison */}
          <section>
            <SectionLabel>Structural Comparison</SectionLabel>
            <SectionHeading>
              Three structural differences that affect your risk and return
            </SectionHeading>

            <div className="space-y-8 max-w-2xl mb-10">
              {[
                {
                  title: "How returns are generated",
                  vc: "Returns depend on a small number of large exits — typically one or two companies in a portfolio of twenty returning enough to cover all losses and produce the fund's multiple. The median company in a conventional VC portfolio returns nothing to investors. This produces a highly skewed return distribution: most LPs in most conventional funds receive less than their capital back.",
                  dsf: "Returns are distributed across ten or more companies, each repaying a capped multiple from operating cash flow. No single company needs to produce an exceptional exit. The return distribution is narrower — less upside in an exceptional scenario, significantly less downside in an average one.",
                },
                {
                  title: "What happens when companies struggle",
                  vc: "A struggling company is typically written off. The fund has equity; if the company cannot produce an exit, the investment is a loss. There is no mechanism for partial recovery.",
                  dsf: "A struggling company simply does not repay in that period. The resilience reserve mechanism ensures the company retains the cash it needs to survive — repayment resumes when conditions allow. Partial recovery is built into the design.",
                },
                {
                  title: "Incentive alignment",
                  vc: "The fund's return depends on exit valuation. This creates pressure on portfolio companies to optimise for acquirability or IPO readiness — sometimes at the expense of long-term operational health or European sovereignty.",
                  dsf: "The fund's return depends on company cash flow, not exit valuation. A company that stays independent, stays open-source, stays European, and generates steady free cash flow is the ideal outcome for the fund — not a consolation prize for failing to achieve an exit.",
                },
              ].map((diff, i) => (
                <div key={i}>
                  <h3 className="text-[14px] font-semibold text-white/80 mb-3">
                    {i + 1}. {diff.title}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div
                      className="rounded-xl p-4"
                      style={{ background: "hsl(0 20% 12% / 0.5)", border: "1px solid hsl(0 30% 22% / 0.5)" }}
                    >
                      <div
                        className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                        style={{ color: "hsl(0 60% 55%)" }}
                      >
                        Conventional VC
                      </div>
                      <p className="text-[12px] text-white/55 leading-relaxed">{diff.vc}</p>
                    </div>
                    <div
                      className="rounded-xl p-4"
                      style={{ background: "hsl(235 30% 13% / 0.5)", border: "1px solid hsl(235 40% 30% / 0.5)" }}
                    >
                      <div
                        className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                        style={{ color: "hsl(235 80% 68%)" }}
                      >
                        DSF
                      </div>
                      <p className="text-[12px] text-white/55 leading-relaxed">{diff.dsf}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary comparison table */}
            <div className="overflow-x-auto -mx-2 px-2 mb-8">
              <table className="w-full min-w-[480px] text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid hsl(237 22% 20%)" }}>
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-white/30 font-normal" />
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-center" style={{ color: "hsl(0 60% 55%)" }}>
                      Conventional VC
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-center" style={{ color: "hsl(235 80% 68%)" }}>
                      DSF
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Return driver",        "Exit valuation",    "Operating cash flow"],
                    ["Return distribution",  "Highly skewed",     "Moderate, broad"],
                    ["Partial recovery",     "No",                "Yes"],
                    ["Incentive alignment",  "Exit-optimised",    "Cash-flow-optimised"],
                    ["Cap on extraction",    "None",              "3× contribution"],
                    ["Horizon",              "7–10 yrs (fixed)",  "10 yrs / cycle"],
                    ["Evergreen option",     "Rare",              "Structural"],
                    ["Mission drift risk",   "High",              "Low (structural)"],
                  ].map(([label, vcVal, dsfVal], ri) => (
                    <tr
                      key={ri}
                      style={{
                        borderBottom: "1px solid hsl(237 22% 15%)",
                        background: ri % 2 === 0 ? ROW_BG : "transparent",
                      }}
                    >
                      <td className="px-3 py-2.5 text-[12px] text-white/50">{label}</td>
                      <td className="px-3 py-2.5 text-[12px] text-center text-white/55">{vcVal}</td>
                      <td className="px-3 py-2.5 text-[12px] text-center font-medium" style={{ color: "hsl(235 75% 72%)" }}>
                        {dsfVal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[13px] text-white/45 leading-relaxed max-w-2xl">
              This is not an argument that DSF produces higher returns than conventional VC in
              every scenario. In an exceptional market where several portfolio companies achieve
              large exits, a conventional fund will outperform. DSF is designed for a different
              risk/return profile: more predictable, more resilient, and structurally aligned
              with the long-term health of European digital infrastructure.
            </p>
          </section>

          <Divider />

          {/* Navigation bridge — The Fund */}
          <section className="pb-4">
            <p className="text-[14px] text-white/55 mb-5">
              Want to stress-test these figures yourself?
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => switchTab("your_return")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover-elevate"
                style={{
                  background: "hsl(235 50% 20% / 0.5)",
                  border: "1px solid hsl(235 60% 45% / 0.4)",
                  color: "hsl(235 85% 78%)",
                }}
              >
                Your Return
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </button>
              <Link
                href="/guided"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover-elevate"
                style={{
                  background: "hsl(237 28% 12%)",
                  border: "1px solid hsl(237 22% 22%)",
                  color: "hsl(237 20% 65%)",
                }}
              >
                <Map className="w-4 h-4" />
                Walk me through
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover-elevate"
                style={{
                  background: "hsl(237 28% 12%)",
                  border: "1px solid hsl(237 22% 22%)",
                  color: "hsl(237 20% 65%)",
                }}
              >
                <Compass className="w-4 h-4" />
                Full model
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </Link>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

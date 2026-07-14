import { useMemo, useState } from "react";
import { Eq } from "@/components/dsf/Eq";
import { SliderField } from "@/components/dsf/SliderField";
import { ValueCard } from "@/components/dsf/ValueCard";
import { fmtPct, fmtNum } from "@/lib/dsfModel";
import { ILLUSTRATIVE_EXAMPLE, simulateCompany } from "@/lib/companyModel";
import { LAUNCH_DEFAULTS } from "@/lib/cooperativeModel";
import {
  TAX_DEFAULTS,
  runScenarios,
  buildSensitivityTable,
  type TaxParams,
  type RedemptionCharacter,
  type FundTaxMode,
} from "@/lib/taxModel";
import { fmtEURcompact } from "@/lib/cooperativeModel";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

const FINANCE = "hsl(var(--finance))";
const IMPACT = "hsl(var(--impact))";
const WARN = "hsl(var(--theology))";

// Extend the coop defaults to 10 years for a more meaningful analysis
const COOP_10 = {
  ...LAUNCH_DEFAULTS,
  yearsToSim: 10,
  newDeploy: Array(10).fill(0),
  liquidationProceeds: Array(10).fill(0),
  otherProceeds: Array(10).fill(0),
};

function ScenarioCard({
  scenario,
  baseline,
  totalMemberCapital,
  highlight,
}: {
  scenario: ReturnType<typeof runScenarios>[number];
  baseline?: ReturnType<typeof runScenarios>[number];
  totalMemberCapital: number;
  highlight: "good" | "bad";
}) {
  const s = scenario.summary;
  const lostToTax =
    baseline ? baseline.summary.totalNetDist - s.totalNetDist : 0;
  const lostPct =
    baseline && baseline.summary.totalNetDist > 0
      ? lostToTax / baseline.summary.totalNetDist
      : 0;

  const border =
    highlight === "good"
      ? "border-[hsl(var(--finance)/0.5)]"
      : "border-[hsl(var(--theology)/0.4)]";
  const badge =
    highlight === "good"
      ? "bg-[hsl(var(--finance)/0.12)] text-finance"
      : "bg-[hsl(var(--theology)/0.12)] text-theology";

  return (
    <div className={`bg-card border ${border} rounded-lg p-5 space-y-4`}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold leading-tight">
            {scenario.label}
          </h3>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${badge}`}>
            {highlight === "good" ? "Preferred" : "Risk"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {scenario.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ValueCard
          label="Net to investors"
          symbol="\sum\text{Dist}^{net}"
          value={fmtEURcompact(s.totalNetDist)}
          channel={highlight === "good" ? "finance" : "neutral"}
          size="sm"
        />
        <ValueCard
          label="Net multiple"
          symbol="M^{net}"
          value={`${s.netInvestorMultiple.toFixed(2)}×`}
          channel={highlight === "good" ? "finance" : "neutral"}
          size="sm"
        />
        <ValueCard
          label="Fund tax paid"
          symbol="\text{Tax}^{fund}"
          value={fmtEURcompact(s.totalFundTax)}
          channel={s.totalFundTax > 0 ? "theology" : "impact"}
          size="sm"
        />
        <ValueCard
          label="Withholding tax"
          symbol="\text{WHT}"
          value={fmtEURcompact(s.totalWithholdingTax)}
          channel={s.totalWithholdingTax > 0 ? "theology" : "impact"}
          size="sm"
        />
        <ValueCard
          label="Tax leakage"
          symbol="\text{leak}"
          value={fmtPct(s.taxLeakagePct)}
          channel={s.taxLeakagePct > 0.15 ? "theology" : s.taxLeakagePct > 0.05 ? "neutral" : "impact"}
          size="sm"
        />
        <ValueCard
          label="Years to LP cap"
          symbol="t^{cap}"
          value={scenario.yearToInvestorCap !== null ? `yr ${scenario.yearToInvestorCap}` : "Not reached"}
          channel="neutral"
          size="sm"
          sub={`cap = 3× capital`}
        />
      </div>

      {baseline && lostToTax > 0 && (
        <div
          className="rounded-md p-3 text-xs"
          style={{ background: "hsl(var(--theology)/0.08)", border: "1px solid hsl(var(--theology)/0.2)" }}
        >
          <span className="text-theology font-semibold">
            {fmtEURcompact(lostToTax)} lost to tax
          </span>{" "}
          <span className="text-muted-foreground">
            ({fmtPct(lostPct)} of equity-structure distributions) — this is the
            economic cost of being misclassified as debt.
          </span>
        </div>
      )}
    </div>
  );
}

export default function TaxPage() {
  const [tax, setTax] = useState<TaxParams>(TAX_DEFAULTS);

  const patch = <K extends keyof TaxParams>(key: K, value: TaxParams[K]) =>
    setTax((prev) => ({ ...prev, [key]: value }));

  // Re-run company simulation with user's tax rate to compute company-level tax paid.
  const companySim = useMemo(
    () =>
      simulateCompany({
        ...ILLUSTRATIVE_EXAMPLE,
        tau: tax.companyTaxRate,
      }),
    [tax.companyTaxRate],
  );

  const totalCompanyTax = useMemo(
    () => companySim.rows.reduce((s, r) => s + r.Tax, 0),
    [companySim],
  );

  // Redemption stream from illustrative company — repeated across 10 years.
  const redemptionStream = useMemo(() => {
    const base = companySim.rows.map((r) => r.Red);
    // Extend to 10 years by cycling the pattern (or padding with last value).
    const out: number[] = [];
    for (let t = 0; t < COOP_10.yearsToSim; t++) {
      out.push(base[t % base.length] ?? 0);
    }
    return out;
  }, [companySim]);

  const totalMemberCapital = useMemo(
    () => COOP_10.members.reduce((s, m) => s + m.K, 0),
    [],
  );

  const [scenA, scenB] = useMemo(
    () => runScenarios(COOP_10, tax, redemptionStream, totalCompanyTax, totalMemberCapital),
    [tax, redemptionStream, totalCompanyTax, totalMemberCapital],
  );

  const sensitivity = useMemo(
    () => buildSensitivityTable(COOP_10, tax, redemptionStream, totalCompanyTax, totalMemberCapital),
    [tax, redemptionStream, totalCompanyTax, totalMemberCapital],
  );

  // Chart data — annual distributions for both scenarios
  const chartData = useMemo(
    () =>
      scenA.rows.map((r, i) => ({
        t: `t${r.t + 1}`,
        "Equity (net)": scenA.rows[i].DistPoolNet,
        "Debt-like (net)": scenB.rows[i].DistPoolNet,
        "Fund tax (B)": scenB.rows[i].FundTax,
        "WHT (B)": scenB.rows[i].WithholdingTax,
      })),
    [scenA, scenB],
  );

  // Cumulative distribution chart
  const cumChart = useMemo(() => {
    let cumA = 0;
    let cumB = 0;
    return scenA.rows.map((r, i) => {
      cumA += scenA.rows[i].DistPoolNet;
      cumB += scenB.rows[i].DistPoolNet;
      return { t: `t${r.t + 1}`, "Equity": cumA, "Debt-like": cumB };
    });
  }, [scenA, scenB]);

  const isDebtLike = tax.redemptionCharacter === "debt_like" || tax.fundTaxMode === "taxable";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Page header */}
      <div className="lg:col-span-12 space-y-1">
        <div className="text-xs uppercase tracking-[0.2em] text-theology">Tax Analysis</div>
        <h2 className="font-serif text-3xl font-semibold">Tax layer — equity vs debt characterisation</h2>
      </div>

      {/* Narrative strip */}
      <div
        className="lg:col-span-12 rounded-lg p-4 text-sm leading-relaxed"
        style={{ background: "hsl(var(--theology)/0.07)", border: "1px solid hsl(var(--theology)/0.18)" }}
      >
        <p className="text-white/80">
          <span className="font-semibold text-white">The structural question:</span>{" "}
          Does the fund's instrument qualify as <em>true equity</em> — attracting participation exemption (0% at fund level) —
          or will a tax authority re-characterise it as <em>debt-like</em> (triggering corporate tax at the fund level and
          potentially withholding tax on distributions)?{" "}
          This simulator shows the economic impact of each outcome. Company-level tax is unavoidable.
          Fund-level tax is avoidable if the instrument is properly structured as equity with real risk, no
          full repayment obligation, and equity language.
        </p>
      </div>

      {/* Left rail — controls */}
      <aside className="lg:col-span-3 space-y-5">

        {/* Company-level tax */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-serif text-lg font-semibold">Company tax (unavoidable)</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Corporate income tax on each portfolio company's EBIT.
              <Eq tex="\text{Tax}_i = \tau \max(0, \text{EBIT}_i)" />
            </p>
          </div>
          <SliderField
            label="Company tax rate τ"
            symbol="\tau"
            value={tax.companyTaxRate}
            min={0}
            max={0.4}
            step={0.01}
            onChange={(v) => patch("companyTaxRate", v)}
            channel="theology"
            format={fmtPct}
            hint={`Total company tax on illustrative example: ${fmtEURcompact(totalCompanyTax)}`}
          />
        </div>

        {/* Fund-level tax */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-serif text-lg font-semibold">Fund tax (avoidable)</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Key structuring risk. 0% if participation exemption applies.
              Up to full rate if re-characterised as debt.
            </p>
          </div>

          {/* Redemption character toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Instrument character
            </label>
            <div
              className="flex rounded-md overflow-hidden"
              style={{ border: "1px solid hsl(237 22% 22%)" }}
            >
              {(["equity", "debt_like"] as RedemptionCharacter[]).map((c, i) => (
                <button
                  key={c}
                  onClick={() => {
                    patch("redemptionCharacter", c);
                    patch("fundTaxMode", c === "equity" ? "equity_exempt" : "taxable");
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    tax.redemptionCharacter === c
                      ? c === "equity"
                        ? "bg-[hsl(var(--finance)/0.18)] text-finance"
                        : "bg-[hsl(var(--theology)/0.18)] text-theology"
                      : "text-white/45 hover:text-white/75"
                  }`}
                  style={i > 0 ? { borderLeft: "1px solid hsl(237 22% 22%)" } : undefined}
                >
                  {c === "equity" ? "Equity" : "Debt-like"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {tax.redemptionCharacter === "equity"
                ? "Equity: participation exemption → 0% fund tax. Requires real risk, no full repayment guarantee, equity language."
                : "Debt-like: treated as taxable income at fund level. Risk if instruments are viewed as guaranteed/fixed-return by tax authorities."}
            </p>
          </div>

          {/* Fund tax mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Fund tax mode
            </label>
            <div
              className="flex rounded-md overflow-hidden"
              style={{ border: "1px solid hsl(237 22% 22%)" }}
            >
              {(["equity_exempt", "taxable"] as FundTaxMode[]).map((m, i) => (
                <button
                  key={m}
                  onClick={() => patch("fundTaxMode", m)}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    tax.fundTaxMode === m
                      ? m === "equity_exempt"
                        ? "bg-[hsl(var(--finance)/0.18)] text-finance"
                        : "bg-[hsl(var(--theology)/0.18)] text-theology"
                      : "text-white/45 hover:text-white/75"
                  }`}
                  style={i > 0 ? { borderLeft: "1px solid hsl(237 22% 22%)" } : undefined}
                >
                  {m === "equity_exempt" ? "Exempt (0%)" : "Taxable"}
                </button>
              ))}
            </div>
          </div>

          <SliderField
            label="Fund tax rate"
            symbol="\tau^{fund}"
            value={tax.fundTaxRate}
            min={0}
            max={0.4}
            step={0.01}
            onChange={(v) => patch("fundTaxRate", v)}
            channel="theology"
            format={fmtPct}
            hint={
              tax.fundTaxMode === "equity_exempt" || tax.redemptionCharacter === "equity"
                ? "Not applied — equity structure active"
                : `Applied to net income before distributions`
            }
          />
        </div>

        {/* Withholding tax */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="font-serif text-lg font-semibold">Withholding tax</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Risk if the fund's distributions to investors are treated as interest payments rather than equity returns.
              <Eq tex="\text{Dist}^{net} = (1 - w)\,\text{DistPool}" />
            </p>
          </div>
          <SliderField
            label="WHT rate w"
            symbol="w"
            value={tax.withholdingTaxRate}
            min={0}
            max={0.3}
            step={0.01}
            onChange={(v) => patch("withholdingTaxRate", v)}
            channel="theology"
            format={fmtPct}
            hint="0% default. Rises to 15–25%+ if instruments are debt-characterised in cross-border structures."
          />
        </div>

      </aside>

      {/* Main content */}
      <div className="lg:col-span-9 space-y-6">

        {/* Scenario comparison cards */}
        <div>
          <h3 className="font-serif text-xl font-semibold mb-3">Scenario comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScenarioCard
              scenario={scenA}
              totalMemberCapital={totalMemberCapital}
              highlight="good"
            />
            <ScenarioCard
              scenario={scenB}
              baseline={scenA}
              totalMemberCapital={totalMemberCapital}
              highlight="bad"
            />
          </div>
        </div>

        {/* Company tax summary */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-3">Company-level tax (illustrative example)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <ValueCard label="Total company tax" symbol="\sum\text{Tax}_i" value={fmtEURcompact(totalCompanyTax)} channel="theology" size="sm" />
            <ValueCard label="Total EBITDA" symbol="\sum\text{EBITDA}" value={fmtEURcompact(companySim.rows.reduce((s, r) => s + r.EBITDA, 0))} channel="finance" size="sm" />
            <ValueCard label="Total FCF (after tax)" symbol="\sum\text{FCF}" value={fmtEURcompact(companySim.rows.reduce((s, r) => s + r.FCF, 0))} channel="finance" size="sm" />
            <ValueCard label="Total redeemed" symbol="\sum\text{Red}" value={fmtEURcompact(companySim.totalRedeemed)} channel="finance" size="sm" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Company-level tax (τ = {fmtPct(tax.companyTaxRate)}) is unavoidable and already embedded in the DSF model's
            FCF chain. It reduces distributable cash flow before the resilience reserve and redemption calculation.
            The fund cannot avoid this layer — but it can optimise the fund-level and withholding layers through
            proper structuring.
          </p>
        </div>

        {/* Annual distributions chart */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">Annual distributions — equity vs debt-like</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Net distributions to investors per year, after all tax layers. Shaded bars show tax drag
            in the debt-like scenario.
          </p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmtEURcompact(v)} />
                <RTooltip
                  contentStyle={{ background: "hsl(237 35% 8%)", border: "1px solid hsl(237 22% 20%)", borderRadius: "6px", fontSize: 12 }}
                  formatter={(v: number) => fmtEURcompact(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Equity (net)" fill={FINANCE} opacity={0.85} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Debt-like (net)" fill={IMPACT} opacity={0.7} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Fund tax (B)" fill={WARN} opacity={0.5} radius={[2, 2, 0, 0]} />
                <Bar dataKey="WHT (B)" fill={WARN} opacity={0.3} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative distribution chart */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">Cumulative net distributions</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Illustrates how quickly investor capital is returned under each characterisation.
            The gap between curves is the cumulative tax drag.
          </p>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={cumChart}>
                <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="2 4" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmtEURcompact(v)} />
                <RTooltip
                  contentStyle={{ background: "hsl(237 35% 8%)", border: "1px solid hsl(237 22% 20%)", borderRadius: "6px", fontSize: 12 }}
                  formatter={(v: number) => fmtEURcompact(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine
                  y={totalMemberCapital * (COOP_10.members[0]?.rCap ?? 3)}
                  stroke="hsl(var(--rule))"
                  strokeDasharray="4 2"
                  label={{ value: "3× cap", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Line dataKey="Equity" stroke={FINANCE} strokeWidth={2} dot={false} />
                <Line dataKey="Debt-like" stroke={WARN} strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sensitivity table */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-serif text-lg font-semibold mb-1">
            Fund tax rate sensitivity
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            How the net investor multiple and total tax paid change across the full range of fund tax rates.
            WHT is held at the current slider value ({fmtPct(tax.withholdingTaxRate)}).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(237 22% 18%)" }}>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Fund tax rate</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Fund tax paid</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Net to investors</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Net multiple</th>
                  <th className="text-right py-2 pl-3 text-muted-foreground font-medium">Tax leakage</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.map((row) => {
                  const isZero = row.fundTaxRate === 0;
                  const isCurrent =
                    !isZero &&
                    Math.abs(row.fundTaxRate - (isDebtLike ? tax.fundTaxRate : 0)) < 0.001;
                  return (
                    <tr
                      key={row.fundTaxRate}
                      style={{
                        borderBottom: "1px solid hsl(237 22% 12%)",
                        background: isZero
                          ? "hsl(var(--finance)/0.06)"
                          : isCurrent
                          ? "hsl(var(--theology)/0.07)"
                          : undefined,
                      }}
                    >
                      <td className="py-1.5 pr-4 num font-medium" style={{ color: isZero ? FINANCE : isCurrent ? WARN : undefined }}>
                        {isZero ? "0% (exempt)" : fmtPct(row.fundTaxRate)}
                        {isZero && <span className="ml-1.5 text-[9px] text-finance opacity-70 uppercase tracking-wider">equity</span>}
                      </td>
                      <td className="text-right py-1.5 px-3 num text-muted-foreground">{fmtEURcompact(row.totalFundTax)}</td>
                      <td className="text-right py-1.5 px-3 num">{fmtEURcompact(row.totalNetDist)}</td>
                      <td className="text-right py-1.5 px-3 num font-semibold" style={{ color: row.netInvestorMultiple >= 1 ? FINANCE : WARN }}>
                        {row.netInvestorMultiple.toFixed(2)}×
                      </td>
                      <td className="text-right py-1.5 pl-3 num" style={{ color: row.taxLeakagePct > 0.15 ? WARN : undefined }}>
                        {fmtPct(row.taxLeakagePct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Structuring guide */}
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
          <h3 className="font-serif text-lg font-semibold">Structuring to preserve exemption</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The three conditions that make a participation exemption defensible — and what that means
            for how the DSF instrument should be documented and explained to tax authorities.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                title: "1. True equity structure",
                body: "The instrument must sit in the equity column of the balance sheet. No fixed redemption date. No guaranteed rate of return. No debt covenants.",
                status: "good",
              },
              {
                title: "2. Real embedded risk",
                body: "The fund bears genuine loss risk. The repayment cap (r) is a ceiling, not a floor. Companies that fail repay nothing. This genuine downside is the structural argument.",
                status: "good",
              },
              {
                title: "3. Equity language throughout",
                body: "Term sheets, fund documents, and LP agreements must consistently use equity framing. Avoid language that implies guaranteed repayment, fixed interest, or debt-like covenants.",
                status: "good",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-md p-3 space-y-1.5"
                style={{ background: "hsl(var(--finance)/0.06)", border: "1px solid hsl(var(--finance)/0.15)" }}
              >
                <div className="text-xs font-semibold text-finance">{item.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

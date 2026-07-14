/**
 * storyVariants.ts
 * Range-based dynamic seam text for all 6 Explore Story tabs.
 * Each tab has 2–3 seams. A null return means "don't render" (NULL range).
 */

// ─── Shared range helper ─────────────────────────────────────────────────────

type Range = [number, number];
type RangeMap<K extends string> = Record<K, Range>;

function getVariant<K extends string>(value: number, ranges: RangeMap<K>): K | null {
  for (const [label, [min, max]] of Object.entries(ranges) as [K, Range][]) {
    if (value >= min && value < max) return label;
  }
  return null;
}

// ─── TAB 1 — FINANCIAL (Elena Sørensen) ─────────────────────────────────────

const P_RANGES_FIN = {
  very_conservative: [0,    0.20] as Range,
  conservative:      [0.20, 0.35] as Range,
  realistic:         [0.35, 0.50] as Range,   // DEFAULT → null
  ambitious:         [0.50, 0.65] as Range,
  highly_ambitious:  [0.65, 1.01] as Range,
};

const K_RANGES_FIN = {
  very_low:       [0,   2.0] as Range,
  conservative:   [2.0, 4.0] as Range,
  null_range:     [4.0, 6.0] as Range,         // NULL
  high_conviction:[6.0, 8.0] as Range,
  very_high:      [8.0, 99]  as Range,
};

const FINANCIAL_P_TEXT: Record<string, string> = {
  very_conservative:
    "She stops at the survival figure on the screen. 'Fewer than one in five companies surviving. I want to be direct with this committee — at this level, the model is not really doing what it was designed to do. We are compensating for very low survival through concentration and the repayment cap, and both of those levers carry costs of their own.' She looks up. 'The question I would want answered before we proceed is whether this assumption reflects a genuinely difficult market, or whether it reflects a problem with our portfolio design that we have not yet named.'",
  conservative:
    "She pauses at the survival figure. 'We are in conservative territory here. Roughly one in four companies making it through — that is an honest acknowledgement of how hard this is, and there is integrity in that.' A beat. 'But the model starts to strain at this level. To keep M above its floor we are leaning on concentration and the repayment cap more heavily than I would like. I would want this committee to ask whether the conservatism in this assumption is earned by evidence, or whether it is a number we have not yet pushed ourselves to improve.'",
  realistic:
    "She glances at the survival figure. 'This is where the evidence from comparable portfolios puts us if we are disciplined about selection and serious about operational support. It is not a comfortable number — a meaningful share of companies will not make it. But it is an honest one, and the model is designed to work with honest numbers.' She turns back to the committee. 'The multiple this produces is not spectacular. It is solid, patient, and repeatable — which is precisely the point.'",
  ambitious:
    "She looks at the survival figure. 'We have set ourselves a high bar here. More than half the portfolio surviving and repaying — that is a conviction about our selection process and our operational support, not just an optimistic forecast.' She lets the number sit. 'The model rewards it: M, I, and T all rise together, which is exactly why it is tempting. But I want this committee to ask the harder question. What have we actually committed to doing for these companies that justifies this assumption? Because if the answer is nothing different, this number will not hold.'",
  highly_ambitious:
    "She looks at the survival figure for a long moment. 'I want to flag this assumption to the committee before we go further. At this level we are claiming that two thirds or more of our portfolio companies will survive long enough to repay us in full. That is a stronger claim than any comparable fund I am aware of has consistently delivered.' A pause. 'The model produces excellent numbers here — M, I, and T all look healthy. But a model rewards the assumptions you give it. The question before us is not whether the arithmetic is correct. It is whether the assumption is.'",
};

const FINANCIAL_K_TEXT: Record<string, string> = {
  very_low:
    "'Concentration this low means follow-on capital is spread almost evenly across survivors. At this level we are not really amplifying survivors — we are treating them all as equally uncertain, which raises the question of what our selection process is actually for.'",
  conservative:
    "'We are taking a conservative position on concentration — following on into survivors, but not committing heavily to any of them. It is a defensible posture, though it leaves multiple on the table that a more decisive allocation would capture without any additional moral cost.'",
  high_conviction:
    "'Concentration at this level is a statement of conviction about our ability to identify which survivors will go furthest. The amplification is meaningful — and so is the assumption underlying it.'",
  very_high:
    "'This is a high-conviction position. A very large share of deployed capital is flowing to a small number of survivors. The committee should be clear that we are making a strong claim about our judgement here, and that the downside of getting those calls wrong is concentrated in proportion.'",
};

const FINANCIAL_C_TEXT: Record<string, string> = {
  single:
    "'A single cycle is the closest thing to a conventional vehicle this model can produce. The evergreen logic exists precisely to escape that frame. The committee should be clear about why we are choosing not to use it.'",
  standard:
    "'Two cycles — a defined commitment with a clear horizon. Reasonable, though the compounding effect of a third cycle is substantial. Worth understanding what we are giving up before we settle here.'",
};

export function getFinancialSeams(
  p: number,
  k: number,
  c: number,
): (string | null)[] {
  // Seam 1 — p
  const pKey = getVariant(p, P_RANGES_FIN);
  const s1 = pKey && pKey !== "realistic" ? FINANCIAL_P_TEXT[pKey] ?? null : null;

  // Seam 2 — k (null for 4 ≤ k < 6)
  const kKey = getVariant(k, K_RANGES_FIN);
  const s2 = kKey && kKey !== "null_range" ? FINANCIAL_K_TEXT[kKey] ?? null : null;

  // Seam 3 — c (null for c === 3)
  const cKey = c === 1 ? "single" : c === 2 ? "standard" : null;
  const s3 = cKey ? FINANCIAL_C_TEXT[cKey] ?? null : null;

  return [s1, s2, s3];
}

// ─── TAB 2 — IMPACT (Dr. Yaw Asante) ────────────────────────────────────────

const U_RANGES_IMP = {
  very_low:  [0,    0.15] as Range,
  low:       [0.15, 0.30] as Range,   // DEFAULT → null
  moderate:  [0.30, 0.55] as Range,
  high:      [0.55, 0.80] as Range,
  critical:  [0.80, 99]   as Range,
};

const A_RANGES_IMP = {
  low:      [0,   1.5] as Range,
  standard: [1.5, 2.5] as Range,    // DEFAULT → null
  high:     [2.5, 99]  as Range,
};

const IMPACT_U_TEXT: Record<string, string> = {
  very_low:
    "He looks at the usury figure. 'The pressure on companies is low — genuinely low. That means the conditions that produce infrastructure are relatively protected: lifetimes are not being shortened, openness is not being eroded, sovereignty is intact.' He pauses. 'This is the environment the model is designed to operate in. The question worth asking is whether it reflects the actual terms we are offering companies, or whether there are pressures not yet captured in this number.'",
  low:
    "He notes the usury figure. 'We are in acceptable territory here. The pressure on company lifetimes, openness, and sovereignty is real but contained.' He looks around the table. 'What I want the committee to remain alert to is direction of travel. U at this level is manageable — but it does not take large movements in the repayment cap composition to push us into mixed territory. We should be watching this number, not just reporting it.'",
  moderate:
    "He pauses at the usury figure. 'We are in mixed territory. That means the financial pressure on surviving companies is beginning to show up in the impact metrics — company lifetimes are shorter than they would be at lower U, openness is under some erosion, sovereignty is less certain.' A beat. 'The committee should understand that this is not a theoretical concern. It is already in the numbers. The question is whether we address the composition of r now, or wait until the erosion is more visible.'",
  high:
    "He stops at the usury figure. 'I want to be direct. At this level, the usury pressure is doing measurable damage to our impact score — not because companies are failing, but because the conditions under which they operate are being degraded by financial pressure. Lifetimes are shortening. Openness is eroding. Sovereignty is at risk.' He looks at the committee. 'We may be generating financial returns that quietly undermine the infrastructure we are trying to build. That is not a trade-off I can recommend accepting passively.'",
  critical:
    "He sets down the report. 'The usury pressure has reached a level where the impact account is being actively undermined by the financial structure of the fund. This is the failure mode the model was designed to make visible — and it is visible now.' He looks around the table slowly. 'I am not in a position to defend this impact score in good conscience without a concrete plan to reduce U. The financial returns may look healthy. But infrastructure built under this level of extractive pressure is not infrastructure. It is a liability with good branding.'",
};

const IMPACT_GUARANTEES_TEXT: Record<string, string> = {
  partial:
    "'I also want to flag the structural guarantees. We have two of the three in place — but the missing one is not a minor detail. Each guarantee is a load-bearing element of the openness and sovereignty scores. A gap here is not a paperwork issue. It is a structural vulnerability in the impact account.'",
  fragile:
    "'The structural guarantees concern me significantly. With only one of the three in place, the o and d factors in our impact equation are essentially resting on founders' goodwill rather than contractual commitment. That may hold. It may not. The model cannot tell us — and that uncertainty belongs on this table.'",
  unprotected:
    "'I need to raise the structural guarantees as an urgent matter. None of the three are in place. That means openness and sovereignty in our impact score are entirely discretionary on the part of our portfolio companies. We are reporting an impact number that assumes conditions we have not contractually secured. I do not think we can continue to do that.'",
};

const IMPACT_A_TEXT: Record<string, string> = {
  low:
    "'Adoption is below the standard threshold. A company that survives, stays open, and remains sovereign — but is never actually used by real institutions — is not infrastructure. It is potential. The a factor distinguishes between the two, and right now it is telling us something we need to act on.'",
  high:
    "'Adoption is strong — genuinely above standard. That is the factor most difficult to manufacture, and the one that most clearly distinguishes theoretical from actual mission success. The committee should note this and ask what is producing it, so we can replicate it.'",
};

export function getImpactSeams(
  U: number,
  stewardOwnership: boolean,
  openSource: boolean,
  euRetention: boolean,
  a: number,
): (string | null)[] {
  // Seam 1 — U (null for low/DEFAULT)
  const uKey = getVariant(U, U_RANGES_IMP);
  const s1 = uKey && uKey !== "low" ? IMPACT_U_TEXT[uKey] ?? null : null;

  // Seam 2 — structural guarantees (null if all three active)
  const active = [stewardOwnership, openSource, euRetention].filter(Boolean).length;
  let guaranteeKey: string | null = null;
  if (active === 2) guaranteeKey = "partial";
  else if (active === 1) guaranteeKey = "fragile";
  else if (active === 0) guaranteeKey = "unprotected";
  const s2 = guaranteeKey ? IMPACT_GUARANTEES_TEXT[guaranteeKey] ?? null : null;

  // Seam 3 — a (null for standard)
  const aKey = getVariant(a, A_RANGES_IMP);
  const s3 = aKey && aKey !== "standard" ? IMPACT_A_TEXT[aKey] ?? null : null;

  return [s1, s2, s3];
}

// ─── TAB 3 — THEOLOGY (Fr. Tomás Brennan) ───────────────────────────────────

const LAMBDA_RANGES = {
  none:        [0,     0.001] as Range,
  minimal:     [0.001, 0.08]  as Range,
  cautious:    [0.08,  0.15]  as Range,  // DEFAULT → null
  moderate:    [0.15,  0.35]  as Range,
  significant: [0.35,  99]    as Range,
};

const U_RANGES_THEO = {
  licit:       [0,    0.15] as Range,
  mostly_licit:[0.15, 0.30] as Range,  // DEFAULT → null
  mixed:       [0.30, 0.55] as Range,
  extractive:  [0.55, 0.80] as Range,
  usurious:    [0.80, 99]   as Range,
};

const ETA_RANGES_THEO = {
  low:         [0,    0.30] as Range,
  moderate:    [0.30, 0.55] as Range,  // DEFAULT → null
  strong:      [0.55, 0.75] as Range,
  very_strong: [0.75, 99]   as Range,
};

const THEOLOGY_LAMBDA_TEXT: Record<string, string> = {
  none:
    "He notes the λ figure. 'The fund has chosen not to claim what it could have earned elsewhere. That is a meaningful moral commitment — it says capital is here to serve the mission, not to extract a market rate from companies that could not otherwise access funding. I find this defensible. The question I would ask is whether it is sustainable — whether the fund's investors understand and accept what they are foregoing, and whether that acceptance is durable.'",
  minimal:
    "He looks at the λ figure. 'A very modest opportunity-cost claim. Almost symbolic — enough to acknowledge that investors have alternatives, not enough to drive the return toward market extraction.' He pauses. 'I have no objection to this in principle. What I would want to understand is whether this figure was arrived at through deliberate reasoning, or whether it simply landed here by default. The distinction matters, because a deliberate commitment is more defensible than an accidental one.'",
  cautious:
    "He considers the λ figure. 'A small concession to investor expectations — modest, but present. It raises U slightly, and the committee should be clear-eyed about that.' He pauses. 'My concern is not with this number in isolation. It is with the logic it rests on. If we are charging a λ premium because investors could earn more elsewhere, then we are allowing market rate expectations to enter the moral composition of the return. That is a gate, once opened, that is difficult to close.'",
  moderate:
    "He pauses at the λ figure. 'This is where I begin to ask harder questions. A meaningful opportunity-cost claim — one that carries real weight in the usury index.' He looks at the committee steadily. 'I am not saying this is indefensible. But I would want to hear the argument for it. What exactly is the opportunity the fund is foregoing, and why does that opportunity cost fall on the companies we are trying to support rather than on the investors who chose this vehicle over others? The answer may be satisfactory. I simply want to hear it before we proceed.'",
  significant:
    "He is quiet for a moment before speaking. 'I want to be honest with this committee. At this level, the opportunity-cost component is a substantial part of what we are charging companies. We are telling them: you must pay us more because capital could have gone elsewhere. That is a claim that has a name in the tradition I work in.' He does not raise his voice. 'I am not saying the fund has crossed a line. I am saying that at this level, the burden of justification is significant, and I would need to hear it made explicitly before I could advise the committee to proceed.'",
};

const THEOLOGY_U_TEXT: Record<string, string> = {
  licit:
    "'The overall usury index is low — the return is predominantly composed of licit elements. That is a position the fund can defend clearly and publicly. The committee should note it and maintain it deliberately.'",
  mostly_licit:
    "'The usury index places us in licit territory, though not without some pressure. The reinvestment rate is doing useful work here — partially offsetting what the ρ and λ components introduce. The committee should understand that T above one does not mean the concern has gone away. It means it is being managed.'",
  mixed:
    "'The usury index has moved into mixed territory. I want the committee to understand what that means precisely: it does not mean the fund is acting wrongly, but it does mean the moral composition of the return can no longer be described as predominantly licit. That is a different position to be in — and a harder one to defend to stakeholders for whom this matters.'",
  extractive:
    "'The usury index is in extractive territory. I would find it difficult to characterise the financial return as morally well-grounded at this level without significant changes to the composition of r or a substantial increase in reinvestment. The committee should treat this as a matter requiring direct attention, not monitoring.'",
  usurious:
    "'I will be direct. At this usury index, I cannot advise the committee to proceed with the current structure. The return has been composed in a way that the tradition I represent would characterise as usurious — not as an insult, but as a technical description of what is happening. I am available to work through what would need to change. But I cannot in good conscience endorse the current position.'",
};

const THEOLOGY_ETA_TEXT: Record<string, string> = {
  low:
    "'The reinvestment rate is low — which means the moral offset against usury pressure is also low. The T formula does the arithmetic honestly: reinvestment helps, but at this level it is not doing enough to compensate for the extractive pressure in the return composition.'",
  strong:
    "'The reinvestment rate is strong — a meaningful share of returns is flowing back into productive activity rather than out to investors. That is doing genuine moral work in the T formula, and it reflects well on the fund's character as a steward rather than an extractor.'",
  very_strong:
    "'A very high reinvestment rate. Most of what comes in is going back out into new companies — which is the clearest possible expression of what a non-extractive vehicle looks like in practice. The committee should understand that this is not just financially meaningful. It is morally significant.'",
};

export function getTheologySeams(
  lambda: number,
  U: number,
  eta: number,
): (string | null)[] {
  // Seam 1 — λ (null for cautious/DEFAULT)
  const lKey = getVariant(lambda, LAMBDA_RANGES);
  const s1 = lKey && lKey !== "cautious" ? THEOLOGY_LAMBDA_TEXT[lKey] ?? null : null;

  // Seam 2 — U (null for mostly_licit/DEFAULT)
  const uKey = getVariant(U, U_RANGES_THEO);
  const s2 = uKey && uKey !== "mostly_licit" ? THEOLOGY_U_TEXT[uKey] ?? null : null;

  // Seam 3 — η (null for moderate/DEFAULT)
  const eKey = getVariant(eta, ETA_RANGES_THEO);
  const s3 = eKey && eKey !== "moderate" ? THEOLOGY_ETA_TEXT[eKey] ?? null : null;

  return [s1, s2, s3];
}

// ─── TAB 4 — PORTFOLIO (Miriam Osei) ────────────────────────────────────────

const PORTFOLIO_EBITDA_TEXT: Record<string, string> = {
  negative:
    "She looks at the operating figure. The fund manager does not press. 'The model is clear here,' he says. 'Repayment from a company that is still consuming cash is extraction — it doesn't matter how the legal terms are written. The gate is closed until EBITDA turns positive and stays there.' She nods slowly. 'So we focus on the operating model.' 'That's the only conversation that matters right now,' he says.",
  barely_positive:
    "She looks at the EBITDA figure. 'Just turned,' she says. The fund manager considers it. 'It's real — but thin. A single difficult quarter could reverse it.' He pauses. 'The model permits repayment to begin at this level, technically. But I would want to see this hold for two or three consecutive periods before we treat it as a stable foundation. Starting repayment from a margin this narrow leaves the company exposed. We can wait.' She looks relieved.",
  clearly_positive:
    "She looks at the operating figure. 'That's real,' she says. The fund manager nods. 'It is. And it's been consistent — which matters more than the absolute number.' He pulls up the reserve status. 'The first question is whether the resilience reserve is where it needs to be. The EBITDA gate is open. Now we look at the buffer.'",
};

const PORTFOLIO_RESERVE_TEXT: Record<string, string> = {
  unfunded:
    "He looks at the reserve figure. 'This needs to be addressed before anything else. The reserve exists to protect the company from operating shocks during the repayment period — if it is not funded, repayment draws down the cash buffer the company needs to survive a difficult month.' He is direct but not unkind. 'We are not in a position to receive redemption payments until this is closer to target. Free cash flow goes here first.'",
  partial:
    "He notes the reserve figure. 'Getting there — but not yet. At this level the company has some buffer, but not enough to absorb a meaningful revenue shock while simultaneously making redemption payments.' He looks at the timeline. 'How long to full funding at the current FCF rate?' The conversation shifts to that question — because it is the right one.",
  nearly_full:
    "He looks at the reserve. 'Very close. One or two strong periods and the floor is fully covered.' He is measured. 'I would want to see it reach the target before we begin redemption rather than running both in parallel at this stage — the margin is too thin to do both comfortably. But we are close. This is not a delay; it is a few weeks of patience.'",
  full:
    "He notes the reserve. 'Fully funded. That is exactly where it needs to be.' He pulls up the FCF figure. 'Whatever free cash flow exceeds the reserve floor from this point is available for redemption — subject to the cap. The company is protected; the fund can receive. The model is doing what it was designed to do.'",
};

const PORTFOLIO_REDEMPTION_TEXT: Record<string, string> = {
  early:
    "'You are in the early stages of repayment,' he says. 'The cap is well above where you are. There is no pressure here — the pace should be whatever the FCF supports, nothing faster.' She looks at the cap number. 'And when we reach it?' 'Then it is over,' he says simply. 'No residual claim. No ongoing relationship on those terms. You will have repaid what was agreed, and everything after that is yours.'",
  mid:
    "'You are well into the repayment arc,' he says. 'The cap is visible from here — not imminent, but no longer abstract.' He looks at the trajectory. 'The pace has been consistent. If that holds, the model gives us a clear horizon.' She looks at the remaining headroom. For the first time the end of this arrangement feels like a real thing rather than a distant clause in an agreement.",
  approaching:
    "'You are close to the cap,' he says. 'Within the final quarter of the repayment arc.' He is straightforward about what this means. 'The fund's claim on future cash flows ends when you reach Ω. After that, what you build is entirely yours. I want to make sure you understand that concretely — not as a legal technicality but as an operational reality.' She does understand it now. The number on the screen has been an abstraction for three years. It is not an abstraction anymore.",
  complete:
    "'The cap has been reached,' he says. 'That is the end of the repayment obligation.' He closes the simulator. 'The fund has no further claim. Whatever free cash flow the company generates from this point belongs entirely to the mission and the team.' She stares at the screen for a moment. Then: 'So that is what non-extractive means.' He nods. 'That is what it means.'",
};

/** ebitda: number, reserveRatio: L_current/L_target, redemptionRatio: CumRed/Omega */
export function getPortfolioSeams(
  ebitda: number,
  reserveRatio: number,
  redemptionRatio: number,
): (string | null)[] {
  const ebitdaKey =
    ebitda < 0 ? "negative" : ebitda < 50_000 ? "barely_positive" : "clearly_positive";
  const s1 = ebitdaKey !== "clearly_positive" ? PORTFOLIO_EBITDA_TEXT[ebitdaKey] : null;

  const reserveKey =
    reserveRatio < 0.4 ? "unfunded"
    : reserveRatio < 0.8 ? "partial"
    : reserveRatio < 1.0 ? "nearly_full"
    : "full";
  const s2 = reserveKey !== "full" ? PORTFOLIO_RESERVE_TEXT[reserveKey] : null;

  // Seam 3 only renders when EBITDA clearly positive AND reserve full
  const redemptionKey =
    redemptionRatio < 0.25 ? "early"
    : redemptionRatio < 0.75 ? "mid"
    : redemptionRatio < 1.0 ? "approaching"
    : "complete";
  const s3 =
    ebitdaKey === "clearly_positive" && reserveKey === "full"
      ? PORTFOLIO_REDEMPTION_TEXT[redemptionKey]
      : null;

  return [s1, s2, s3];
}

// ─── TAB 5 — OPERATIONS (Beatriz Santos) ────────────────────────────────────

const ETA_RANGES_OPS = {
  extractive: [0,    0.30] as Range,
  low:        [0.30, 0.50] as Range,
  standard:   [0.50, 0.70] as Range,  // DEFAULT → null
  strong:     [0.70, 0.85] as Range,
  evergreen:  [0.85, 99]   as Range,
};

const RESERVE_RANGES_OPS = {
  depleted:     [0,    0.50] as Range,
  building:     [0.50, 0.90] as Range,
  on_target:    [0.90, 1.10] as Range,  // DEFAULT → null
  above_target: [1.10, 99]   as Range,
};

const R_MEMBER_RANGES = {
  below_standard: [0,   2.0] as Range,
  standard:       [2.0, 3.5] as Range,  // DEFAULT → null
  elevated:       [3.5, 5.0] as Range,
  high:           [5.0, 99]  as Range,
};

const OPS_ETA_TEXT: Record<string, string> = {
  extractive:
    "She pauses at the reinvestment figure. 'I want to flag this to the council before we go further. At this reinvestment rate, the cooperative is distributing the substantial majority of what comes in. That is the financial profile of an extraction vehicle — not a steward.' She is measured. 'The cooperative may have good reasons for being here temporarily. But if this is a sustained position rather than a transition, I would want the council to name it clearly: we are prioritising current distributions over future mission capacity. That is a choice we can make. It is not a choice we should make without acknowledging what we are giving up.'",
  low:
    "She notes the reinvestment figure. 'Below the standard threshold. More than half of available proceeds are flowing out to investors rather than staying in the cooperative.' A pause. 'The evergreen logic depends on this ratio staying above a certain level — below it, the fund's capacity to support future generations of companies declines with each cycle. I would want the council to have a clear position on whether this is where we intend to operate, and why.'",
  standard:
    "She looks at the reinvestment figure. 'In the standard range — roughly half of available proceeds staying in the cooperative, half flowing to investors. That is a workable balance: investors receive meaningful distributions while the fund retains enough to keep investing.' She is straightforward. 'The council should understand that this is a policy choice, not an engineering outcome. We could move this number in either direction. The question is what we are optimising for.'",
  strong:
    "She notes the reinvestment figure. 'Strong — a significant majority of proceeds staying in the cooperative. Investors are receiving distributions, but the fund is clearly prioritising its capacity to keep investing over current payouts.' She looks at the council. 'That is a mission-oriented position. It is also one that requires investor members to understand and accept what they are foregoing each cycle. Are we confident they do?'",
  evergreen:
    "She stops at the reinvestment figure. 'At this level the cooperative is functioning as a near-pure evergreen vehicle — almost everything that comes in is going back out into new companies or held in the reserve.' A pause. 'That is the most complete expression of the non-extractive model — and it is worth naming clearly, because it implies that investor members are receiving very little in current distributions. The council should be explicit with its members about what this commitment means in practice. An evergreen fund is a long-term relationship, not a yield vehicle.'",
};

const OPS_RESERVE_TEXT: Record<string, string> = {
  depleted:
    "'The evergreen reserve is significantly below target. That is the detail I want the council to focus on. A depleted reserve means the cooperative cannot fund the next generation of companies without either new external capital or compromising the current waterfall order. That is a fragile position — and one that becomes visible to investors and portfolio companies alike if it persists.'",
  building:
    "'The reserve is building — below target but moving in the right direction. The trajectory matters more than the current level here. If the fund continues at this reinvestment rate, when does the reserve reach its target? That timeline should be on the table, because until it is fully funded, the waterfall is operating with less structural security than the design intends.'",
  above_target:
    "'The reserve is above target — which raises a productive question for the council. Surplus capital in the reserve is not being deployed. At what point does a reserve excess become a reason to increase the distribution pool or accelerate reinvestment into new companies? The model does not answer that automatically. It requires a policy decision.'",
};

const OPS_R_MEMBER_TEXT: Record<string, string> = {
  below_standard:
    "'The member cap is below the standard level — investors will receive less than the typical 3× on their contribution. The council should be confident that investors understood and accepted this at the point of commitment, and that the rationale for the lower cap is documented clearly.'",
  elevated:
    "'The member cap has been set above the standard level. That is a structural decision with consequences for the non-extractive character of the cooperative — a higher cap means more capital can flow out to investors before the evergreen mechanism takes over. The council should be explicit about why this level was chosen and what it signals to stakeholders for whom the cap is part of the value proposition.'",
  high:
    "'The member cap is significantly above standard. At this level the distinction between the cooperative and a conventional equity vehicle becomes harder to articulate. The council should consider carefully whether this cap is consistent with the cooperative's stated character — not as a legal question, but as a question of what we are actually building.'",
};

/** etaEffective: reinvestment ratio (0–1), reserveRatio: E/E_target, rMember: member cap multiple */
export function getOperationsSeams(
  etaEffective: number,
  reserveRatio: number,
  rMember: number,
): (string | null)[] {
  // Seam 1 — η (null for standard/DEFAULT)
  const eKey = getVariant(etaEffective, ETA_RANGES_OPS);
  const s1 = eKey && eKey !== "standard" ? OPS_ETA_TEXT[eKey] ?? null : null;

  // Seam 2 — reserve ratio (null for on_target)
  const rKey = getVariant(reserveRatio, RESERVE_RANGES_OPS);
  const s2 = rKey && rKey !== "on_target" ? OPS_RESERVE_TEXT[rKey] ?? null : null;

  // Seam 3 — member cap (null for standard)
  const mKey = getVariant(rMember, R_MEMBER_RANGES);
  const s3 = mKey && mKey !== "standard" ? OPS_R_MEMBER_TEXT[mKey] ?? null : null;

  return [s1, s2, s3];
}

// ─── TAB 6 — UNIFIED (Prof. Lena Kowalski) ──────────────────────────────────

const P_RANGES_UNI = {
  low:       [0,    0.25] as Range,
  moderate:  [0.25, 0.45] as Range,  // DEFAULT → null
  high:      [0.45, 0.65] as Range,
  very_high: [0.65, 99]   as Range,
};

const U_RANGES_UNI = {
  licit:             [0,    0.15] as Range,
  low_pressure:      [0.15, 0.30] as Range,  // DEFAULT → null
  moderate_pressure: [0.30, 0.55] as Range,
  high_pressure:     [0.55, 0.80] as Range,
  critical_pressure: [0.80, 99]   as Range,
};

const UNIFIED_P_TEXT: Record<string, string> = {
  low:
    "She marks the survival figure on the board. 'We are in a region where the coupling works against the fund — low survival means the financial account is under pressure, which creates incentives to raise r or increase concentration to compensate. Both of those levers push U upward, which damages T and erodes I through the lifetime and openness channels.' She looks at the class. 'The model is showing us a system under stress. The right intervention is not to adjust the other levers — it is to understand why survival is this low and whether it can be improved. Everything else is symptom management.'",
  moderate:
    "She notes the survival figure. 'In the working range — where the model was designed to operate. The three accounts are in tension but not in crisis: M is above its floor, T is manageable, I is meaningful.' She pauses. 'What I want the class to notice is that this equilibrium is not stable by default. It requires active maintenance — keeping U low, keeping structural guarantees in place, keeping reinvestment above threshold. The model is not a machine that runs itself. It is a set of relationships that require ongoing stewardship.'",
  high:
    "She looks at the survival figure. 'Above the evidence-based default — which means either we have a portfolio performing exceptionally well, or we have made an optimistic assumption.' She is measured. 'If this is performance, it is the cleanest possible outcome: M, I, and T all benefit simultaneously, with no coupling costs. If it is assumption, the class should notice that good numbers in a model do not validate the premise that produced them. The question to ask is: what would have to be true for this survival rate to be real?'",
  very_high:
    "She stops at the survival figure. 'I want to use this as a teaching moment about model discipline. At this level the three accounts all look excellent — M is strong, I is high, T is healthy. The guardrails are comfortably passed. Everything looks optimal.' She pauses. 'But the model is only as reliable as its inputs. A survival assumption this high has no precedent in comparable portfolios. The outputs are internally consistent — but they are consistent with a premise that has not been validated. That is a different thing from being right.'",
};

const UNIFIED_U_TEXT: Record<string, string> = {
  licit:
    "'The usury pressure is very low — which means the coupling between the financial and impact accounts is weak. U erodes L, o, and d; at this level the erosion is minimal. The fund is operating in a region where financial returns and infrastructure creation are genuinely complementary rather than in tension. That is the design ideal — worth noting when we see it.'",
  low_pressure:
    "'The usury pressure is in the licit range — present but contained. The coupling between the financial and impact accounts is real but manageable. T is above its floor, which means reinvestment is doing enough work to offset the extractive component in r. The system is in equilibrium. It is not a permanent equilibrium — it requires the reinvestment rate to be maintained and the composition of r to be watched. But it is a genuine one.'",
  moderate_pressure:
    "'The usury pressure has moved into mixed territory. The class should notice what this does to the impact account — not through direct financial failure, but through the slow erosion of L, o, and d. Companies live shorter lives, open-source commitments become harder to maintain, sovereignty becomes more negotiable. The I score reflects this. The important lesson is that this erosion is invisible in the short term. A fund can report healthy M figures while impact is quietly declining. The model makes both visible simultaneously — which is the point.'",
  high_pressure:
    "'The coupling is now working against all three accounts simultaneously. High U damages T directly. It also erodes I through the impact channels. And the conditions that produce high U — elevated λ and ρ — typically reflect investor pressure on the financial account, which means M may be healthy precisely because the other two accounts are being sacrificed.' She looks at the class. 'This is the extractive equilibrium the model was designed to make visible. The question is whether the people running the fund can see it in real time — or whether they are looking only at M.'",
  critical_pressure:
    "'We are in the region the model was built to prevent. The usury index at this level means the fund's financial structure is actively undermining its own mission. T is at serious risk. I is being eroded through multiple channels simultaneously. M may still be passing its floor — but the cost of that financial performance is being paid by the companies the fund is supposed to be supporting, and by the infrastructure the fund is supposed to be building.' She sets down her marker. 'This is what extraction looks like when it is dressed in mission language. The model does not dress it differently. It shows it clearly.'",
};

const UNIFIED_GUARDRAIL_TEXT: Record<string, string> = {
  financial_breach:
    "'The financial guardrail has been breached — M is below its floor. The temptation here is to reach for the repayment cap or increase concentration to compensate. The class should notice what the model shows: both of those interventions carry costs in U and therefore in T and I. The mission-consistent response is to ask about survival first, because improving p is the only lever that restores M without imposing costs elsewhere.'",
  integrity_breach:
    "'The theological guardrail has been breached — T is below its floor, even though M is healthy. This is the configuration the model was specifically designed to surface: financial viability achieved at the cost of moral integrity. The fund is making money in a way the model cannot endorse.' She pauses. 'The intervention is not to lower the T floor. It is to examine the composition of r and reduce λ — or to increase the reinvestment rate until the offset is sufficient. Both paths require giving something up on the financial side. That is the trade-off the model is making explicit.'",
  design_failure:
    "'Both guardrails have been breached. The fund is neither financially viable nor morally well-grounded at current settings.' She is direct. 'This is not a position from which minor adjustments will recover. The design requires fundamental reconsideration — starting with survival, because it is the only lever that improves all three accounts simultaneously. Everything else requires trade-offs this configuration cannot absorb.'",
};

export function getUnifiedSeams(
  p: number,
  U: number,
  M: number,
  T: number,
  Mmin: number,
  Tmin: number,
): (string | null)[] {
  // Seam 1 — p (null for moderate/DEFAULT)
  const pKey = getVariant(p, P_RANGES_UNI);
  const s1 = pKey && pKey !== "moderate" ? UNIFIED_P_TEXT[pKey] ?? null : null;

  // Seam 2 — U (null for low_pressure/DEFAULT)
  const uKey = getVariant(U, U_RANGES_UNI);
  const s2 = uKey && uKey !== "low_pressure" ? UNIFIED_U_TEXT[uKey] ?? null : null;

  // Seam 3 — guardrail status (null for viable/both pass)
  const mPass = M >= Mmin;
  const tPass = T >= Tmin;
  let guardrailKey: string | null = null;
  if (!mPass && tPass) guardrailKey = "financial_breach";
  else if (mPass && !tPass) guardrailKey = "integrity_breach";
  else if (!mPass && !tPass) guardrailKey = "design_failure";
  const s3 = guardrailKey ? UNIFIED_GUARDRAIL_TEXT[guardrailKey] ?? null : null;

  return [s1, s2, s3];
}

// ─── Static closing text per tab (exported for use in pages) ────────────────

export const STORY_CLOSING: Record<string, string> = {
  financial:
    "'We have spent two years asking: what is the design space where all three accounts pass their floor? This simulator is that question made visible. The three guardrails on screen are not aspirational. They are enforced by the model. Any design that fails one of them shows up red — and we do not deploy capital into red.'",
  impact:
    "'Impact is the hardest account to defend because it is invisible in the short term. A company can stay open-source on paper while being nudged toward closure by financial pressure. The model makes that erosion visible — but only if we are willing to look at what it is showing us.'",
  theology:
    "'The usury score does not condemn the fund. It maps the moral risk. What I ask of this committee is not that we achieve a perfect score — I am not sure such a thing is possible in practice — but that we know what score we are choosing, and that we can say clearly why.'",
  portfolio:
    "Miriam had spent three years waiting for the conversation where the investor asked for more than the company could give. It never came. The model had enforced the sequence — not because the fund manager was unusually principled, but because the design made extraction impossible to initiate before the conditions were right. She had not needed to rely on goodwill. The structure had done the work.",
  operations:
    "'The waterfall order is not a governance structure,' Beatriz says, closing the report. 'It is a promise about sequence. If we honour the sequence, capital stays in circulation and the mission propagates. If we reorder it — even once, even with good reasons — we have changed what the cooperative is. The model makes both options visible. The choice of which one to take remains ours.'",
  unified:
    "'The model has one honest message,' Lena says, stepping back from the board. 'You cannot optimise one account in isolation. Every lever you pull has consequences in the other two. The design problem — the real one — is to find the region where all three pass their floors simultaneously. That region exists. It is not large. And staying inside it requires active attention to all three accounts at once, not sequential management of each in turn.'",
};

// ─── Closing prompt text per tab ─────────────────────────────────────────────

export const CLOSING_PROMPT_TEXT: Record<string, string> = {
  financial:
    "The committee is looking at the survival assumption. The Scenario tab shows what each choice commits you to — not just financially, but operationally.",
  impact:
    "The Scenario tab maps the structural decisions that protect — or expose — each impact factor. The choices there are not financial. They are architectural.",
  theology:
    "The Scenario tab breaks down the repayment cap into its four components. Each one carries a different moral weight. The choice is not just financial.",
  portfolio:
    "The Scenario tab walks through the repayment conditions as a series of decisions. Each gate in the sequence is a choice about what the fund actually values.",
  operations:
    "The Scenario tab asks whether the cooperative is still a steward. Each option reflects a different answer to that question — not in theory, but in the mechanics of where money flows.",
  unified:
    "The Scenario tab maps the design space directly — each choice moves the fund's position relative to the guardrail region. The question is whether you can find the configuration that passes all three simultaneously.",
};

// ─── Scenario banner text per tab ────────────────────────────────────────────

export const SCENARIO_BANNER_TEXT: Record<string, string> = {
  financial:
    "Elena has framed survival as a design commitment, not a forecast. Each option below implies a different operational promise to your portfolio companies.",
  impact:
    "Yaw has framed impact as a multiplication of conditions, each of which must hold. The options below determine which of those conditions are structurally guaranteed — and which are left to chance.",
  theology:
    "Fr. Tomás has identified the composition of r — not its magnitude — as the moral question. Each option below reflects a different answer to: what is the investor actually being paid for?",
  portfolio:
    "Miriam's situation illustrates what the repayment model looks like from the company's side. The options below represent different positions a fund manager might take at each gate in the sequence.",
  operations:
    "Beatriz has described the waterfall order as the structural expression of the cooperative's mission. The options below test whether that order holds under pressure — and what changes if it does not.",
  unified:
    "Lena has described the model as a coupled system — every lever has consequences in all three accounts. The options below test whether you can navigate that coupling to a design that holds.",
};

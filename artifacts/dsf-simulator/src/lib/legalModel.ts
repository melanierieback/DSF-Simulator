/**
 * legalModel.ts
 * Pure computation: NEC liability regime vs conventional, anchored in Dutch civil law.
 *
 * Five legal concepts: Damages, Losses, Indemnities, Material Breach, Force Majeure.
 * Each has a conventional calculation and an NEC-aligned alternative.
 * Dutch law sources provided for every concept.
 */

// ── Legal concept taxonomy ────────────────────────────────────────────────────

export type LegalConcept =
  | "damages"
  | "losses"
  | "indemnities"
  | "material_breach"
  | "force_majeure";

export const ALL_CONCEPTS: LegalConcept[] = [
  "damages",
  "losses",
  "indemnities",
  "material_breach",
  "force_majeure",
];

export interface ConceptMeta {
  label: string;
  dutchLabel: string;
  subtitle: string;
  dutchLawAnchor: string;   // e.g. "Art. 6:95-110 BW"
  dutchPrinciple: string;   // the underlying Dutch law principle
  thomistPrinciple: string; // the Thomistic equivalent
  conventionalBias: string; // what conventional law defaults to
  necPath: string;          // what NEC chooses within the same law
}

export const CONCEPT_META: Record<LegalConcept, ConceptMeta> = {
  damages: {
    label: "Damages",
    dutchLabel: "Schadevergoeding",
    subtitle: "What compensation is owed when a party suffers harm?",
    dutchLawAnchor: "Art. 6:95–110 BW",
    dutchPrinciple: "Vermogensschade (patrimonial loss): only actual, demonstrable loss is recoverable. Dutch law does not award punitive damages.",
    thomistPrinciple: "Restitutio in integrum — restoration to the prior state, not punishment or enrichment.",
    conventionalBias: "Commercial practice extends damages through uncapped consequential loss, lost profit projections, and escalating legal costs — all of which exceed the actual harm.",
    necPath: "Cap damages at demonstrable direct loss only. Exclude consequential and speculative claims. Apply Art. 6:94 BW (matiging) to reduce excessive penalties to proportionate restoration.",
  },
  losses: {
    label: "Losses",
    dutchLabel: "Verlies & Schadebeperking",
    subtitle: "How are losses calculated and who has the duty to limit them?",
    dutchLawAnchor: "Art. 6:101 BW",
    dutchPrinciple: "Eigen schuld en schadebeperking: the claimant has an active duty to mitigate losses. Contributory fault reduces the claim. The defendant is not liable for losses the claimant could have prevented.",
    thomistPrinciple: "Prudentia — the injured party cannot passively accumulate harm. Recovery is proportionate to what a reasonable person would have suffered.",
    conventionalBias: "Claimants present maximised loss figures with no mitigation effort. Lost future revenue (Gederfde winst) is projected forward indefinitely using optimistic assumptions.",
    necPath: "Require demonstrated mitigation steps before any loss claim. Cap future lost revenue at a reasonable horizon (e.g., 12 months). Use objective market benchmarks, not internal projections. Losses are assessed on a restoration, not enrichment, basis.",
  },
  indemnities: {
    label: "Indemnities",
    dutchLabel: "Vrijwaring",
    subtitle: "How far does one party protect another from third-party claims?",
    dutchLawAnchor: "Art. 6:254 BW & Art. 7:407 BW",
    dutchPrinciple: "Vrijwaring requires a specific, defined obligation. Dutch law does not automatically imply unlimited indemnification — it must be expressly agreed and proportionate to the assumed risk.",
    thomistPrinciple: "Commutative justice — the indemnifying party assumed a calculable risk in exchange for a calculable reward. The indemnity cannot exceed the proportionate risk premium received.",
    conventionalBias: "Broad unlimited indemnity clauses ('hold harmless for any and all claims') transfer unlimited liability without proportionate compensation. In venture/fund contexts this becomes effectively extractive — the company indemnifies the fund for risks the fund priced into its return.",
    necPath: "Indemnities are capped at the direct value of the transaction that caused the risk. Third-party IP indemnities capped at contract value. Fund indemnities limited to demonstrated fraud or wilful misconduct — not mere underperformance. No double recovery.",
  },
  material_breach: {
    label: "Material Breach",
    dutchLabel: "Wezenlijke Tekortkoming",
    subtitle: "When does a failure justify termination — and what follows?",
    dutchLawAnchor: "Art. 6:265 BW & Art. 6:80 BW",
    dutchPrinciple: "Ontbinding (rescission) requires a 'tekortkoming' that justifies the severity of the remedy. Art. 6:265 BW allows parties to contractually agree what constitutes a material breach. Dutch courts apply proportionality — minor failures do not justify full termination.",
    thomistPrinciple: "A breach is only material if it strikes at the substance of the agreement. Remedies must be proportionate to the harm, not maximised. Nakoming (specific performance) is preferred over termination where restoration is possible.",
    conventionalBias: "Conventional clauses define material breach broadly and trigger automatic termination with full acceleration of all future obligations. This converts a limited failure into a maximum extraction event — the exact opposite of proportionality.",
    necPath: "Define material breach narrowly: fraud, wilful misconduct, or fundamental incompatibility with NEC principles. All other failures trigger a cure period (30–90 days), then mediation, then arbitration before any remedy. Default remedy is specific performance (nakoming), not termination. Termination is the remedy of last resort.",
  },
  force_majeure: {
    label: "Force Majeure",
    dutchLabel: "Overmacht",
    subtitle: "What happens when performance becomes impossible through no one's fault?",
    dutchLawAnchor: "Art. 6:74–6:75 BW & Art. 6:258 BW",
    dutchPrinciple: "Overmacht (Art. 6:75 BW) excuses non-performance when the debtor is not at fault. Crucially, Art. 6:258 BW (onvoorziene omstandigheden — unforeseen circumstances) allows courts to modify contract terms where strict enforcement would be unacceptable in light of reasonableness and fairness.",
    thomistPrinciple: "No obligation can be justly enforced when fulfilment has become impossible through circumstances beyond the obligor's control. Force majeure suspends, not destroys, the relationship.",
    conventionalBias: "Conventional contracts define FM narrowly (acts of God only), allow the non-FM party to terminate immediately and claim full remaining value, and treat FM as a breach-equivalent. The result: an unexpected event becomes an extraction event for whichever party isn't affected.",
    necPath: "Broad FM definition including economic disruption and regulatory change. FM triggers proportionate suspension, not termination. Use Art. 6:258 BW proactively: build in mandatory renegotiation clauses. The parties share the cost of FM proportionately. No party may profit from another's FM.",
  },
};

// ── Input scenario ────────────────────────────────────────────────────────────

export interface LiabilityScenario {
  contractValue: number;          // € total contract/investment value
  breachFraction: number;         // 0–1: fraction of contract at issue
  consequentialMultiple: number;  // conventional consequential loss multiplier (e.g. 2.0 = 2× direct loss)
  necDamagesCap: number;          // NEC cap as fraction of contract value (e.g. 0.5 = 50%)
  fmDurationMonths: number;       // months of FM event
  fmTotalMonths: number;          // total contract duration months
  indemnityCapFraction: number;   // NEC indemnity cap as fraction of contract value
  curePeroidDays: number;         // NEC material breach cure period (days)
  mitigationEffort: number;       // 0–1: fraction of loss mitigated by claimant
}

export const DEFAULT_SCENARIO: LiabilityScenario = {
  contractValue: 500_000,
  breachFraction: 0.30,
  consequentialMultiple: 2.5,
  necDamagesCap: 0.50,
  fmDurationMonths: 3,
  fmTotalMonths: 24,
  indemnityCapFraction: 1.0,
  curePeroidDays: 60,
  mitigationEffort: 0.40,
};

// ── Result types ──────────────────────────────────────────────────────────────

export interface DualResult {
  label: string;
  conventional: number;
  nec: number;
  saving: number; // conventional - nec (positive = NEC is less extractive)
  extractionRatio: number; // conventional / actual harm
  necRatio: number;        // nec / actual harm
}

export interface DamagesResult extends DualResult {
  directLoss: number;
  conventionalBreakdown: { direct: number; consequential: number; legal: number };
}

export interface LossesResult extends DualResult {
  grossClaim: number;
  mitigated: number;
  futureRevenueConventional: number;
  futureRevenueNEC: number;
}

export interface IndemnitiesResult extends DualResult {
  thirdPartyClaim: number;
  uncappedExposure: number;
  necCap: number;
}

export interface MaterialBreachResult {
  eventValue: number; // value of the breach event
  conventional: {
    remedy: string;
    acceleratedClaims: number;
    terminationDamages: number;
    total: number;
  };
  nec: {
    remedy: string;
    cureAllowed: boolean;
    curePeriodDays: number;
    maxRemedyValue: number;
    total: number;
  };
  saving: number;
}

export interface ForceMajeureResult {
  fmPeriodValue: number;         // value of the FM-affected period
  remainingValue: number;        // value of unaffected remainder
  conventional: {
    terminationValue: number;    // value extracted by termination
    acceleratedClaims: number;
    total: number;
  };
  nec: {
    suspensionCost: number;      // proportionate shared cost during FM
    adjustedObligations: number; // reduced performance cost
    total: number;
  };
  saving: number;
  fmShareConventional: number; // fraction of risk borne by FM party (conventional)
  fmShareNEC: number;          // fraction of risk shared (NEC)
}

// ── Computation functions ─────────────────────────────────────────────────────

export function computeDamages(s: LiabilityScenario): DamagesResult {
  const directLoss = s.contractValue * s.breachFraction;
  const conventionalConsequential = directLoss * (s.consequentialMultiple - 1);
  const conventionalLegal = directLoss * 0.18; // typical litigation cost loading
  const conventionalTotal = directLoss + conventionalConsequential + conventionalLegal;

  const necDamages = Math.min(directLoss, s.contractValue * s.necDamagesCap);
  const necTotal = necDamages; // no consequential, no legal cost loading

  return {
    label: "Damages",
    directLoss,
    conventional: conventionalTotal,
    nec: necTotal,
    saving: conventionalTotal - necTotal,
    extractionRatio: directLoss > 0 ? conventionalTotal / directLoss : 0,
    necRatio: directLoss > 0 ? necTotal / directLoss : 0,
    conventionalBreakdown: {
      direct: directLoss,
      consequential: conventionalConsequential,
      legal: conventionalLegal,
    },
  };
}

export function computeLosses(s: LiabilityScenario): LossesResult {
  const directLoss = s.contractValue * s.breachFraction;
  const mitigated = directLoss * s.mitigationEffort;
  const grossClaim = directLoss;

  // Conventional: full gross claim + 18 months future revenue
  const annualRevenue = s.contractValue * 0.6; // assume 60% of contract = annual revenue exposure
  const futureRevenueConventional = annualRevenue * 1.5; // 18 months projected
  const conventionalTotal = grossClaim + futureRevenueConventional;

  // NEC: mitigated loss only + 6 months objective market rate future loss
  const futureRevenueNEC = annualRevenue * 0.5; // 6 months capped
  const necTotal = (grossClaim - mitigated) + futureRevenueNEC;

  return {
    label: "Losses",
    grossClaim,
    mitigated,
    futureRevenueConventional,
    futureRevenueNEC,
    conventional: conventionalTotal,
    nec: necTotal,
    saving: conventionalTotal - necTotal,
    extractionRatio: directLoss > 0 ? conventionalTotal / directLoss : 0,
    necRatio: directLoss > 0 ? necTotal / directLoss : 0,
  };
}

export function computeIndemnities(s: LiabilityScenario): IndemnitiesResult {
  const thirdPartyClaim = s.contractValue * s.breachFraction * 1.5; // third party adds 50%
  const uncappedExposure = thirdPartyClaim * 3; // legal escalation in uncapped conventional
  const necCap = s.contractValue * s.indemnityCapFraction;

  const conventionalTotal = Math.min(uncappedExposure, thirdPartyClaim * 2); // litigation risk
  const necTotal = Math.min(thirdPartyClaim, necCap);

  return {
    label: "Indemnities",
    thirdPartyClaim,
    uncappedExposure,
    necCap,
    conventional: conventionalTotal,
    nec: necTotal,
    saving: conventionalTotal - necTotal,
    extractionRatio: thirdPartyClaim > 0 ? conventionalTotal / thirdPartyClaim : 0,
    necRatio: thirdPartyClaim > 0 ? necTotal / thirdPartyClaim : 0,
  };
}

export function computeMaterialBreach(s: LiabilityScenario): MaterialBreachResult {
  const eventValue = s.contractValue * s.breachFraction;
  // Conventional: immediate termination + acceleration of future obligations
  const acceleratedClaims = s.contractValue * 0.70; // 70% of contract value accelerated
  const terminationDamages = eventValue * s.consequentialMultiple;
  const conventionalTotal = terminationDamages + acceleratedClaims;

  // NEC: cure period → specific performance → max remedy = proportionate loss only
  const necMaxRemedy = eventValue * s.necDamagesCap;
  const necTotal = necMaxRemedy;

  return {
    eventValue,
    conventional: {
      remedy: "Immediate termination + full acceleration",
      acceleratedClaims,
      terminationDamages,
      total: conventionalTotal,
    },
    nec: {
      remedy: "Cure period → specific performance → proportionate remedy",
      cureAllowed: true,
      curePeriodDays: s.curePeroidDays,
      maxRemedyValue: necMaxRemedy,
      total: necTotal,
    },
    saving: conventionalTotal - necTotal,
  };
}

export function computeForceM(s: LiabilityScenario): ForceMajeureResult {
  const monthlyValue = s.contractValue / s.fmTotalMonths;
  const fmPeriodValue = monthlyValue * s.fmDurationMonths;
  const remainingValue = monthlyValue * (s.fmTotalMonths - s.fmDurationMonths);

  // Conventional: FM party loses, other party terminates + claims remaining value
  const terminationValue = remainingValue * 0.65; // 65% of remaining extracted
  const acceleratedClaims = fmPeriodValue * 0.50;
  const conventionalTotal = terminationValue + acceleratedClaims;

  // NEC: proportionate cost-sharing during FM only; contract continues
  const suspensionCost = fmPeriodValue * 0.50; // shared 50/50
  const adjustedObligations = fmPeriodValue * 0.50; // each party absorbs half
  const necTotal = suspensionCost;

  return {
    fmPeriodValue,
    remainingValue,
    conventional: { terminationValue, acceleratedClaims, total: conventionalTotal },
    nec: { suspensionCost, adjustedObligations, total: necTotal },
    saving: conventionalTotal - necTotal,
    fmShareConventional: 1.0, // FM party bears 100% (loses everything)
    fmShareNEC: 0.5,          // shared proportionately
  };
}

// ── Aggregate extraction index ────────────────────────────────────────────────

export interface ExtractionIndex {
  concept: LegalConcept;
  label: string;
  conventional: number;
  nec: number;
  extractionAverted: number;
  extractionAvertedPct: number;
}

export function computeAllExtractions(s: LiabilityScenario): ExtractionIndex[] {
  const d = computeDamages(s);
  const l = computeLosses(s);
  const i = computeIndemnities(s);
  const mb = computeMaterialBreach(s);
  const fm = computeForceM(s);

  return [
    { concept: "damages", label: "Damages", conventional: d.conventional, nec: d.nec, extractionAverted: d.saving, extractionAvertedPct: d.conventional > 0 ? d.saving / d.conventional : 0 },
    { concept: "losses", label: "Losses", conventional: l.conventional, nec: l.nec, extractionAverted: l.saving, extractionAvertedPct: l.conventional > 0 ? l.saving / l.conventional : 0 },
    { concept: "indemnities", label: "Indemnities", conventional: i.conventional, nec: i.nec, extractionAverted: i.saving, extractionAvertedPct: i.conventional > 0 ? i.saving / i.conventional : 0 },
    { concept: "material_breach", label: "Material Breach", conventional: mb.conventional.total, nec: mb.nec.total, extractionAverted: mb.saving, extractionAvertedPct: mb.conventional.total > 0 ? mb.saving / mb.conventional.total : 0 },
    { concept: "force_majeure", label: "Force Majeure", conventional: fm.conventional.total, nec: fm.nec.total, extractionAverted: fm.saving, extractionAvertedPct: fm.conventional.total > 0 ? fm.saving / fm.conventional.total : 0 },
  ];
}

// ── NEC clause library ────────────────────────────────────────────────────────

export interface NecClause {
  concept: LegalConcept;
  label: string;
  conventional: string;
  nec: string;
  dutchAnchor: string;
}

export const NEC_CLAUSES: NecClause[] = [
  {
    concept: "damages",
    label: "Damages — limitation of liability",
    conventional: "The [Party] shall be liable for all direct, indirect, consequential, special, incidental, or punitive damages arising from any breach of this Agreement, howsoever arising.",
    nec: "Liability is limited to demonstrated direct patrimonial loss (vermogensschade) actually suffered, capped at [X]% of the total Contract Value. No party shall recover consequential, speculative, or punitive losses. Penalties are subject to judicial matiging (Art. 6:94 BW) to the extent they exceed restorative proportionality.",
    dutchAnchor: "Art. 6:95–6:110 BW (schadevergoeding) · Art. 6:94 BW (matiging boetebeding) · Art. 6:248 BW (redelijkheid en billijkheid)",
  },
  {
    concept: "losses",
    label: "Losses — mitigation and future revenue",
    conventional: "The claimant shall be entitled to recover all losses, including loss of anticipated profits and future revenues, without obligation to mitigate.",
    nec: "The claimant shall take all reasonable steps to mitigate loss (schadebeperking, Art. 6:101 BW). Future revenue claims are capped at six (6) months of the claimant's contracted revenue, assessed at objective market rates, not internal projections. Failure to mitigate reduces the claim proportionately.",
    dutchAnchor: "Art. 6:101 BW (eigen schuld / schadebeperking) · Art. 6:97 BW (begroting schade naar billijkheid)",
  },
  {
    concept: "indemnities",
    label: "Indemnities — scope and cap",
    conventional: "Each party shall indemnify, defend, and hold harmless the other from and against any and all claims, losses, damages, liabilities, and expenses of any kind arising from any act or omission.",
    nec: "Indemnification obligations are limited to: (i) claims arising directly from the indemnifying party's wilful misconduct or gross negligence; (ii) verified third-party IP infringement claims directly caused by the indemnifying party's materials; and (iii) in all cases, capped at [100]% of the total fees paid or payable under this Agreement. No indemnity shall cover speculative or unverified third-party claims.",
    dutchAnchor: "Art. 6:254 BW (vrijwaring) · Art. 6:248 lid 2 BW (beperkende werking R&B) · Art. 7:407 BW (aansprakelijkheid opdrachtnemer)",
  },
  {
    concept: "material_breach",
    label: "Material breach — cure period and remedy sequence",
    conventional: "Upon the occurrence of any material breach, the non-breaching party may immediately terminate this Agreement and seek all available remedies including damages, specific performance, and injunctive relief.",
    nec: "A material breach (wezenlijke tekortkoming) is limited to: (i) fraud or wilful misconduct; (ii) violation of NEC structural principles as set out in Schedule [X]; or (iii) persistent failure to perform after a [60]-day written cure notice. Remedy sequence: (1) written notice and cure period; (2) mediation (Art. 6:265 lid 2 BW); (3) specific performance (nakoming, Art. 3:296 BW); (4) proportionate partial termination only as a last resort. Full termination with acceleration is not available for the first material breach.",
    dutchAnchor: "Art. 6:265 BW (ontbinding wegens tekortkoming) · Art. 3:296 BW (nakoming) · Art. 6:248 BW (R&B) · NVM-mediation protocol",
  },
  {
    concept: "force_majeure",
    label: "Force majeure — proportionate suspension and renegotiation",
    conventional: "If either party is prevented from performing its obligations by an event of Force Majeure, the non-affected party may terminate this Agreement after [30] days.",
    nec: "Force Majeure (overmacht, Art. 6:75 BW) suspends — but does not terminate — the affected obligations. During the FM period: (i) financial obligations are proportionately reduced in accordance with reduced performance; (ii) the parties shall negotiate in good faith a temporary adjustment (Art. 6:258 BW — onvoorziene omstandigheden); (iii) termination is available only if FM exceeds [6] months and the parties cannot agree on adjusted terms. Neither party may profit from the other party's FM event. The cost of suspension is shared proportionately.",
    dutchAnchor: "Art. 6:74–6:75 BW (overmacht) · Art. 6:258 BW (onvoorziene omstandigheden) · Art. 6:2 BW (redelijkheid en billijkheid)",
  },
];

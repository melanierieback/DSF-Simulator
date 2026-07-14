import type { DsfParams } from "./dsfModel";
import { fmtNum, fmtPct } from "./dsfModel";

export type DriftStatus = "not_started" | "complete" | "drifted";

export interface ModuleLiveDisplay {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel?: string;
  secondaryValue?: string;
}

type MinimalDerived = { U: number; M: number; I: number; T: number };

export function getModuleLiveDisplay(
  moduleIndex: number,
  params: DsfParams,
  derived: MinimalDerived,
): ModuleLiveDisplay {
  switch (moduleIndex) {
    case 0:
      return {
        primaryLabel: "Survival p",
        primaryValue: fmtPct(params.p),
        secondaryLabel: "Survivors",
        secondaryValue: `${Math.round(params.N * params.p)} / ${params.N}`,
      };
    case 1:
      return {
        primaryLabel: "λ",
        primaryValue: fmtNum(params.lambda, 2),
        secondaryLabel: "Usury U",
        secondaryValue: fmtNum(derived.U, 2),
      };
    case 2:
      return {
        primaryLabel: "Impact I",
        primaryValue: fmtNum(derived.I, 0),
        secondaryLabel: "Adoption a",
        secondaryValue: fmtNum(params.a, 1),
      };
    case 3:
      return {
        primaryLabel: "Timing gate η",
        primaryValue: fmtPct(params.eta),
        secondaryLabel: "Integrity T",
        secondaryValue: fmtNum(derived.T, 2),
      };
    case 4:
      return {
        primaryLabel: "Reinvestment η",
        primaryValue: fmtPct(params.eta),
        secondaryLabel: "Multiple M",
        secondaryValue: `${derived.M.toFixed(2)}×`,
      };
    case 5:
      return {
        primaryLabel: "M · I · T",
        primaryValue: `${derived.M.toFixed(1)}× · ${fmtNum(derived.I, 0)} · ${fmtNum(derived.T, 2)}`,
      };
    default:
      return { primaryLabel: "", primaryValue: "" };
  }
}

export function getDriftStatus(
  moduleIndex: number,
  choiceId: string,
  params: DsfParams,
): DriftStatus {
  switch (moduleIndex) {
    case 0: return module0Drift(choiceId, params);
    case 1: return module1Drift(choiceId, params);
    case 2: return module2Drift(choiceId, params);
    case 3: return module3Drift(choiceId, params);
    case 4: return module4Drift(choiceId, params);
    case 5: return module5Drift(choiceId, params);
    default: return "complete";
  }
}

function module0Drift(choiceId: string, params: DsfParams): DriftStatus {
  switch (choiceId) {
    case "deepen_support":    return params.p < 0.42 ? "drifted" : "complete";
    case "tighten_selection": return (params.p >= 0.55 || params.N >= 28) ? "drifted" : "complete";
    case "raise_cap":         return params.rDirect <= 2.95 ? "drifted" : "complete";
    default: return "complete";
  }
}

function module1Drift(choiceId: string, params: DsfParams): DriftStatus {
  const λ = params.lambda;
  switch (choiceId) {
    case "mission_aligned": return λ >= 0.05 ? "drifted" : "complete";
    case "compromise":      return (λ < 0.05 || λ >= 0.20) ? "drifted" : "complete";
    case "market_rate":     return λ < 0.20 ? "drifted" : "complete";
    default: return "complete";
  }
}

function module2Drift(choiceId: string, params: DsfParams): DriftStatus {
  switch (choiceId) {
    case "full_guarantees": return (!params.stewardOwnership || !params.openSource || !params.euRetention) ? "drifted" : "complete";
    case "raise_adoption":  return params.a < 2.7 ? "drifted" : "complete";
    case "accept_erosion":  return (params.stewardOwnership && params.openSource && params.euRetention) ? "drifted" : "complete";
    default: return "complete";
  }
}

function module3Drift(choiceId: string, params: DsfParams): DriftStatus {
  switch (choiceId) {
    case "enforce_gates": return params.eta < 0.55 ? "drifted" : "complete";
    case "partial_early": return (params.eta < 0.20 || params.eta > 0.65) ? "drifted" : "complete";
    case "full_early":    return params.eta > 0.25 ? "drifted" : "complete";
    default: return "complete";
  }
}

function module4Drift(choiceId: string, params: DsfParams): DriftStatus {
  switch (choiceId) {
    case "reserve_first":       return params.eta < 0.55 ? "drifted" : "complete";
    case "partial_reinvest":    return (params.eta < 0.18 || params.eta > 0.55) ? "drifted" : "complete";
    case "distributions_first": return params.eta > 0.20 ? "drifted" : "complete";
    default: return "complete";
  }
}

function module5Drift(choiceId: string, params: DsfParams): DriftStatus {
  switch (choiceId) {
    case "raise_p": return params.p < 0.42 ? "drifted" : "complete";
    case "raise_r": return params.lambda < 0.18 ? "drifted" : "complete";
    case "raise_k": return params.k < 6.0 ? "drifted" : "complete";
    default: return "complete";
  }
}

export function getDriftNote(
  moduleIndex: number,
  choiceId: string,
  params: DsfParams,
): string {
  switch (moduleIndex) {
    case 0: {
      if (choiceId === "deepen_support" && params.p < 0.42)
        return `p = ${fmtPct(params.p)} — survival has dropped back below the mission-consistent threshold.`;
      if (choiceId === "raise_cap" && params.rDirect <= 2.95)
        return `r = ${fmtNum(params.rDirect, 2)}× — the repayment cap has been lowered back toward the default.`;
      if (choiceId === "tighten_selection")
        return "Portfolio size or survival has moved outside the selection-tightened range.";
      break;
    }
    case 1: {
      const λ = params.lambda;
      if (choiceId === "mission_aligned" && λ >= 0.05)
        return `λ = ${fmtNum(λ, 2)} — moved out of mission-aligned territory (bucket: λ < 0.05).`;
      if (choiceId === "compromise" && λ >= 0.20)
        return `λ = ${fmtNum(λ, 2)} — crossed into market-rate territory (bucket: λ ≥ 0.20).`;
      if (choiceId === "compromise" && λ < 0.05)
        return `λ = ${fmtNum(λ, 2)} — moved into mission-aligned territory (bucket: λ < 0.05).`;
      if (choiceId === "market_rate" && λ < 0.20)
        return `λ = ${fmtNum(λ, 2)} — dropped below market-rate territory (bucket: λ ≥ 0.20).`;
      break;
    }
    case 2: {
      if (choiceId === "full_guarantees")
        return "One or more structural guarantees have been removed in Explore.";
      if (choiceId === "raise_adoption" && params.a < 2.7)
        return `a = ${fmtNum(params.a, 1)} — adoption has fallen below the high-bar threshold.`;
      if (choiceId === "accept_erosion")
        return "All structural guarantees are now active — reversing the fragile choice.";
      break;
    }
    case 3:
    case 4:
      return `Reinvestment η = ${fmtPct(params.eta)} is outside the chosen range.`;
    default:
      break;
  }
  return "Parameters have moved outside the chosen range.";
}

const CHOICE_LABELS: Record<number, Record<string, string>> = {
  0: {
    deepen_support:    "Deepen operational support",
    tighten_selection: "Tighten portfolio selection",
    raise_cap:         "Raise the repayment cap",
  },
  1: {
    mission_aligned: "Mission-aligned (λ = 0)",
    compromise:      "Compromise (λ = 0.1)",
    market_rate:     "Market-rate (λ = 0.5)",
  },
  2: {
    full_guarantees: "Full structural guarantees",
    raise_adoption:  "Raise the adoption standard",
    accept_erosion:  "Accept current openness",
  },
  3: {
    enforce_gates: "Enforce all three gates",
    partial_early: "Allow partial early repayment",
    full_early:    "Authorise full early repayment",
  },
  4: {
    reserve_first:       "Reserve fully funded first",
    partial_reinvest:    "30% reinvested / 70% distributed",
    distributions_first: "Maximise distributions",
  },
  5: {
    raise_p: "Raise survival (p)",
    raise_r: "Raise cap via λ",
    raise_k: "Concentrate follow-on (k)",
  },
};

export function getChoiceLabel(moduleIndex: number, choiceId: string): string {
  return CHOICE_LABELS[moduleIndex]?.[choiceId] ?? choiceId;
}

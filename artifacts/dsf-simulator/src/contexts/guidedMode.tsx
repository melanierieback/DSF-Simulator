import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { readGuidedFromHash, type GuidedSave } from "@/lib/shareScenario";

export type GuidedStep = "story" | "decision" | "consequence" | "reflection";

type GuidedCtx = {
  isGuided: boolean;
  setIsGuided: (v: boolean) => void;
  activeModule: number | null;
  setActiveModule: (m: number | null) => void;
  step: GuidedStep;
  setStep: (s: GuidedStep) => void;
  chosenOption: string | null;
  setChosenOption: (o: string | null) => void;
  completedModules: Set<number>;
  moduleChoices: Record<number, string>;
  markModuleComplete: (moduleIndex: number) => void;
  recordChoice: (moduleIndex: number, optionId: string) => void;
  resetProgress: () => void;
  restoreProgress: (save: GuidedSave) => void;
  startModule: (moduleIndex: number) => void;
  exitGuided: () => void;
  getGuidedSave: () => GuidedSave;
};

const Ctx = createContext<GuidedCtx>({
  isGuided: false,
  setIsGuided: () => {},
  activeModule: null,
  setActiveModule: () => {},
  step: "story",
  setStep: () => {},
  chosenOption: null,
  setChosenOption: () => {},
  completedModules: new Set(),
  moduleChoices: {},
  markModuleComplete: () => {},
  recordChoice: () => {},
  resetProgress: () => {},
  restoreProgress: () => {},
  startModule: () => {},
  exitGuided: () => {},
  getGuidedSave: () => ({ done: [], choices: {} }),
});

function loadSavedProgress(): { completedModules: Set<number>; moduleChoices: Record<number, string> } {
  const fromHash = readGuidedFromHash();
  if (fromHash) {
    return {
      completedModules: new Set(fromHash.done),
      moduleChoices: fromHash.choices,
    };
  }
  try {
    const raw = localStorage.getItem("dsf-guided-progress");
    if (raw) {
      const parsed = JSON.parse(raw) as { done: number[]; choices: Record<number, string> };
      return {
        completedModules: new Set(parsed.done ?? []),
        moduleChoices: parsed.choices ?? {},
      };
    }
  } catch {}
  return { completedModules: new Set(), moduleChoices: {} };
}

function persistProgress(completedModules: Set<number>, moduleChoices: Record<number, string>) {
  try {
    localStorage.setItem(
      "dsf-guided-progress",
      JSON.stringify({ done: Array.from(completedModules), choices: moduleChoices }),
    );
  } catch {}
}

export function GuidedModeProvider({ children }: { children: ReactNode }) {
  const [isGuided, setIsGuidedState] = useState<boolean>(() => {
    const s = localStorage.getItem("dsf-top-mode");
    return s !== "explore";
  });
  const [activeModule, setActiveModule] = useState<number | null>(null);
  const [step, setStep] = useState<GuidedStep>("story");
  const [chosenOption, setChosenOption] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(
    () => loadSavedProgress().completedModules,
  );
  const [moduleChoices, setModuleChoices] = useState<Record<number, string>>(
    () => loadSavedProgress().moduleChoices,
  );

  const setIsGuided = (v: boolean) => {
    localStorage.setItem("dsf-top-mode", v ? "guided" : "explore");
    setIsGuidedState(v);
  };

  const markModuleComplete = useCallback((moduleIndex: number) => {
    setCompletedModules((prev) => {
      const next = new Set(prev);
      next.add(moduleIndex);
      persistProgress(next, moduleChoices);
      return next;
    });
  }, [moduleChoices]);

  const recordChoice = useCallback((moduleIndex: number, optionId: string) => {
    setModuleChoices((prev) => {
      const next = { ...prev, [moduleIndex]: optionId };
      persistProgress(completedModules, next);
      return next;
    });
  }, [completedModules]);

  const resetProgress = useCallback(() => {
    setCompletedModules(new Set());
    setModuleChoices({});
    localStorage.removeItem("dsf-guided-progress");
  }, []);

  const restoreProgress = useCallback((save: GuidedSave) => {
    const next = new Set(save.done);
    const choices = save.choices ?? {};
    setCompletedModules(next);
    setModuleChoices(choices);
    persistProgress(next, choices);
  }, []);

  const startModule = (moduleIndex: number) => {
    setActiveModule(moduleIndex);
    setStep("story");
    setChosenOption(null);
  };

  const exitGuided = () => {
    setActiveModule(null);
    setIsGuided(false);
  };

  const getGuidedSave = useCallback((): GuidedSave => ({
    done: Array.from(completedModules),
    choices: moduleChoices,
  }), [completedModules, moduleChoices]);

  return (
    <Ctx.Provider value={{
      isGuided, setIsGuided,
      activeModule, setActiveModule,
      step, setStep,
      chosenOption, setChosenOption,
      completedModules, moduleChoices,
      markModuleComplete, recordChoice, resetProgress, restoreProgress,
      startModule, exitGuided,
      getGuidedSave,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useGuidedMode = () => useContext(Ctx);

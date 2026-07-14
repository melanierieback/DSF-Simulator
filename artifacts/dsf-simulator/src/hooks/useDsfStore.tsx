import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULTS,
  SCENARIO_BASE,
  THEOLOGY_SCENARIOS,
  WORKED_EXAMPLES,
  computeAll,
  type DsfParams,
  type Derived,
} from "@/lib/dsfModel";
import { readParamsFromHash } from "@/lib/shareScenario";

type Ctx = {
  params: DsfParams;
  derived: Derived;
  set: <K extends keyof DsfParams>(key: K, value: DsfParams[K]) => void;
  patch: (p: Partial<DsfParams>) => void;
  reset: () => void;
  applyScenario: (id: "A" | "B" | "C" | "D" | "E") => void;
  applyExample: (id: string) => void;
};

const DsfContext = createContext<Ctx | null>(null);

export function DsfProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useState<DsfParams>(() => ({
    ...DEFAULTS,
    ...readParamsFromHash(),
  }));

  const set = useCallback(
    <K extends keyof DsfParams>(key: K, value: DsfParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const patch = useCallback((p: Partial<DsfParams>) => {
    setParams((prev) => ({ ...prev, ...p }));
  }, []);

  const reset = useCallback(() => setParams(DEFAULTS), []);

  const applyScenario = useCallback((id: "A" | "B" | "C" | "D" | "E") => {
    const sc = THEOLOGY_SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    setParams((prev) => ({
      ...prev,
      ...SCENARIO_BASE,
      delta: sc.delta,
      pi: sc.pi,
      rho: sc.rho,
      lambda: sc.lambda,
    }));
  }, []);

  const applyExample = useCallback((id: string) => {
    const ex = WORKED_EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    setParams((prev) => ({ ...prev, ...ex.patch }));
  }, []);

  const derived = useMemo(() => computeAll(params), [params]);

  const value: Ctx = { params, derived, set, patch, reset, applyScenario, applyExample };
  return <DsfContext.Provider value={value}>{children}</DsfContext.Provider>;
}

export function useDsf() {
  const ctx = useContext(DsfContext);
  if (!ctx) throw new Error("useDsf must be used inside DsfProvider");
  return ctx;
}

import { createContext, useContext, useState, type ReactNode } from "react";

export type PageMode = "story" | "analyst" | "scenario" | "glossary";

type StoryModeCtx = {
  mode: PageMode;
  isStory: boolean;
  setMode: (m: PageMode) => void;
  toggle: () => void;
};

const Ctx = createContext<StoryModeCtx>({
  mode: "analyst",
  isStory: false,
  setMode: () => {},
  toggle: () => {},
});

export function StoryModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PageMode>(() => {
    const s = localStorage.getItem("dsf-page-mode");
    if (s === "story" || s === "analyst" || s === "scenario" || s === "glossary") return s;
    return "analyst";
  });

  const setMode = (m: PageMode) => {
    localStorage.setItem("dsf-page-mode", m);
    setModeState(m);
  };

  const toggle = () =>
    setMode(mode === "analyst" ? "story" : "analyst");

  return (
    <Ctx.Provider value={{ mode, isStory: mode === "story", setMode, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useStoryMode = () => useContext(Ctx);

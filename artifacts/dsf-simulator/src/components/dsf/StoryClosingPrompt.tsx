import { ArrowRight } from "lucide-react";
import { useStoryMode } from "@/contexts/storyMode";

interface StoryClosingPromptProps {
  text: string;
  channel?: "finance" | "impact" | "theology" | "neutral";
}

const ACCENT: Record<string, string> = {
  finance:  "hsl(var(--finance))",
  impact:   "hsl(var(--impact))",
  theology: "hsl(var(--theology))",
  neutral:  "hsl(235 80% 68%)",
};

export function StoryClosingPrompt({ text, channel = "neutral" }: StoryClosingPromptProps) {
  const { setMode } = useStoryMode();
  const accent = ACCENT[channel];

  return (
    <div
      className="rounded-lg px-4 py-3.5 flex items-center justify-between gap-4 mt-2"
      style={{ background: "hsl(237 28% 11%)", border: "1px solid hsl(237 22% 20%)" }}
    >
      <p className="text-xs text-white/60 leading-relaxed flex-1">{text}</p>
      <button
        onClick={() => setMode("scenario")}
        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-all hover:gap-2.5"
        style={{ color: accent }}
      >
        Go to Scenario <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

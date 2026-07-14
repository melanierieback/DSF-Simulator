import { AlertTriangle, BookOpen, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useGuidedMode } from "@/contexts/guidedMode";

const CHANNEL_STYLE: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  finance: {
    bg: "hsl(var(--finance)/0.06)",
    border: "hsl(var(--finance)/0.25)",
    badge: "hsl(var(--finance)/0.15)",
    text: "hsl(var(--finance))",
  },
  impact: {
    bg: "hsl(var(--impact)/0.06)",
    border: "hsl(var(--impact)/0.25)",
    badge: "hsl(var(--impact)/0.15)",
    text: "hsl(var(--impact))",
  },
  theology: {
    bg: "hsl(var(--theology)/0.06)",
    border: "hsl(var(--theology)/0.25)",
    badge: "hsl(var(--theology)/0.15)",
    text: "hsl(var(--theology))",
  },
};

const DRIFTED_STYLE = {
  bg: "hsl(38 92% 50% / 0.06)",
  border: "hsl(38 92% 50% / 0.35)",
  badge: "hsl(38 92% 50% / 0.15)",
  text: "hsl(38 92% 60%)",
};

interface GuidedContextBannerProps {
  moduleTitle: string;
  choiceLabel: string;
  channel: "finance" | "impact" | "theology";
  moduleIndex: number;
  drifted?: boolean;
  driftNote?: string;
}

export function GuidedContextBanner({
  moduleTitle,
  choiceLabel,
  channel,
  moduleIndex,
  drifted = false,
  driftNote,
}: GuidedContextBannerProps) {
  const [, navigate] = useLocation();
  const { startModule, setIsGuided } = useGuidedMode();
  const style = drifted ? DRIFTED_STYLE : CHANNEL_STYLE[channel];

  const handleRevisit = () => {
    setIsGuided(true);
    startModule(moduleIndex);
    navigate("/");
  };

  return (
    <div
      className="rounded-lg px-4 py-3 flex items-start gap-3 mb-5"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <div
        className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: style.badge }}
      >
        {drifted
          ? <AlertTriangle className="w-3 h-3" style={{ color: style.text }} />
          : <BookOpen className="w-3 h-3" style={{ color: style.text }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: style.text }}
          >
            {drifted ? `Drifted · ${moduleTitle}` : `Guided Mode · ${moduleTitle} complete`}
          </span>
        </div>
        {drifted ? (
          <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
            Guided choice:{" "}
            <span className="font-semibold text-white/70">{choiceLabel}</span>
            {driftNote ? (
              <> — <span className="text-amber-400/80">{driftNote}</span></>
            ) : (
              <> — parameters have moved outside that range.</>
            )}
          </p>
        ) : (
          <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
            Your walkthrough choice:{" "}
            <span className="font-semibold text-white/80">{choiceLabel}</span>
            {" "}— reflected below. You can explore other options freely.
          </p>
        )}
      </div>
      <button
        onClick={handleRevisit}
        className="shrink-0 flex items-center gap-0.5 text-[11px] transition-colors mt-0.5 hover:opacity-80"
        style={{ color: style.text }}
        title="Revisit this module in Guided Mode"
      >
        {drifted ? "Review" : "Revisit"} <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

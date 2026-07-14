import { BarChart2 } from "lucide-react";

interface ScenarioBannerProps {
  text: string;
  channel?: "finance" | "impact" | "theology" | "neutral";
}

const STYLE: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  finance: {
    bg: "hsl(var(--finance)/0.06)",
    border: "hsl(var(--finance)/0.25)",
    icon: "hsl(var(--finance)/0.15)",
    text: "hsl(var(--finance))",
  },
  impact: {
    bg: "hsl(var(--impact)/0.06)",
    border: "hsl(var(--impact)/0.25)",
    icon: "hsl(var(--impact)/0.15)",
    text: "hsl(var(--impact))",
  },
  theology: {
    bg: "hsl(var(--theology)/0.06)",
    border: "hsl(var(--theology)/0.25)",
    icon: "hsl(var(--theology)/0.15)",
    text: "hsl(var(--theology))",
  },
  neutral: {
    bg: "hsl(235 60% 62% / 0.06)",
    border: "hsl(235 60% 62% / 0.22)",
    icon: "hsl(235 60% 62% / 0.15)",
    text: "hsl(235 80% 72%)",
  },
};

export function ScenarioBanner({ text, channel = "neutral" }: ScenarioBannerProps) {
  const s = STYLE[channel] ?? STYLE.neutral;

  return (
    <div
      className="rounded-lg px-4 py-3 flex items-start gap-3 mb-5"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <div
        className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: s.icon }}
      >
        <BarChart2 className="w-3 h-3" style={{ color: s.text }} />
      </div>
      <p className="text-xs text-white/65 leading-relaxed flex-1 italic">{text}</p>
    </div>
  );
}

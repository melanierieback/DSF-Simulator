/**
 * PageStory — case-study narrative panel shown in Story mode.
 *
 * Each analyst page passes:
 *   - character: who is narrating (name + role)
 *   - paragraphs: array of { text, liveValue? } — prose sections, optionally
 *     referencing a live computed value from the simulator
 *   - insights: 2–4 key-insight cards
 *   - cta: optional text for a guided next step
 */

import { BookOpen } from "lucide-react";

export interface StoryCharacter {
  name: string;
  role: string;
  initials: string;
  color: "finance" | "impact" | "theology" | "neutral";
}

export interface StoryParagraph {
  text: string;
  liveValue?: string;
  liveLabel?: string;
}

export interface StoryInsight {
  label: string;
  body: string;
  status?: "good" | "warning" | "fragile" | "stressed" | "balanced";
}

interface PageStoryProps {
  character: StoryCharacter;
  scene: string;
  paragraphs: StoryParagraph[];
  insights: StoryInsight[];
  cta?: string;
}

const COLOR_RING: Record<StoryCharacter["color"], string> = {
  finance: "ring-[hsl(var(--finance)/0.5)] bg-[hsl(var(--finance)/0.12)] text-[hsl(var(--finance))]",
  impact: "ring-[hsl(var(--impact)/0.5)] bg-[hsl(var(--impact)/0.12)] text-[hsl(var(--impact))]",
  theology: "ring-[hsl(var(--theology)/0.5)] bg-[hsl(var(--theology)/0.12)] text-[hsl(var(--theology))]",
  neutral: "ring-white/20 bg-white/5 text-white/70",
};

const STATUS_CLS: Record<NonNullable<StoryInsight["status"]>, string> = {
  good: "border-[hsl(var(--impact)/0.4)] bg-[hsl(var(--impact)/0.06)]",
  balanced: "border-[hsl(var(--finance)/0.4)] bg-[hsl(var(--finance)/0.06)]",
  fragile: "border-amber-400/35 bg-amber-400/5",
  stressed: "border-[hsl(var(--theology)/0.4)] bg-[hsl(var(--theology)/0.06)]",
  warning: "border-red-500/40 bg-red-500/5",
};

export function PageStory({ character, scene, paragraphs, insights, cta }: PageStoryProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Character card */}
      <div
        className="flex items-start gap-4 rounded-xl px-5 py-4"
        style={{ background: "hsl(237 28% 10%)", border: "1px solid hsl(237 22% 18%)" }}
      >
        <div
          className={`w-11 h-11 rounded-full ring-2 flex items-center justify-center text-sm font-bold shrink-0 ${COLOR_RING[character.color]}`}
        >
          {character.initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/90">{character.name}</span>
            <span className="text-xs text-white/40">·</span>
            <span className="text-xs text-white/50">{character.role}</span>
          </div>
          <div className="text-xs text-white/40 mt-0.5 italic">{scene}</div>
        </div>
        <BookOpen className="w-4 h-4 text-white/25 shrink-0 ml-auto mt-0.5" />
      </div>

      {/* Narrative */}
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <div key={i} className="space-y-2">
            <p className="text-sm text-white/75 leading-relaxed">{p.text}</p>
            {p.liveValue && (
              <div
                className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-xs"
                style={{ background: "hsl(237 28% 13%)", border: "1px solid hsl(237 22% 20%)" }}
              >
                <span className="text-white/40 uppercase tracking-wider">{p.liveLabel}</span>
                <span className="font-mono font-semibold text-white/85 ml-auto">{p.liveValue}</span>
                <span className="text-[10px] text-white/30 uppercase tracking-wider">live</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Insight cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`rounded-lg border px-4 py-3 space-y-1 ${ins.status ? STATUS_CLS[ins.status] : "border-white/10 bg-white/[0.03]"}`}
            >
              <div className="text-[10px] uppercase tracking-wider text-white/45 font-medium">
                {ins.label}
              </div>
              <p className="text-xs text-white/70 leading-relaxed">{ins.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {cta && (
        <p className="text-xs text-white/40 italic border-l-2 border-white/15 pl-3">{cta}</p>
      )}
    </div>
  );
}

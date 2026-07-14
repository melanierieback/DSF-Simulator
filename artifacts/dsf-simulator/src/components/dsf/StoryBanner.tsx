import { useState } from "react";
import { ChevronRight } from "lucide-react";

export type DiagnosisStatus = "balanced" | "good" | "fragile" | "stressed" | "warning";

export type ControlRow = { technical: string; plain: string; question: string };

export interface StoryBannerProps {
  humanQuestion: string;
  opening: string;
  guidedQuestions?: string[];
  controlTranslations?: ControlRow[];
  diagnosis: {
    label?: string;
    text: string;
    status: DiagnosisStatus;
  };
}

const STATUS_CLS: Record<DiagnosisStatus, string> = {
  balanced: "border-finance/50 bg-finance/8 text-finance",
  good:     "border-impact/50 bg-impact/8 text-impact",
  fragile:  "border-theology/50 bg-theology/8 text-theology",
  stressed: "border-theology/50 bg-theology/8 text-theology",
  warning:  "border-destructive/50 bg-destructive/8 text-destructive",
};

const STATUS_LABEL: Record<DiagnosisStatus, string> = {
  balanced: "Balanced",
  good:     "Healthy",
  fragile:  "Fragile",
  stressed: "Stressed",
  warning:  "Warning",
};

export function StoryBanner({
  humanQuestion,
  opening,
  guidedQuestions = [],
  controlTranslations = [],
  diagnosis,
}: StoryBannerProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const label = diagnosis.label ?? "Current diagnosis";
  const statusLabel = STATUS_LABEL[diagnosis.status];

  return (
    <div className="bg-card border border-card-border rounded-lg p-6 space-y-5 mb-6">
      {/* Human question */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Human question
        </div>
        <p className="font-serif text-xl md:text-2xl italic text-foreground/90 leading-snug">
          {humanQuestion}
        </p>
      </div>

      {/* Opening narrative */}
      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{opening}</p>

      {/* Diagnosis card */}
      <div className={`rounded-md border px-4 py-3 space-y-1 ${STATUS_CLS[diagnosis.status]}`}>
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-wider opacity-60">{label}</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-current/30 uppercase tracking-wide opacity-70">
            {statusLabel}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{diagnosis.text}</p>
      </div>

      {/* Collapsible: guided questions */}
      {guidedQuestions.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${showGuide ? "rotate-90" : ""}`}
            />
            {showGuide ? "Hide" : "Show"} guided questions
          </button>
          {showGuide && (
            <ul className="pl-2 space-y-1.5">
              {guidedQuestions.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground/40 text-xs mt-0.5 shrink-0">→</span>
                  <span className="text-muted-foreground">{q}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Collapsible: control translations */}
      {controlTranslations.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowControls((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${showControls ? "rotate-90" : ""}`}
            />
            {showControls ? "Hide" : "Show"} plain-language guide to controls
          </button>
          {showControls && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2 pr-4">Control</th>
                    <th className="text-left py-2 pr-4">Plain name</th>
                    <th className="text-left py-2">Question it answers</th>
                  </tr>
                </thead>
                <tbody>
                  {controlTranslations.map((row, i) => (
                    <tr key={i} className="border-t border-card-border">
                      <td className="py-2 pr-4 font-mono text-[11px] text-finance">{row.technical}</td>
                      <td className="py-2 pr-4 font-medium">{row.plain}</td>
                      <td className="py-2 text-muted-foreground">{row.question}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

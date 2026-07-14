import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import type { DiagnosisStatus } from "./StoryBanner";

export type { DiagnosisStatus };

const STATUS_LABEL: Record<DiagnosisStatus, string> = {
  balanced: "Balanced",
  good: "Healthy",
  fragile: "Fragile",
  stressed: "Stressed",
  warning: "Warning",
};

const STATUS_DOT: Record<DiagnosisStatus, string> = {
  balanced: "bg-finance",
  good: "bg-impact",
  fragile: "bg-amber-400",
  stressed: "bg-theology",
  warning: "bg-destructive",
};

const STATUS_CLS: Record<DiagnosisStatus, string> = {
  balanced: "border-finance/30 bg-finance/5 text-finance",
  good: "border-impact/30 bg-impact/5 text-impact",
  fragile: "border-amber-400/40 bg-amber-400/5 text-amber-700 dark:text-amber-400",
  stressed: "border-theology/30 bg-theology/5 text-theology",
  warning: "border-destructive/30 bg-destructive/5 text-destructive",
};

export type Channel = "finance" | "impact" | "theology" | "neutral";

interface DiagnosisProps {
  text: string;
  status: DiagnosisStatus;
  label?: string;
}

interface StoryStripProps {
  humanQuestion: string;
  opening: string;
  diagnosis: DiagnosisProps;
  guidedQuestions?: string[];
}

export function StoryStrip({
  humanQuestion,
  opening,
  diagnosis,
  guidedQuestions = [],
}: StoryStripProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-card-border bg-card/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/20 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="font-serif text-sm italic text-foreground/80 flex-1 min-w-0 truncate pr-2">
          {humanQuestion}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[diagnosis.status]}`} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:block">
            {STATUS_LABEL[diagnosis.status]}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-card-border space-y-3 px-4 pb-4 pt-3 bg-muted/10">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{opening}</p>
          <div className={`rounded-md border px-4 py-3 ${STATUS_CLS[diagnosis.status]}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[diagnosis.status]}`} />
              <span className="text-[10px] uppercase tracking-wider font-medium opacity-70">
                {diagnosis.label ?? "Current read"}
              </span>
              <span className="ml-auto text-[10px] uppercase tracking-wider opacity-50">
                {STATUS_LABEL[diagnosis.status]}
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-90">{diagnosis.text}</p>
          </div>
          {guidedQuestions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Questions to explore
              </div>
              <ul className="space-y-1">
                {guidedQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 opacity-30 mt-0.5">→</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StoryDiagnosisProps {
  diagnosis: DiagnosisProps;
}

export function StoryDiagnosis({ diagnosis }: StoryDiagnosisProps) {
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${STATUS_CLS[diagnosis.status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[diagnosis.status]}`} />
          <span className="text-[10px] uppercase tracking-wider font-medium">Live read</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider opacity-50">
          {STATUS_LABEL[diagnosis.status]}
        </span>
      </div>
      <p className="text-xs leading-relaxed opacity-90">{diagnosis.text}</p>
    </div>
  );
}

const BORDER_CLS: Record<Channel, string> = {
  finance: "border-finance/50",
  impact: "border-impact/50",
  theology: "border-theology/50",
  neutral: "border-muted-foreground/25",
};

interface StoryAnnotationProps {
  children: React.ReactNode;
  channel?: Channel;
  className?: string;
}

export function StoryAnnotation({
  children,
  channel = "neutral",
  className = "",
}: StoryAnnotationProps) {
  return (
    <div className={`border-l-2 ${BORDER_CLS[channel]} pl-3 ${className}`}>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

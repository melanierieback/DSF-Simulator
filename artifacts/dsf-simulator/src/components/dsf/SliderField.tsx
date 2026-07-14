import { Slider } from "@/components/ui/slider";
import { Eq } from "./Eq";
import { fmtNum } from "@/lib/dsfModel";

type Props = {
  label: string;
  symbol?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  hint?: string;
  format?: (v: number) => string;
  channel?: "finance" | "impact" | "theology" | "neutral";
};

const channelClass = {
  finance: "text-finance",
  impact: "text-impact",
  theology: "text-theology",
  neutral: "",
};

export function SliderField({
  label,
  symbol,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  disabled = false,
  hint,
  format,
  channel = "neutral",
}: Props) {
  const fmt = format ?? ((v: number) => fmtNum(v, step >= 1 ? 0 : step >= 0.1 ? 1 : 2));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          {symbol ? (
            <span className={`shrink-0 ${channelClass[channel]}`}>
              <Eq tex={symbol} />
            </span>
          ) : null}
          <span className="text-sm text-muted-foreground truncate" data-testid={`label-${label}`}>{label}</span>
        </div>
        <span className="num text-sm tabular-nums" data-testid={`value-${label}`}>
          {fmt(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        data-testid={`slider-${label}`}
      />
      {hint ? <p className="text-xs text-muted-foreground/80 leading-snug">{hint}</p> : null}
    </div>
  );
}

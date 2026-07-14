import { motion } from "framer-motion";
import { Eq } from "./Eq";
import type { ReactNode } from "react";

type Props = {
  label: string;
  symbol?: string;
  value: string;
  sub?: string;
  channel?: "finance" | "impact" | "theology" | "neutral";
  size?: "sm" | "md" | "lg" | "xl";
  children?: ReactNode;
  className?: string;
  testId?: string;
};

const sizeClass = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-5xl",
  xl: "text-6xl",
};

const channelText = {
  finance: "text-finance",
  impact: "text-impact",
  theology: "text-theology",
  neutral: "text-foreground",
};

const channelBar = {
  finance: "bg-finance",
  impact: "bg-impact",
  theology: "bg-theology",
  neutral: "bg-muted-foreground/40",
};

export function ValueCard({
  label,
  symbol,
  value,
  sub,
  channel = "neutral",
  size = "md",
  children,
  className = "",
  testId,
}: Props) {
  return (
    <div className={`relative bg-card border border-card-border rounded-lg p-5 ${className}`}>
      <div className={`channel-bar ${channelBar[channel]} absolute top-0 left-5 right-5`} />
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          {symbol ? (
            <span className={channelText[channel]}>
              <Eq tex={symbol} />
            </span>
          ) : null}
          <span className="text-xs uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </span>
        </div>
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.6, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className={`font-serif num ${sizeClass[size]} ${channelText[channel]} leading-none`}
        data-testid={testId ?? `value-${label}`}
      >
        {value}
      </motion.div>
      {sub ? <div className="text-xs text-muted-foreground mt-2">{sub}</div> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

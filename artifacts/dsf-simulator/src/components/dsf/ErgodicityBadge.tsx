import { Link } from "wouter";
import { useDsf } from "@/hooks/useDsfStore";

export function ErgodicityBadge() {
  const { params } = useDsf();
  const on = params.includeErgodicityInResults;
  const effectiveP = params.ergodicEffectiveSurvivalRate;
  const baseP = params.p;

  return (
    <Link href="/ergodicity">
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full cursor-pointer transition-opacity hover:opacity-80"
        style={
          on
            ? {
                background: "hsl(142 55% 16%)",
                color: "hsl(142 70% 65%)",
                border: "1px solid hsl(142 50% 30%)",
              }
            : {
                background: "hsl(237 22% 11%)",
                color: "hsl(237 40% 50%)",
                border: "1px solid hsl(237 22% 19%)",
              }
        }
        title={
          on
            ? `Pooling-adjusted survival active — effective p = ${(effectiveP * 100).toFixed(1)}% vs baseline ${(baseP * 100).toFixed(1)}%. Click to configure.`
            : "Solidarity Reserve Lab is preview-only. Click to open it."
        }
      >
        <span>{on ? "⬤" : "◯"}</span>
        <span>
          {on
            ? `Pooling-adjusted p = ${(effectiveP * 100).toFixed(1)}%`
            : "Baseline model — pooling excluded"}
        </span>
        <span style={{ opacity: 0.4 }}>↗</span>
      </span>
    </Link>
  );
}

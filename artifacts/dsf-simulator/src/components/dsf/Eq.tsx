import { InlineMath, BlockMath } from "react-katex";

export function Eq({ tex, block = false, className = "" }: { tex: string; block?: boolean; className?: string }) {
  return (
    <span className={`equation ${block ? "equation-lg block" : "inline-block"} ${className}`}>
      {block ? <BlockMath math={tex} /> : <InlineMath math={tex} />}
    </span>
  );
}

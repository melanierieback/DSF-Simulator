import { Link } from "wouter";
import { Eq } from "./Eq";
import { variableLegend } from "@/lib/dsfModel";

type SectionKey = keyof typeof variableLegend;

const SECTION_META: Record<SectionKey, { title: string; href: string; accent: string; border: string }> = {
  financial: { title: "Financial", href: "/financial", accent: "text-finance", border: "border-finance" },
  impact: { title: "Impact", href: "/impact", accent: "text-impact", border: "border-impact" },
  theology: { title: "Theology", href: "/theology", accent: "text-theology", border: "border-theology" },
  company: { title: "Portfolio company", href: "/company", accent: "text-finance", border: "border-finance" },
  cooperative: { title: "Cooperative waterfall", href: "/cooperative", accent: "text-finance", border: "border-finance" },
};

export function GlossaryTab({
  sections,
  showEquations = false,
}: {
  sections: SectionKey | SectionKey[] | "all";
  showEquations?: boolean;
}) {
  const keys: SectionKey[] =
    sections === "all"
      ? (Object.keys(SECTION_META) as SectionKey[])
      : Array.isArray(sections)
      ? sections
      : [sections];

  const showEq = showEquations || sections === "all";

  return (
    <div className="space-y-8">
      <header className="space-y-1 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Variable legend</div>
        <h2 className="font-serif text-3xl font-semibold">Glossary</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every variable in this page's engine, with its symbol, plain-language name, and defining equation.
        </p>
      </header>

      <div className="space-y-10">
        {keys.map((key) => {
          const meta = SECTION_META[key];
          return (
            <section key={key}>
              <div className={`flex items-baseline justify-between pb-2 mb-4 border-b ${meta.border}`}>
                <h3 className={`font-serif text-2xl font-semibold ${meta.accent}`}>{meta.title}</h3>
                <Link
                  href={meta.href}
                  className="text-xs text-muted-foreground hover-elevate rounded px-2 py-1"
                >
                  Open engine →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2 pr-3">Symbol</th>
                      <th className="text-left py-2 pr-3">Name</th>
                      <th className="text-left py-2 pr-3">Role</th>
                      <th className="text-left py-2 pr-3">Defining equation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variableLegend[key].map((row, i) => (
                      <tr key={i} className="border-t border-card-border align-top">
                        <td className={`py-3 pr-3 ${meta.accent}`}>
                          <Eq tex={row.sym} />
                        </td>
                        <td className="py-3 pr-3">{row.name}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{row.role}</td>
                        <td className="py-3 pr-3">
                          {row.eq ? (
                            <Eq tex={row.eq} />
                          ) : (
                            <span className="text-muted-foreground/60 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {showEq && (
        <section className="bg-card border border-card-border rounded-lg p-5 space-y-2">
          <h4 className="font-serif text-lg font-semibold">Three core equations</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rule-top md:rule-top-0 pt-3 md:pt-0">
              <div className="text-xs uppercase tracking-wider text-finance mb-1">Financial</div>
              <Eq tex="M = \dfrac{r\,k\,p}{1+(k-1)p}" block />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-impact mb-1">Impact</div>
              <Eq tex="I = N \cdot p \cdot L \cdot o \cdot d \cdot a \cdot e" block />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-theology mb-1">Theology</div>
              <Eq tex="T = 1 - U + \mu\,\eta" block />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

import { Link } from "wouter";
import { useStoryMode } from "@/contexts/storyMode";
import { StoryStrip } from "@/components/dsf/StoryComponents";
import { PageStory } from "@/components/dsf/PageStory";
import { PageScenario } from "@/components/dsf/PageScenario";
import { Eq } from "@/components/dsf/Eq";
import { variableLegend } from "@/lib/dsfModel";

const SECTIONS = [
  {
    key: "financial" as const,
    title: "Financial",
    href: "/financial",
    accent: "text-finance",
    border: "border-finance",
  },
  {
    key: "impact" as const,
    title: "Impact",
    href: "/impact",
    accent: "text-impact",
    border: "border-impact",
  },
  {
    key: "theology" as const,
    title: "Theology",
    href: "/theology",
    accent: "text-theology",
    border: "border-theology",
  },
  {
    key: "company" as const,
    title: "Portfolio company",
    href: "/company",
    accent: "text-finance",
    border: "border-finance",
  },
  {
    key: "cooperative" as const,
    title: "Cooperative waterfall",
    href: "/cooperative",
    accent: "text-finance",
    border: "border-finance",
  },
];

export default function GlossaryPage() {
  const { mode } = useStoryMode();
  const isStory = mode === "story";
  return (
    <div className="space-y-8">
      {isStory && (
        <PageStory
          character={{ name: "Marta Vidal", role: "Policy director, DSF Steering Committee", initials: "MV", color: "neutral" }}
          scene="Preparing a briefing note for new investment committee members"
          paragraphs={[
            { text: "Before anyone reads an equation, Marta hands them a single sheet. 'Every letter in this model is a question,' she says. 'p is: how many companies actually make it? r is: how much can a successful one repay without being harmed? U is: are we crossing a moral line?'" },
            { text: "She draws a triangle on the whiteboard — Money, Infrastructure, Conscience. 'The entire model is about keeping that triangle in shape. The moment you pull hard on one corner, the others deform. The glossary tells you which letters live in which corner.'" },
            { text: "'There is one letter that improves all three corners at once,' she says, tapping the board. 'p. Survival. If more companies survive, the fund makes more money, builds more infrastructure, and faces less moral pressure. That is the mission-consistent lever. Everything else involves trade-offs.'" },
          ]}
          insights={[
            { label: "The safe lever", body: "p (survival probability) is the only variable that strengthens all three accounts simultaneously. Focus here first.", status: "good" },
            { label: "The dangerous lever", body: "r (repayment cap) improves M directly but raises usury pressure. Every increase demands a theological justification.", status: "warning" },
            { label: "The coupling variable", body: "U (usury pressure) is computed from r's composition and affects L, o, d — eroding impact indirectly through company lifetimes and openness.", status: "stressed" },
            { label: "The moral offset", body: "η (reinvestment rate) partially offsets U in the T formula. High reinvestment keeps the fund operating as a steward rather than an extractor.", status: "balanced" },
          ]}
          cta="Use the rows below as a map. Click through to each page and move a lever — the glossary tells you where to expect the effect."
        />
      )}
      {mode === "scenario" && (
        <PageScenario
          title="Which lever should I move first?"
          description="You're onboarding an investment committee. Walk through the model's key levers in order of mission-consistency, making choices that reveal the logic of each variable."
          steps={[
            {
              id: "first_lever",
              question: "Which lever do you start with in your first committee meeting?",
              subtitle: "This sets the frame for everything else.",
              options: [
                { id: "p", label: "Survival probability p", description: "Improve the fraction of companies that survive long enough to repay. No moral cost — it helps all three accounts.", tag: "Mission-first", tagColor: "impact", onApply: () => {} },
                { id: "r", label: "Repayment cap r", description: "Raise how much successful companies can repay. Improves M immediately but raises usury pressure U.", tag: "Financial-first", tagColor: "warning", onApply: () => {} },
                { id: "k", label: "Concentration k", description: "Put more capital into proven survivors. Amplifies winners without changing the moral composition of returns.", tag: "Portfolio design", tagColor: "finance", onApply: () => {} },
              ],
            },
            {
              id: "usury_guard",
              question: "The committee asks: 'what prevents us from drifting toward extraction?'",
              options: [
                { id: "cap", label: "The repayment cap is contractual", description: "Companies sign agreements. The cap is legally binding. Extraction is prevented by contract.", tag: "Governance", tagColor: "finance", onApply: () => {} },
                { id: "T", label: "The T guardrail fails the model", description: "If T drops below its floor, the model literally fails. The system rejects designs that cross the moral line.", tag: "Model-enforced", tagColor: "theology", onApply: () => {} },
                { id: "eta", label: "Reinvestment rate η offsets pressure", description: "Recycling capital back into new companies partially offsets usury pressure in the T formula — structural discipline.", tag: "Structural", tagColor: "impact", onApply: () => {} },
              ],
            },
          ]}
          consequences={[
            { label: "Financial M", value: "2.28×", channel: "finance", note: "Per cycle with default params" },
            { label: "Impact I", value: "182", channel: "impact", note: "Infrastructure units" },
            { label: "Integrity T", value: "1.24", channel: "theology", note: "Above floor of 1.0" },
            { label: "Usury U", value: "0.37", channel: "neutral", note: "In the mixed zone" },
          ]}
          narratorLine="The glossary is the map. The simulator is the territory. Choose your lever carefully — each one has a moral character, and the model will tell you what it cost."
        />
      )}
      {mode === "analyst" && (
        <StoryStrip
          humanQuestion="What does each symbol mean in plain language?"
          opening="Every symbol in this model stands for a human question. p asks how many companies survive. r asks how much successful ones can repay. U measures moral risk. η measures how much capital stays in the mission. The lever with the best moral character is p: improving it strengthens all three accounts at once. The most dangerous lever is r: raising it improves the money account but may damage the conscience account. Use the symbol rows below as a map — click to the relevant page and move the lever."
          diagnosis={{ text: "Every symbol is a lever. Every lever has a moral character. The mission-consistent lever is p. The dangerous lever is r. Understanding the difference is the analytical purpose of this simulator.", status: "balanced" }}
          guidedQuestions={[
            "Which variables appear in more than one account?",
            "Which lever improves all three accounts simultaneously?",
            "Which lever improves the money account by worsening the conscience account?",
            "What does usury pressure (U) do to infrastructure impact (I)?",
          ]}
        />
      )}
      <header className="space-y-2 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Variable legend
        </div>
        <h2 className="font-serif text-3xl font-semibold">Glossary</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every variable in the simulator, grouped by engine. Each row links
          straight to the page where the variable lives so you can move it and
          watch the effect propagate.
        </p>
      </header>

      <div className="space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.key}>
            <div className={`flex items-baseline justify-between rule-bot pb-2 mb-4 border-b ${s.border}`}>
              <h3 className={`font-serif text-2xl font-semibold ${s.accent}`}>
                {s.title}
              </h3>
              <Link
                href={s.href}
                className="text-xs text-muted-foreground hover-elevate rounded px-2 py-1"
              >
                Open engine →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2 pr-3">symbol</th>
                    <th className="text-left py-2 pr-3">name</th>
                    <th className="text-left py-2 pr-3">role</th>
                    <th className="text-left py-2 pr-3">defining equation</th>
                  </tr>
                </thead>
                <tbody>
                  {variableLegend[s.key].map((row, i) => (
                    <tr key={i} className="border-t border-card-border align-top">
                      <td className={`py-3 pr-3 ${s.accent}`}>
                        <Eq tex={row.sym} />
                      </td>
                      <td className="py-3 pr-3">{row.name}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{row.role}</td>
                      <td className="py-3 pr-3">
                        {row.eq ? <Eq tex={row.eq} /> : <span className="text-muted-foreground/60 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

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
    </div>
  );
}

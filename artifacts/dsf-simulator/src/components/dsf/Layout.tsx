import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useDsf } from "@/hooks/useDsfStore";
import { useStoryMode } from "@/contexts/storyMode";
import { useGuidedMode } from "@/contexts/guidedMode";
import { fmtMultiple, fmtNum } from "@/lib/dsfModel";
import { Eq } from "./Eq";
import { Button } from "@/components/ui/button";
import { SharePanel } from "./SharePanel";
import { BookOpen, BarChart2, RotateCcw, Layers, BookMarked, Map, Compass, TrendingUp } from "lucide-react";
import type { PageMode } from "@/contexts/storyMode";


function NavLink({
  href,
  label,
  active,
  highlight,
}: {
  href: string;
  label: string;
  active: boolean;
  highlight?: boolean;
}) {
  const { setMode } = useStoryMode();
  return (
    <Link
      href={href}
      onClick={() => setMode("analyst")}
      data-testid={`nav-${label.toLowerCase()}`}
      className={`text-sm py-1 px-3 rounded-md transition-colors ${
        active
          ? "text-white font-semibold"
          : highlight
          ? "hover:text-white/90 hover-elevate"
          : "text-white/65 hover:text-white/90 hover-elevate"
      }`}
      style={
        highlight
          ? {
              color: active ? "white" : "hsl(235 90% 74%)",
              fontWeight: active ? 700 : 500,
            }
          : undefined
      }
    >
      {label}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { params, derived, reset } = useDsf();
  const { mode, setMode } = useStoryMode();
  const { isGuided, setIsGuided, activeModule } = useGuidedMode();
  const handleSwitchToGuided = () => {
    setIsGuided(true);
    navigate("/guided");
  };

  const handleSwitchToExplore = () => {
    setIsGuided(false);
    setMode("analyst");
    navigate("/explore");
  };

  const isLpView = location === "/" || location === "/lp";
  const isGuidedRoute = location === "/guided";
  const showExploreNav = !isLpView && !isGuidedRoute;

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b border-white/8"
        style={{
          background:
            "linear-gradient(to bottom, hsl(237 35% 7% / 0.96), hsl(237 30% 5% / 0.92))",
          boxShadow: "0 1px 0 hsl(235 95% 62% / 0.15)",
        }}
      >
        {/* ── Row 1: Logo + mode toggle ─────────────────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 hover-elevate rounded-md shrink-0"
            data-testid="link-home"
          >
            <div
              role="img"
              aria-label="Non-Extractive Capital"
              style={{
                width: "140px",
                height: "72px",
                flexShrink: 0,
                backgroundImage: `url(${import.meta.env.BASE_URL}nec-logo-cropped.png)`,
                backgroundColor: "hsl(237 35% 7%)",
                backgroundBlendMode: "screen",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center left",
              }}
            />
          </Link>

          {/* Top-level mode toggle: LP View | Guided | Explore */}
          <div
            className="flex items-center rounded-lg overflow-hidden shrink-0"
            style={{ border: "1px solid hsl(237 22% 22%)", background: "hsl(237 28% 8%)" }}
          >
            <button
              onClick={() => { setIsGuided(false); navigate("/lp"); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                isLpView
                  ? "bg-[hsl(235_95%_62%/0.18)] text-[hsl(235_90%_80%)]"
                  : "text-white/45 hover:text-white/75"
              }`}
              title="LP View — investor returns and fund proposition"
            >
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">LP View</span>
            </button>
            <div className="w-px h-4 shrink-0" style={{ background: "hsl(237 22% 22%)" }} />
            <button
              onClick={handleSwitchToGuided}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                isGuidedRoute
                  ? "bg-[hsl(235_95%_62%/0.18)] text-[hsl(235_90%_80%)]"
                  : "text-white/45 hover:text-white/75"
              }`}
              title="Guided Mode — walk through the six core design decisions"
            >
              <Map className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Guided</span>
            </button>
            <div className="w-px h-4 shrink-0" style={{ background: "hsl(237 22% 22%)" }} />
            <button
              onClick={handleSwitchToExplore}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                showExploreNav
                  ? "bg-[hsl(235_95%_62%/0.18)] text-[hsl(235_90%_80%)]"
                  : "text-white/45 hover:text-white/75"
              }`}
              title="Explore — full free-form access to all model tabs"
            >
              <Compass className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Explore</span>
            </button>
          </div>
        </div>

        {/* ── Rows 2 & 3: Explore-only panel ───────────────────────────── */}
        {showExploreNav && (
          <div
            style={{
              marginTop: "14px",
              borderTop: "1px solid hsl(235 75% 62% / 0.45)",
              background: "linear-gradient(to bottom, hsl(235 60% 30% / 0.38), hsl(235 50% 22% / 0.24))",
              boxShadow: "inset 0 1px 0 hsl(235 85% 70% / 0.18), 0 -1px 0 hsl(235 75% 62% / 0.20)",
            }}
          >
            {/* Row 2: page tab nav */}
            <div style={{ borderBottom: "1px solid hsl(235 60% 45% / 0.12)" }}>
              <nav className="max-w-[1400px] mx-auto px-3 sm:px-6 py-1.5 flex items-center gap-0.5 overflow-x-auto">
                <NavLink href="/explore"     label="Overview"   active={location === "/explore"} />
                <span className="w-px h-3.5 mx-1 shrink-0" style={{ background: "hsl(235 40% 40% / 0.4)" }} />
                <NavLink href="/financial"   label="Financial"  active={location === "/financial"} />
                <NavLink href="/impact"      label="Impact"     active={location === "/impact"} />
                <NavLink href="/theology"    label="Theology"   active={location === "/theology"} />
                <NavLink href="/unified"     label="Unified"    active={location === "/unified"} />
                <span className="w-px h-3.5 mx-1 shrink-0" style={{ background: "hsl(235 40% 40% / 0.4)" }} />
                <NavLink href="/company"     label="Portfolio"  active={location === "/company"} />
                <span className="w-px h-3.5 mx-1 shrink-0" style={{ background: "hsl(235 40% 40% / 0.4)" }} />
                <NavLink href="/cooperative" label="Operations" active={location === "/cooperative"} />
                <span className="w-px h-3.5 mx-1 shrink-0" style={{ background: "hsl(235 40% 40% / 0.4)" }} />
                <NavLink href="/tax"         label="Tax"        active={location === "/tax"} />
                <span className="w-px h-3.5 mx-1 shrink-0" style={{ background: "hsl(235 40% 40% / 0.4)" }} />
                <NavLink href="/revenue"    label="Revenue Models" active={location === "/revenue"} />
                <span className="w-px h-3.5 mx-1 shrink-0" style={{ background: "hsl(235 40% 40% / 0.4)" }} />
                <NavLink href="/legal"     label="Legal"          active={location === "/legal"} />
                <span className="w-px h-3.5 mx-1 shrink-0" style={{ background: "hsl(235 40% 40% / 0.4)" }} />
                <NavLink href="/ergodicity" label="Solidarity Reserve Lab" active={location === "/ergodicity"} highlight />
              </nav>
            </div>

            {/* Row 3: view-mode toolbar */}
            <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-1.5 flex items-center gap-2 sm:gap-3">
              <div
                className="flex items-center rounded-md overflow-hidden"
                style={{ border: "1px solid hsl(235 50% 50% / 0.25)" }}
              >
                {(
                  [
                    { id: "analyst"  as PageMode, icon: <BarChart2  className="w-3 h-3" />, label: "Analyst" },
                    { id: "story"    as PageMode, icon: <BookOpen   className="w-3 h-3" />, label: "Story" },
                    { id: "scenario" as PageMode, icon: <Layers     className="w-3 h-3" />, label: "Scenario" },
                    { id: "glossary" as PageMode, icon: <BookMarked className="w-3 h-3" />, label: "Glossary" },
                  ] as const
                ).map((tab, i) => (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                      mode === tab.id
                        ? "bg-[hsl(235_95%_62%/0.22)] text-[hsl(235_90%_80%)] font-semibold"
                        : "text-white/55 hover:text-white/85"
                    }`}
                    style={i > 0 ? { borderLeft: "1px solid hsl(235 50% 50% / 0.25)" } : undefined}
                    title={
                      tab.id === "story"
                        ? "Story — a case study with a fictional fund"
                        : tab.id === "analyst"
                        ? "Analyst — equations, sliders, and charts"
                        : "Scenario — decision walkthrough with consequence cards"
                    }
                  >
                    {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={reset}
                data-testid="button-reset"
                className="text-xs text-white/50 hover:text-white/90 h-7 px-2"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Reset</span>
              </Button>
              <SharePanel />
            </div>
          </div>
        )}

        {/* ── Guided module breadcrumb bar ──────────────────────────────── */}
        {isGuidedRoute && activeModule !== null && (
          <div
            style={{
              background: "hsl(237 30% 5% / 0.95)",
              borderBottom: "1px solid hsl(237 22% 14%)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-1.5 flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={reset}
                className="text-xs text-white/40 hover:text-white/70 h-7 px-2"
              >
                <RotateCcw className="w-3 h-3 sm:mr-1.5" /><span className="hidden sm:inline">Reset model</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSwitchToExplore}
                className="text-xs text-white/40 hover:text-white/70 h-7 px-2 ml-auto"
              >
                Exit to Explore <Compass className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-8">{children}</main>

      <footer style={{ borderTop: "1px solid hsl(237 22% 14%)" }}>
        <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-3 text-xs text-white/55">
          <div className="flex flex-wrap gap-2 justify-between items-start mb-4">
            <span>
              This simulator is built from two working papers by{" "}
              <span className="text-white/75">Non-Extractive Capital</span>{" "}
              (Mar 2026). Download the originals below.
            </span>
            <span
              className="font-bold tracking-[0.14em] uppercase text-[10px] shrink-0"
              style={{ color: "hsl(235 90% 74%)", fontFamily: "var(--app-font-sans)" }}
            >
              Non-Extractive Capital
            </span>
          </div>
          <div className="flex flex-wrap gap-3 pb-5" style={{ borderTop: "1px solid hsl(237 22% 12%)", paddingTop: "14px" }}>
            <a
              href={`${import.meta.env.BASE_URL}docs/dsf-unified-model-v2.5.pdf`}
              download
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors hover:text-white/90"
              style={{
                background: "hsl(237 28% 14%)",
                border: "1px solid hsl(237 22% 22%)",
                color: "hsl(235 80% 75%)",
              }}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span>
                <span className="font-medium text-white/80">Unified Financial, Impact &amp; Theological Model</span>
                <span className="text-white/40 ml-1.5">v2.5 · PDF</span>
              </span>
            </a>
            <a
              href={`${import.meta.env.BASE_URL}docs/dsf-portfolio-simulation-framework-v4.pdf`}
              download
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors hover:text-white/90"
              style={{
                background: "hsl(237 28% 14%)",
                border: "1px solid hsl(237 22% 22%)",
                color: "hsl(235 80% 75%)",
              }}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span>
                <span className="font-medium text-white/80">Portfolio Simulation, Redemption &amp; Evergreen Waterfall Framework</span>
                <span className="text-white/40 ml-1.5">v4 · PDF</span>
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function KpiPill({
  label,
  symbol,
  value,
  channel,
}: {
  label: string;
  symbol: string;
  value: string;
  channel: "finance" | "impact" | "theology";
}) {
  const cls =
    channel === "finance"
      ? "text-finance"
      : channel === "impact"
        ? "text-impact"
        : "text-theology";
  return (
    <div className="flex items-center gap-2" data-testid={`kpi-${label.toLowerCase()}`}>
      <span className={cls}>
        <Eq tex={symbol} />
      </span>
      <span className="num font-medium text-white/80">{value}</span>
    </div>
  );
}

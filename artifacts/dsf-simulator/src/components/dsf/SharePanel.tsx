import { useState, useRef, useEffect } from "react";
import { Link2, Check, X, Download, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDsf } from "@/hooks/useDsfStore";
import { useGuidedMode } from "@/contexts/guidedMode";
import { buildShareUrl, type GuidedSave } from "@/lib/shareScenario";
import { fmtMultiple, fmtNum, fmtPct, DEFAULTS, type DsfParams } from "@/lib/dsfModel";

const MODULE_TITLES = [
  "Survival",
  "Repayment Cap",
  "Impact",
  "Repayment Timing",
  "Waterfall",
  "System Coupling",
];

const EXPORT_VERSION = 2;

type ExportFile = {
  v: 2;
  exported: string;
  params: DsfParams;
  guided: GuidedSave;
};

function changedParamSummary(params: typeof DEFAULTS): string[] {
  const lines: string[] = [];
  if (params.p !== DEFAULTS.p) lines.push(`p = ${fmtPct(params.p)}`);
  if (params.k !== DEFAULTS.k) lines.push(`k = ${fmtNum(params.k, 1)}×`);
  if (params.N !== DEFAULTS.N) lines.push(`N = ${params.N}`);
  if (params.lambda !== DEFAULTS.lambda) lines.push(`λ = ${fmtNum(params.lambda, 2)}`);
  if (params.delta !== DEFAULTS.delta) lines.push(`δ = ${fmtNum(params.delta, 2)}`);
  if (params.rho !== DEFAULTS.rho) lines.push(`ρ = ${fmtNum(params.rho, 2)}`);
  if (params.eta !== DEFAULTS.eta) lines.push(`η = ${fmtPct(params.eta)}`);
  if (params.a !== DEFAULTS.a) lines.push(`a = ${fmtNum(params.a, 1)}`);
  if (params.e !== DEFAULTS.e) lines.push(`e = ${fmtNum(params.e, 1)}`);
  return lines;
}

export function SharePanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importError, setImportError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { params, derived, patch } = useDsf();
  const { completedModules, moduleChoices, getGuidedSave, resetProgress, restoreProgress } = useGuidedMode();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleCopy = () => {
    const url = buildShareUrl(params, getGuidedSave());
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleExport = () => {
    const data: ExportFile = {
      v: EXPORT_VERSION,
      exported: new Date().toISOString(),
      params,
      guided: getGuidedSave(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `dsf-state-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = evt.target?.result as string;
        const data = JSON.parse(raw) as Partial<ExportFile>;

        if (data.v !== EXPORT_VERSION) {
          setImportError("Unrecognised file version.");
          setImportStatus("error");
          setTimeout(() => setImportStatus("idle"), 4000);
          return;
        }
        if (!data.params || typeof data.params !== "object") {
          setImportError("File is missing model parameters.");
          setImportStatus("error");
          setTimeout(() => setImportStatus("idle"), 4000);
          return;
        }

        patch({ ...DEFAULTS, ...data.params });

        if (data.guided) {
          restoreProgress({
            done: Array.isArray(data.guided.done) ? data.guided.done : [],
            choices: data.guided.choices ?? {},
          });
        }

        setImportStatus("success");
        setTimeout(() => setImportStatus("idle"), 3000);
      } catch {
        setImportError("Could not read file — is it a valid JSON export?");
        setImportStatus("error");
        setTimeout(() => setImportStatus("idle"), 4000);
      }
    };
    reader.readAsText(file);
  };

  const changedParams = changedParamSummary(params);
  const completedCount = completedModules.size;

  return (
    <div className="relative" ref={panelRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className={`text-xs h-7 px-2 transition-colors ${open ? "text-white/90 bg-white/[0.08]" : "text-white/60 hover:text-white/90"}`}
        title="Save your place — copy a link or download a JSON file that restores all sliders and Guided Mode progress"
      >
        <Link2 className="w-3.5 h-3.5 sm:mr-1.5" />
        <span className="hidden sm:inline">Save / Share</span>
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[300px] rounded-xl shadow-2xl z-50"
          style={{
            background: "hsl(237 28% 9%)",
            border: "1px solid hsl(237 22% 20%)",
            boxShadow: "0 8px 40px hsl(237 35% 3% / 0.7)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid hsl(237 22% 16%)" }}
          >
            <span className="text-xs font-semibold text-white/80">Save your place</span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-4 py-3 space-y-4">
            {/* What gets saved */}
            <p className="text-[11px] text-white/45 leading-relaxed">
              Save your current slider values and Guided Mode progress — either as a shareable link or as a JSON file you can reload later.
            </p>

            {/* Model state */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-white/30">Current model</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "M", value: fmtMultiple(derived.M), color: "text-[hsl(var(--finance))]" },
                  { label: "I", value: fmtNum(derived.I, 0), color: "text-[hsl(var(--impact))]" },
                  { label: "T", value: fmtNum(derived.T, 2), color: "text-[hsl(var(--theology))]" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg px-2.5 py-1.5 text-center"
                    style={{ background: "hsl(237 28% 12%)", border: "1px solid hsl(237 22% 18%)" }}
                  >
                    <div className="text-[9px] text-white/30 uppercase tracking-wider">{item.label}</div>
                    <div className={`font-mono font-semibold text-sm ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              {changedParams.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {changedParams.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: "hsl(237 28% 14%)",
                        color: "hsl(235 80% 72%)",
                        border: "1px solid hsl(237 22% 22%)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-white/25 italic">Default parameters</p>
              )}
            </div>

            {/* Guided progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-white/30">Guided progress</div>
                {completedCount > 0 && (
                  <button
                    onClick={resetProgress}
                    className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                      style={{
                        background: completedModules.has(i)
                          ? "hsl(var(--impact)/0.2)"
                          : "hsl(237 28% 14%)",
                        border: completedModules.has(i)
                          ? "1px solid hsl(var(--impact)/0.4)"
                          : "1px solid hsl(237 22% 22%)",
                        color: completedModules.has(i)
                          ? "hsl(var(--impact))"
                          : "hsl(237 22% 35%)",
                      }}
                      title={MODULE_TITLES[i]}
                    >
                      {completedModules.has(i) ? "✓" : i + 1}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-white/45">
                  {completedCount === 0
                    ? "No modules complete"
                    : `${completedCount} of 6 complete`}
                </span>
              </div>
              {completedCount > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(completedModules).sort().map((i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "hsl(var(--impact)/0.1)",
                        color: "hsl(var(--impact))",
                        border: "1px solid hsl(var(--impact)/0.25)",
                      }}
                    >
                      {MODULE_TITLES[i]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid hsl(237 22% 16%)" }} />

            {/* Copy link */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: copied ? "hsl(var(--impact)/0.15)" : "hsl(235 95% 62% / 0.18)",
                border: copied ? "1px solid hsl(var(--impact)/0.4)" : "1px solid hsl(235 95% 62% / 0.35)",
                color: copied ? "hsl(var(--impact))" : "hsl(235 90% 80%)",
              }}
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5" /> Copied to clipboard</>
              ) : (
                <><Link2 className="w-3.5 h-3.5" /> Copy link</>
              )}
            </button>

            {/* JSON export / import row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: "hsl(237 28% 13%)",
                  border: "1px solid hsl(237 22% 22%)",
                  color: "hsl(237 20% 65%)",
                }}
                title="Download current state as a JSON file"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={
                  importStatus === "success"
                    ? { background: "hsl(var(--impact)/0.15)", border: "1px solid hsl(var(--impact)/0.4)", color: "hsl(var(--impact))" }
                    : importStatus === "error"
                    ? { background: "hsl(0 70% 50% / 0.12)", border: "1px solid hsl(0 70% 50% / 0.35)", color: "hsl(0 70% 65%)" }
                    : { background: "hsl(237 28% 13%)", border: "1px solid hsl(237 22% 22%)", color: "hsl(237 20% 65%)" }
                }
                title="Load a previously downloaded JSON file"
              >
                {importStatus === "success" ? (
                  <><Check className="w-3.5 h-3.5" /> Loaded</>
                ) : importStatus === "error" ? (
                  <><AlertCircle className="w-3.5 h-3.5" /> Error</>
                ) : (
                  <><Upload className="w-3.5 h-3.5" /> Load JSON</>
                )}
              </button>
            </div>

            {importStatus === "error" && importError && (
              <p className="text-[10px] leading-relaxed" style={{ color: "hsl(0 70% 65%)" }}>
                {importError}
              </p>
            )}

            {/* Version note */}
            <p className="text-[9px] text-white/20 italic">
              Links and JSON files include a version identifier — old files will be handled gracefully if the model is updated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

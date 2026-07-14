import { DEFAULTS, type DsfParams } from "./dsfModel";

const SCHEMA_VERSION = 2;

export type GuidedSave = {
  done: number[];
  choices: Record<number, string>;
};

type SavedStateV2 = {
  v: 2;
  params: Partial<DsfParams>;
  guided: GuidedSave;
};

function diffParams(params: DsfParams): Partial<DsfParams> {
  const diff: Partial<DsfParams> = {};
  for (const key of Object.keys(params) as (keyof DsfParams)[]) {
    if (params[key] !== DEFAULTS[key]) {
      (diff as Record<string, unknown>)[key] = params[key];
    }
  }
  return diff;
}

export function encodeParams(params: DsfParams): string {
  return btoa(JSON.stringify(diffParams(params)));
}

export function decodeParams(encoded: string): Partial<DsfParams> {
  try {
    const parsed = JSON.parse(atob(encoded));
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Partial<DsfParams>;
    }
    return {};
  } catch {
    return {};
  }
}

function encodeState(params: DsfParams, guided: GuidedSave): string {
  const state: SavedStateV2 = {
    v: SCHEMA_VERSION,
    params: diffParams(params),
    guided,
  };
  return btoa(JSON.stringify(state));
}

function decodeState(encoded: string): SavedStateV2 | null {
  try {
    const parsed = JSON.parse(atob(encoded));
    if (parsed && typeof parsed === "object" && parsed.v === SCHEMA_VERSION) {
      return parsed as SavedStateV2;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(params: DsfParams, guided?: GuidedSave): string {
  const url = new URL(window.location.href);
  if (guided) {
    url.hash = `v=${SCHEMA_VERSION}&s=${encodeState(params, guided)}`;
  } else {
    url.hash = `state=${encodeParams(params)}`;
  }
  return url.toString();
}

function parseHash(): { v1State?: string; v2State?: string } {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};
  const params = new URLSearchParams(hash);
  const v = params.get("v");
  if (v === String(SCHEMA_VERSION)) {
    return { v2State: params.get("s") ?? undefined };
  }
  const state = params.get("state");
  if (state) return { v1State: state };
  const directMatch = hash.match(/^state=(.+)$/);
  if (directMatch) return { v1State: directMatch[1] };
  return {};
}

export function readParamsFromHash(): Partial<DsfParams> {
  const { v1State, v2State } = parseHash();
  if (v2State) {
    const decoded = decodeState(v2State);
    return decoded?.params ?? {};
  }
  if (v1State) return decodeParams(v1State);
  return {};
}

export function readGuidedFromHash(): GuidedSave | null {
  const { v2State } = parseHash();
  if (!v2State) return null;
  const decoded = decodeState(v2State);
  return decoded?.guided ?? null;
}

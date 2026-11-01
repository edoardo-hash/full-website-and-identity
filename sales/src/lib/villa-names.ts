/**
 * Villa names never reach the sales site (Edo, 30 Oct 2026: reference codes only, never names): neither the owner's
 * real name nor Invenio's marketing name may appear in the sale text, which the HAM writes by hand and may well start
 * with "Can Xxx is…". Copied and adapted from invenio-portal src/lib/real-name.ts (the portal hides only the real name
 * and shows the marketing one); here every name is replaced by "this villa", and the matching is the same: whole
 * words, case- and accent-insensitive, plus the distinctive part without the usual prefix ("Can Toni" → "Toni") when it
 * is 4+ letters and not a place name ("Cala Vadella" stays).
 */
const PREFIX = /^(villa|villas|can|ca'?n|casa|cas|casita|finca|sa|es|el|la|the|cal|son)\s+/i;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function patterns(name: string): string[] {
  const real = name.trim().replace(/\s+/g, " ");
  if (real.length < 3) return [];
  const out = [real];
  const core = real.replace(PREFIX, "").trim();
  if (core !== real && core.length >= 4) out.push(core);
  return out;
}

/**
 * Place words: the distinctive part of a real name is not hidden when it is part of a place name (Edo, 1 Nov 2026:
 * real name "Villa Vadella", bay "Cala Vadella" — the tagline read "above Cala Villa Capella"). The whole real name
 * is still hidden wherever it appears.
 */
const PLACE_WORDS = /(?:^|[^a-z0-9])(?:cala|platja|playa|puig|sant|santa|san|es|sa|ses|cap|punta|port|portinatx|torre|cova|talamanca|badia|bahia|serra)\s+$/;

/** Folded-text regex for whole-word matches of the patterns (accents removed on both sides). */
function matcher(pats: string[]): RegExp | null {
  if (!pats.length) return null;
  const alts = pats.sort((a, b) => b.length - a.length).map((p) => esc(fold(p)).replace(/ /g, "\\s+"));
  return new RegExp(`(^|[^a-z0-9])(${alts.join("|")})(?=$|[^a-z0-9])`, "g");
}

/** A match of the short form (distinctive part only) right after a place word is a place name, not the villa. */
function isPlaceName(folded: string, index: number, matched: string, whole: string[]): boolean {
  if (whole.some((w) => fold(w) === matched)) return false;
  return PLACE_WORDS.test(folded.slice(Math.max(0, index - 12), index));
}

/** The sale text with every villa name (real or marketing) replaced by "this villa". */
export function scrubVillaNames(text: string | null | undefined, names: (string | null | undefined)[], replacement = "this villa"): string | null | undefined {
  if (!text) return text;
  const whole: string[] = [];
  const pats: string[] = [];
  for (const n of names) {
    if (!n) continue;
    const p = patterns(n);
    if (p.length) whole.push(p[0]);
    pats.push(...p);
  }
  const re = matcher([...new Set(pats)]);
  if (!re) return text;
  const chars = [...text];
  const foldedChars = chars.map((c) => fold(c));
  const folded = foldedChars.join("");
  const starts: number[] = [];
  let pos = 0;
  for (const f of foldedChars) {
    starts.push(pos);
    pos += f.length;
  }
  const origAt = (foldedIndex: number) => {
    let i = starts.findIndex((s) => s >= foldedIndex);
    if (i === -1) i = chars.length;
    return chars.slice(0, i).join("").length;
  };
  let out = "";
  let last = 0;
  for (const m of folded.matchAll(re)) {
    if (isPlaceName(folded, (m.index ?? 0) + m[1].length, m[2], whole)) continue;
    const from = origAt((m.index ?? 0) + m[1].length);
    const to = origAt((m.index ?? 0) + m[0].length);
    const atStart = from === 0 || /[.!?]\s+$/.test(text.slice(0, from));
    out += text.slice(last, from) + (atStart ? replacement[0].toUpperCase() + replacement.slice(1) : replacement);
    last = to;
  }
  return out + text.slice(last);
}

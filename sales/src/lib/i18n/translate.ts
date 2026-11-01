import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { getVercelOidcToken } from "@vercel/oidc";
import { EN, type Dict } from "./en";
import { LANG_ENGLISH, type Lang } from ".";
import { OVERRIDES } from "./overrides";
import ES from "./static/es.json";
import IT from "./static/it.json";
import NL from "./static/nl.json";

/**
 * Stored translations (design critique, 30 Oct 2026: a cold cache showed English pages under /es, /it, /nl).
 * src/lib/i18n/static/<lang>.json holds DeepSeek's full translation of the dictionary, exported from dev
 * (/portal/i18n-export?lang=xx) and committed, with the English each value was made from. A value counts only while
 * its English is unchanged; new or changed strings are translated at runtime as before until the next export.
 */
type Stored = { source: Record<string, string>; translations: Record<string, string> };
const STORED: Partial<Record<Lang, Stored>> = { es: ES as Stored, it: IT as Stored, nl: NL as Stored };

/**
 * Translations by the low-cost text model, as in invenio-portal src/lib/ai-text.ts: DeepSeek through the Vercel AI
 * Gateway, authenticated by the deployment's OIDC token, zero data retention. Only website copy and the public sale
 * text are sent, never client data. Results are kept in Vercel's data cache, keyed by a hash of the English text, so
 * each language is translated once and again only when the English changes. On any failure the page shows English.
 */
const BASE = (process.env.AI_TEXT_BASE_URL || "https://ai-gateway.vercel.sh/v1").replace(/\/+$/, "");
const MODEL = process.env.AI_TEXT_MODEL || "deepseek/deepseek-v4-flash";

const KEEP = "Keep unchanged: {placeholders} in curly braces, Invenio Homes, David Ramiro, Ref., €, numbers, place names, " +
  "e-mail addresses and these Spanish legal terms (they may be followed by a translation in brackets): nota simple, escritura, " +
  "arras, cédula, certificado urbanístico, IBI. A word between asterisks (*known*) is emphasised: keep the asterisks around " +
  "the corresponding word in your translation.";

/** Taken in the request itself (before entering the cache), where the deployment's OIDC token is available. */
async function gatewayToken(): Promise<string | null> {
  return process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || (await getVercelOidcToken().catch(() => null));
}

/** After a failed call, this instance shows English for a while instead of making every visitor wait for a retry. */
const failedAt = new Map<string, number>();
const COOLDOWN_MS = 5 * 60_000;
const coolingDown = (key: string) => Date.now() - (failedAt.get(key) ?? 0) < COOLDOWN_MS;

async function complete(token: string | null, system: string, user: string, maxTokens: number): Promise<string> {
  if (!token) throw new Error("no AI gateway credentials");
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      providerOptions: { gateway: { zeroDataRetention: true } },
      reasoning: { enabled: false, exclude: true },
    }),
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AI text ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] };
  const c = body.choices?.[0];
  if (c?.finish_reason === "length") throw new Error("AI text cut off");
  const text = c?.message?.content?.trim();
  if (!text) throw new Error("AI text empty");
  return text;
}

/** Formal address everywhere, buttons and labels included (Edo, 30 Oct 2026: the first run mixed tú/usted and tu/Lei). */
const FORMAL: Record<Lang, string> = {
  en: "",
  es: "Always address the reader formally with usted, never tú, including buttons and imperatives (Venda, Envíe, Descubra; never Vende, Envía).",
  it: "Always address the reader formally with Lei, never tu, including buttons and imperatives (Ci dica, Invii, la Sua registrazione; never Dicci, Invia, la tua).",
  nl: "Always address the reader formally with u, never je or jij, including buttons and imperatives.",
};
/** Bump when the instructions change, so every language is translated again. */
const PROMPT_VERSION = "2";

type Flat = Record<string, string>;
function flatten(o: Record<string, unknown>, pre = ""): Flat {
  const out: Flat = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string") out[pre + k] = v;
    else Object.assign(out, flatten(v as Record<string, unknown>, `${pre}${k}.`));
  }
  return out;
}
function unflatten(flat: Flat, shape: Record<string, unknown>, pre = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(shape)) {
    out[k] = typeof v === "string" ? (typeof flat[pre + k] === "string" && flat[pre + k] ? flat[pre + k] : v) : unflatten(flat, v as Record<string, unknown>, `${pre}${k}.`);
  }
  return out;
}
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
const json = (text: string) => JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));


/** One section of the dictionary (nav, home, property…): small calls in parallel, each cached on its own. */
async function translateSection(lang: Lang, section: string, strings: Flat, token: string | null): Promise<Flat> {
  const system =
    `You translate the website of Invenio Homes, a luxury villa sales agency in Ibiza, from English into ${LANG_ENGLISH[lang]}. ` +
    `Write natural, polished copy for wealthy home buyers and owners. ${FORMAL[lang]} Short UI labels stay short. ` +
    `${KEEP} Answer with one JSON object only: the same keys, translated values.`;
  const started = Date.now();
  const out = json(await complete(token, system, JSON.stringify(strings), 6_000)) as Flat;
  // Any value that lost or gained a placeholder falls back to English.
  for (const [k, v] of Object.entries(strings)) if (typeof out[k] !== "string" || placeholders(out[k]) !== placeholders(v)) out[k] = v;
  console.log(`translated ${lang}/${section}: ${Object.keys(strings).length} strings in ${Date.now() - started} ms`);
  return out;
}

const SECTIONS = Object.keys(EN).map((section) => {
  const strings = flatten((EN as Record<string, Record<string, unknown>>)[section], `${section}.`);
  return { section, strings, hash: createHash("sha1").update(JSON.stringify(strings)).digest("hex").slice(0, 12) };
});
const WAIT_MS = 2_500;
const sleep = (ms: number) => new Promise<null>((r) => setTimeout(() => r(null), ms));

/**
 * The page dictionary for a language. Never keeps a visitor waiting more than WAIT_MS: a section not translated
 * yet is shown in English while its translation finishes in the background (after()), cached for the next visitor.
 */
export async function getDict(lang: Lang): Promise<Dict> {
  if (lang === "en") return EN;
  const stored = STORED[lang];
  const merged: Flat = {};
  const missing = SECTIONS.filter(({ strings }) => {
    let complete = true;
    for (const [k, en] of Object.entries(strings)) {
      if (stored?.source[k] === en && stored.translations[k]) merged[k] = stored.translations[k];
      else complete = false;
    }
    return !complete;
  });
  const token = missing.length ? await gatewayToken() : null;
  const pending: Promise<unknown>[] = [];
  await Promise.all(
    missing.map(async ({ section, strings, hash }) => {
      const key = `dict:${lang}:${section}`;
      if (coolingDown(key)) return;
      const job = unstable_cache(() => translateSection(lang, section, strings, token), ["dict", PROMPT_VERSION, lang, section, hash], { revalidate: false, tags: ["dict"] })().catch(
        (e) => {
          failedAt.set(key, Date.now());
          console.error(`translation ${lang}/${section} failed:`, e instanceof Error ? e.message : e);
          return null;
        },
      );
      const done = await Promise.race([job, sleep(WAIT_MS)]);
      // Stored values win; the runtime fills only what the stored file lacks.
      if (done) {
        for (const [k, v] of Object.entries(done)) if (!(k in merged)) merged[k] = v;
      } else {
        pending.push(job);
      }
    }),
  );
  if (pending.length) after(() => Promise.allSettled(pending));
  Object.assign(merged, OVERRIDES[lang] ?? {});
  return unflatten(merged, EN) as Dict;
}

/** A listing's public sale text in the visitor's language (paragraphs kept). */
export async function translateText(lang: Lang, text: string | null): Promise<string | null> {
  if (!text || lang === "en") return text;
  const key = createHash("sha1").update(text).digest("hex").slice(0, 16);
  if (coolingDown(`text:${lang}:${key}`)) return text;
  const token = await gatewayToken();
  const job = unstable_cache(
      () =>
        complete(
          token,
          `Translate this property description for a luxury villa sales website in Ibiza from English into ${LANG_ENGLISH[lang]}. ` +
            `Keep the paragraphs. ${FORMAL[lang]} ${KEEP} Answer with the translation only.`,
          text,
          4000,
        ),
      ["sale-text", PROMPT_VERSION, lang, key],
      { revalidate: false, tags: ["sale-text"] },
    )().catch(() => {
      failedAt.set(`text:${lang}:${key}`, Date.now());
      return null;
    });
  const done = await Promise.race([job, sleep(WAIT_MS)]);
  if (done) return done;
  after(() => job);
  return text; // English this time; translated for the next visitor
}

/**
 * The whole dictionary translated, waiting as long as it takes (no 2.5 s cap): what /portal/i18n-export returns,
 * to be saved as src/lib/i18n/static/<lang>.json. Uses the same cache as the pages.
 */
export async function exportDict(lang: Lang): Promise<Stored> {
  const token = await gatewayToken();
  const translations: Flat = {};
  const source: Flat = {};
  const results = await Promise.allSettled(
    SECTIONS.map(({ section, strings, hash }) =>
      unstable_cache(() => translateSection(lang, section, strings, token), ["dict", PROMPT_VERSION, lang, section, hash], { revalidate: false, tags: ["dict"] })().then((done) => {
        for (const [k, en] of Object.entries(strings)) {
          // Every key, identical ones too ("WhatsApp {phone}"), so a complete section never calls the model again.
          translations[k] = done[k] || en;
          source[k] = en;
        }
      }),
    ),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed) throw new Error(`${failed} section(s) failed to translate; try again`);
  return { source, translations };
}

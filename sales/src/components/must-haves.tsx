import { fmt } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/en";
import { MUST_HAVE_GROUPS, MUST_HAVES, POPULAR_MUST_HAVES } from "@/lib/rules";

/**
 * Must-have boxes in the company design (.check / .check-grid): the popular ones first, then every feature under its
 * group in a fold (open when something in it is ticked).
 */
export function MustHaveChips({ t, selected = [], legend }: { t: Dict; selected?: string[]; legend: string }) {
  const label = (k: string) => t.mustHave[k] ?? k;
  const box = (k: string) => (
    <label key={k} className="check"><input type="checkbox" name={`m_${k}`} defaultChecked={selected.includes(k)} /><span>{label(k)}</span></label>
  );
  const rest = MUST_HAVE_GROUPS.map((g) => ({ g, keys: MUST_HAVES.filter((m) => m.group === g && !POPULAR_MUST_HAVES.includes(m.key)).map((m) => m.key) })).filter((x) => x.keys.length);
  return (
    <>
      <fieldset className="brief-form__group">
        <legend>{legend}</legend>
        <div className="check-grid">{POPULAR_MUST_HAVES.map(box)}</div>
      </fieldset>
      <details className="more-features" open={rest.some((x) => x.keys.some((k) => selected.includes(k)))}>
        <summary>{t.featureGroups.more}</summary>
        {rest.map(({ g, keys }) => {
          const n = keys.filter((k) => selected.includes(k)).length;
          return (
            <div key={g} className="check-grid">
              <h4>{t.featureGroups[g] ?? g}{n ? ` · ${fmt(t.featureGroups.selected, { n })}` : ""}</h4>
              {keys.map(box)}
            </div>
          );
        })}
      </details>
    </>
  );
}

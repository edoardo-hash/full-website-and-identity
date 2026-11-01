import { submitBrief } from "@/app/actions";
import { MustHaveChips } from "./must-haves";
import { Arrow, DAVID } from "./site";
import type { Dict } from "@/lib/i18n/en";
import type { Lang } from "@/lib/i18n";

/** The buyer brief, in the company design's form (labels above hairline fields). compact = inside a brief-card. */
export function BriefForm({ t, lang, error, compact }: { t: Dict; lang: Lang; error?: boolean; compact?: boolean }) {
  const B = t.brief;
  return (
    <form action={submitBrief} aria-label={B.aria} className={`brief-form${compact ? " brief-form--compact" : ""}`}><div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <input type="hidden" name="lang" value={lang} />
      {error ? <p className="note-err" role="alert">{B.error}</p> : null}
      <div className="brief-form__grid">
        <div className="field"><label htmlFor="b-name">{B.name} <span aria-hidden="true">*</span></label><input id="b-name" name="name" autoComplete="name" required aria-required="true" /></div>
        <div className="field"><label htmlFor="b-email">{B.email}</label><input id="b-email" name="email" type="email" autoComplete="email" /></div>
        <div className="field"><label htmlFor="b-phone">{B.phone}</label><input id="b-phone" name="phone" type="tel" autoComplete="tel" /></div>
        <div className="field">
          <label htmlFor="b-timing">{B.timing}</label>
          <select id="b-timing" name="timing"><option value="Within 3 months">{B.timing1}</option><option value="3 to 12 months">{B.timing2}</option><option value="Just looking">{B.timing3}</option></select>
        </div>
        <div className="field"><label htmlFor="b-min">{B.budgetFrom}</label><input id="b-min" name="min" inputMode="numeric" placeholder={B.examplePrice1} /></div>
        <div className="field"><label htmlFor="b-max">{B.budgetTo}</label><input id="b-max" name="max" inputMode="numeric" placeholder={B.examplePrice2} /></div>
        <div className="field"><label htmlFor="b-areas">{B.areas}</label><input id="b-areas" name="areas" placeholder={B.areasExample} /></div>
        <div className="field">
          <label htmlFor="b-beds">{B.bedsAtLeast}</label>
          <select id="b-beds" name="beds" defaultValue=""><option value="">{t.search.any}</option><option>4</option><option>5</option><option>6</option><option value="7">7+</option></select>
        </div>
      </div>
      <MustHaveChips t={t} legend={t.list.mustHaves} />
      <div className="field field--wide"><label htmlFor="b-msg">{B.anythingElse}</label><textarea id="b-msg" name="message" rows={3} placeholder={B.anythingElseExample} /></div>
      <label className="check-line"><input type="checkbox" name="consent" required /><span>{B.consent}</span></label>
      <div className="brief-form__submit">
        <button className="btn" type="submit">{B.send}<Arrow /></button>
        <span className="form-note">{B.orWrite} <a href={`mailto:${DAVID.email}`}>{DAVID.email}</a></span>
      </div>
    </form>
  );
}

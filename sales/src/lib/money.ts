/**
 * A budget as people type it, in any of the site's languages: "3.5", "3,5", "3.5M", "€2,5 mln", "1.200.000",
 * "1,200,000", "800k", "950 000". With no unit, a small number is read in the unit people mean for a villa: under 100 = millions
 * ("3.5" = €3.5M), 100 to 99,999 = thousands ("950" = €950k, "1.200" = €1.2M); from 100,000 = euros.
 * Review 1 Nov 2026: the old parser read "2,5" as €25M and dropped "1.200.000".
 */
export const money = (raw: string): number | null => {
  let v = raw.toLowerCase().replace(/[€\s\u00a0']/g, "").replace(/eur(os?)?/g, "");
  let mult = 1;
  if (/(m|mln|mio|million|millones|milioni|miljoen)$/.test(v)) { mult = 1e6; v = v.replace(/[a-z]+$/, ""); }
  else if (/k$/.test(v)) { mult = 1e3; v = v.slice(0, -1); }
  if (!/^[\d.,]+$/.test(v)) return null;
  const lastDot = v.lastIndexOf("."), lastComma = v.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // Both: the later one is the decimal mark.
    const dec = lastDot > lastComma ? "." : ",";
    v = v.split(dec === "." ? "," : ".").join("").replace(dec, ".");
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const parts = v.split(sep);
    // "1.200.000" or "1,200" (groups of three) are thousands; "3,5" or "3.75" are decimals.
    const thousands = parts.length > 2 || (parts[1].length === 3 && mult === 1 && parts[0] !== "0");
    v = thousands ? parts.join("") : parts.join(".");
  }
  const n = Number(v) * mult;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (mult === 1 && n < 100) return Math.round(n * 1e6);
  if (mult === 1 && n < 100_000) return Math.round(n * 1e3);
  return Math.round(n);
};

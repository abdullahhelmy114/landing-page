/**
 * Interface strings: a language's own `ui` strings, then the fallback language's (English), then
 * the key itself. "{n}" and other "{name}" parts are filled in; with a number {n}, "a|b" picks a
 * form by number (the first for 3–10, as Arabic counts, the second otherwise).
 */
export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(ui: Record<string, string>, fallback: Record<string, string>): Translate {
  return (key, vars) => {
    let s = ui[key] ?? fallback[key] ?? key;
    // "a|b" is a plural pair only when a number is given; otherwise "|" is plain text (the name forms).
    if (s.includes("|") && vars && "n" in vars) {
      const forms = s.split("|");
      const n = Number(vars?.["n"] ?? 0);
      const mod = n % 100;
      s = (mod >= 3 && mod <= 10 ? forms[0] : forms[1]) ?? forms[0] ?? s;
    }
    return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
  };
}

/** A whole number with this language's thousands separator: 3200 → "3.200" or "3,200". */
export const groupDigits = (n: number, sep: string) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

/** The academy's name as the lockup, titles and alt text show it on a language's page (English form otherwise). */
export const nameFor = (brand: { arabic: string; latin: string; names?: Record<string, string> }, lang: string) =>
  brand.names?.[lang]?.trim() || brand.names?.["en"]?.trim() || `${brand.latin} | ${brand.arabic}`;

/** The tagline for a language, or the fallback language's when it has none of its own. */
export const taglineFor = (tagline: Record<string, string>, lang: string, fallback: string) =>
  tagline[lang]?.trim() ? tagline[lang]! : (tagline[fallback] ?? "");

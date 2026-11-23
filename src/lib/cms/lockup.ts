import type { LockupSetting, Scheme, Tone } from "./types";

/**
 * The four lockup colour schemes. `bg` is the band behind the lockup; `fg` colours the emblem, the
 * names and the tagline. Every pair passes WCAG AA for small text (4.5:1); see lockup.test.ts.
 */
export const SCHEMES: Record<Scheme, { name: string; bg: string; fg: string }> = {
  1: { name: "كريمي على كحلي داكن", bg: "#071027", fg: "#f3ead7" },
  2: { name: "ذهبي فاتح على كحلي داكن", bg: "#071027", fg: "#e8cf8f" },
  3: { name: "كحلي داكن على كريمي", bg: "#f3ead7", fg: "#071027" },
  4: { name: "كحلي داكن على ذهبي خردلي", bg: "#d0a348", fg: "#071027" },
};

/** The scheme picked automatically for a background: light gold on navy, navy on cream or gold. */
export const AUTO_SCHEME: Record<Tone, Scheme> = { navy: 2, cream: 3, gold: 4 };

export const TONE_LABELS: Record<Tone, string> = { navy: "كحلي داكن", cream: "كريمي", gold: "ذهبي خردلي" };

export const resolveScheme = (s: LockupSetting | undefined): Scheme =>
  s && s.scheme !== "auto" ? s.scheme : AUTO_SCHEME[s?.tone ?? "navy"];

// WCAG 2.x contrast ratio between two #rrggbb colours.
const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

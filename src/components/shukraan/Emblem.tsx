import type { CSSProperties } from "react";

import { EMBLEM_FILL_RULE, EMBLEM_PATH, EMBLEM_VIEWBOX } from "./emblem-path";

/**
 * The academy emblem as inline SVG in currentColor: set `color` (or a text-* class) to tint it.
 * With `label` it is announced as an image; without, it is decorative.
 */
export function Emblem({ label, className, style }: { label?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox={EMBLEM_VIEWBOX} className={className} style={style} focusable="false" {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      <path fill="currentColor" fillRule={EMBLEM_FILL_RULE} d={EMBLEM_PATH} />
    </svg>
  );
}

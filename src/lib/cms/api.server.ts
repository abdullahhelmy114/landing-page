import type { Op } from "./ops";
import { SECTION_TYPES, type PageSettings, type SectionType, type SiteConfig } from "./types";

/** Checks the shape of panel operations before they reach the store (anything odd is refused). */
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const isPath = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.length <= 12 && v.every((k) => typeof k === "string" && k.length > 0 && k.length <= 80 && !BAD_KEYS.has(k.replace(/^#/, "")));
const isId = (v: unknown): v is string => typeof v === "string" && /^[\w-]{1,60}$/.test(v);
const isLang = (v: unknown): v is string => typeof v === "string" && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(v);

export function parseOps(body: unknown): Op[] | null {
  const ops = (body as { ops?: unknown } | null)?.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 50) return null;
  const out: Op[] = [];
  for (const raw of ops) {
    const o = raw as Record<string, unknown>;
    switch (o["op"]) {
      case "setText":
        if (!isLang(o["lang"]) || !isPath(o["path"]) || typeof o["value"] !== "string" || o["value"].length > 20_000) return null;
        out.push({ op: "setText", lang: o["lang"], path: o["path"], value: o["value"] });
        break;
      case "setValue":
        if (!isPath(o["path"]) || !(typeof o["value"] === "string" || typeof o["value"] === "boolean") || String(o["value"]).length > 2000) return null;
        out.push({ op: "setValue", path: o["path"], value: o["value"] });
        break;
      case "setImage":
        if (!isPath(o["path"]) || typeof o["src"] !== "string" || o["src"].length > 500) return null;
        out.push({ op: "setImage", path: o["path"], src: o["src"] });
        break;
      case "setAlt":
        if (!isLang(o["lang"]) || !isPath(o["path"]) || typeof o["value"] !== "string" || o["value"].length > 500) return null;
        out.push({ op: "setAlt", lang: o["lang"], path: o["path"], value: o["value"] });
        break;
      case "addSection":
        if (!SECTION_TYPES.includes(o["type"] as never) || !(o["after"] === undefined || o["after"] === "" || isId(o["after"]))) return null;
        out.push({ op: "addSection", type: o["type"] as SectionType, ...(typeof o["after"] === "string" ? { after: o["after"] } : {}) });
        break;
      case "duplicateSection":
      case "deleteSection":
        if (!isId(o["id"])) return null;
        out.push({ op: o["op"], id: o["id"] });
        break;
      case "moveSection":
        if (!isId(o["id"]) || !Number.isInteger(o["to"])) return null;
        out.push({ op: "moveSection", id: o["id"], to: o["to"] as number });
        break;
      case "setHidden":
        if (!isId(o["id"]) || typeof o["hidden"] !== "boolean") return null;
        out.push({ op: "setHidden", id: o["id"], hidden: o["hidden"] });
        break;
      case "listAdd": {
        if (!isPath(o["path"]) || !(o["after"] === undefined || isId(o["after"]))) return null;
        const tpl = o["template"];
        if (tpl !== undefined && (typeof tpl !== "object" || tpl === null || Array.isArray(tpl) || JSON.stringify(tpl).length > 2000 || Object.keys(tpl).some((k) => BAD_KEYS.has(k)))) return null;
        out.push({ op: "listAdd", path: o["path"], ...(typeof o["after"] === "string" ? { after: o["after"] } : {}), ...(tpl ? { template: tpl as Record<string, unknown> } : {}) });
        break;
      }
      case "listDelete":
        if (!isPath(o["path"]) || !isId(o["id"])) return null;
        out.push({ op: "listDelete", path: o["path"], id: o["id"] });
        break;
      case "listMove":
        if (!isPath(o["path"]) || !isId(o["id"]) || !Number.isInteger(o["to"])) return null;
        out.push({ op: "listMove", path: o["path"], id: o["id"], to: o["to"] as number });
        break;
      default:
        return null;
    }
  }
  return out;
}

export function parseSettings(body: unknown): PageSettings | null {
  const s = (body as { settings?: unknown } | null)?.settings;
  if (!s || typeof s !== "object") return null;
  return s as PageSettings;
}

export function parseSite(body: unknown): SiteConfig | null {
  const s = (body as { site?: unknown } | null)?.site as SiteConfig | undefined;
  if (!s || typeof s !== "object" || !Array.isArray(s.languages) || typeof s.tagline !== "object" || !s.brand) return null;
  return s;
}

import { newId, newSection, sectionTitle } from "./sections";
import type { LangContent, Section, SectionType, TrashEntry } from "./types";

/**
 * Draft operations. Structural ones (sections, list items, image files, switches) apply to every
 * language at once, so all languages keep the same ids and order; text and alt text apply to one.
 * A path is a list of keys; "#id" picks the array element with that id.
 */
export type Op =
  | { op: "setText"; lang: string; path: string[]; value: string }
  | { op: "setValue"; path: string[]; value: string | boolean }
  | { op: "setImage"; path: string[]; src: string }
  | { op: "setAlt"; lang: string; path: string[]; value: string }
  | { op: "addSection"; type: SectionType; after?: string }
  | { op: "duplicateSection"; id: string }
  | { op: "deleteSection"; id: string }
  | { op: "restoreSection"; entry: TrashEntry }
  | { op: "moveSection"; id: string; to: number }
  | { op: "setHidden"; id: string; hidden: boolean }
  | { op: "listAdd"; path: string[]; after?: string; template?: Record<string, unknown> }
  | { op: "listDelete"; path: string[]; id: string }
  | { op: "listMove"; path: string[]; id: string; to: number };

export type Drafts = Record<string, LangContent>;

export class OpError extends Error {}

type Obj = Record<string, unknown>;

function step(cur: unknown, key: string): unknown {
  if (Array.isArray(cur)) {
    if (!key.startsWith("#")) throw new OpError(`array needs #id, got ${key}`);
    return cur.find((x) => (x as Obj | null)?.["id"] === key.slice(1));
  }
  if (cur && typeof cur === "object") return (cur as Obj)[key];
  return undefined;
}

/** The value at a path, or undefined. */
export function getAt(root: unknown, path: string[]): unknown {
  let cur = root;
  for (const k of path) {
    cur = step(cur, k);
    if (cur === undefined) return undefined;
  }
  return cur;
}

/** Sets a value at a path whose parent exists (an object). */
export function setAt(root: unknown, path: string[], value: unknown) {
  if (path.length === 0) throw new OpError("empty path");
  const parent = getAt(root, path.slice(0, -1));
  const key = path[path.length - 1]!;
  if (!parent || typeof parent !== "object" || Array.isArray(parent) || key.startsWith("#")) throw new OpError(`no field at ${path.join("/")}`);
  const prev = (parent as Obj)[key];
  if (prev !== undefined && typeof prev === "object" && prev !== null) throw new OpError(`not a value at ${path.join("/")}`);
  (parent as Obj)[key] = value;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const langs = (d: Drafts) => Object.keys(d);

function sectionIndex(c: LangContent, id: string) {
  const i = c.sections.findIndex((s) => s.id === id);
  if (i < 0) throw new OpError(`no section ${id}`);
  return i;
}

/** Re-ids a section's list items so a copy never shares item ids with its source. */
function reId(section: Section, idMap: Map<string, string>) {
  const walk = (v: unknown) => {
    if (Array.isArray(v)) {
      for (const it of v) {
        if (it && typeof it === "object" && typeof (it as Obj)["id"] === "string") {
          const old = (it as Obj)["id"] as string;
          if (!idMap.has(old)) idMap.set(old, newId("i"));
          (it as Obj)["id"] = idMap.get(old);
        }
        walk(it);
      }
    } else if (v && typeof v === "object") for (const x of Object.values(v)) walk(x);
  };
  walk(section.fields);
}

/** Applies one operation to the drafts of every language (in place); returns a trash entry for deletions. */
export function applyOp(drafts: Drafts, op: Op, now = new Date()): { trash?: TrashEntry } {
  const all = langs(drafts);
  switch (op.op) {
    case "setText": {
      const c = drafts[op.lang];
      if (!c) throw new OpError(`no language ${op.lang}`);
      const prev = getAt(c, op.path);
      if (prev !== undefined && typeof prev !== "string") throw new OpError("not a text");
      setAt(c, op.path, op.value);
      return {};
    }
    case "setValue":
      for (const l of all) setAt(drafts[l], op.path, op.value);
      return {};
    case "setImage":
      for (const l of all) {
        const img = getAt(drafts[l], op.path) as Obj | undefined;
        if (!img || typeof img !== "object") throw new OpError("no image there");
        img["src"] = op.src;
      }
      return {};
    case "setAlt": {
      const img = getAt(drafts[op.lang], op.path) as Obj | undefined;
      if (!img || typeof img !== "object") throw new OpError("no image there");
      img["alt"] = op.value;
      return {};
    }
    case "addSection": {
      const id = newId("s");
      const ids = [newId("i"), newId("i"), newId("i")];
      for (const l of all) {
        const c = drafts[l]!;
        // after: a section id; "" puts it first; no `after` puts it last.
        const at = op.after === "" ? 0 : op.after ? sectionIndex(c, op.after) + 1 : c.sections.length;
        c.sections.splice(at, 0, newSection(op.type, l, id, ids));
      }
      return {};
    }
    case "duplicateSection": {
      const id = newId("s");
      const idMap = new Map<string, string>();
      for (const l of all) {
        const c = drafts[l]!;
        const i = sectionIndex(c, op.id);
        const copy = clone(c.sections[i]!);
        copy.id = id;
        reId(copy, idMap);
        c.sections.splice(i + 1, 0, copy);
      }
      return {};
    }
    case "deleteSection": {
      const sections: Record<string, Section> = {};
      let index = 0;
      let type: SectionType = "richtext";
      let title = "";
      for (const l of all) {
        const c = drafts[l]!;
        const i = sectionIndex(c, op.id);
        const [s] = c.sections.splice(i, 1);
        sections[l] = s!;
        index = i;
        type = s!.type;
        title ||= sectionTitle(s!);
      }
      return { trash: { id: op.id, deletedAt: now.toISOString(), index, type, title, sections } };
    }
    case "restoreSection": {
      for (const l of all) {
        const c = drafts[l]!;
        if (c.sections.some((s) => s.id === op.entry.id)) throw new OpError("already on the page");
        const s = op.entry.sections[l] ?? Object.values(op.entry.sections)[0];
        if (!s) throw new OpError("nothing to restore");
        c.sections.splice(Math.min(op.entry.index, c.sections.length), 0, clone({ ...s, id: op.entry.id }));
      }
      return {};
    }
    case "moveSection":
      for (const l of all) {
        const c = drafts[l]!;
        const i = sectionIndex(c, op.id);
        const [s] = c.sections.splice(i, 1);
        c.sections.splice(Math.max(0, Math.min(op.to, c.sections.length)), 0, s!);
      }
      return {};
    case "setHidden":
      for (const l of all) {
        const c = drafts[l]!;
        c.sections[sectionIndex(c, op.id)]!.hidden = op.hidden;
      }
      return {};
    case "listAdd": {
      const id = newId("i");
      for (const l of all) {
        const list = getAt(drafts[l], op.path);
        if (!Array.isArray(list)) throw new OpError("not a list");
        const i = op.after ? list.findIndex((x) => (x as Obj)["id"] === op.after) : list.length - 1;
        const model = (list[i >= 0 ? i : 0] ?? null) as Obj | null;
        const item: Obj = model ? clone(model) : clone(op.template ?? { text: "" });
        item["id"] = id;
        if ("consent" in item) item["consent"] = false;
        list.splice(i >= 0 ? i + 1 : list.length, 0, item);
      }
      return {};
    }
    case "listDelete":
      for (const l of all) {
        const list = getAt(drafts[l], op.path);
        if (!Array.isArray(list)) throw new OpError("not a list");
        const i = list.findIndex((x) => (x as Obj)["id"] === op.id);
        if (i >= 0) list.splice(i, 1);
      }
      return {};
    case "listMove":
      for (const l of all) {
        const list = getAt(drafts[l], op.path);
        if (!Array.isArray(list)) throw new OpError("not a list");
        const i = list.findIndex((x) => (x as Obj)["id"] === op.id);
        if (i < 0) continue;
        const [it] = list.splice(i, 1);
        list.splice(Math.max(0, Math.min(op.to, list.length)), 0, it);
      }
      return {};
  }
}

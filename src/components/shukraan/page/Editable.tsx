"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";

import type { ImageField } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { go, usePage } from "./context";

/**
 * The page's building blocks. On the public page they render plain text, sanitised rich text,
 * images and buttons. In edit mode the same elements become editable in place: text is typed
 * into directly, an image opens the image dialog, list items get move/add/delete buttons and
 * buttons stop navigating so their labels can be edited.
 */

type Common = { path: string[]; as?: ElementType; className?: string | undefined; style?: CSSProperties | undefined; placeholder?: string | undefined; id?: string | undefined };

/** Plain text (React escapes it). Empty text is left out of the public page. */
export function Txt({ path, value, as = "span", className, style, placeholder, multiline, id, dir }: Common & { value: string | undefined; multiline?: boolean; dir?: string }) {
  const { edit } = usePage();
  const Tag = as;
  const v = value ?? "";
  if (!edit) return v ? <Tag id={id} className={className} style={style} dir={dir}>{v}</Tag> : null;
  return (
    <Tag
      key={v}
      id={id}
      dir={dir}
      className={cn(className, "cms-text")}
      style={style}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      data-ph={placeholder ?? "…"}
      data-cms-path={path.join("/")}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.currentTarget.textContent = v;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = e.currentTarget.innerText.replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
        if (next !== v) edit.apply([{ op: "setText", lang: edit.lang, path, value: next }]);
      }}
    >
      {v}
    </Tag>
  );
}

/** Rich text: bold, italic, links and lists (sanitised on the server before it is stored). */
export function Rich({ path, html, as = "div", className, style, placeholder }: Common & { html: string | undefined }) {
  const { edit } = usePage();
  const Tag = as;
  const v = html ?? "";
  if (!edit) return v ? <Tag className={cn(className, "rich")} style={style} dangerouslySetInnerHTML={{ __html: v }} /> : null;
  return (
    <Tag
      key={v}
      className={cn(className, "rich cms-text cms-rich")}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder ?? "…"}
      data-cms-path={path.join("/")}
      dangerouslySetInnerHTML={{ __html: v }}
      onFocus={(e: React.FocusEvent<HTMLElement>) => edit.focusRich(e.currentTarget)}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        // The link button asks for an address in a prompt, which takes focus for a moment.
        if (e.currentTarget.dataset["hold"]) return;
        edit.focusRich(null);
        const next = e.currentTarget.innerHTML.replace(/&nbsp;/g, " ").trim();
        if (next !== v) edit.apply([{ op: "setText", lang: edit.lang, path, value: next === "<br>" ? "" : next }]);
      }}
    />
  );
}

/** An image; in edit mode a click opens the image dialog. */
export function Img({ path, image, className, style, alt, ...rest }: { path: string[]; image: ImageField | undefined; className?: string; style?: CSSProperties; alt?: string } & Record<`data-${string}`, string>) {
  const { edit } = usePage();
  const src = image?.src ?? "";
  if (!edit) {
    // eslint-disable-next-line @next/next/no-img-element
    return src ? <img src={src} alt={alt ?? image?.alt ?? ""} className={className} style={style} {...rest} /> : null;
  }
  const open = () => edit.pickImage(path, image ?? { src: "", alt: "" });
  if (!src)
    return (
      <button type="button" onClick={open} className={cn(className, "cms-img-empty")} style={style}>
        + صورة
      </button>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={image?.alt ?? ""}
      className={cn(className, "cms-img")}
      style={style}
      title="انقر لتغيير الصورة"
      onClick={open}
      {...rest}
    />
  );
}

/** A list item; in edit mode it gets buttons to move it, add one after it or delete it. */
export function Item({ list, id, index, count, as = "div", className, style, children, template, attrs }: { list: string[]; id: string; index: number; count: number; as?: ElementType; className?: string | undefined; style?: CSSProperties | undefined; children: ReactNode; template?: Record<string, unknown>; attrs?: Record<string, string | undefined> }) {
  const { edit } = usePage();
  const Tag = as;
  if (!edit) return <Tag className={className} style={style} {...attrs}>{children}</Tag>;
  const b = "cms-tool";
  return (
    <Tag className={cn(className, "cms-item")} style={style} {...attrs}>
      {children}
      <span className="cms-item-tools" dir="rtl" lang="ar" contentEditable={false}>
        <button type="button" className={b} title="تحريك للأعلى" disabled={index === 0} onClick={() => edit.apply([{ op: "listMove", path: list, id, to: index - 1 }])}>↑</button>
        <button type="button" className={b} title="تحريك للأسفل" disabled={index === count - 1} onClick={() => edit.apply([{ op: "listMove", path: list, id, to: index + 1 }])}>↓</button>
        <button type="button" className={b} title="إضافة عنصر بعده" onClick={() => edit.apply([{ op: "listAdd", path: list, after: id, ...(template ? { template } : {}) }])}>+</button>
        <button
          type="button"
          className={b}
          title="حذف العنصر"
          onClick={() => {
            if (window.confirm("حذف هذا العنصر من كل اللغات؟")) edit.apply([{ op: "listDelete", path: list, id }]);
          }}
        >
          ×
        </button>
      </span>
    </Tag>
  );
}

/** In edit mode, a button that adds the first item to an empty list. */
export function ListAdd({ list, template, label = "+ إضافة عنصر" }: { list: string[]; template: Record<string, unknown>; label?: string }) {
  const { edit } = usePage();
  if (!edit) return null;
  return (
    <button type="button" dir="rtl" lang="ar" className="cms-add" onClick={() => edit.apply([{ op: "listAdd", path: list, template }])}>
      {label}
    </button>
  );
}

export type ButtonField = { label: string; target: string };

/**
 * A button that scrolls to a section of the page (or runs `onClick`). In edit mode it is a plain
 * element so its label can be typed into; its target is set in the section's fields.
 */
export function Btn({ path, value, className, onClick }: { path: string[]; value: ButtonField | undefined; className?: string; onClick?: () => void }) {
  const { edit } = usePage();
  if (!value) return null;
  if (edit)
    return (
      <span className={className}>
        <Txt path={[...path, "label"]} value={value.label} />
      </span>
    );
  if (!value.label) return null;
  return (
    <button type="button" onClick={onClick ?? (() => value.target && go(value.target))} className={className}>
      {value.label}
    </button>
  );
}

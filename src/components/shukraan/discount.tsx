"use client";

import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";
import { checkDiscountCode, type Discount } from "@/lib/discount";
import { track } from "@/lib/analytics";
import { formatTL, priceFor, type CourseType, type Price } from "./data";

// ── One discount code for the whole page ─────────────────────────────────────────────────────
type Status = "idle" | "checking" | "applied" | "invalid" | "error";

export type DiscountState = {
  discount: Discount | null;
  draft: string;
  status: Status;
  setDraft: (value: string) => void;
  /** Checks the draft with the server and applies it when valid; resolves to the applied discount. */
  apply: () => Promise<Discount | null>;
  /** Applies the code of a referral link's path (/konusma40 …), checked by the server. */
  applyReferral: (path: string) => Promise<Discount | null>;
  remove: () => void;
  /** Restores a code kept in session storage (a return from Whop). */
  restore: (discount: Discount | null) => void;
};

const DiscountContext = createContext<DiscountState | null>(null);

export function useDiscountState(): DiscountState {
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const request = useRef(0);

  const check = useCallback(async (input: { code: string } | { ref: string }) => {
    const id = ++request.current;
    setStatus("checking");
    const result = await checkDiscountCode(input);
    if (id !== request.current) return null;
    // A code the visitor applied (not a referral link) is counted, without the code itself.
    if ("code" in input && result !== "error") track("discount_code_result", { valid: result !== null });
    if (result === "error" || result === null) {
      setStatus(result === null ? "invalid" : "error");
      return null;
    }
    setDiscount(result);
    setDraft(result.code);
    setStatus("applied");
    return result;
  }, []);
  const apply = () => check({ code: draft });
  const applyReferral = useCallback((path: string) => check({ ref: path }), [check]);
  const remove = () => {
    request.current += 1;
    setDiscount(null);
    setDraft("");
    setStatus("idle");
  };
  const restore = useCallback((d: Discount | null) => {
    request.current += 1;
    setDiscount(d);
    setDraft(d?.code ?? "");
    setStatus(d ? "applied" : "idle");
  }, []);
  return {
    discount,
    draft,
    status,
    setDraft: (value) => {
      setDraft(value);
      if (status === "invalid" || status === "error") setStatus("idle");
    },
    apply,
    applyReferral,
    remove,
    restore,
  };
}

export function DiscountProvider({ value, children }: { value: DiscountState; children: ReactNode }) {
  return <DiscountContext value={value}>{children}</DiscountContext>;
}

export function useDiscount(): DiscountState {
  const state = use(DiscountContext);
  if (!state) throw new Error("useDiscount needs a DiscountProvider");
  return state;
}

// ── Prices ───────────────────────────────────────────────────────────────────────────────────
/** A course's regular price and, with a valid code, its discounted price. */
export function useCoursePrice(course: CourseType): { regular: Price; discounted: Price | null } {
  const { discount } = useDiscount();
  const regular = priceFor(course);
  const plan = discount?.plans[course];
  return {
    regular,
    discounted: plan ? { lessons: regular.lessons, perLesson: plan.perLesson, total: plan.total } : null,
  };
}

type Kind = "perLesson" | "total";

const amount = (p: Price, kind: Kind) =>
  kind === "perLesson" ? p.perLesson : p.total;

/**
 * A price as the page shows it: "400" per lesson and "3.200 TL" for a total, or with a
 * code the regular one struck through beside the discounted one ("~~400~~ 250").
 */
export function Amount({ course, kind }: { course: CourseType; kind: Kind }) {
  const { regular, discounted } = useCoursePrice(course);
  const show = (p: Price) => `${formatTL(amount(p, kind))}${kind === "perLesson" ? "" : " TL"}`;
  if (!discounted) return show(regular);
  return (
    <>
      <s className="opacity-60 decoration-2">{show(regular)}</s> {show(discounted)}
    </>
  );
}

// ── The code field ───────────────────────────────────────────────────────────────────────────
/** The discount-code field; every instance on the page edits the same code. */
export function DiscountField({ tone = "light" }: { tone?: "light" | "navy" }) {
  const { discount, draft, status, setDraft, apply, remove } = useDiscount();
  const navy = tone === "navy";
  const message =
    status === "applied"
      ? "İndirim uygulandı."
      : status === "invalid"
        ? "Bu kod geçerli değil."
        : status === "error"
          ? "Kod kontrol edilemedi. Lütfen tekrar dene."
          : "";
  return (
    <div data-discount-field>
      <div className="flex gap-2">
        <input
          aria-label="İndirim kodu"
          placeholder="İndirim kodu"
          autoComplete="off"
          spellCheck={false}
          value={discount ? discount.code : draft}
          readOnly={!!discount}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (!discount && status !== "checking") void apply();
          }}
          className={`min-w-0 flex-1 rounded-full border px-4 py-2.5 text-sm uppercase outline-none transition placeholder:normal-case focus:border-gold focus:ring-2 focus:ring-gold/30 ${
            navy
              ? "border-on-navy/25 bg-on-navy/10 text-on-navy placeholder:text-on-navy/50"
              : "border-input bg-card text-foreground"
          }`}
        />
        {discount ? (
          <button
            type="button"
            onClick={remove}
            className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition ${
              navy ? "border-on-navy/40 text-on-navy hover:border-gold" : "border-primary/30 text-primary"
            }`}
          >
            Kaldır
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void apply()}
            disabled={status === "checking"}
            className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-gold transition hover:scale-[1.03] disabled:opacity-60"
          >
            Uygula
          </button>
        )}
      </div>
      <p
        role="status"
        className={`mt-2 min-h-5 text-xs ${
          status === "applied" ? (navy ? "text-gold-soft" : "text-primary") : navy ? "text-red-300" : "text-destructive"
        }`}
      >
        {message}
      </p>
    </div>
  );
}

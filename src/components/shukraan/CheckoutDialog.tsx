"use client";

import { useEffect, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { loadWhop } from "@whop/elements";
import { Checkout, CheckoutElement, WhopElements, type Appearance } from "@whop/elements-react";
import { X } from "lucide-react";

import { Dialog, DialogDescription, DialogPortal, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eyebrow } from "./Eyebrow";

/** The page's palette (src/styles.css) in hex, for the checkout frame that page CSS cannot reach. */
const COLORS = {
  gold: "#d0a348",
  navyDeep: "#071027",
  card: "#fefcf7",
  foreground: "#0d1936",
};

const APPEARANCE: Appearance = {
  theme: { appearance: "light", accentColor: "gold", grayColor: "sand" },
  classes: {
    "whop-Checkout": { backgroundColor: COLORS.card, color: COLORS.foreground },
    "whop-CheckoutPayButton": {
      backgroundColor: COLORS.gold,
      color: COLORS.navyDeep,
      borderRadius: "9999px",
      fontWeight: "600",
    },
  },
};

/** Mounted only while its dialog is open, so every opening creates a fresh checkout for its plan. */
function PlanCheckout({ planId }: { planId: string }) {
  const [elements] = useState(loadWhop);
  const [returnUrl] = useState(() => `${window.location.origin}/thank-you`);
  const [retry, setRetry] = useState<(() => void) | null>(null);

  return (
    <WhopElements elements={elements} onLoadError={(_error, again) => setRetry(() => again)}>
      {retry ? (
        <div className="rounded-2xl bg-secondary p-4 text-sm text-primary">
          <p>Ödeme formu yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
          <button
            type="button"
            onClick={() => {
              setRetry(null);
              retry();
            }}
            className="mt-3 rounded-full border border-primary/30 px-5 py-2.5 text-sm font-medium text-primary"
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        <Checkout
          plan={planId}
          returnUrl={returnUrl}
          appearance={APPEARANCE}
          locale="tr"
          fallback={<p className="py-10 text-center text-sm text-muted-foreground">Ödeme formu yükleniyor…</p>}
        >
          <CheckoutElement />
        </Checkout>
      )}
    </WhopElements>
  );
}

/**
 * Whop's embedded checkout in a page-styled dialog. The dialog is non-modal so Whop's own
 * overlays (3-D Secure, sign-in codes) stay clickable; the backdrop and scroll lock are ours.
 */
export function CheckoutDialog({
  planId,
  title,
  total,
  children,
}: {
  planId: string;
  title: string;
  total: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const { overflow, paddingRight } = root.style;
    const gutter = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (gutter > 0) root.style.paddingRight = `${gutter}px`;
    return () => {
      root.style.overflow = overflow;
      root.style.paddingRight = paddingRight;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-navy-deep/80 backdrop-blur-sm animate-in fade-in-0"
        />
        <DialogPrimitive.Content
          data-plan-id={planId}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[2rem] bg-card p-6 text-foreground shadow-elegant ring-1 ring-gold/25 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-8"
        >
          <div className="absolute inset-x-10 top-0 h-px gold-rule" />
          <div className="pe-10">
            <Eyebrow>Ödeme</Eyebrow>
            <DialogTitle className="mt-3 font-serif text-3xl font-semibold leading-tight text-primary">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">{total}</DialogDescription>
          </div>
          <div className="mt-6 min-h-40">
            <PlanCheckout key={planId} planId={planId} />
          </div>
          <DialogPrimitive.Close className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-gold/50 text-gold transition hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40">
            <X className="h-4 w-4" />
            <span className="sr-only">Kapat</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

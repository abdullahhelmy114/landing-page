"use client";

import { useState } from "react";
import { loadWhop } from "@whop/elements";
import { Checkout, CheckoutElement, WhopElements, type Appearance } from "@whop/elements-react";

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

/**
 * Whop's embedded checkout for one plan. Options are fixed when a checkout is created, so give
 * this a `key` per plan: a new plan mounts a new checkout. `returnUrl` brings the buyer back to
 * this page (Whop appends `payment` and `status`).
 */
export function WhopCheckout({ planId, onPaid }: { planId: string; onPaid: () => void }) {
  const [elements] = useState(loadWhop);
  const [returnUrl] = useState(() => `${window.location.origin}${window.location.pathname}`);
  const [retry, setRetry] = useState<(() => void) | null>(null);

  return (
    <WhopElements elements={elements} onLoadError={(_error, again) => setRetry(() => again)}>
      {retry ? (
        <div className="rounded-2xl bg-secondary p-4 text-sm text-primary">
          <p>Ödeme formu yüklenemedi. Bağlantını kontrol edip tekrar dene.</p>
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
          onComplete={(done) => {
            if (done.result === "payment") onPaid();
          }}
          fallback={<p className="py-10 text-center text-sm text-muted-foreground">Ödeme formu yükleniyor…</p>}
        >
          <CheckoutElement />
        </Checkout>
      )}
    </WhopElements>
  );
}

"use client";

import { useState } from "react";
import { loadWhop } from "@whop/elements";
import { Checkout, CheckoutElement, WhopElements, type Appearance } from "@whop/elements-react";
import { usePage } from "./page/context";

/** Languages Whop's checkout speaks; any other (Arabic among them) shows it in English. */
const WHOP_LOCALES = ["en", "es", "zh", "nl", "pt", "de", "hu", "it", "fr", "ja", "pl", "tr"] as const;
type WhopLocale = (typeof WHOP_LOCALES)[number];

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
  const { t, lang } = usePage();
  const locale: WhopLocale = (WHOP_LOCALES as readonly string[]).includes(lang) ? (lang as WhopLocale) : "en";

  return (
    <WhopElements elements={elements} onLoadError={(_error, again) => setRetry(() => again)}>
      {retry ? (
        <div className="rounded-2xl bg-secondary p-4 text-sm text-primary">
          <p>{t("checkout.failed")}</p>
          <button
            type="button"
            onClick={() => {
              setRetry(null);
              retry();
            }}
            className="mt-3 rounded-full border border-primary/30 px-5 py-2.5 text-sm font-medium text-primary"
          >
            {t("checkout.retry")}
          </button>
        </div>
      ) : (
        <Checkout
          plan={planId}
          returnUrl={returnUrl}
          appearance={APPEARANCE}
          locale={locale}
          onComplete={(done) => {
            if (done.result === "payment") onPaid();
          }}
          fallback={<p className="py-10 text-center text-sm text-muted-foreground">{t("checkout.loading")}</p>}
        >
          <CheckoutElement />
        </Checkout>
      )}
    </WhopElements>
  );
}

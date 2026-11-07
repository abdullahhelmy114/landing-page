import { useEffect, useRef, useState } from "react";
import { GROUP_TITLE, priceFor, courseTitle, type CourseType, type Gender, type WhatsAppInvite } from "./data";
import { Amount, DiscountField, useDiscount } from "./discount";
import { Button } from "@/components/ui/button";
import { WHOP_PLANS } from "@/lib/whop-plans";
import {
  DONE_STEP,
  EMPTY_ANSWERS,
  PAY_STEP,
  forgetPayingStep,
  markPaid,
  onSave,
  refusedStep,
  rememberPayingStep,
  resumePoint,
  saveRegistrations,
  type Answers,
} from "./registration";
import { WhopCheckout } from "./WhopCheckout";

export type Preset = { course: CourseType; nonce: number } | null;

const field =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30";
const label = "mb-1.5 block text-xs font-medium text-foreground";

const STEP_TITLES = [
  ["Grup tercihi", "Size uygun grubu seçin"],
  ["İletişim", "Size nasıl ulaşalım?"],
  ["Ödeme", "Ödemenizi tamamlayın"],
];
const STEPS = [0, 1, 2, 3];

export function RegisterForm({ preset }: { preset: Preset }) {
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [f, setF] = useState<Answers>(EMPTY_ANSWERS);
  // The WhatsApp step's invite, from the save's answer: undefined while waiting, null if none.
  const [invite, setInvite] = useState<WhatsAppInvite | null | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const set = (k: keyof Answers, v: string) => setF((p) => ({ ...p, [k]: v }));
  // The page's one discount code, entered in the payment step.
  const { discount, restore } = useDiscount();

  // A price card's course prefills the form (adjusting state while rendering).
  const [appliedPreset, setAppliedPreset] = useState<Preset>(null);
  if (preset !== appliedPreset) {
    setAppliedPreset(preset);
    if (preset) {
      setF((p) => ({ ...p, course: preset.course }));
      setStep(0);
    }
  }

  // The save that follows payment answers with the group's WhatsApp link and QR code.
  useEffect(
    () =>
      onSave((e) => {
        if (e.answers.gender !== f.gender || e.answers.course !== f.course || e.answers.email !== f.email) return;
        if (e.saved) setInvite(e.invite);
        else setInvite((prev) => (prev === undefined ? null : prev));
      }),
    [f.gender, f.course, f.email],
  );

  // Back from Whop's returnUrl, or reloaded mid-payment: resume from session storage.
  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    if (status !== null || url.searchParams.has("payment")) {
      url.searchParams.delete("status");
      url.searchParams.delete("payment");
      window.history.replaceState(window.history.state, "", url);
    }
    const point = resumePoint(status);
    saveRegistrations();
    if (!point) return;
    // Session storage exists only in the browser, so a resumed form is applied after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    setF(point.answers);
    setStep(point.step);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (point.discount) restore(point.discount);
    document.getElementById("basvuru")?.scrollIntoView();
  }, [restore]);

  // While the payment step is open, its answers and step are kept for the return from Whop.
  useEffect(() => {
    if (step === PAY_STEP) rememberPayingStep(f, discount);
    else if (step < PAY_STEP) forgetPayingStep();
  }, [step, f, discount]);

  const PRICE = priceFor(f.course);
  // A valid code opens its discounted plan; otherwise the regular plan.
  const planId = discount?.plans[f.course].planId ?? WHOP_PLANS[f.course].planId;

  const validate = (i: number) => {
    const root = ref.current?.querySelector<HTMLElement>(`[data-step="${i}"]`);
    if (!root) return true;
    for (const c of root.querySelectorAll<HTMLInputElement>("input,select,textarea")) {
      if (c.required && c.type !== "checkbox" && c.tagName !== "SELECT")
        c.setCustomValidity(c.value.trim() ? "" : "Lütfen bu alanı doldurun.");
      if (!c.checkValidity()) {
        c.reportValidity();
        c.focus();
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validate(step)) return;
    setErr("");
    if (step < PAY_STEP - 1) return setStep(step + 1);
    // Nobody pays for a registration the API would refuse: check it with the API's own rules.
    const refused = refusedStep({ ...f, code: discount?.code ?? "" });
    if (refused !== null) {
      setStep(refused);
      setErr("Bazı bilgiler geçersiz görünüyor. Lütfen alanları kontrol edin.");
      return;
    }
    setStep(PAY_STEP);
  };

  /** Whop reported the payment complete: open the WhatsApp step and save the registration (once). */
  const paid = () => {
    markPaid({ ...f, code: discount?.code ?? "" });
    setStep(DONE_STEP);
    // Whop usually sends the tab to returnUrl right away; that page then does the saving.
    saveRegistrations(1_500);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const progress = (
    <div className="flex gap-2">
      {STEPS.map((i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-gold" : "bg-border"}`}
        />
      ))}
    </div>
  );

  if (step === DONE_STEP && f.gender) {
    const title = GROUP_TITLE[f.gender];
    return (
      <div ref={ref} className="glass scroll-mt-28 rounded-3xl p-6 sm:p-8">
        {progress}
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
          {STEPS.length} / {STEPS.length} · Başvurunuz alındı
        </p>
        <h3 className="mt-2 text-3xl font-semibold text-primary">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Başvurunuz akademiye kaydedildi. Ödeme, kayıt sırasında bu sayfa üzerinden yapılır;
          koltuğunuz ödemeniz doğrulandıktan sonra kesinleşir.
        </p>
        {invite === undefined ? (
          <div aria-busy="true" className="mt-6 h-24 animate-pulse rounded-2xl bg-secondary" />
        ) : invite ? (
        <div className="mt-6 grid items-center gap-6 sm:grid-cols-[180px_1fr]">
          <div className="rounded-2xl bg-card p-3 shadow-gold ring-1 ring-gold/40">
            <img
              src={invite.qr}
              alt={`${title} — WhatsApp QR kodu`}
              className="aspect-square w-full rounded-lg object-contain"
            />
          </div>
          <div>
            <a
              href={invite.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-accent-foreground shadow-gold transition hover:scale-[1.03]"
            >
              WhatsApp grubuna katıl ↗
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              Telefondaysanız düğmeyi kullanın. Başka bir cihazdaysanız QR kodunu telefonunuzla
              okutun.
            </p>
          </div>
        </div>
        ) : (
          <p data-no-invite className="mt-6 rounded-2xl bg-secondary p-4 text-sm text-primary">
            Ödemeniz alındı. Grubunuzun WhatsApp bağlantısı en kısa sürede size iletilecek.
          </p>
        )}
        <div className="mt-6">
          <Button
            type="button"
            onClick={() => {
              setInvite(undefined);
              setStep(0);
            }}
            variant="outline" className="h-auto rounded-full border border-primary/30 px-5 py-2.5 text-sm font-medium text-primary"
          >
            Yeni başvuru / düzenle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="glass scroll-mt-28 rounded-3xl p-6 sm:p-8">
      {progress}
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
        {step + 1} / {STEPS.length} · {STEP_TITLES[step]?.[0]}
      </p>
      <h3 className="mt-1 text-2xl font-semibold text-primary">{STEP_TITLES[step]?.[1]}</h3>

      <form onSubmit={(e) => e.preventDefault()} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity?.("")} className="mt-6">
        <div data-step="0" hidden={step !== 0} className="space-y-4">
          <fieldset>
            <legend className={label}>Kurs türü *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["regular", "intensive"] as CourseType[]).map((course) => (
                <label key={course} className="flex cursor-pointer items-start gap-2 rounded-lg border border-input bg-card p-3 text-sm text-primary">
                  <input type="radio" name="course" value={course} checked={f.course === course} onChange={() => setF((p) => ({ ...p, course }))} className="mt-1 accent-primary" />
                  <span>{courseTitle(course)}<span className="mt-1 block text-xs text-muted-foreground">{priceFor(course).lessons} ders · <Amount course={course} kind="total" /></span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className={label}>Grup türü *</label>
            <select
              required
              className={field}
              value={f.gender}
              onChange={(e) => setF((p) => ({ ...p, gender: e.target.value as Gender }))}
            >
              <option value="">Kadın / Erkek seçiniz</option>
              <option value="Kadın">Kadın grubu</option>
              <option value="Erkek">Erkek grubu</option>
            </select>
          </div>
        </div>

        <div data-step="1" hidden={step !== 1} className="space-y-4">
          <div>
            <label className={label}>Adınız ve soyadınız *</label>
            <input required className={field} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Adınız ve soyadınız" />
          </div>
          <div>
            <label className={label}>WhatsApp numaranız (ülke koduyla) *</label>
            <input required type="tel" pattern="\+?[0-9 ]{8,}" className={field} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+90 5..." />
          </div>
          <div>
            <label className={label}>E-posta adresiniz *</label>
            <input required type="email" className={field} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="ad@ornek.com" />
          </div>
          <div>
            <label className={label}>Arapça konuşma hedefiniz *</label>
            <textarea required rows={3} className={field} value={f.goal} onChange={(e) => set("goal", e.target.value)} placeholder="Arapçayı hangi durumlarda daha rahat konuşmak istiyorsunuz?" />
          </div>
          <p className="rounded-2xl bg-secondary p-4 text-sm text-primary">
            <Amount course={f.course} kind="perLesson" /> TL/50 dk × {PRICE.lessons} ders = <Amount course={f.course} kind="total" />
          </p>
        </div>

        {step === PAY_STEP && (
          <div data-step="2" data-plan-id={planId} className="space-y-4">
            <div className="rounded-2xl bg-secondary p-4 text-sm text-primary">
              <p className="font-semibold">{courseTitle(f.course)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{PRICE.lessons} ders · <Amount course={f.course} kind="total" /></p>
            </div>
            <DiscountField />
            <WhopCheckout key={planId} planId={planId} onPaid={paid} />
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button type="button" onClick={() => setStep(step - 1)} variant="outline" className="h-auto rounded-full border border-primary/30 px-6 py-3 text-sm font-medium text-primary">
              Geri
            </Button>
          ) : (
            <span />
          )}
          {step < PAY_STEP && (
            <Button type="button" onClick={next} className="h-auto whitespace-normal disabled:opacity-60 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:scale-[1.03]">
              Devam et →
            </Button>
          )}
        </div>
        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      </form>
    </div>
  );
}

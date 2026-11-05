import { useRef, useState } from "react";
import { WHATSAPP, qrFor, groupsFor, priceFor, courseTitle, waitlistFor, type CourseType, type Gender } from "./data";
import { Button } from "@/components/ui/button";

export type Preset = { gender: Gender; groupId: string; course: CourseType; nonce: number } | null;

const field =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30";
const label = "mb-1.5 block text-xs font-medium text-foreground";

const STEP_TITLES = [
  ["Grup tercihi", "Size uygun grubu seçin"],
  ["İletişim", "Size nasıl ulaşalım?"],
  ["Özel teklif", "Teklif uygunluğunuz"],
  ["Kontrol", "Tercihlerinizi gözden geçirin"],
];

const ELIGIBLE = [
  { v: "dad", t: "ضاد (Dâd) topluluğu üyesiyim" },
  { v: "other", t: "Diğer" },
];

export function RegisterForm({ preset }: { preset: Preset }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    course: "intensive" as CourseType,
    gender: "" as Gender | "",
    group: "",
    level: "",
    availability: "",
    name: "",
    phone: "",
    email: "",
    goal: "",
    eligible: "",
    confirm: false,
  });
  const ref = useRef<HTMLDivElement>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  // A group picked in the list above prefills the form (adjusting state while rendering).
  const [appliedPreset, setAppliedPreset] = useState<Preset>(null);
  if (preset !== appliedPreset) {
    setAppliedPreset(preset);
    if (preset) {
      setF((p) => ({ ...p, course: preset.course, gender: preset.gender, group: preset.groupId }));
      setStep(0);
      setDone(false);
    }
  }

  const PRICE = priceFor(f.course);
  const WAITLIST_NOTE = waitlistFor(f.course);
  const GROUPS = groupsFor(f.course);
  const groups = GROUPS.filter((g) => g.gender === f.gender);
  const group = GROUPS.find((g) => g.id === f.group);

  const price =
    f.eligible === "other"
      ? "Bu fiyat ضاد (Dâd) topluluğu üyeleri için geçerlidir. Size uygulanacak ücret akademi tarafından WhatsApp üzerinden bildirilir."
      : f.eligible
        ? `${PRICE.perLesson} TL/40 dk × ${PRICE.lessons} ders = ${PRICE.total} TL`
        : "Lütfen uygunluk seçiminizi yapın.";

  const summary = [
    courseTitle(f.course),
    f.name.trim(),
    "WhatsApp: " + f.phone.trim(),
    "E-posta: " + f.email.trim(),
    group
      ? `${group.id}${group.full ? " · BEKLEME LİSTESİ" : ""}\n${group.slots.map((s) => `${s.day}: ${s.first} / ${s.second} · 10 dk ara`).join("\n")}`
      : `${f.gender} · Yeni grup talebi\n${f.availability.trim()}`,
    "Seviye: " + f.level,
    "Hedef: " + f.goal.trim(),
    "Uygunluk: " + (ELIGIBLE.find((e) => e.v === f.eligible)?.t ?? ""),
    price,
    ...(group?.full ? [WAITLIST_NOTE] : []),
  ].join("\n\n");

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

  const next = async () => {
    if (!validate(step)) return;
    if (step < 3) return setStep(step + 1);
    if (sending) return;
    setSending(true);
    setErr("");
    try {
      const res = await fetch("/api/public/shukraan-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: f.gender,
          group_id: f.group === "new" ? `${f.gender} new${f.course === "intensive" ? "+" : ""}` : f.group,
          level: f.level,
          availability: f.availability,
          full_name: f.name,
          whatsapp: f.phone,
          email: f.email,
          goal: f.goal,
          eligibility: f.eligible,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error === "DATABASE_URL is not configured"
            ? "Kayıt sistemi şu anda yapılandırılmamış. Lütfen daha sonra tekrar deneyin."
            : data.error === "Invalid input"
              ? "Bazı bilgiler geçersiz görünüyor. Lütfen alanları kontrol edin."
              : "Sunucu başvurunuzu kaydedemedi. Bilgileriniz korunuyor; lütfen tekrar deneyin.",
        );
      }
    } catch (e) {
      setErr(e instanceof TypeError || !(e instanceof Error) ? "Bağlantı kurulamadı. Bilgileriniz korunuyor; lütfen tekrar deneyin." : e.message);
      setSending(false);
      return;
    }
    setSending(false);
    setDone(true);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (done && f.gender) {
    const invite = WHATSAPP[f.gender];
    return (
      <div ref={ref} className="glass scroll-mt-28 rounded-3xl p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
          Başvurunuz alındı
        </p>
        <h3 className="mt-2 text-3xl font-semibold text-primary">{invite.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Başvurunuz akademiye kaydedildi. Ödeme yöntemi bu WhatsApp grubunda paylaşılır;
          koltuğunuz ödemeniz doğrulandıktan sonra kesinleşir.
        </p>
        <div className="mt-6 grid items-center gap-6 sm:grid-cols-[180px_1fr]">
          <div className="rounded-2xl bg-card p-3 shadow-gold ring-1 ring-gold/40">
            <img
              src={qrFor(f.group, f.gender)}
              alt={`${invite.title} — WhatsApp QR kodu`}
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
        <div className="mt-6">
          <Button
            type="button"
            onClick={() => {
              setDone(false);
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
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-gold" : "bg-border"}`}
          />
        ))}
      </div>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
        {step + 1} / 4 · {STEP_TITLES[step]?.[0]}
      </p>
      <h3 className="mt-1 text-2xl font-semibold text-primary">{STEP_TITLES[step]?.[1]}</h3>

      <form onSubmit={(e) => e.preventDefault()} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity?.("")} className="mt-6">
        <div data-step="0" hidden={step !== 0} className="space-y-4">
          <fieldset>
            <legend className={label}>Kurs türü *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["regular", "intensive"] as CourseType[]).map((course) => (
                <label key={course} className="flex cursor-pointer items-start gap-2 rounded-lg border border-input bg-card p-3 text-sm text-primary">
                  <input type="radio" name="course" value={course} checked={f.course === course} onChange={() => setF((p) => ({ ...p, course, group: "" }))} className="mt-1 accent-primary" />
                  <span>{courseTitle(course)}<span className="mt-1 block text-xs text-muted-foreground">{priceFor(course).lessons} ders · {priceFor(course).total} TL</span></span>
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
              onChange={(e) => setF((p) => ({ ...p, gender: e.target.value as Gender, group: "" }))}
            >
              <option value="">Kadın / Erkek seçiniz</option>
              <option value="Kadın">Kadın grubu</option>
              <option value="Erkek">Erkek grubu</option>
            </select>
          </div>
          <div>
            <label className={label}>Tercih ettiğiniz grup *</label>
            <select required className={field} value={f.group} onChange={(e) => set("group", e.target.value)}>
              <option value="">Grup seçiniz</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id} disabled={f.course === "regular" && g.full}>
                  {g.id} · {g.slots.map((s) => `${s.day} ${s.first.slice(0, 5)}`).join(" + ")}{g.full ? f.course === "intensive" ? " · Dolu — Bekleme listesi" : " · Dolu" : ""}
                </option>
              ))}
              {f.gender && <option value="new">Yeni bir gruba katılmak istiyorum</option>}
            </select>
          </div>
          <div>
            <label className={label}>Arapça seviyeniz *</label>
            <select required className={field} value={f.level} onChange={(e) => set("level", e.target.value)}>
              <option value="">Seçiniz</option>
              <option>A2</option>
              <option>B1</option>
              <option>B2</option>
            </select>
          </div>
          {f.group === "new" && (
            <div>
              <label className={label}>Uygun olduğunuz gün ve saatler *</label>
              <textarea
                required
                rows={3}
                className={field}
                value={f.availability}
                onChange={(e) => set("availability", e.target.value)}
                placeholder="Örn. Pazartesi ve çarşamba akşamları 19:00 sonrası"
              />
            </div>
          )}
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
        </div>

        <div data-step="2" hidden={step !== 2} className="space-y-4">
          <div>
            <label className={label}>Size uygun seçeneği işaretleyin *</label>
            <select required className={field} value={f.eligible} onChange={(e) => set("eligible", e.target.value)}>
              <option value="">Seçiniz</option>
              {ELIGIBLE.map((e) => (
                <option key={e.v} value={e.v}>{e.t}</option>
              ))}
            </select>
          </div>
          <p className="rounded-2xl bg-secondary p-4 text-sm text-primary">{price}</p>
        </div>

        <div data-step="3" hidden={step !== 3} className="space-y-4">
          <pre className="whitespace-pre-wrap rounded-2xl bg-secondary p-4 font-sans text-xs leading-relaxed">
            {summary}
          </pre>
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input required type="checkbox" checked={f.confirm} onChange={(e) => set("confirm", e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
            {f.group === "new"
              ? "Bilgilerimi kontrol ettim. Bu, yeni bir grup için talep başvurusudur; uygun grup oluştuğunda benimle iletişime geçilecektir."
              : group?.full
                ? "Bilgilerimi kontrol ettim. Bu, bir sonraki dönem için bekleme listesi başvurusudur; yerim, en az 1.800 TL ön ödemem doğrulandıktan sonra kesinleşir."
                : "Bilgilerimi kontrol ettim. Bu bir kayıt başvurusudur; koltuğum, ödemem doğrulandıktan sonra kesinleşir."}
          </label>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button type="button" onClick={() => setStep(step - 1)} variant="outline" className="h-auto rounded-full border border-primary/30 px-6 py-3 text-sm font-medium text-primary">
              Geri
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={next} disabled={sending} className="h-auto whitespace-normal disabled:opacity-60 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:scale-[1.03]">
            {sending ? "Gönderiliyor…" : step === 3 ? "Başvuruyu gönder →" : "Devam et →"}
          </Button>
        </div>
        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      </form>
    </div>
  );
}

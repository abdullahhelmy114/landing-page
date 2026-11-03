import { useEffect, useMemo, useRef, useState } from "react";
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
  { v: "sakarya", t: "Sakarya Üniversitesi öğrencisiyim" },
  { v: "other", t: "Diğer" },
];

export function RegisterForm({ preset }: { preset: Preset }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
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

  useEffect(() => {
    if (!preset) return;
    setF((p) => ({ ...p, course: preset.course, gender: preset.gender, group: preset.groupId }));
    setStep(0);
    setDone(false);
  }, [preset]);

  const PRICE = priceFor(f.course);
  const WAITLIST_NOTE = waitlistFor(f.course);
  const GROUPS = groupsFor(f.course);
  const groups = GROUPS.filter((g) => g.gender === f.gender);
  const group = GROUPS.find((g) => g.id === f.group);

  const price =
    f.eligible === "other"
      ? `Standart grup dersi: kişi başı ${PRICE.standardPerLesson} TL / 40 dakika. ${PRICE.lessons} ders: ${PRICE.standardTotal} TL. Özel teklif bu kategori için geçerli değildir.`
      : f.eligible
        ? `Özel teklif: ${PRICE.perLesson} TL × ${PRICE.lessons} ders = ${PRICE.total} TL / kişi. Her ders 40 dakika.`
        : "Özel teklif için uygunluk seçiminizi yapın.";

  const summary = useMemo(
    () =>
      [
        courseTitle(f.course),
        f.name.trim(),
        "WhatsApp: " + f.phone.trim(),
        "E-posta: " + f.email.trim(),
        group
          ? `${group.id}${group.full ? " · BEKLEME LİSTESİ" : ""}\n${group.slots.map((s) => `${s.day}: ${s.first} / ${s.second} · 10 dk ara`).join("\n")}`
          : `${f.gender} · Yeni grup talebi\n${f.availability.trim()}`,
        "Seviye: " + f.level,
        "Hedef: " + f.goal.trim(),
        "Teklif uygunluğu: " + (ELIGIBLE.find((e) => e.v === f.eligible)?.t ?? ""),
        price,
        ...(group?.full ? [WAITLIST_NOTE] : []),
        "Sonraki kurslar: öncelikli rezervasyon + %20 indirim",
      ].join("\n\n"),
    [f, group, price, WAITLIST_NOTE],
  );

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
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setErr("Kaydınız gönderilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.");
      setSending(false);
      return;
    }
    setSending(false);
    setDone(true);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyMsg(
        "Kopyalandı. WhatsApp grubuna katıldıktan sonra bu özeti grup yöneticisine özel mesajla gönderin.",
      );
    } catch {
      setCopyMsg("Özeti seçip kopyalayın (Ctrl+C veya basılı tutup Kopyala).");
    }
  };

  if (done && f.gender) {
    const invite = WHATSAPP[f.gender];
    return (
      <div ref={ref} className="glass scroll-mt-28 rounded-3xl p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
          WhatsApp ile devam edin
        </p>
        <h3 className="mt-2 text-3xl font-semibold text-primary">{invite.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Ödeme yöntemi ve kesin kayıt adımları için size uygun gruba katılın. Formu tamamlamak
          veya gruba katılmak, tek başına koltuğunuzu kesinleştirmez.
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
        <pre className="mt-6 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-secondary p-4 font-sans text-xs leading-relaxed text-foreground">
          {summary}
        </pre>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={copy}
            className="h-auto rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Kayıt bilgilerimi kopyala
          </Button>
          <Button
            type="button"
            onClick={() => {
              setDone(false);
              setStep(0);
            }}
            variant="outline" className="h-auto rounded-full border border-primary/30 px-5 py-2.5 text-sm font-medium text-primary"
          >
            Bilgilerimi düzenle
          </Button>
        </div>
        {copyMsg && <p className="mt-3 text-xs text-gold">{copyMsg}</p>}
        <p className="mt-5 text-[11px] text-muted-foreground">
          Bilgileriniz akademiye iletildi. Kesin kayıt ve peşin ödeme işlemlerini grup yönetimiyle
          tamamlayın.
        </p>
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
          <p className="text-xs text-muted-foreground">
            Programa katılanlara sonraki kurslarda öncelikli kontenjan rezervasyonu ve %20 indirim.
          </p>
        </div>

        <div data-step="3" hidden={step !== 3} className="space-y-4">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-secondary p-4 font-sans text-xs leading-relaxed">
            {summary}
          </pre>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ödeme peşin yapılır. Yöntem, form ve WhatsApp topluluğuna katılım sonrasında paylaşılır.
            Kesin kayıt, ödemeniz doğrulandıktan sonra oluşturulur. Form tek başına yerinizi
            kesinleştirmez.
          </p>
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input required type="checkbox" checked={f.confirm} onChange={(e) => set("confirm", e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
            Bilgilerimi kontrol ettim. Kesin kaydın peşin ödeme doğrulandıktan sonra tamamlandığını anladım.
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
            {sending ? "Gönderiliyor…" : step === 3 ? "Tamamla ve WhatsApp’a geç →" : "Devam et →"}
          </Button>
        </div>
        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
const logoGold = { url: "/images/logo_gold.png" };
const logoNavy = { url: "/images/logo_navy.png" };
const classroom = { url: "/images/classroom.jpg" };
const drJehan = { url: "/images/jehan-cream-office.png" };
import { ACTIVITIES, CREDENTIALS, FAQ, PHRASES, STEPS, formatTL, type CourseType } from "./data";
import { DiscountField, DiscountProvider, useCoursePrice, useDiscountState } from "./discount";
import { RegisterForm, type Preset } from "./RegisterForm";
import { useScrollMotion } from "./motion";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "./Eyebrow";

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="h-0.5 origin-left gradient-gold" style={{ transform: "scaleX(var(--scroll, 0))" }} />
      <div className="border-b border-gold/25 bg-navy-deep/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            <img src={logoGold.url} alt="Shukraan Akademi logosu" className="h-9 w-auto shrink-0 sm:h-11" />
            <span className="min-w-0 leading-tight">
              <span className="block whitespace-nowrap font-serif text-base font-semibold text-on-navy sm:text-xl">Shukraan Akademi</span>
              <span className="hidden truncate text-[10px] tracking-wide text-on-navy/60 sm:block">
                For Arabic Education & Linguistic Studies of the Holy Qur’an
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["program", "Kurs"],
              ["egitmen", "Eğitmen"],
              ["sss", "SSS"],
            ].map(([id, t]) => (
              <button key={id} onClick={() => go(id!)} className="rounded-full px-4 py-2 text-sm text-on-navy/75 transition hover:text-gold">
                {t}
              </button>
            ))}
          </nav>
          <button onClick={() => go("ucretler")} className="shrink-0 rounded-full bg-gold px-3.5 py-2 text-xs font-semibold text-accent-foreground shadow-gold transition hover:scale-[1.04] sm:px-5 sm:py-2.5 sm:text-sm">
            Kayıt ol ↗
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-navy-deep pt-28 text-on-navy">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-20 pt-6 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-10">
        <div className="reveal">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-gold/40 px-4 py-1.5 text-xs tracking-[0.2em] text-gold-soft">A2 · B1 · B2 seviyeleri için</span>
            <span className="inline-flex rounded-full bg-gold/15 px-4 py-1.5 text-xs font-semibold tracking-wide text-gold ring-1 ring-gold/50">Sınırlı kontenjan · Her grupta en fazla 5 kişi</span>
          </div>
          <p className="mt-6 font-arabic text-2xl text-gold sm:text-3xl" dir="rtl">ممارسة المحادثة في اللغة العربية</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] sm:text-7xl">
            Arapça biliyorsunuz.
            <span className="mt-2 block italic text-gold">Peki, konuşmaya ne kadar fırsatınız var?</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-on-navy/75 sm:text-lg">
            <b className="text-gold-soft">Bildiğiniz Arapçayı konuşmaya taşıyın.</b> Dr. Jehan Ziyad ile Arapça Konuşma Kursu: beş kişilik canlı gruplarda öğrendiklerinizi kullanın ve Arapçanızı canlı tutun.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={() => go("basvuru")} className="rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-accent-foreground transition hover:scale-[1.04]">
              Bana uygun grubu bul ↗
            </button>
            <button onClick={() => go("program")} className="rounded-full border border-on-navy/30 px-7 py-3.5 text-sm font-medium text-on-navy transition hover:border-gold hover:text-gold">
              Kursu incele
            </button>
          </div>
          <p className="mt-6 text-xs tracking-wide text-on-navy/55">Zoom üzerinden · Kadın ve erkekler için ayrı gruplar</p>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-3 rounded-[2rem] border border-gold/40" />
          <img src={classroom.url} alt="Zoom üzerinden canlı Arapça konuşma dersi" className="relative aspect-[16/10] w-full rounded-[1.75rem] object-cover shadow-elegant" />
        </div>
      </div>
    </section>
  );
}

/** Each phrase takes a turn in the pinned scene, revealing its words on scroll. */
function Phrases() {
  return (
    <section data-pin className="phrase-scroll relative bg-navy-deep text-on-navy">
      <div className="phrase-stage sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-24 pt-28 sm:px-8">
        <Eyebrow light>Kursun tadına bakın · Birkaç örnek</Eyebrow>
        <div className="relative mt-10 grid min-h-48 w-full max-w-3xl items-center">
        {PHRASES.map((p, i) => (
          <div key={p.ar} className="phrase-card glass-navy col-start-1 row-start-1 rounded-2xl px-6 py-8 text-center shadow-elegant sm:px-10 sm:py-12"
            style={{ ["--phrase" as string]: i, ["--count" as string]: PHRASES.length }}>
            <span className="inline-flex rounded-full border border-gold/40 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-gold-soft">{p.level}</span>
            <p className="mt-3 font-arabic text-3xl leading-loose text-gold sm:text-5xl" dir="rtl">
              {p.ar.split(" ").map((word, wi, words) => (
                <span key={wi} className="phrase-word inline-block" style={{ ["--word" as string]: wi, ["--words" as string]: words.length }}>{word}{"\u00a0"}</span>
              ))}
            </p>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}

function Pinned() {
  return (
    <section id="program" data-pin className="program-scroll relative scroll-mt-20" style={{ ["--p" as string]: 0 }}>
      <div className="program-stage relative flex flex-col justify-center py-16">
        <p
          className="pointer-events-none absolute top-24 hidden whitespace-nowrap font-serif text-9xl font-semibold italic leading-none text-primary/[0.05] lg:block"
          style={{ transform: "translateX(calc(20% - var(--p) * 70%))" }}
        >
          Söz sırası sizde · Söz sırası sizde
        </p>
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-2 lg:gap-12">
          <div className="program-col-a">
            <Eyebrow>Söz sırası sizde</Eyebrow>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-primary sm:text-6xl">
              {"“Anlıyorum ama konuşurken duraksıyorum.”".split(" ").map((w, i, a) => (
                <span
                  key={i}
                  className="program-word inline-block transition-opacity"
                  style={{ opacity: `clamp(0.12, calc(var(--p) * ${a.length * 2.2} - ${i}), 1)` }}
                >
                  {w}{"\u00a0"}
                </span>
              ))}
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-muted-foreground">
              Tanıdık geliyor mu? Konuşma pratiği için her şeyi kusursuz bilmeniz gerekmez. Bildiklerinizi kullanabileceğiniz, soru sorabileceğiniz ve geri bildirim alabileceğiniz düzenli bir ortam iyi bir başlangıçtır.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Bu kurs, kuralları ve kelimeleri bilen ama bunları konuşmada kullanma fırsatı arayan, en az A2 düzeyinde Arapça bilen ve A2–B2 aralığında konuşma pratiği yapmak isteyen katılımcılar içindir. Gruplar oluşturulurken seviye yakınlığı dikkate alınır.
            </p>
          </div>
          <div className="program-col-b min-w-0 lg:py-2">
            <h3 className="text-2xl font-semibold text-primary">Derste neler yapacağız?</h3>
            <ul className="mt-6 space-y-3">
              {ACTIVITIES.map((a, i) => (
                <li
                  key={a}
                  className="program-activity flex items-start gap-4 rounded-2xl border border-gold/20 bg-card/70 p-4"
                  style={{
                    opacity: `clamp(0, calc(var(--p) * 6 - ${i * 0.7}), 1)`,
                    transform: `translateX(calc((1 - clamp(0, calc(var(--p) * 6 - ${i * 0.7}), 1)) * 40px))`,
                  }}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full gradient-navy font-serif text-sm text-gold">{i + 1}</span>
                  <span className="pt-1 text-sm text-foreground">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Rhythm() {
  return (
    <section className="relative bg-secondary/60 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Eyebrow>Haftanıza sığan bir düzen</Eyebrow>
          <h2 className="mt-5 text-4xl font-semibold leading-tight text-primary sm:text-6xl">Planınıza uygun programı seçin.</h2>
          <p className="mt-5 max-w-md text-lg italic text-primary/80">Normal veya yoğun seçeneklerle Arapça konuşma pratiği yapın.</p>
        </div>
        <div className="space-y-8">
          {STEPS.map((s, i) => (
            <article key={s.n} className="sticky rounded-3xl bg-card p-8 shadow-elegant ring-1 ring-gold/25 sm:p-10" style={{ top: `${7 + i * 1.5}rem` }}>
              <div className="flex items-start gap-6">
                <span className="font-serif text-6xl font-semibold text-gold-shine">{s.n}</span>
                <div>
                  <h3 className="text-2xl font-semibold text-primary">{s.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoffeeCard() {
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const reset = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--mx", "0");
    e.currentTarget.style.setProperty("--my", "0");
  };
  return (
    <div onPointerMove={move} onPointerLeave={reset} className="coffee-card reveal group relative mt-12 overflow-hidden rounded-[2rem] bg-card p-8 text-foreground shadow-elegant sm:p-10">
      <div aria-hidden className="coffee-glow pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
      <div className="relative grid items-center gap-8 sm:grid-cols-[auto_1fr]">
        <div aria-hidden className="coffee-cup relative mx-auto h-36 w-32">
          <p className="coffee-hello absolute inset-x-0 top-0 text-center font-arabic text-2xl text-gold" dir="rtl">مرحبًا</p>
          <svg viewBox="0 0 120 140" className="absolute inset-0 h-full w-full">
            <g className="coffee-steam" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M45 50c-8-10 8-16 0-28" className="text-gold/70" />
              <path d="M60 52c-8-10 8-16 0-30" className="text-gold/70" />
              <path d="M75 50c-8-10 8-16 0-28" className="text-gold/70" />
            </g>
            <path d="M22 66h72v26c0 20-16 34-36 34S22 112 22 92z" className="fill-primary" />
            <path d="M94 74h6a12 12 0 0 1 0 24h-8" fill="none" strokeWidth="5" className="stroke-primary" />
            <path d="M28 70h60" strokeWidth="2" className="stroke-gold" />
            <ellipse cx="58" cy="132" rx="46" ry="5" className="fill-gold/40" />
          </svg>
        </div>
        <div>
          <h3 className="font-serif text-3xl font-semibold text-primary sm:text-4xl">Bir kahve molası kadar keyifli.</h3>
          <p className="mt-2 text-muted-foreground">Bu kez sohbet Arapça. Bildiklerinizi konuşmaya taşıyın.</p>
          <p className="mt-1 text-sm text-muted-foreground">Arapça konuşmaya ayrılmış 50 dakika.</p>
          <p className="coffee-sip mt-4 font-serif text-lg italic text-gold">Bir yudum kahve, bir adım Arapça.</p>
        </div>
      </div>
    </div>
  );
}

type OfferCardData = { t: string; course: CourseType; meta: string };

function OfferCard({ c, onChooseCourse }: { c: OfferCardData; onChooseCourse: (course: CourseType) => void }) {
  const { regular, discounted } = useCoursePrice(c.course);
  const now = discounted ?? regular;
  return (
    <div data-course={c.course} className="reveal relative rounded-[2rem] bg-card p-8 text-foreground shadow-elegant sm:p-10">
      <div className="absolute inset-x-10 -top-px h-px gold-rule" />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">{c.t}</p>
      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className="font-serif text-6xl font-semibold text-primary sm:text-7xl">
          {now.perLesson} <span className="text-xl text-muted-foreground">TL/50 dk</span>
        </p>
        {discounted && (
          <s className="pb-2 text-base text-muted-foreground decoration-2 sm:text-lg">{regular.perLesson} TL</s>
        )}
      </div>
      <p className="mt-3 text-base text-foreground">
        {now.lessons} derslik paket toplamı:{" "}
        {discounted && (
          <>
            <s className="text-muted-foreground decoration-2">{formatTL(regular.total)} TL</s>{" "}
          </>
        )}
        <b>{formatTL(now.total)} TL</b>
      </p>
      <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">{c.meta}</p>
      <p className="mt-1 text-sm text-muted-foreground">5 kişilik grup · Zoom üzerinden canlı</p>
      <button type="button" onClick={() => onChooseCourse(c.course)} className="mt-6 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-accent-foreground shadow-gold transition hover:scale-[1.04]">
        Uygun grubu seçin ↗
      </button>
    </div>
  );
}

function Offer({ onChooseCourse }: { onChooseCourse: (course: CourseType) => void }) {
  const cards: OfferCardData[] = [
    { t: "Normal Konuşma Kursu", course: "regular", meta: "4 hafta · Haftada 1 gün · Her buluşmada 2 ders" },
    { t: "Yoğun Konuşma Kursu (+)", course: "intensive", meta: "4 hafta · Haftada 2 gün · Her buluşmada 2 ders" },
  ];
  return (
    <section id="ucretler" className="relative isolate scroll-mt-20 overflow-hidden gradient-navy py-24 text-on-navy sm:py-32">
      <div data-speed="0.2" className="absolute inset-[-20%] -z-10 geo-pattern opacity-25" />
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="reveal max-w-2xl">
          <Eyebrow light>Ücretler</Eyebrow>
          <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-6xl">
            Bir kahve molası. <span className="italic text-gold">Bir Arapça pratiği.</span>
          </h2>
          <p className="mt-5 text-on-navy/80">Bildiğiniz Arapçayı kullanın, kendinizi ifade edin ve düzenli pratikle ilerleyin.</p>
          <p className="mt-4 text-sm font-semibold text-gold-soft">Sınırlı kontenjan · Her grupta en fazla 5 kişi</p>
          <p className="mt-2 text-sm text-on-navy/85">
            İndirim kodlarıyla %40&apos;a varan indirim: 8 derslik pakette 1.200 TL&apos;ye, 16 derslik pakette 2.400 TL&apos;ye kadar.
          </p>
          <div className="mt-4 max-w-md">
            <DiscountField tone="navy" />
          </div>
        </div>
        <CoffeeCard />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {cards.map((c) => (
            <OfferCard key={c.t} c={c} onChooseCourse={onChooseCourse} />
          ))}
        </div>
        <div className="reveal mt-8 rounded-2xl border-s-2 border-gold bg-on-navy/5 p-6 text-sm leading-relaxed text-on-navy/85">
          <p><b className="text-gold-soft">Ödeme ve rezervasyon:</b> Ödeme, kayıt sırasında bu sayfa üzerinden yapılır. Koltuğunuz ödemeniz doğrulandıktan sonra kesinleşir.</p>
          <p className="mt-3"><b className="text-gold-soft">Sonraki kurslar:</b> Bu kursa katılanlar, akademinin sonraki kurslarının kayıt dönemlerinde kontenjan rezervasyonunda öncelik kazanır.</p>
        </div>
      </div>
    </section>
  );
}

function Instructor() {
  return (
    <section id="egitmen" className="relative scroll-mt-20 overflow-hidden bg-navy-deep text-on-navy">
      <div className="relative h-[60vh] min-h-[380px] overflow-hidden sm:h-[80vh]">
        <img data-speed="0.25" src={drJehan.url} alt="Dr. Jehan Ziyad" className="absolute inset-0 h-[130%] w-full -translate-y-[10%] object-cover object-[65%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/30 to-transparent" />
      </div>
      <div className="relative mx-auto -mt-32 max-w-7xl px-4 pb-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="reveal">
            <Eyebrow light>Eğitmeniniz</Eyebrow>
            <h2 className="mt-4 text-5xl font-semibold sm:text-7xl text-gold-shine">Dr. Jehan Ziyad</h2>
            <p className="mt-3 text-lg">Kurucu ve Direktör, Shukraan Akademi</p>
            <p className="font-serif text-xl italic text-gold-soft">Kıdemli Eğitimci ve Dilbilim Uzmanı</p>
            <p className="mt-4 text-xs tracking-wide text-on-navy/60">Arap Dilbilimi · Müfredat Geliştirme · Akademik Liderlik · İslami İlimler</p>
          <p className="mt-6 max-w-md leading-relaxed text-on-navy/75">
              Ana dili Arapça; Arapça, Arap edebiyatı ve İslami ilimler alanlarındaki birikimiyle; yüz yüze ve çevrim içi eğitimde <b className="text-gold">30 yılı aşkın</b> deneyim.
          </p>
          </div>
          <div className="glass-navy reveal rounded-3xl p-6 sm:p-8">
            <h3 className="text-2xl font-semibold">Akademik birikim ve öğretim deneyimi</h3>
            <ul className="mt-5 space-y-3">
              {CREDENTIALS.map((c) => (
                <li key={c} className="flex gap-3 text-sm leading-relaxed text-on-navy/80">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Register({ preset }: { preset: Preset }) {
  return (
    <section id="basvuru" className="relative scroll-mt-24 overflow-hidden py-24 sm:py-32">
      <img data-speed="-0.2" src={logoNavy.url} alt="" className="pointer-events-none absolute -left-24 top-10 h-[34rem] w-auto opacity-[0.04]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
        <div className="reveal lg:sticky lg:top-32 lg:self-start">
          <Eyebrow>İlk adımınız</Eyebrow>
          <h2 className="mt-5 text-4xl font-semibold leading-tight text-primary sm:text-6xl">
            Grubunuzu seçin.
            <span className="block italic text-gold">Birlikte başlayalım.</span>
          </h2>
        </div>
        <RegisterForm preset={preset} />
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="sss" className="scroll-mt-24 bg-secondary/60 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <div className="reveal text-center">
          <Eyebrow>Aklınızdaki sorular</Eyebrow>
          <h2 className="mt-5 text-4xl font-semibold text-primary sm:text-6xl">Başlamadan önce</h2>
        </div>
        <div className="mt-12 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="reveal group rounded-2xl bg-card p-5 shadow-elegant ring-1 ring-gold/20 open:ring-gold">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl font-semibold text-primary">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/50 text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">Özel teklifler ve kurumsal iş birlikleri için bizimle iletişime geçebilirsiniz.</p>
      </div>
    </section>
  );
}

/** The closing band at the end of the page. */
function Closing() {
  return (
    <section id="kapanis" className="relative isolate overflow-hidden gradient-navy py-24 text-center text-on-navy sm:py-32">
      <div data-speed="0.2" className="absolute inset-[-20%] -z-10 geo-pattern opacity-25" />
      <div className="reveal mx-auto max-w-4xl px-4 sm:px-8">
        <h2 className="text-5xl font-semibold leading-tight sm:text-7xl">
          Az kişi, <span className="italic text-gold">çok sohbet.</span>
        </h2>
        <p className="mt-6 text-lg italic text-on-navy/80">Tek hedef: Bildiğiniz Arapçayı konuşabilmek.</p>
        <button onClick={() => go("ucretler")} className="mt-10 rounded-full bg-gold px-8 py-3.5 text-sm font-semibold text-accent-foreground shadow-gold transition hover:scale-[1.04]">
          Kayıt ol
        </button>
      </div>
    </section>
  );
}

/** The landing page; `referral` (a referral link's path, e.g. "dad40") applies its code on arrival. */
export function Landing({ referral }: { referral?: string }) {
  useScrollMotion();
  // One discount code for the whole page: entered in Ücretler or the payment step, shown in every price.
  const discount = useDiscountState();
  const { applyReferral } = discount;
  useEffect(() => {
    if (referral) void applyReferral(referral);
  }, [referral, applyReferral]);
  const [preset, setPreset] = useState<Preset>(null);
  // A price card's button opens the form with its course chosen.
  const chooseCourse = (course: CourseType) => {
    setPreset({ course, nonce: Date.now() });
    go("basvuru");
  };
  const [ctaHidden, setCtaHidden] = useState(false);
  useEffect(() => {
    // The floating button stays out of the way while the pricing cards, the form or the closing
    // band (which has its own button) are on screen.
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setCtaHidden(visible.size > 0);
    });
    ["ucretler", "basvuru", "kapanis"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return (
    <DiscountProvider value={discount}>
      <main className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <Hero />
        <Phrases />
        <Pinned />
        <Rhythm />
        <Offer onChooseCourse={chooseCourse} />
        <Instructor />
        <Register preset={preset} />
        <Faq />
        <Closing />
        <button onClick={() => go("ucretler")} className={`fixed inset-x-4 bottom-4 z-40 rounded-full bg-gold py-3.5 text-sm font-semibold text-accent-foreground shadow-gold transition-opacity md:hidden ${ctaHidden ? "pointer-events-none opacity-0" : ""}`}>
          Kayıt ol · 8 veya 16 ders
        </button>
      </main>
    </DiscountProvider>
  );
}

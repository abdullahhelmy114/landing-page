import { useState } from "react";
const logoGold = { url: "/images/logo_gold.png" };
const logoNavy = { url: "/images/logo_navy.png" };
const classroom = { url: "/images/classroom.jpg" };
const drJehan = { url: "/images/jehan-cream-office.png" };
import { ACTIVITIES, CREDENTIALS, FAQ, GROUPS, PHRASES, PRICE, STEPS, WAITLIST_NOTE, REGULAR_PRICE, groupsFor, type CourseType, type Gender } from "./data";
import { RegisterForm, type Preset } from "./RegisterForm";
import { useScrollMotion } from "./motion";
import { Button } from "@/components/ui/button";

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] ${light ? "text-gold-soft" : "text-gold"}`}>
      <span className="h-px w-8 bg-gold" />
      {children}
    </p>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="h-0.5 origin-left gradient-gold" style={{ transform: "scaleX(var(--scroll, 0))" }} />
      <div className="border-b border-gold/25 bg-navy-deep/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            <img src={logoGold.url} alt="Shukraan Akademi logosu" className="h-10 w-auto shrink-0 sm:h-11" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-serif text-lg font-semibold text-on-navy sm:text-xl">Shukraan Akademi</span>
              <span className="hidden truncate text-[10px] tracking-wide text-on-navy/60 sm:block">
                For Arabic Education & Linguistic Studies of the Holy Qur’an
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["program", "Program"],
              ["egitmen", "Eğitmen"],
              ["gruplar", "Gruplar"],
              ["s.s.s.", "S.S.S."],
            ].map(([id, t]) => (
              <button key={id} onClick={() => go(id!)} className="rounded-full px-4 py-2 text-sm text-on-navy/75 transition hover:text-gold">
                {t}
              </button>
            ))}
          </nav>
          <button onClick={() => go("basvuru")} className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-gold transition hover:scale-[1.04]">
            Grubunu seç ↗
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
          <span className="inline-flex rounded-full border border-gold/40 px-4 py-1.5 text-xs tracking-[0.2em] text-gold-soft">A2 · B1 · B2 seviyeleri için</span>
          <p className="mt-6 font-arabic text-2xl text-gold sm:text-3xl" dir="rtl">ممارسة المحادثة في اللغة العربية</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] sm:text-7xl">
            Arapça biliyorsunuz.
            <span className="mt-2 block italic text-gold">Peki, konuşmaya ne kadar fırsatınız var?</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-on-navy/75 sm:text-lg">
            Dr. Jehan Ziad ile Arapça konuşma pratiği. Beş kişilik canlı gruplarda öğrendiklerinizi kullanın, kendinizi ifade etmeye daha fazla zaman ayırın.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={() => go("gruplar")} className="rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-accent-foreground transition hover:scale-[1.04]">
              Bana uygun grubu bul ↗
            </button>
            <button onClick={() => go("program")} className="rounded-full border border-on-navy/30 px-7 py-3.5 text-sm font-medium text-on-navy transition hover:border-gold hover:text-gold">
              Programı incele
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
        <div className="relative mt-10 grid min-h-64 w-full max-w-3xl items-center">
        {PHRASES.map((p, i) => (
          <div key={p} className="phrase-card glass-navy col-start-1 row-start-1 rounded-2xl px-6 py-8 text-center shadow-elegant sm:px-10 sm:py-12"
            style={{ ["--phrase" as string]: i, ["--count" as string]: PHRASES.length }}>
            <p className="font-arabic text-3xl leading-loose text-gold sm:text-5xl" dir="rtl">
              {p.split(" ").map((word, wi, words) => (
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
              Bu program, en az A2 düzeyinde Arapça bilen ve A2–B2 aralığında konuşma pratiği yapmak isteyen katılımcılar içindir. Gruplar oluşturulurken seviye yakınlığı dikkate alınır.
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
          <h2 className="mt-5 text-4xl font-semibold leading-tight text-primary sm:text-6xl">
            Bir gün ayırın.
            <span className="block italic text-gold">İki ders boyunca pratik yapın.</span>
          </h2>
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

function Offer() {
  return (
    <section className="relative isolate overflow-hidden gradient-navy py-24 text-on-navy sm:py-32">
      <div data-speed="0.2" className="absolute inset-[-20%] -z-10 geo-pattern opacity-25" />
      <p data-speed="-0.35" className="pointer-events-none absolute -right-10 top-10 -z-10 font-serif text-[30vw] font-semibold leading-none text-gold/10">%20</p>
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-2">
        <div className="reveal">
          <Eyebrow light>Sınırlı süreli özel teklif</Eyebrow>
          <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-6xl">
            Bugün konuşma pratiği.
            <span className="block italic text-gold-shine">Yarın yeni öğrenme fırsatları.</span>
          </h2>
          <p className="mt-6 max-w-lg text-on-navy/75">
            Bu özel fiyat, <b className="text-gold-soft">ضاد (Dâd) topluluğu üyeleri ve Sakarya Üniversitesi öğrencileri</b> için hazırlanmıştır.
          </p>
          <div className="mt-8 rounded-2xl border-s-2 border-gold bg-on-navy/5 p-6">
            <p className="font-serif text-5xl font-semibold text-gold">%20</p>
            <p className="mt-2 font-semibold">Shukraan Akademi ailesinde öğrenmeye devam edin</p>
            <p className="mt-2 text-sm text-on-navy/70">
              Bu programa katılanlar, akademinin sonraki kurslarında <b className="text-gold-soft">kontenjan rezervasyonunda öncelik</b> ve <b className="text-gold-soft">kurs ücretleri üzerinden %20 indirim</b> hakkı kazanır.
            </p>
            <p className="mt-3 text-xs italic text-on-navy/50">Öncelikli rezervasyon, sonraki kursların kayıt dönemlerinde kullanılır; otomatik kayıt anlamına gelmez.</p>
          </div>
        </div>

        <div data-speed="-0.08" className="reveal">
          <div className="relative rounded-[2rem] bg-card p-8 text-foreground shadow-elegant sm:p-10">
            <div className="absolute inset-x-10 -top-px h-px gold-rule" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Dâd topluluğu & Sakarya Üniversitesi</p>
            <p className="mt-4 font-serif text-7xl font-semibold text-primary">
              3.600 <span className="text-xl text-muted-foreground">TL / kişi</span>
            </p>
            <p className="mt-2 text-sm"><b className="text-gold">225 TL × 16 ders</b> · Her ders 40 dakika</p>
            <p className="mt-4 border-t border-border pt-4 text-sm text-primary">Normal kurs: <b>{REGULAR_PRICE.perLesson} TL × {REGULAR_PRICE.lessons} ders = {REGULAR_PRICE.total} TL</b> · 4 hafta, haftada bir gün.</p>
            <ul className="mt-5 space-y-1 text-sm text-muted-foreground">
              <li>4 hafta · Haftada iki gün · Her gün iki ders</li>
              <li>5 kişilik grup · Zoom üzerinden canlı</li>
              <li>Yoğunlaştırılmış program (+) · Sabah ve akşam buluşmaları</li>
            </ul>
            <button onClick={() => go("basvuru")} className="mt-7 w-full rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:scale-[1.02]">
              Özel teklif için başvur ↗
            </button>
            <div className="mt-6 divide-y text-sm">
              <div className="flex justify-between py-3"><span className="text-muted-foreground">Standart bireysel ders · 40 dk</span><b>950 TL</b></div>
              <div className="flex justify-between py-3"><span className="text-muted-foreground">Standart grup dersi · 40 dk / kişi</span><b>550 TL</b></div>
              <div className="flex justify-between py-3"><span className="text-muted-foreground">Standart 16 derslik paket</span><b>8.800 TL</b></div>
            </div>
            <p className="mt-3 text-[11px] italic text-muted-foreground">
              Teklif sınırlı bir süre için geçerlidir. Ödeme peşindir. Ödeme yöntemi, form ve WhatsApp topluluğuna katılım sonrasında paylaşılır.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Groups({ onChoose, course }: { onChoose: (g: Gender, id: string, course: CourseType) => void; course: CourseType }) {
  const regular = course === "regular";
  return (
    <section id={regular ? "normal-gruplar" : "gruplar"} className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32">
      <div className="reveal max-w-3xl">
        <Eyebrow>{regular ? "10 normal grup · Her grupta 5 kişi" : "10 yoğun grup · Her grupta 5 kişi"}</Eyebrow>
        <h2 className="mt-5 text-4xl font-semibold text-primary sm:text-6xl">
          {regular ? "Konuşma Kursu" : "Yoğunlaştırılmış Konuşma Kursu"}
          {!regular && <span className="italic text-gold"> (+)</span>}
        </h2>
        <p className="mt-4 text-muted-foreground">
          Tüm saatler Türkiye saatine göredir — Europe/Istanbul. {regular ? "Haftada bir gün, 10 dakika arayla iki ders. 4 haftada toplam 8 ders · 250 TL × 8 = 2.000 TL / kişi." : "Her kart, haftada iki gün buluşan ayrı bir gruptur: bir sabah ve bir akşam buluşması, her gün 10 dakika arayla iki ders. 225 TL × 16 = 3.600 TL / kişi."}
        </p>
      </div>
      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        {(["Kadın", "Erkek"] as Gender[]).map((gender, gi) => (
          <div key={gender} data-speed={gi ? "-0.06" : "0.06"}>
            <h3 className="mb-5 flex items-center gap-3 text-2xl font-semibold text-primary">
              <span className="h-px flex-1 gold-rule" />
              {gender} grupları
              <span className="h-px flex-1 gold-rule" />
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {groupsFor(course).filter((g) => g.gender === gender).map((g) => (
                <Button
                  variant="ghost"
                  disabled={regular && g.full}
                  key={g.id}
                  onClick={() => onChoose(gender, g.id, course)}
                  className="group reveal block h-auto whitespace-normal rounded-lg bg-card p-5 text-start shadow-elegant ring-1 ring-gold/20 transition duration-300 hover:-translate-y-1 hover:ring-gold"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-2xl font-semibold text-primary">{g.id}</span>
                    {g.full ? (
                      <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">Dolu</span>
                    ) : (
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs text-primary">5 kişilik</span>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    {g.slots.map((s) => (
                      <div key={s.day} className="rounded-xl bg-muted/60 p-2.5">
                        <p className="mb-1.5 text-[11px] font-semibold text-primary">{s.day}</p>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-center text-[11px]">
                          <span className="rounded-lg bg-muted p-1.5"><b className="block text-foreground">{s.first}</b>1. ders</span>
                          <span className="px-1 text-[10px] text-gold">10 dk</span>
                          <span className="rounded-lg bg-muted p-1.5"><b className="block text-foreground">{s.second}</b>2. ders</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {g.full && !regular ? (
                    <span className="mt-4 block">
                      <span className="inline-flex text-sm font-semibold text-gold transition group-hover:translate-x-1">Bekleme listesine katıl ↗</span>
                      <span className="mt-2 block text-[11px] leading-relaxed text-muted-foreground">{WAITLIST_NOTE}</span>
                    </span>
                  ) : (
                    <span className="mt-4 inline-flex text-sm font-semibold text-gold transition group-hover:translate-x-1">{g.full ? "Kontenjan dolu" : "Seç ↗"}</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-10 max-w-3xl text-sm text-muted-foreground">
        Planlanan başlangıç: <b className="text-primary">12 Kasım 2026</b> veya grubun 5 kişilik kontenjanı tamamlandığında. Her grubun kesin başlangıcı WhatsApp topluluğunda paylaşılır. Kayıt talepleri devam eder; yeni gruplar için ayrıca uygun gün ve saat belirlenir.
      </p>
    </section>
  );
}

function Instructor() {
  return (
    <section id="egitmen" className="relative scroll-mt-20 overflow-hidden bg-navy-deep text-on-navy">
      <div className="relative h-[60vh] min-h-[380px] overflow-hidden sm:h-[80vh]">
        <img data-speed="0.25" src={drJehan.url} alt="Dr. Jehan Ziad" className="absolute inset-0 h-[130%] w-full -translate-y-[10%] object-cover object-[65%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/30 to-transparent" />
      </div>
      <div className="relative mx-auto -mt-32 max-w-7xl px-4 pb-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="reveal">
            <Eyebrow light>Eğitmeniniz</Eyebrow>
            <h2 className="mt-4 text-5xl font-semibold sm:text-7xl text-gold-shine">Dr. Jehan Ziad</h2>
            <p className="mt-3 text-lg">Founder & Director, Shukraan Akademi</p>
            <p className="font-serif text-xl italic text-gold-soft">Senior Educator & Linguistics Specialist</p>
            <p className="mt-4 text-xs tracking-wide text-on-navy/60">Arabic Linguistics · Curriculum Development · Academic Leadership · Islamic Studies</p>
          <p className="mt-6 max-w-md leading-relaxed text-on-navy/75">
              Arapça, Arap edebiyatı ve İslami ilimler alanlarındaki birikimiyle; yüz yüze ve çevrim içi eğitimde <b className="text-gold">30 yılı aşkın</b> deneyim.
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
          <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
            Bilgilerinizi doldurun, kayıt özetinizi kopyalayın ve size uygun WhatsApp grubuna katılın. Özeti grup yöneticisine özel mesajla ileterek kayıt işlemini tamamlayın.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-foreground">
            {[
              "Tüm kayıt alanları zorunludur: ad soyad, WhatsApp, e-posta, grup, seviye, hedef ve teklif uygunluğu.",
              "Kontenjanlar, doğrulanmış ödeme sırasına göre kesinleşir.",
              "Yoğun grup (+) doluysa aynı saatte bir sonraki dönem için bekleme listesine kaydolabilirsiniz (en az 1.800 TL ön ödeme ile).",
            ].map((t) => (
              <li key={t} className="flex gap-3"><span className="text-gold">↗</span>{t}</li>
            ))}
          </ul>
          <p className="mt-6 rounded-2xl bg-secondary p-4 text-xs leading-relaxed text-muted-foreground">
            Bilgileriniz güvenli şekilde akademiye iletilir. Tüm alanları tamamlayınca kadın veya erkek grubunuza ait bağlantı ve QR kodu gösterilir.
          </p>
        </div>
        <RegisterForm preset={preset} />
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="s.s.s." className="scroll-mt-24 bg-secondary/60 py-24 sm:py-32">
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
      </div>
    </section>
  );
}

export function Landing() {
  useScrollMotion();
  const [preset, setPreset] = useState<Preset>(null);
  const choose = (gender: Gender, groupId: string, course: CourseType) => {
    setPreset({ gender, groupId, course, nonce: Date.now() });
    go("basvuru");
  };
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Phrases />
      <Pinned />
      <Rhythm />
      <Offer />
      <Groups onChoose={choose} course="regular" />
      <Groups onChoose={choose} course="intensive" />
      <Instructor />
      <Register preset={preset} />
      <Faq />
      <button onClick={() => go("basvuru")} className="fixed inset-x-4 bottom-4 z-40 rounded-full bg-gold py-3.5 text-sm font-semibold text-accent-foreground shadow-gold md:hidden">
        Grubunu seç · 8 veya 16 ders
      </button>
    </main>
  );
}

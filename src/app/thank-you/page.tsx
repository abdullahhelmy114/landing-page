import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow } from "@/components/shukraan/Eyebrow";

export const metadata: Metadata = {
  title: "Teşekkürler | Shukraan Akademi",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Whop sends the buyer here with `status` = succeeded | failed | canceled. Only `succeeded` is a sale. */
export default async function ThankYou({ searchParams }: { searchParams: SearchParams }) {
  const { status } = await searchParams;
  const paid = status === "succeeded";

  return (
    <main className="relative isolate flex min-h-[100svh] items-center overflow-hidden gradient-navy px-4 py-24 text-on-navy sm:px-8">
      <div aria-hidden className="absolute inset-0 -z-10 geo-pattern opacity-25" />
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-3">
          <img src="/images/logo_gold.png" alt="Shukraan Akademi logosu" className="h-11 w-auto" />
          <span className="font-serif text-xl font-semibold text-on-navy">Shukraan Akademi</span>
        </Link>

        <div className="relative mt-10 rounded-[2rem] bg-card p-8 text-foreground shadow-elegant sm:p-10">
          <div className="absolute inset-x-10 -top-px h-px gold-rule" />
          {paid ? (
            <>
              <Eyebrow>Ödemeniz alındı</Eyebrow>
              <p className="mt-5 font-arabic text-3xl text-gold" dir="rtl">
                شكرًا
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-primary sm:text-5xl">
                Teşekkür ederiz.
                <span className="block italic text-gold">Birlikte başlayalım.</span>
              </h1>
              <p className="mt-6 leading-relaxed text-muted-foreground">
                Ödemeniz başarıyla tamamlandı. Grup tercihinizi ve iletişim bilgilerinizi henüz
                iletmediyseniz başvuru formunu doldurun.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/#basvuru"
                  className="rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-accent-foreground shadow-gold transition hover:scale-[1.04]"
                >
                  Başvuru formuna git ↗
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-primary/30 px-7 py-3.5 text-sm font-medium text-primary transition hover:border-gold"
                >
                  Ana sayfaya dön
                </Link>
              </div>
            </>
          ) : (
            <>
              <Eyebrow>Ödeme tamamlanmadı</Eyebrow>
              <h1 className="mt-5 text-4xl font-semibold leading-tight text-primary sm:text-5xl">
                Ödemeniz tamamlanamadı.
              </h1>
              <p className="mt-6 leading-relaxed text-muted-foreground">
                Ödemeniz alınmadı veya iptal edildi. Dilerseniz tekrar deneyebilirsiniz.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/#ucretler"
                  className="rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-accent-foreground shadow-gold transition hover:scale-[1.04]"
                >
                  Tekrar dene ↗
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-primary/30 px-7 py-3.5 text-sm font-medium text-primary transition hover:border-gold"
                >
                  Ana sayfaya dön
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

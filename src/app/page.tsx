import type { Metadata } from "next";

import { Landing } from "@/components/shukraan/Landing";

export const metadata: Metadata = {
  title: "Arapça Konuşma Pratiği | Shukraan Akademi",
  description:
    "Dr. Jehan Ziad ile 5 kişilik canlı gruplarda Arapça konuşma pratiği. Normal kursta 8 ders / 3.200 TL, yoğun kursta 16 ders / 6.000 TL. Zoom üzerinden. A2–B2 seviyeleri için.",
  openGraph: {
    title: "Arapça Konuşma Pratiği | Shukraan Akademi",
    description:
      "Arapça biliyorsunuz. Peki, konuşmaya ne kadar fırsatınız var? 8 ders · 3.200 TL veya yoğun kurs (+): 16 ders · 6.000 TL özel teklif.",
    type: "website",
  },
};

export default function Home() {
  return <Landing />;
}

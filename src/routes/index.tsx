import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/shukraan/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arapça Konuşma Pratiği | Shukraan Akademi" },
      {
        name: "description",
        content:
          "Dr. Jehan Ziad ile 5 kişilik canlı gruplarda Arapça konuşma pratiği. 8 ders, 4 hafta, Zoom üzerinden. A2–B2 seviyeleri için.",
      },
      { property: "og:title", content: "Arapça Konuşma Pratiği | Shukraan Akademi" },
      {
        property: "og:description",
        content: "Arapça biliyorsunuz. Peki, konuşmaya ne kadar fırsatınız var? 8 ders · 2.000 TL özel teklif.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

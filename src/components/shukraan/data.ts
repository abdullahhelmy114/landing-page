export type Gender = "Kadın" | "Erkek";
export type CourseType = "regular" | "intensive";

/** A group's WhatsApp invite as the save API returns it: the link and its QR image as a data URL. */
export type WhatsAppInvite = { url: string; qr: string };

/**
 * The WhatsApp group a buyer joins after payment: one per course and group type (the academy sets
 * each person's level after payment). `id` is saved with the registration, Yoğun (+) ending in
 * "+"; `file` names the group's link and QR files in whatsapp-gruplari/.
 */
export type WhatsAppGroup = { id: string; file: string; course: CourseType; gender: Gender };

export const WHATSAPP_GROUPS: WhatsAppGroup[] = [
  { id: "Kadın", file: "normal-kadin", course: "regular", gender: "Kadın" },
  { id: "Erkek", file: "normal-erkek", course: "regular", gender: "Erkek" },
  { id: "Kadın+", file: "yogun-kadin", course: "intensive", gender: "Kadın" },
  { id: "Erkek+", file: "yogun-erkek", course: "intensive", gender: "Erkek" },
];

/** The saved group id for a course and group type ("" until the type is chosen). */
export const groupIdFor = (course: CourseType, gender: Gender | "") =>
  WHATSAPP_GROUPS.find((g) => g.course === course && g.gender === gender)?.id ?? "";

export type Price = { perLesson: number; lessons: number; total: number };

/**
 * Regular prices, charged without a discount code (they match WHOP_PLANS). A valid code's
 * discounted prices come from the server with its plans (see src/lib/discount.ts).
 */
export const PRICE: Price = { perLesson: 375, lessons: 16, total: 6000 };

export const REGULAR_PRICE: Price = { perLesson: 400, lessons: 8, total: 3200 };

/** An amount in Turkish style: 3200 → "3.200". */
export const formatTL = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const priceFor = (course: CourseType) => course === "regular" ? REGULAR_PRICE : PRICE;
export const courseTitle = (course: CourseType) => course === "regular" ? "Normal Konuşma Kursu" : "Yoğun Konuşma Kursu (+)";
/** The WhatsApp step's heading for each group type. */
export const GROUP_TITLE: Record<Gender, string> = {
  Kadın: "Kadınlar için Arapça Konuşma Grubu",
  Erkek: "Erkekler için Arapça Konuşma Grubu",
};

export const ACTIVITIES = [
  "Günlük konular üzerinden yönlendirilmiş diyaloglar",
  "Fikir belirtme, soru sorma ve cevap verme çalışmaları",
  "Kelime ve ifadeleri konuşma içinde kullanma",
  "Dinleme ve karşılıklı iletişim pratiği",
  "Eğitmen geri bildirimiyle ifadeleri geliştirme",
];

export const STEPS = [
  {
    n: "01",
    title: "Kurs türünü ve grubunuzu seçin",
    body: "Normal veya Yoğun (+) kurstan birini, ardından size uygun Kadın ya da Erkek grubunu seçin. Her grupta en fazla 5 kişi bulunur.",
  },
  {
    n: "02",
    title: "50 dakika ders + 10 dakika ara + 50 dakika ders",
    body: "Her buluşma, aralarında 10 dakika mola olan 50 dakikalık iki dersten oluşur.",
  },
  {
    n: "03",
    title: "Normal: 8 ders · Yoğun (+): 16 ders",
    body: "Normal kurs: haftada 1 gün, her buluşmada 2 ders, 4 haftada 8 ders. Yoğun kurs (+): haftada 2 gün, her buluşmada 2 ders, 4 haftada 16 ders.",
  },
];

export const CREDENTIALS = [
  "Arap dili ve ilimleri ile İslami ilimler alanında lisans.",
  "Edebiyat araştırmaları alanında, İslam edebiyatı uzmanlığında akademik yüksek lisans ve doktora.",
  "Kur’an-ı Kerim okutma icazeti.",
  "Mısır ve Suudi Arabistan’daki üniversiteler ile diğer eğitim ortamlarında yüz yüze öğretim ve çevrim içi eğitim deneyimi.",
  "Shukraan Akademi kurucusu ve yöneticisi.",
];

export const FAQ = [
  {
    q: "Bu kurs sıfırdan başlayanlar için uygun mu?",
    a: "Kursa katılım için en az A2 düzeyi gerekir. A2, B1 ve B2 düzeyindeki katılımcılar için gruplar oluşturulurken seviye yakınlığı dikkate alınır.",
  },
  {
    q: "Haftada kaç gün katılacağım?",
    a: "Normal kursta haftada bir gün, yoğun kursta (+) haftada iki gün buluşulur. Her buluşmada 50 dakikalık iki ders yapılır; arada 10 dakika mola verilir. Normal kurs 4 haftada 8 ders, yoğun kurs 4 haftada 16 derstir.",
  },
  {
    q: "Yerim ne zaman kesinleşir?",
    a: "Ödemenizi tamamladığınızda. Ödeme, kayıt formunun ödeme adımında bu sayfadan yapılır; hemen ardından grubunuzun WhatsApp bağlantısı ve QR kodu gösterilir.",
  },
  {
    q: "Sonraki kurslar için bir avantajım olacak mı?",
    a: "Bu kursa katılanlar, Shukraan Akademi'nin sonraki kurslarının kayıt dönemlerinde kontenjan rezervasyonunda öncelik kazanır.",
  },
];

/** Sample conversation questions, each tagged with a level. */
export const PHRASES: { ar: string; level: "A2" | "B1" | "B2" }[] = [
  { ar: "كيف تعبّر عن رأيك؟", level: "B1" },
  { ar: "أيّ بلد تحبّ أن تزور؟", level: "A2" },
  { ar: "متى تتحدّث بالعربية؟", level: "A2" },
  { ar: "ما الذي يجعل يومك ناجحًا؟", level: "B1" },
  { ar: "ماذا تغيّر لو أدرتَ مدينتك يومًا؟", level: "B2" },
  { ar: "أتفضّل العمل وحدك أم ضمن فريق؟", level: "B2" },
];

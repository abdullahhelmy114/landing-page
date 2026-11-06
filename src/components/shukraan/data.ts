export type Gender = "Kadın" | "Erkek";
export type CourseType = "regular" | "intensive";

export type Level = "A2" | "B1" | "B2";
/** The levels the form offers; the groups section starts on the first. */
export const LEVELS: Level[] = ["A2", "B1", "B2"];

export type Slot = { day: string; first: string; pause: string; second: string };

export type WhatsAppInvite = { url: string; qr: string };

export type Group = {
  /** Saved with the registration; Yoğun (+) groups end in "+". */
  id: string;
  /** Shown on the page, e.g. "A2 · Kadın 1". */
  name: string;
  level: Level;
  gender: Gender;
  /** Normal: one weekly meeting. Yoğun (+): two, at the same hour. */
  slots: Slot[];
  full: boolean;
  /** The group's WhatsApp invite (link, and its QR image in /public). Absent until it has one. */
  whatsapp?: WhatsAppInvite;
};

const hh = (hour: number) => String(hour).padStart(2, "0");

/** A meeting starting at `hour`, Türkiye saati: two 50-minute lessons with a 10-minute break. */
const meeting = (day: string, hour: number): Slot => ({
  day,
  first: `${hh(hour)}:00–${hh(hour)}:50`,
  pause: "10 dk ara",
  second: `${hh(hour + 1)}:00–${hh(hour + 1)}:50`,
});

/** To give a group its WhatsApp invite, add it as the last argument: { url, qr }. */
const group = (course: CourseType, level: Level, gender: Gender, n: 1 | 2, slots: Slot[], whatsapp?: WhatsAppInvite): Group => ({
  id: `${level} · ${gender} ${n}${course === "intensive" ? "+" : ""}`,
  name: `${level} · ${gender} ${n}`,
  level,
  gender,
  slots,
  full: false,
  ...(whatsapp ? { whatsapp } : {}),
});

// One level per day: A2 Pazartesi + Perşembe, B1 Salı + Cumartesi, B2 Çarşamba + Pazar. No Cuma.

/** Yoğun Konuşma Kursu (+): each group meets on its level's two days at the same hour (16 ders). */
export const GROUPS: Group[] = [
  group("intensive", "A2", "Kadın", 1, [meeting("Pazartesi", 10), meeting("Perşembe", 10)]),
  group("intensive", "A2", "Erkek", 1, [meeting("Pazartesi", 12), meeting("Perşembe", 12)]),
  group("intensive", "A2", "Kadın", 2, [meeting("Pazartesi", 14), meeting("Perşembe", 14)]),
  group("intensive", "A2", "Erkek", 2, [meeting("Pazartesi", 16), meeting("Perşembe", 16)]),
  group("intensive", "B1", "Kadın", 1, [meeting("Salı", 10), meeting("Cumartesi", 10)]),
  group("intensive", "B1", "Erkek", 1, [meeting("Salı", 12), meeting("Cumartesi", 12)]),
  group("intensive", "B1", "Kadın", 2, [meeting("Salı", 14), meeting("Cumartesi", 14)]),
  group("intensive", "B1", "Erkek", 2, [meeting("Salı", 16), meeting("Cumartesi", 16)]),
  group("intensive", "B2", "Kadın", 1, [meeting("Çarşamba", 10), meeting("Pazar", 10)]),
  group("intensive", "B2", "Erkek", 1, [meeting("Çarşamba", 12), meeting("Pazar", 12)]),
  group("intensive", "B2", "Kadın", 2, [meeting("Çarşamba", 14), meeting("Pazar", 14)]),
  group("intensive", "B2", "Erkek", 2, [meeting("Çarşamba", 16), meeting("Pazar", 16)]),
];

export type Price = { perLesson: number; lessons: number; total: number };

/**
 * Regular prices, charged without a discount code (they match WHOP_PLANS). A valid code's
 * discounted prices come from the server with its plans (see src/lib/discount.ts).
 */
export const PRICE: Price = { perLesson: 375, lessons: 16, total: 6000 };

export const REGULAR_PRICE: Price = { perLesson: 400, lessons: 8, total: 3200 };

/** An amount in Turkish style: 3200 → "3.200". */
export const formatTL = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Normal Konuşma Kursu: one evening a week; group 1 on the level's first day, group 2 on its second. */
export const REGULAR_GROUPS: Group[] = [
  group("regular", "A2", "Kadın", 1, [meeting("Pazartesi", 18)]),
  group("regular", "A2", "Kadın", 2, [meeting("Perşembe", 18)]),
  group("regular", "A2", "Erkek", 1, [meeting("Pazartesi", 20)]),
  group("regular", "A2", "Erkek", 2, [meeting("Perşembe", 20)]),
  group("regular", "B1", "Kadın", 1, [meeting("Salı", 18)]),
  group("regular", "B1", "Kadın", 2, [meeting("Cumartesi", 18)]),
  group("regular", "B1", "Erkek", 1, [meeting("Salı", 20)]),
  group("regular", "B1", "Erkek", 2, [meeting("Cumartesi", 20)]),
  group("regular", "B2", "Kadın", 1, [meeting("Çarşamba", 18)]),
  group("regular", "B2", "Kadın", 2, [meeting("Pazar", 18)]),
  group("regular", "B2", "Erkek", 1, [meeting("Çarşamba", 20)]),
  group("regular", "B2", "Erkek", 2, [meeting("Pazar", 20)]),
];

export const groupsFor = (course: CourseType) => course === "regular" ? REGULAR_GROUPS : GROUPS;
export const priceFor = (course: CourseType) => course === "regular" ? REGULAR_PRICE : PRICE;
export const courseTitle = (course: CourseType) => course === "regular" ? "Normal Konuşma Kursu" : "Yoğun Konuşma Kursu (+)";
export const waitlistFor = (course: CourseType) => course === "regular"
  ? "Yedek / Bekleme Listesi: Bu saat size uygunsa, mevcut grup tamamlandıktan sonra başlayacak bir sonraki dönem için yerinizi ayırtabilirsiniz. Ödeme, kayıt sırasında bu sayfa üzerinden yapılır."
  : WAITLIST_NOTE;

export const WAITLIST_NOTE =
  "Size uygun grup yoksa bekleme listesine katılın; yeni grup açıldığında size haber verelim.";

/** The WhatsApp step's heading for each group type. */
export const GROUP_TITLE: Record<Gender, string> = {
  Kadın: "Kadınlar için Arapça Konuşma Grubu",
  Erkek: "Erkekler için Arapça Konuşma Grubu",
};

/**
 * The academy's earlier WhatsApp groups, one per group type, which all the former groups shared.
 * No group uses them now; to send a group's buyers to one, pass it as that group's invite.
 */
export const COMMUNITY_WHATSAPP: Record<Gender, WhatsAppInvite> = {
  Kadın: { url: "https://chat.whatsapp.com/FwfLiQe9DFw53CKHGrLsRN", qr: "/QR CODE/Kadın A.png" },
  Erkek: { url: "https://chat.whatsapp.com/KiPAJLXpwag3WIKBg3UYQ8", qr: "/QR CODE/Erkek A.png" },
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

/**
 * Answers that quote prices hold placeholders such as {intensive.total}; <PriceText> fills them
 * with the current price (struck through beside the discounted one when a code is applied).
 * `deposit` is half of the package total.
 */
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
    q: "İstediğim grup doluysa ne yapabilirim?",
    a: "Aynı saat size uygunsa bekleme listesine kaydolabilirsiniz: mevcut grup tamamlandıktan sonra başlayacak bir sonraki dönem için yerinizi ayırtırsınız. Yoğun kursta (+) rezervasyon, {intensive.total}'lik paketin en az %50'si olan {intensive.deposit} ön ödeme ile kesinleşir; kalan tutar kurs başlangıcından önce tamamlanır.",
  },
  {
    q: "Sonraki kurslar için bir avantajım olacak mı?",
    a: "Bu kursa katılanlar, Shukraan Akademi'nin sonraki kurslarının kayıt dönemlerinde kontenjan rezervasyonunda öncelik kazanır.",
  },
];

/** Sample conversation questions, each tagged with one of the levels the form offers. */
export const PHRASES: { ar: string; level: "A2" | "B1" | "B2" }[] = [
  { ar: "كيف تعبّر عن رأيك؟", level: "B1" },
  { ar: "أيّ بلد تحبّ أن تزور؟", level: "A2" },
  { ar: "متى تتحدّث بالعربية؟", level: "A2" },
  { ar: "ما الذي يجعل يومك ناجحًا؟", level: "B1" },
  { ar: "ماذا تغيّر لو أدرتَ مدينتك يومًا؟", level: "B2" },
  { ar: "أتفضّل العمل وحدك أم ضمن فريق؟", level: "B2" },
];

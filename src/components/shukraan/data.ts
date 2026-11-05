export type Gender = "Kadın" | "Erkek";
export type CourseType = "regular" | "intensive";

export type Slot = { day: string; first: string; pause: string; second: string };

export type Group = {
  id: string;
  gender: Gender;
  /** Two weekly slots: one morning, one evening. */
  slots: Slot[];
  full: boolean;
};

const slot = (day: string, first: string, second: string): Slot => ({
  day,
  first,
  pause: "10 dk ara",
  second,
});

/** Yoğunlaştırılmış Konuşma Kursu (+): her grup haftada 2 gün, günde 2 ders, toplam 16 ders. */
export const GROUPS: Group[] = [
  { id: "Kadın A+", gender: "Kadın", full: true, slots: [slot("Cumartesi", "09:00–09:40", "09:50–10:30"), slot("Pazartesi", "16:00–16:40", "16:50–17:30")] },
  { id: "Kadın B+", gender: "Kadın", full: false, slots: [slot("Pazar", "09:00–09:40", "09:50–10:30"), slot("Perşembe", "16:00–16:40", "16:50–17:30")] },
  { id: "Kadın C+", gender: "Kadın", full: false, slots: [slot("Pazartesi", "09:00–09:40", "09:50–10:30"), slot("Cuma", "10:00–10:40", "10:50–11:30")] },
  { id: "Kadın D+", gender: "Kadın", full: true, slots: [slot("Salı", "09:00–09:40", "09:50–10:30"), slot("Cuma", "16:00–16:40", "16:50–17:30")] },
  { id: "Kadın E+", gender: "Kadın", full: true, slots: [slot("Çarşamba", "09:00–09:40", "09:50–10:30"), slot("Salı", "16:00–16:40", "16:50–17:30")] },
  { id: "Erkek A+", gender: "Erkek", full: false, slots: [slot("Cumartesi", "12:00–12:40", "12:50–13:30"), slot("Çarşamba", "18:00–18:40", "18:50–19:30")] },
  { id: "Erkek B+", gender: "Erkek", full: true, slots: [slot("Pazar", "09:00–09:40", "09:50–10:30"), slot("Cumartesi", "16:00–16:40", "16:50–17:30")] },
  { id: "Erkek C+", gender: "Erkek", full: false, slots: [slot("Pazartesi", "09:00–09:40", "09:50–10:30"), slot("Perşembe", "16:00–16:40", "16:50–17:30")] },
  { id: "Erkek D+", gender: "Erkek", full: false, slots: [slot("Salı", "09:00–09:40", "09:50–10:30"), slot("Pazartesi", "16:00–16:40", "16:50–17:30")] },
  { id: "Erkek E+", gender: "Erkek", full: true, slots: [slot("Çarşamba", "09:00–09:40", "09:50–10:30"), slot("Pazar", "16:00–16:40", "16:50–17:30")] },
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

export const REGULAR_GROUPS: Group[] = [
  { id: "Kadın A", gender: "Kadın", full: true, slots: [slot("Pazartesi", "17:00–17:40", "17:50–18:30")] },
  { id: "Kadın B", gender: "Kadın", full: false, slots: [slot("Salı", "18:00–18:40", "18:50–19:30")] },
  { id: "Kadın C", gender: "Kadın", full: false, slots: [slot("Çarşamba", "18:00–18:40", "18:50–19:30")] },
  { id: "Kadın D", gender: "Kadın", full: false, slots: [slot("Perşembe", "18:00–18:40", "18:50–19:30")] },
  { id: "Kadın E", gender: "Kadın", full: false, slots: [slot("Cuma", "18:00–18:40", "18:50–19:30")] },
  { id: "Erkek A", gender: "Erkek", full: true, slots: [slot("Pazartesi", "15:00–15:40", "15:50–16:30")] },
  { id: "Erkek B", gender: "Erkek", full: false, slots: [slot("Salı", "20:00–20:40", "20:50–21:30")] },
  { id: "Erkek C", gender: "Erkek", full: false, slots: [slot("Çarşamba", "20:00–20:40", "20:50–21:30")] },
  { id: "Erkek D", gender: "Erkek", full: false, slots: [slot("Perşembe", "20:00–20:40", "20:50–21:30")] },
  { id: "Erkek E", gender: "Erkek", full: false, slots: [slot("Cuma", "20:00–20:40", "20:50–21:30")] },
];

export const groupsFor = (course: CourseType) => course === "regular" ? REGULAR_GROUPS : GROUPS;
export const priceFor = (course: CourseType) => course === "regular" ? REGULAR_PRICE : PRICE;
export const courseTitle = (course: CourseType) => course === "regular" ? "Normal Konuşma Kursu" : "Yoğunlaştırılmış Konuşma Kursu (+)";
export const waitlistFor = (course: CourseType) => course === "regular"
  ? "Yedek / Bekleme Listesi: Bu saat size uygunsa, mevcut grup tamamlandıktan sonra başlayacak bir sonraki dönem için yerinizi ayırtabilirsiniz. Ödeme, kayıt sırasında bu sayfa üzerinden yapılır."
  : WAITLIST_NOTE;

/**
 * Texts that quote prices hold placeholders such as {intensive.total}; <PriceText> fills them with
 * the current price (struck through beside the discounted one when a code is applied). `deposit`
 * is half of the package total.
 */
export const WAITLIST_NOTE =
  "Yedek / Bekleme Listesi: Bu saat size uygunsa, mevcut grup tamamlandıktan sonra başlayacak bir sonraki dönem için şimdiden yerinizi ayırtabilirsiniz. (Not: Koltuk rezervasyonu, {intensive.total}'lik yoğunlaştırılmış kurs paketinin en az %50'si olan {intensive.deposit} ön ödeme ile kesinleşir; kalan tutar ise kurs başlangıç tarihinden önce tamamlanır.)";

/** QR images live in /public/QR CODE/<Kadın|Erkek> <A–E>.png — replace the files, keep the names. */
export function qrFor(groupId: string, gender: Gender) {
  const g = [...GROUPS, ...REGULAR_GROUPS].find((x) => x.id === groupId);
  const letter = g ? g.id.replace("+", "").split(" ")[1] : "A";
  return encodeURI(`/QR CODE/${gender} ${letter}.png`);
}

export const WHATSAPP: Record<Gender, { url: string; title: string }> = {
  Kadın: {
    url: "https://chat.whatsapp.com/FwfLiQe9DFw53CKHGrLsRN",
    title: "Kadınlar için Arapça Konuşma Grubu",
  },
  Erkek: {
    url: "https://chat.whatsapp.com/KiPAJLXpwag3WIKBg3UYQ8",
    title: "Erkekler için Arapça Konuşma Grubu",
  },
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
    body: "Normal veya Yoğunlaştırılmış (+) kurstan birini, ardından size uygun Kadın ya da Erkek grubunu seçin. Her grupta en fazla 5 kişi bulunur.",
  },
  {
    n: "02",
    title: "40 dakika ders + 10 dakika ara + 40 dakika ders",
    body: "Her buluşma, aralarında 10 dakika mola olan 40 dakikalık iki dersten oluşur.",
  },
  {
    n: "03",
    title: "Normal: 8 ders · Yoğunlaştırılmış (+): 16 ders",
    body: "Normal kurs: haftada 1 gün, her buluşmada 2 ders, 4 haftada 8 ders. Yoğunlaştırılmış kurs (+): haftada 2 gün, her buluşmada 2 ders, 4 haftada 16 ders.",
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
    a: "Normal kursta haftada bir gün, yoğunlaştırılmış kursta (+) haftada iki gün buluşulur. Her buluşmada 40 dakikalık iki ders yapılır; arada 10 dakika mola verilir. Normal kurs 4 haftada 8 ders, yoğunlaştırılmış kurs 4 haftada 16 derstir.",
  },
  {
    q: "Ücretler nedir ve kimler için geçerlidir?",
    a: `Normal kurs {regular.perLesson} TL × ${REGULAR_PRICE.lessons} ders = {regular.total}; Yoğunlaştırılmış kurs (+) {intensive.perLesson} TL × ${PRICE.lessons} ders = {intensive.total}. Ücretler kişi başıdır.`,
  },
  {
    q: "Formu doldurunca yerim kesinleşir mi?",
    a: "Hayır. Form, başvurunuzu akademiye iletir. Ödeme, kayıt sırasında bu sayfa üzerinden yapılır; koltuğunuz ödemeniz doğrulandıktan sonra kesinleşir.",
  },
  {
    q: "İstediğim grup doluysa ne yapabilirim?",
    a: "Aynı saat size uygunsa bekleme listesine kaydolabilirsiniz: mevcut grup tamamlandıktan sonra başlayacak bir sonraki dönem için yerinizi ayırtırsınız. Yoğunlaştırılmış kursta (+) rezervasyon, {intensive.total}'lik paketin en az %50'si olan {intensive.deposit} ön ödeme ile kesinleşir; kalan tutar kurs başlangıcından önce tamamlanır.",
  },
  {
    q: "Sonraki kurslar için bir avantajım olacak mı?",
    a: "Bu kursa katılanlar, Shukraan Akademi'nin sonraki kurslarının kayıt dönemlerinde kontenjan rezervasyonunda öncelik kazanır.",
  },
];

export const PHRASES = [
  "كيف تعبّر عن رأيك إذا اختلفت مع صديقك؟",
  "لو أُتيحت لك فرصة السفر، فأيّ بلد تختار؟ ولماذا؟",
  "ما أكثر موقف احتجت فيه إلى التحدث بالعربية؟",
  "ما الذي يجعل يومك ناجحًا في رأيك؟",
  "لو كنت مسؤولًا عن مدينتك ليوم واحد، فماذا تغيّر أولًا؟",
  "هل تفضّل العمل وحدك أم ضمن فريق؟ ولماذا؟",
];

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

export const PRICE = {
  perLesson: 225,
  lessons: 16,
  total: "3.600",
  deposit: "1.800",
  standardPerLesson: 550,
  standardTotal: "8.800",
};

export const REGULAR_PRICE = {
  perLesson: 250,
  lessons: 8,
  total: "2.000",
  standardPerLesson: 550,
  standardTotal: "4.400",
};

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
export const courseTitle = (course: CourseType) => course === "regular" ? "Konuşma Kursu" : "Yoğunlaştırılmış Konuşma Kursu (+)";
export const waitlistFor = (course: CourseType) => course === "regular"
  ? "Yedek / Bekleme Listesi: Bu saat size uygunsa, mevcut grup tamamlandıktan sonra başlayacak bir sonraki dönem için yerinizi ayırtabilirsiniz. Kesin kayıt ve ödeme adımları WhatsApp topluluğunda paylaşılır."
  : WAITLIST_NOTE;

export const WAITLIST_NOTE =
  "Yedek / Bekleme Listesi: Bu saat size uygunsa, mevcut grup tamamlandıktan sonra başlayacak bir sonraki dönem için şimdiden yerinizi ayırtabilirsiniz. (Not: Koltuk rezervasyonu, 16 derslik ücretin en az %50'si olan 1.800 TL ön ödeme ile kesinleşir; kalan tutar ise kurs başlangıç tarihinden önce tamamlanır.)";

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

export const STATS = [
  { value: "16", label: "ders", note: "4 haftalık yoğun paket" },
  { value: "40", label: "dakika", note: "Her bir dersin süresi" },
  { value: "2", label: "gün / hafta", note: "Her gün iki ders, 10 dk ara" },
  { value: "3.600", label: "TL", note: "Özel teklif · Kişi başı" },
];

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
    title: "Size uygun grubu seçin",
    body: "A+ – E+ yoğun gruplarından birini tercih edin. Her grubun haftada iki günü vardır: bir sabah ve bir akşam buluşması. Her grupta en fazla 5 kişi bulunur.",
  },
  {
    n: "02",
    title: "40 dakika + 10 dakika ara + 40 dakika",
    body: "Her buluşmada 40'ar dakikalık iki ders yapılır. Kısa aradan sonra ikinci derste pratiğe devam edersiniz.",
  },
  {
    n: "03",
    title: "Dört haftada 16 ders",
    body: "Paketiniz toplam 16 dersten oluşur: haftada 2 gün × 2 ders × 4 hafta. Kesin ders tarihleri grubunuzun başlangıcıyla birlikte paylaşılır.",
  },
];

export const CREDENTIALS = [
  "Arap dili ve ilimleri ile İslami ilimler alanında lisans.",
  "Edebiyat araştırmaları alanında, İslam edebiyatı uzmanlığında akademik yüksek lisans ve doktora.",
  "Kur’an-ı Kerim okutma icazeti.",
  "Ana dili Arapça olmayanlara Arapça öğretimi alanında mesleki yüksek lisans ve mesleki doktora.",
  "Mısır ve Suudi Arabistan’daki üniversiteler ile diğer eğitim ortamlarında yüz yüze öğretim ve çevrim içi eğitim deneyimi.",
  "Shukraan Akademi kurucusu ve yöneticisi.",
];

export const FAQ = [
  {
    q: "Bu program sıfırdan başlayanlar için uygun mu?",
    a: "Programa katılım için en az A2 düzeyi gerekir. A2, B1 ve B2 düzeyindeki katılımcılar için gruplar oluşturulurken seviye yakınlığı dikkate alınır.",
  },
  {
    q: "Haftada kaç gün katılacağım?",
    a: "Yoğunlaştırılmış gruplarda (+) haftada iki güne katılırsınız: bir sabah ve bir akşam buluşması. Her gün 40’ar dakikalık iki ders yapılır; arada 10 dakika mola verilir. Paket dört haftada toplam 16 derstir.",
  },
  {
    q: "3.600 TL’lik teklif kimler için geçerli?",
    a: "ضاد (Dâd) topluluğu üyeleri ve Sakarya Üniversitesi öğrencileri için geçerlidir. Kişi başı 225 TL × 16 ders = 3.600 TL. Teklif sınırlı sürelidir.",
  },
  {
    q: "Formu doldurunca yerim kesinleşir mi?",
    a: "Form bilgilerinizi akademiye iletir. Ödeme yöntemi, form ve WhatsApp topluluğuna katılım sonrasında paylaşılır. Koltuklar, peşin ödemenin doğrulandığı sıraya göre kesinleşir.",
  },
  {
    q: "İstediğim grup doluysa ne yapabilirim?",
    a: "Aynı saat size uygunsa bekleme listesine kaydolabilirsiniz: mevcut grup tamamlandıktan sonra başlayacak bir sonraki dönem için yerinizi şimdiden ayırtırsınız. Rezervasyon, 16 derslik ücretin en az %50'si olan 1.800 TL ön ödeme ile kesinleşir; kalan tutar kurs başlangıç tarihinden önce tamamlanır.",
  },
  {
    q: "Sonraki kurslar için hangi avantajlarım olacak?",
    a: "Bu programa katılanlar Shukraan Akademi ailesinin bir parçası olarak sonraki kurslarda kontenjan rezervasyonunda öncelik ve kurs ücretleri üzerinden %20 indirim hakkı kazanır.",
  },
];

export const PHRASES = [
  "أهلاً وسهلاً",
  "كيف حالك؟",
  "أنا بخير، والحمد لله",
  "ماذا تفعل في عطلة نهاية الأسبوع؟",
  "برأيي…",
  "هل يمكنك أن تعيد من فضلك؟",
  "شكراً جزيلاً",
];

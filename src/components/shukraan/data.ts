export type Gender = "Kadın" | "Erkek";

export type Group = {
  id: string;
  gender: Gender;
  day: string;
  first: string;
  pause: string;
  second: string;
  full: boolean;
};

const SLOTS: Record<Gender, [string, string, string]> = {
  Kadın: ["18:00–18:40", "18:40–18:50", "18:50–19:30"],
  Erkek: ["20:00–20:40", "20:40–20:50", "20:50–21:30"],
};
const MONDAY: Record<Gender, [string, string, string]> = {
  Kadın: ["17:00–17:40", "17:40–17:50", "17:50–18:30"],
  Erkek: ["15:00–15:40", "15:40–15:50", "15:50–16:30"],
};
const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
/** Groups marked full cannot be chosen. */
const FULL = new Set(["Kadın A", "Erkek A"]);

export const GROUPS: Group[] = (["Kadın", "Erkek"] as Gender[]).flatMap((gender) =>
  DAYS.map((day, i) => {
    const id = `${gender} ${String.fromCharCode(65 + i)}`;
    const [first, pause, second] = i === 0 ? MONDAY[gender] : SLOTS[gender];
    return { id, gender, day, first, pause, second, full: FULL.has(id) };
  }),
);

/** QR images live in /public/QR CODE/<Group id>.png — replace the files, keep the names. */
export function qrFor(groupId: string, gender: Gender) {
  const id = GROUPS.some((g) => g.id === groupId) ? groupId : `${gender} A`;
  return encodeURI(`/QR CODE/${id}.png`);
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
  { value: "8", label: "ders", note: "4 haftalık paket" },
  { value: "40", label: "dakika", note: "Her bir dersin süresi" },
  { value: "1", label: "gün / hafta", note: "Aynı gün iki ders, 10 dk ara" },
  { value: "2.000", label: "TL", note: "Özel teklif · Kişi başı" },
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
    title: "Size uygun günü seçin",
    body: "Pazartesiden cumaya, kadın veya erkek gruplarından birini tercih edin. Her grupta en fazla 5 kişi bulunur.",
  },
  {
    n: "02",
    title: "40 dakika + 10 dakika ara + 40 dakika",
    body: "Haftalık iki dersiniz aynı gün yapılır. Kısa aradan sonra ikinci derste pratiğe devam edersiniz.",
  },
  {
    n: "03",
    title: "Dört haftada 8 ders",
    body: "Paketiniz toplam 8 dersten oluşur. Kesin ders tarihleri grubunuzun başlangıcıyla birlikte paylaşılır.",
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
    a: "Seçtiğiniz gruba haftada bir gün katılırsınız. Aynı gün 40’ar dakikalık iki ders yapılır; arada 10 dakika mola verilir. Paket dört haftada toplam 8 derstir.",
  },
  {
    q: "2.000 TL’lik teklif kimler için geçerli?",
    a: "ضاد (Dâd) topluluğu üyeleri ve Sakarya Üniversitesi öğrencileri için geçerlidir. Kişi başı 250 TL × 8 ders = 2.000 TL. Teklif sınırlı sürelidir.",
  },
  {
    q: "Formu doldurunca yerim kesinleşir mi?",
    a: "Form bilgilerinizi akademiye iletir. Ödeme yöntemi, form ve WhatsApp topluluğuna katılım sonrasında paylaşılır. Koltuklar, peşin ödemenin doğrulandığı sıraya göre kesinleşir.",
  },
  {
    q: "İstediğim grup dolarsa ne olur?",
    a: "Başvuru formu açık kalır. Her 5 kadın veya 5 erkek katılımcı için seviye ve zaman uygunluğu değerlendirilerek yeni grup planlanır. Yeni grubun günü ve saati ayrıca paylaşılır.",
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

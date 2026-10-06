import { pledgeFor } from "./decisions";
import { offeredProduct } from "./navigation";
import { products, roomById, combos, type RoomId } from "./data";
import type { State } from "./model";
export interface Discovery {
  round: number;
  room: RoomId;
  zone: string;
}
export interface Consideration {
  round: number;
  productId: string;
}
export interface MiniGoal {
  id: string;
  label: string;
  done: boolean;
}
export function miniGoals(s: State): MiniGoal[] {
  const moves = s.moves.filter((m) => m.round === s.round),
    seen = (s.discoveries || []).filter((d) => d.round === s.round);
  const moved = (ids: string[]) => moves.some((m) => ids.includes(m.id));
  const found = (rooms: RoomId[]) => seen.some((d) => rooms.includes(d.room));
  const installed = moves.some((m) => products.some((p) => p.id === m.id));
  const habit = moves.some((m) => s.actions.includes(m.id));
  const entries: [string, boolean][][] = [
    [
      [
        "Su boşa giden bir yeri bul",
        seen.some((d) => d.zone === "tap" || d.zone === "shower"),
      ],
      ["Evde küçük bir iyileştirme yap", installed],
      ["Parasız bir hamle seç", habit],
    ],
    [
      ["Gereksiz enerji kullanımını bul", found(["workshop", "laundry"])],
      [
        "Bir ölçüm veya kontrol çözümü dene",
        moved(["meter", "strip", "basic-strip", "smart-plug"]),
      ],
      ["Bir alışkanlığı değiştir", habit],
    ],
    [
      [
        "Bahçede suyu daha doğru kullan",
        moved(["drip", "rain", "watering", "dawn"]),
      ],
      [
        "Tekrar kullanılabilecek bir şeyi değerlendir",
        moved(["bags", "jars", "crate", "reuse"]),
      ],
      [
        "Gıda veya ambalaj kaybını azalt",
        moved(["containers", "stock", "bags", "jars", "crate", "reuse"]),
      ],
    ],
    [
      [
        "Atığı ayır veya yeniden değerlendir",
        moved(["sort", "compost", "separate"]),
      ],
      [
        "Büyük bir yatırım kararını düşün",
        (s.considered || []).some(
          (c) => c.round === s.round && c.productId === "solar",
        ),
      ],
      [
        "Dönüşüme son bir adım ekle",
        moves.some((m) => m.room === "waste" || m.room === "roof"),
      ],
    ],
  ];
  return entries[s.round - 1].map(([label, done], i) => ({
    id: `${s.round}-${i}`,
    label,
    done,
  }));
}
export interface Idea {
  id: string;
  title: string;
  text: string;
  pledge: string;
  asset?: string;
  lessonId?: string;
  starter?: boolean;
}
const starters: Idea[] = [
  {
    id: "start-observe",
    title: "Önce küçük kayıplara bak",
    text: "Her gün kullandığın bir yerde boşa gideni fark ederek başlayabilirsin.",
    pledge: "Evde ve işte küçük kayıpları kontrol edeceğiz.",
    starter: true,
  },
  {
    id: "start-need",
    title: "Önce ihtiyacını düşün",
    text: "Bir ürün almadan önce hangi sorunu çözmek istediğini konuşabilirsin.",
    pledge: "Yeni bir ürün almadan önce ihtiyacımızı konuşacağız.",
    starter: true,
  },
  {
    id: "start-together",
    title: "Küçük başla, birlikte sürdür",
    text: "Bir fikri günlük düzene katmak için birbirinize hatırlatabilirsiniz.",
    pledge: "Bir tasarruf alışkanlığını birlikte sürdüreceğiz.",
    starter: true,
  },
];
const pledges: Record<string, string> = {
  "tap-a": "Musluk uçlarında küçük bir iyileştirmeyi araştıracağız.",
  repair: "Musluk kaçaklarını kontrol edeceğiz.",
  "shower-a": "Duş başlığımızın ihtiyacımıza uygunluğuna bakacağız.",
  "shower-b": "Su kullanan ürünleri yalnız görünüşüne göre seçmeyeceğiz.",
  led: "Sık kullandığımız ampullere bakacağız.",
  bulb: "Ampul alırken kullanım yükünü de karşılaştıracağız.",
  curtain: "Pencere çevresinde ısıyı korumayı deneyeceğiz.",
  seal: "Kapı ve pencere boşluklarını kontrol edeceğiz.",
  containers: "Tekrar kullanılabilir kapları artıracağız.",
  wrap: "Tek kullanımlık ambalajın yerine geçebilecek seçeneklere bakacağız.",
  strip: "İş bitince uygun cihazları kapatacağız.",
  "basic-strip": "Priz alırken hangi sorunu çözdüğünü kontrol edeceğiz.",
  meter: "Hangi cihazın ne kadar elektrik kullandığını araştıracağız.",
  "smart-plug":
    "Akıllı cihazlarımızın ayarlarını ihtiyacımıza göre düzenleyeceğiz.",
  rack: "Uygun yerde çamaşırları asarak kurutmayı deneyeceğiz.",
  rope: "Havayla kurutma için küçük bir alan ayıracağız.",
  drip: "Sulamayı doğrudan bitkinin ihtiyacına yönlendireceğiz.",
  watering: "Sulamadan önce toprağın ihtiyacına bakacağız.",
  mulch: "Toprağın nemini koruyacak örtüleri araştıracağız.",
  rain: "Yağmur suyunu bahçede değerlendirmeyi araştıracağız.",
  tank: "Su deposu almadan önce bağlantılarını planlayacağız.",
  bags: "Alışverişte tekrar kullandığımız çantaları yanımıza alacağız.",
  jars: "Uygun kavanozları yeniden kullanacağız.",
  crate: "Kooperatifte kasaların tekrar kullanımını planlayacağız.",
  sort: "Atıkları uygun şekilde ayıracağız.",
  bin: "Atık kutusunu büyütmeden önce ayırma düzenine bakacağız.",
  compost: "Uygun organik artıkları değerlendirmeyi araştıracağız.",
  solar: "Güneş yatırımı öncesinde çatı uygunluğunu araştıracağız.",
  "portable-solar":
    "Panel seçerken ihtiyacımızla kapasitesini karşılaştıracağız.",
  "solar-lamp":
    "Çevreci görünen ürünlerin asıl ihtiyacımızı karşılayıp karşılamadığına bakacağız.",
  "free-lights": "Son çıkanın ışıkları kontrol etmesini alışkanlık yapacağız.",
  "free-stock": "Önce kullan sepeti oluşturacağız.",
  "free-full": "Makineyi tam doluyken çalıştıracağız.",
  "free-off": "İş sonunda kapatma rutini oluşturacağız.",
  "free-dawn": "Sulama saatini değiştireceğiz.",
  "free-reuse": "Temiz ve uygun ambalajları yeniden kullanacağız.",
  "free-separate": "Uygun organik artıkları ayrı biriktireceğiz.",
  "free-short": "Kullanmadığımız anlarda musluğu kapatacağız.",
};
export const comboIdeas: Record<string, { text: string; pledge: string }> = {
  water: {
    text: "Kaçağı onarmak ve akışı kontrol etmek birbirini tamamlar.",
    pledge: "Muslukta bakım ve akış kontrolünü birlikte ele alacağız.",
  },
  warm: {
    text: "Pencere aralıklarını kapatmak ve kalın perde kullanmak birlikte işe yarayabilir.",
    pledge: "Pencere aralıklarını ve perdeyi birlikte gözden geçireceğiz.",
  },
  garden: {
    text: "Toplanan yağmur suyunu köklere yönlendirmek iki fikri birleştirir.",
    pledge: "Yağmur suyunu kontrollü sulamayla birleştirmeyi araştıracağız.",
  },
  aware: {
    text: "Ölçtüğünü fark edip kullanımını değiştirmek asıl farkı yaratır.",
    pledge:
      "Ölçtüğümüz tüketim için bir kullanım alışkanlığını değiştireceğiz.",
  },
  soil: {
    text: "Uygun artıkları ayrı toplamak kompostu mümkün kılar.",
    pledge: "Kompost için uygun artıkları ayrı biriktirmeyi deneyeceğiz.",
  },
};
export function ideas(s: State): Idea[] {
  return [
    ...(s.lessons || []).map((l) => ({
      id: l.id,
      title: l.memoryName,
      text: l.takeaway || l.result,
      pledge:
        pledgeFor(l.id) ||
        pledges[l.id] ||
        "İhtiyacımıza uygun küçük bir değişiklik deneyeceğiz.",
      asset: l.asset,
      lessonId: l.id,
    })),
    ...s.combos.map((id) => ({
      id: "combo-" + id,
      title: combos.find((c) => c.id === id)!.name,
      text: comboIdeas[id].text,
      pledge: comboIdeas[id].pledge,
    })),
    ...starters,
  ];
}
export function solutions(room: RoomId, zone: string, round: number) {
  return products
    .filter(
      (p) =>
        offeredProduct(p) &&
        p.room === room &&
        p.zone === zone &&
        roomById(p.room).round <= round,
    )
    .slice(0, 4);
}
export const roundIdea = (s: State) => {
  const move = s.moves.filter((m) => m.round === s.round).at(-1);
  return (
    (s.lessons || []).find(
      (l) => l.id === move?.id || l.id === "free-" + move?.id,
    )?.takeaway || "Küçük bir kaybı fark etmek de iyi bir başlangıçtır."
  );
};

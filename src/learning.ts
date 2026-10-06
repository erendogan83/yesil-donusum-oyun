import { productById, freeActions, type Product } from "./data";
export type Tone = "good" | "bad" | "neutral";
export interface LessonCopy {
  title: string;
  result: string;
  realLife: string;
  takeaway: string;
  memoryName: string;
}
export interface Lesson extends LessonCopy {
  id: string;
  asset: string;
  category: string;
  billImpact: number;
  comboImpact: number;
  replacementImpact?: number;
  spent: number;
  tone: Tone;
  acknowledged: boolean;
  remind: boolean;
}
export const lessonCopy: Record<string, LessonCopy> = {
  "tap-a": {
    memoryName: "Perlatör",
    title: "Küçük parça, güzel fark!",
    result:
      "Bu aparat musluğun ucunda gereksiz su akışını azaltmaya yardımcı olur.",
    realLife: "Küçük ve evde uygulanması kolay çözümlerden biridir.",
    takeaway: "Musluğu değiştirmeden de su kullanımını iyileştirebilirsin.",
  },
  repair: {
    memoryName: "Kaçak bakımı",
    title: "Kaçak durdu!",
    result: "Damla damla akan suyu durdurdun; sürekli kaybın önüne geçtin.",
    realLife: "Evde sızdıran muslukları ertelememek suyu ve bütçeyi korur.",
    takeaway: "Bazen en iyi yatırım yeni bir ürün değil, basit bir tamirdir.",
  },
  "shower-a": {
    memoryName: "Kontrollü duş başlığı",
    title: "Duş keyfi kalsın, su boşa gitmesin.",
    result: "Daha kontrollü çalışan bir duş başlığı seçtin.",
    realLife: "Tesisatı yenilemeden uygulanabilecek kolay adımlardan biridir.",
    takeaway: "Gösterişli olan değil, ihtiyacına uygun olan değerlidir.",
  },
  "shower-b": {
    memoryName: "Güçlü akışın etkisi",
    title: "Güzel göründü, daha çok su kullandı.",
    result: "Geniş ve güçlü akış bu oyunda faturayı artırdı.",
    realLife: "Yalnız görünüşe veya “güçlü” olmasına bakmak yanıltabilir.",
    takeaway: "Pahalı veya büyük ürün her zaman tasarruflu değildir.",
  },
  led: {
    memoryName: "LED aydınlatma",
    title: "Aynı işi daha az enerjiyle yaptın.",
    result: "Eski ampul yerine daha verimli bir aydınlatma seçtin.",
    realLife: "Sık kullanılan lambalar evde başlamak için kolay bir noktadır.",
    takeaway: "Tasarruf bazen tek bir ampulle başlar.",
  },
  bulb: {
    memoryName: "Ampul seçimi",
    title: "Sıcak ışık, daha fazla tüketim.",
    result: "Bu ampulün düşük fiyatı kullanımda avantaj sağlamadı.",
    realLife: "Ampul alırken yalnız ilk fiyatını düşünmemek iyi olur.",
    takeaway: "Satın alma bedeli ile kullanım yükünü birlikte düşün.",
  },
  curtain: {
    memoryName: "Kalın perde",
    title: "Isıyı içeride tutmaya yardım ettin.",
    result:
      "Kalın perde pencere çevresindeki ısı kaybını azaltmaya yardımcı olur.",
    realLife: "Soğuk dönemlerde kolay uygulanabilen destekleyici bir çözümdür.",
    takeaway: "Her çözüm büyük tadilat olmak zorunda değil.",
  },
  seal: {
    memoryName: "Pencere aralıkları",
    title: "Küçük hava kaçaklarını kapattın.",
    result: "Pencere kenarından gelen soğuk havayı azalttın.",
    realLife: "Evde pencere fitillerini kontrol etmek kolay bir başlangıçtır.",
    takeaway: "Önce küçük aralıkları fark et, sonra uygun parçayı seç.",
  },
  containers: {
    memoryName: "Saklama kapları",
    title: "Bir kez al, tekrar tekrar kullan.",
    result: "Yiyecekleri koruyan, yeniden kullanılabilir kaplar seçtin.",
    realLife:
      "Evde ve kooperatifte sık kullanılan kaplar tekrar değerlendirilebilir.",
    takeaway: "En iyi atıklardan biri hiç oluşmayan atıktır.",
  },
  wrap: {
    memoryName: "Tek kullanımlık ambalaj",
    title: "Pratikti, ama her seferinde yenisi gerekti.",
    result: "Tek kullanımlık örtü yeni ambalaj ihtiyacını sürdürdü.",
    realLife:
      "Sık yaptığın işlerde tekrar kullanılan seçenekleri karşılaştırabilirsin.",
    takeaway: "Bir sonraki kullanımı da düşün.",
  },
  strip: {
    memoryName: "Anahtarlı priz",
    title: "İş bitince tek düğmeyle kapattın.",
    result: "Gereksiz bekleyen cihazların tüketimini azalttın.",
    realLife:
      "Uygun cihazları iş sonunda kapatmak günlük bir alışkanlık olabilir.",
    takeaway: "Kolay kapatılan bir düzen kur.",
  },
  "basic-strip": {
    memoryName: "Çoklu priz",
    title: "Bağlantı çoğaldı, tüketim değişmedi.",
    result: "Bu priz yeni bağlantı yerleri sağladı; cihazları kapatmadı.",
    realLife: "Daha fazla özellik her zaman ihtiyacın olan çözüm değildir.",
    takeaway: "Üründen önce çözmek istediğin sorunu seç.",
  },
  meter: {
    memoryName: "Tüketim göstergesi",
    title: "Önce nerede harcadığını gör.",
    result:
      "Bu cihaz ekipmanların ne kadar elektrik kullandığını anlamana yardımcı olur.",
    realLife: "Tek başına tasarruf sağlamaz; nereden başlayacağını gösterir.",
    takeaway: "Ölç, fark et, sonra değiştir.",
  },
  "smart-plug": {
    memoryName: "Zaman ayarlı priz",
    title: "Saatini ayarladın, boşuna beklemedi.",
    result: "Bu oyunda gereksiz bekleme süresini azaltacak şekilde kullandın.",
    realLife:
      "Akıllı ürün tek başına yetmez; doğru ayar ve alışkanlık gerekir.",
    takeaway: "Ürünü almadan önce neyi değiştireceğini düşün.",
  },
  rack: {
    memoryName: "Havayla kurutma",
    title: "Hava ve güneş de yardım etti.",
    result: "Çamaşırları asarak kurutmayı seçtin.",
    realLife:
      "Uygun ve havalanan bir alanda makineye daha az ihtiyaç duyabilirsin.",
    takeaway: "Elindeki doğal imkânları fark et.",
  },
  rope: {
    memoryName: "İp ve mandal",
    title: "Basit bir çözüm işini gördü.",
    result: "Çamaşırları asabileceğin bir alan oluşturdun.",
    realLife: "Uygun yerde küçük bir kurutma alanı da işe yarayabilir.",
    takeaway: "Her ihtiyaç pahalı bir cihaz gerektirmez.",
  },
  drip: {
    memoryName: "Damla sulama",
    title: "Suyu doğrudan bitkiye götürdün.",
    result: "Suyu her yere dağıtmak yerine köklere yönlendirdin.",
    realLife:
      "Bahçe ve üretim alanlarında kontrollü sulama için uygulanabilir.",
    takeaway: "Daha çok su değil, doğru yere su.",
  },
  watering: {
    memoryName: "Kontrollü sulama",
    title: "Her bitkiye ihtiyacı kadar.",
    result: "Küçük alanda suyu daha kontrollü verdin.",
    realLife: "Evdeki saksılarda toprağı kontrol ederek başlayabilirsin.",
    takeaway: "Sulamadan önce ihtiyaca bak.",
  },
  mulch: {
    memoryName: "Toprak örtüsü",
    title: "Toprağın nemini korumaya yardım ettin.",
    result: "Örtüyle toprağın çıplak kalmasını azalttın.",
    realLife: "Uygun malç, bahçede nem kaybını azaltmaya yardımcı olabilir.",
    takeaway: "Suyu vermek kadar tutmak da önemlidir.",
  },
  rain: {
    memoryName: "Yağmur suyu",
    title: "Yağmur suyunu boşa bırakmadın.",
    result: "Çatıdan gelen suyu bahçede değerlendirmek üzere topladın.",
    realLife: "Uygun alanı olan ev ve işletmelerde sulamaya destek olabilir.",
    takeaway: "Bir yerde atık olan, başka yerde kaynak olabilir.",
  },
  tank: {
    memoryName: "Su depolama",
    title: "Topladığın suya yer açtın.",
    result: "Bağlantılı sistemde suyu daha sonra kullanmak üzere sakladın.",
    realLife: "Depo seçerken suyun nereden geleceğini de düşünmek gerekir.",
    takeaway: "Parçalar birbirini tamamladığında işe yarar.",
  },
  bags: {
    memoryName: "Bez çanta",
    title: "Aynı çanta, birçok yolculuk.",
    result: "Tekrar kullanılabilir bir taşıma çözümü seçtin.",
    realLife:
      "Alışverişe veya teslimata giderken çantanı yanında tutabilirsin.",
    takeaway: "Tekrar kullanmak, hatırlamakla başlar.",
  },
  jars: {
    memoryName: "Yeniden dolan kavanozlar",
    title: "Ambalajı bir kez daha kullandın.",
    result: "Kavanozları yeniden doldurulabilir bir çözüm olarak seçtin.",
    realLife: "Uygun, temiz kaplar evde ve kooperatifte değerlendirilebilir.",
    takeaway: "Yeni kap almadan önce elindekine bak.",
  },
  crate: {
    memoryName: "Dayanıklı kasa",
    title: "Taşımayı tekrar kullanılabilir hâle getirdin.",
    result: "Ürünler için sağlam bir taşıma kabı seçtin.",
    realLife:
      "Kooperatifte geri dönen kasalar için küçük bir düzen kurulabilir.",
    takeaway: "Tekrar kullanım için geri dönüş yolunu da planla.",
  },
  sort: {
    memoryName: "Atıkları ayırma",
    title: "Birbirine karışmadan ayırdın.",
    result: "Farklı atıklar için ayrı yerler oluşturdun.",
    realLife:
      "Evde ve işte toplama koşullarına uygun ayırmayla başlayabilirsin.",
    takeaway: "Doğru ayırma, doğru yerde başlar.",
  },
  bin: {
    memoryName: "Büyük kutunun sınırı",
    title: "Daha çok yer, aynı karışıklık.",
    result: "Büyük kutu alan sağladı; atıkları kendiliğinden ayırmadı.",
    realLife: "Daha büyük bir ürün her zaman asıl sorunu çözmez.",
    takeaway: "Hacmi büyütmeden önce alışkanlığı düşün.",
  },
  compost: {
    memoryName: "Kompost",
    title: "Çöp yerine toprağa döndü.",
    result:
      "Uygun mutfak ve bahçe artıklarını değerlendirecek bir sistem kurdun.",
    realLife: "Her organik artık çöpe gitmek zorunda değil.",
    takeaway: "Atığı azaltmanın bir yolu, onu yeniden kaynağa çevirmektir.",
  },
  solar: {
    memoryName: "Çatı güneşi",
    title: "Çatıya yeni bir görev verdin.",
    result: "Güneş alan çatıya elektrik üreten paneller kurdun.",
    realLife:
      "Gerçek bir kurulumda çatı uygunluğu ve ihtiyaç birlikte değerlendirilir.",
    takeaway: "Büyük yatırımdan önce doğru alanı ve ihtiyacı belirle.",
  },
  "portable-solar": {
    memoryName: "Küçük güneş paneli",
    title: "Küçük panelin etkisi de sınırlı kaldı.",
    result: "Bu çözüm yerleşkenin ihtiyacının küçük bir bölümüne destek oldu.",
    realLife:
      "Taşınabilir bir ürün daha küçük bir kullanım için uygun olabilir.",
    takeaway: "Ürünün gücünü ihtiyacınla eşleştir.",
  },
  "solar-lamp": {
    memoryName: "Güneşli süs lambası",
    title: "Bir ışık ekledin, asıl sorun kaldı.",
    result: "Dekor lambası yerleşkenin mevcut tüketimini değiştirmedi.",
    realLife:
      "“Güneşli” veya “eko” olması tek başına doğru çözüm demek değildir.",
    takeaway: "Etikete değil, çözmek istediğin soruna bak.",
  },
};
Object.assign(lessonCopy, {
  "tap-a": {
    memoryName: "Muslukta küçük dokunuş",
    title: "Küçücük parça, güzel fark.",
    result: "Musluğu değiştirmeden gereksiz su akışını azalttın.",
    realLife: "Evde uygulanması kolay ve düşük maliyetli fikirlerden biri.",
    takeaway: "Önce küçük kayıplara bak.",
  },
  repair: {
    memoryName: "Tamirle gelen fark",
    title: "Damla damla gitmesine izin vermedin.",
    result: "Kaçağı durdurdun. Küçük bir bakım sürekli kaybı önledi.",
    realLife:
      "Bazen yeni ürün almak yerine elindekini onarmak daha iyi sonuç verir.",
    takeaway: "Tamir de bir tasarruf yöntemidir.",
  },
  "shower-a": {
    memoryName: "İhtiyaca uygun duş",
    title: "Konfor kalsın, israf azalsın.",
    result: "Daha kontrollü bir seçenek kullandın.",
    realLife: "Tesisatı değiştirmeden de küçük bir iyileştirme yapılabilir.",
    takeaway: "Büyük olan her zaman daha iyi değildir.",
  },
  "shower-b": {
    memoryName: "Görünüşten önce ihtiyaç",
    title: "Gösterişliydi, ama faturayı sevmedi.",
    result: "Güçlü akış daha fazla su kullandı.",
    realLife: "Bir ürünü yalnız görüntüsüne göre seçmek yanıltabilir.",
    takeaway: "Önce ihtiyacına bak.",
  },
  led: {
    memoryName: "Aydınlatmada küçük değişim",
    title: "Işıktan değil, gereksiz harcamadan vazgeçtin.",
    result: "Bu LED ampulle aynı ihtiyacı daha az enerjiyle karşıladın.",
    realLife: "Sık kullandığın lambalardan başlamak kolaydır.",
    takeaway: "Küçük değişiklikler her gün çalışır.",
  },
  meter: {
    memoryName: "Ölç, fark et, değiştir",
    title: "Nereye gittiğini görmeden azaltmak zor.",
    result:
      "Ölçmek tasarrufun kendisi değil; şimdi neyin fazla harcadığını bul.",
    realLife:
      "Bu cihaz, elektriğin nerede daha çok kullanıldığını görmene yardımcı olur.",
    takeaway: "Ölç, fark et, sonra değiştir.",
  },
  "smart-plug": {
    memoryName: "Akıllı kullanım",
    title: "Akıllı ürün, akıllı kullanım ister.",
    result: "Bu oyunda zamanını ayarlayıp gereksiz beklemeyi azalttın.",
    realLife:
      "Teknoloji tek başına mucize yaratmaz; nasıl kullandığın önemlidir.",
    takeaway: "Üründen önce ihtiyacını düşün.",
  },
  drip: {
    memoryName: "Suyu yerine götür",
    title: "Suyu dolaştırmadın, yerine götürdün.",
    result: "Suyu doğrudan bitkinin ihtiyacı olan yere yönlendirdin.",
    realLife:
      "Bahçede suyu daha kontrollü kullanmanın pratik yollarından biri.",
    takeaway: "Daha çok değil, daha doğru sulama.",
  },
  rain: {
    memoryName: "Yağmuru değerlendir",
    title: "Gökyüzünden geleni boşa bırakmadın.",
    result: "Yağmur suyunu daha sonra kullanmak üzere topladın.",
    realLife: "Uygun alanlarda bahçe sulamasına destek olabilir.",
    takeaway: "Bir yerde fazlalık, başka yerde kaynak olabilir.",
  },
  bags: {
    memoryName: "Bir kez al, birçok kez kullan",
    title: "Bir kez al, birçok kez kullan.",
    result: "Tek kullanımlık yerine tekrar kullanılabilecek bir çözüm seçtin.",
    realLife: "Evde de kooperatifte de küçük bir düzenle sürdürülebilir.",
    takeaway: "En iyi atık, hiç oluşmayan atıktır.",
  },
  compost: {
    memoryName: "Atığı toprağa döndür",
    title: "Çöp sandığın şey toprağa döndü.",
    result: "Uygun organik artıkları yeniden değerlendirdin.",
    realLife: "Uygun mutfak artıklarının hepsi çöpe gitmek zorunda değil.",
    takeaway: "Artığı kaynağa çevirebilirsin.",
  },
});
export function productLesson(
  p: Product,
  impact: number,
  totalImpact: number,
  hasRequirement: boolean,
  replacementImpact = 0,
): Lesson {
  let copy = lessonCopy[p.id];
  if (p.requires && !hasRequirement)
    copy = {
      memoryName: "Su depolama",
      title: "Depo hazır, bağlantı eksik.",
      result: "Suyu toplayan sistem olmadığı için tüketim değişmedi.",
      realLife:
        "Bir parça almadan önce neye bağlanacağını kontrol edebilirsin.",
      takeaway: "Doğru ürün, doğru sistemle işe yarar.",
    };
  if (replacementImpact !== 0)
    copy = {
      ...copy,
      result: `Önceki ürünün etkisi kalktı. Yeni seçimin gideri ${totalImpact < 0 ? "azalttı" : totalImpact > 0 ? "artırdı" : "değiştirmedi"}.`,
    };
  return {
    ...copy,
    id: p.id,
    asset: p.asset,
    category: p.category,
    billImpact: impact,
    comboImpact: totalImpact - impact - replacementImpact,
    replacementImpact,
    spent: p.price,
    tone: totalImpact < 0 ? "good" : totalImpact > 0 ? "bad" : "neutral",
    acknowledged: false,
    remind: false,
  };
}
export function freeLesson(id: string, impact: number, total: number): Lesson {
  const a = freeActions.find((a) => a.id === id)!;
  const real: Record<string, [string, string]> = {
    lights: [
      "Evde son çıkanın ışığı kontrol etmesi kolay bir başlangıçtır.",
      "Küçük bir hatırlatma düzeni kur.",
    ],
    stock: [
      "Evde önce dolaba bakarak alışveriş listesini kısaltabilirsin.",
      "Elindekini görmek, gereksizi almamayı kolaylaştırır.",
    ],
    full: [
      "Uygun program ve dolulukla günlük rutini düzenleyebilirsin.",
      "Makineyi kullanmadan önce doluluğuna bak.",
    ],
    off: [
      "Kooperatifte iş sonu kısa bir kapatma rutini deneyebilirsiniz.",
      "Ölçtükten sonra alışkanlığı değiştir.",
    ],
    dawn: [
      "Bahçede serin saatleri seçmek kaybı azaltmaya yardımcı olabilir.",
      "Ne zaman suladığın da önemlidir.",
    ],
    reuse: [
      "Temiz ve uygun kapları bir sonraki iş için ayırabilirsin.",
      "Atmadan önce bir kullanım daha düşün.",
    ],
    separate: [
      "Uygun sebze artıklarını ayrı bir kapta biriktirerek başlayabilirsin.",
      "Toprağa dönebilecekleri karıştırma.",
    ],
    short: [
      "Evde kullanmadığın anlarda musluğu kapatmayı deneyebilirsin.",
      "Küçük bir alışkanlıkla başla.",
    ],
  };
  return {
    id: "free-" + id,
    memoryName: a.name,
    title: a.name,
    result: a.text,
    realLife: real[id][0],
    takeaway: real[id][1],
    asset: a.asset,
    category: "Günlük alışkanlık",
    billImpact: impact,
    comboImpact: total - impact,
    spent: 0,
    tone: "good",
    acknowledged: false,
    remind: false,
  };
}
export function validLesson(value: unknown): value is Lesson {
  const l = value as Lesson;
  return (
    !!l &&
    [
      "id",
      "title",
      "result",
      "realLife",
      "takeaway",
      "memoryName",
      "asset",
      "category",
    ].every(
      (k) => typeof (l as unknown as Record<string, unknown>)[k] === "string",
    ) &&
    [l.billImpact, l.comboImpact, l.spent].every(Number.isFinite) &&
    (l.replacementImpact === undefined ||
      Number.isFinite(l.replacementImpact)) &&
    ["good", "bad", "neutral"].includes(l.tone) &&
    typeof l.acknowledged === "boolean" &&
    typeof l.remind === "boolean"
  );
}

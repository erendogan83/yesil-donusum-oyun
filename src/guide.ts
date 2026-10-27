// "Nasıl oynanır" page and the advice shown around the game. Plain text only, so it is safe to inline.
import { maximumScore } from "./decisions";
import {
  EARLY_BONUS,
  INITIAL_BILL,
  INITIAL_BUDGET,
  OVERTIME_COST,
  ROOM_EXTEND_S,
  ROOM_START_S,
  SORT_MISTAKE_PENALTY,
  TIME_LIMIT_S,
  fmtMoney,
} from "./economy";

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);

/** Advice for playing well, shown on the guide page. */
export const tips: { title: string; text: string }[] = [
  {
    title: "Seçmeden önce Artısı ve Eksisi’ni oku",
    text: "Her ürünün ve seçeneğin yanında ne işe yaradığı ve neyi yapmadığı yazıyor. Sorunun asıl nedenini çözen seçeneği ara.",
  },
  {
    title: "Pahalı olan ya da gösterişli olan en iyisi değildir",
    text: "Bazen küçük bir tamir, komple yenilemeden daha iyi sonuç verir. Fiyata değil, sorunu çözüp çözmediğine bak.",
  },
  {
    title: "Paranı bilerek harca",
    text: "Her satın alma kasandan düşer. Doğru seçimler ise tasarruf ettirdiği kadar para kazandırır. Büyük bir harcamadan önce kalan paranı kontrol et.",
  },
  {
    title: "Sökmek para kaybettirir",
    text: "Yanlış seçimi değiştirebilirsin ama ödediğin ürün bedeli geri gelmez. Denemek yerine okumak daha ucuza gelir.",
  },
  {
    title: "Süreli oyunda acele etme",
    text: `Erken bitirmek saniye başına ${fmtMoney(EARLY_BONUS)} kazandırır; yanlış ürün alıp sökmek ise bu bonustan çok daha pahalıya gelebilir.`,
  },
  {
    title: "Seçeneklerin sırasına güvenme",
    text: "Seçenekler her oyunda karışık gösterilir. Doğru cevap hep aynı yerde olmaz.",
  },
  {
    title: "Davranış sorularında gündelik hayatı düşün",
    text: "Sifon, diş fırçalama, kirli kâğıt ya da sulama zamanı gibi sorularda ürün yok; evde gerçekten en az israfı hangisi yapar, onu seç.",
  },
  {
    title: "Önce temel adımları bitir",
    text: "İsteğe bağlı fırsatlar (leğen, LED şerit, zamanlayıcı, çatı) puan getirmez. Paranı onlara harcamadan önce temel kararları tamamla.",
  },
  {
    title: "Oyundan gerçek hayata",
    text: "Bir şey almadan önce etiketine ve özelliğine bak: su akışı, watt, tekrar kullanılabilir olması. Oyundaki alışkanlığı evde de uygula.",
  },
  {
    title: "Odada kendi oyununa odaklan",
    text: "Canlı sıralama motive eder ama herkes aynı soruları görür. Rakibin ne yaptığına değil, kendi seçimlerinin sonucuna bak.",
  },
];

/** One piece of advice per finished period, shown on the period summary for the next step. */
export const roundTips = [
  "Ofiste ve çamaşırhanede de aynı kural geçerli: önce sorunun asıl nedenine bak, sonra seçeneklerin Artısı ve Eksisi’ni oku.",
  "Bahçede ve depoda tekrar kullanılabilir seçenekler çoğu zaman kazandırır, ama yine de senaryoyu oku: bazen tek bir ayrıntı her şeyi değiştirir.",
  "Son dönemde kasana satış geliri eklenecek. Yine de harcamadan önce Artısı ve Eksisi’ni okuyup gereksiz yere para bırakma.",
  "Sonucuna bak: hangi seçimlerin hem puan hem para kazandırdığını görmek bir sonraki oyunda işine yarar.",
];

/** The whole guide as HTML (a page from the start screen, a dialog during the game). */
export function guideHtml(): string {
  return `<p class="eyebrow">NASIL OYNANIR?</p><h2 id="dialog-title">Boşa gideni bul, doğru seçimi yap.</h2>
<section class="guide-block"><h3>Amaç</h3>
<p>Kooperatif yerleşkesinde su, elektrik ve ambalaj gereksiz yere harcanıyor. 4 dönem boyunca boşa gideni bul, doğru çözümü seç ve aylık gideri <b>${fmtMoney(INITIAL_BILL)}</b>’den aşağı çek. Seçimlerin puan ve para olarak geri döner.</p></section>
<section class="guide-block"><h3>Bir odada ne yaparsın?</h3>
<ol>
<li><b>Haritadan bir oda seç.</b> Odanın üstünde “Bugünkü hedef” yazar.</li>
<li><b>ÇÖZÜM ARA</b>’ya bas. Yeşil Market’te seçenekleri incele: her birinin <b>Artısı</b> ve <b>Eksisi</b> yazıyor.</li>
<li><b>SATIN AL</b>, sonra <b>YERLEŞTİR</b>. Ürün odaya kurulur ve sonucu görürsün.</li>
<li>Sonucu oku ve <b>ANLADIM</b>’a bas. Sıradaki adıma geç.</li>
</ol>
<p>Sifon, diş fırçalama, kirli kâğıt ve sulama zamanı gibi bazı adımlarda ürün yoktur; seçenekler doğrudan ekrana gelir. Atık ve çamaşır ayırmada nesneyi doğru yere sürükle (ya da nesneye, sonra hedefe dokun).</p></section>
<section class="guide-block"><h3>Para</h3>
<ul>
<li>Kasan <b>${fmtMoney(INITIAL_BUDGET)}</b> ile başlar. Her satın alma kasandan düşer.</li>
<li>Gideri düşüren doğru bir ürünü kurduğunda, <b>ne kadar tasarruf ettiriyorsa kasana o kadar para eklenir</b>. Daha çok tasarruf, daha çok para demektir.</li>
<li>Hiçbir şeyi düşürmeyen ya da gideri artıran bir seçim para kazandırmaz.</li>
<li>Paran artık hiçbir seçeneğe yetmiyorsa, gerekli satın alma adımı “Bütçem yetmiyor, bu adımı geç” ile atlanır (puan getirmez).</li>
</ul></section>
<section class="guide-block"><h3>Puan</h3>
<ul>
<li>Her temel karar en çok 100 puan getirir; toplam en çok <b>${fmt(maximumScore)}</b> puandır.</li>
<li>Puan seçimin işe yarayıp yaramadığına bağlıdır; fiyatına ya da süreye değil. Aynı seçim her zaman aynı puanı getirir.</li>
<li>İsteğe bağlı fırsatlar (leğen, LED şerit, sulama zamanlayıcısı, çatı) puan getirmez.</li>
</ul></section>
<section class="guide-block"><h3>Yanlış seçimi değiştir</h3>
<ul>
<li>Yanlış bir seçim yaptıysan dönem bitmeden değiştirebilirsin: odada <b>Seçimimi değiştir</b>’e bas, taktığın parçayı <b>sök</b> ve başka bir seçenek dene.</li>
<li>Sökülen ürünün <b>bedeli geri gelmez</b> ve o ürünün kazandırdığı tasarruf parası da geri alınır. Ama doğruyu bulana kadar deneyebilirsin.</li>
<li>Davranış seçimlerini (sifon, diş fırçalama gibi) değiştirmek paraya mal olmaz.</li>
<li>Ayırma işinde ilk yanlış eşleştirme ${fmtMoney(SORT_MISTAKE_PENALTY)} götürür ve o nesnenin puanını getirmez; doğru yere yerleştirene kadar tekrar deneyebilirsin.</li>
<li>Dönem bitince o dönemin seçimleri kilitlenir.</li>
</ul></section>
<section class="guide-block"><h3>Süreli ve serbest oyun</h3>
<ul>
<li><b>Serbest deneme:</b> süre yoktur, rahatça düşünürsün.</li>
<li><b>Süreli yarışma:</b> her odada <b>${TIME_LIMIT_S} saniyen</b> var. Odayı erken bitirirsen artan her saniye için <b>${fmtMoney(EARLY_BONUS)}</b> kazanırsın. Süre dolarsa her saniye kasandan <b>${fmtMoney(OVERTIME_COST)}</b> düşer. Süre yalnız odanın içindeyken işler; haritada ve sonuç kartı açıkken durur.</li>
</ul></section>
<section class="guide-block"><h3>Odalar</h3>
<ul>
<li><b>ODA OLUŞTUR</b> ile kendi oda adınla bir oda aç ve odayı <b>süreli</b> ya da <b>süresiz</b> kur. Arkadaşların <b>ODAYA GİR</b> ile aynı oda adını yazıp katılır.</li>
<li>Oyunu kurucu başlatır. Başlatması için <b>${ROOM_START_S} saniyesi</b> vardır; yetmezse <b>Süre ekle</b> ile her seferinde ${ROOM_EXTEND_S} saniye uzatabilir. Süre bitince kuruculuk sıradaki oyuncuya geçer.</li>
<li>Başlayınca herkes aynı anda oynar. Üstteki bantta canlı sıralama görünür; final ekranı odanın sıralamasını gösterir.</li>
</ul></section>
<section class="guide-block"><h3>Dönem sonu ve final</h3>
<p>Her dönemin sonunda giderin ne kadar düştüğünü ve kasana ne kadar para döndüğünü görürsün. 4. dönemde kasana satış geliri eklenir. Final ekranında toplam puanın, kalan paran ve gerçek hayatta deneyeceğin 3 yeşil hamlen çıkar.</p></section>
<section class="guide-block"><h3>Tavsiyeler</h3>
<ul class="tips">${tips.map((t) => `<li><b>${t.title}.</b> ${t.text}</li>`).join("")}</ul></section>
<p class="subtle">Oyundaki tutarlar örnek senaryodur; gerçek kullanımda değişir.</p>`;
}

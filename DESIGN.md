---
version: alpha
name: "Yeşil Dönüşüm"
description: "Kadın kooperatifleri için sıcak, yarı izometrik bir yerleşke simülasyonu."
colors:
  walnut: "#302b21"
  cream: "#f3e8d0"
  olive: "#536443"
  gold: "#e4c57e"
  clay: "#ae6746"
  danger: "#91482e"
typography:
  display:
    fontFamily: "Georgia, Times New Roman, serif"
  body:
    fontFamily: "Trebuchet MS, Segoe UI, sans-serif"
rounded:
  DEFAULT: "8px"
  dialog: "14px"
spacing:
  control: "12px"
  panel: "30px"
components:
  button:
    minHeight: "44px"
  dialog:
    maxWidth: "540px"
---

# Yeşil Dönüşüm

## Overview

North Star: zeytin ağaçlarının arasında, kiremit çatılı bir kooperatifte dolaşmak.
Audience: iki kişi birlikte oynayan kadın kooperatifi temsilcileri; oyun deneyimi gerektirmez.
Register: oyun. Admin ayrı, işlevsel bir yerel yönetim ekranıdır.
Locale: Türkçe, tr-TR; yönetim tarihleri Europe/Istanbul. Japonya kapsamı yok.
Usage: 1366×768 ve 1920×1080 masaüstü; yatay tablet. Dikey görünüm ikincil uyarlama.
Signature: ahşap raflardaki gerçek objeyi seçip mekânda yerine koymak; fatura sayısının akarak değişmesi.
Anti-references: dashboard, sidebar, ecommerce grid, kurumsal beyaz kart ve sunum sayfası.
Source of truth: mevcut proje ve son kullanıcı revizyonu; son istekteki 26 kurum adı.
Runtime mapping: ön yüzde `src/style.css` :root tokenları bu dosyadaki renkleri bire bir uygular.
Canvas assetlerinin özgün renkleri korunur; efekt renkleri semantik yardımcı değerlerdir.

## Colors

Walnut HUD ve oyun panoları; cream ana yazı; olive birincil eylem; gold ödül ve odak;
clay sıcak vurgu; danger olumsuz sonuç. Durumlar yalnız renkle anlatılmaz.
Ana resmin üzerindeki tabelalar koyu ve yeterli opaklıktadır. Sadece tek tema vardır.

## Typography

Georgia büyük oyun adı, sonuç ve sayaçlar için kullanılır. Sistem üzerindeki yerel
Trebuchet MS / Segoe UI kontrol yazılarında Türkçe harfleri destekler. Uzak font yok.
Sayılar tr-TR ile biçimlenir. Ürün özellikleri en fazla iki kısa cümledir.

## Layout

1536×960 Phaser sahnesi, FIT ölçekleme. Arka plan sahnenin tamamını doldurur.
HUD üst kenarda; hareket araçları altta; envanter alt drawer olarak açılır.
Harita tabelaları bina konumlarında. Market kategori şeridi altta; ürünler raflarda.
Form ve modal kendi içinde kayar; ekranın önemli kısmı görsel dünyaya ayrılır.
UI atölye, mutfak ve diğer odalarda aynı davranışları paylaşır.

## Elevation & Depth

Arayüz ahşap tabela gibi ince alt gölge taşır. Büyük beyaz yüzey yok.
Ürün detayı ve onaylar koyu örtü üzerinde; sahne arkada görünmeye devam eder.

## Shapes

8px kontrol ve 14px modal köşeleri. Ödül madalyaları daire; ana sanat yerel bitmap.

## Components

Canonical owners: `btn`, `showModal`, `announce`, `render` in src/main.ts.
Buttons: focus ring gold, hover brightness, pressed position; disabled reasons nearby.
44px minimum interaction height. Native dialogs manage focus. Learning cards trap Tab explicitly and prevent Escape; only their two named actions dismiss them.
Searchable organization selection: intentionally native datalist; platform popup accepted.
Motion: 250ms scene fade, 750ms counters, 900ms particles, 2600ms floating numbers.
Reduced motion disables shake, ambient animation and tweens; text feedback remains.
No external fonts, emoji art or CDN. Art is from the user's ZIP, transformed non-destructively.

## Do's and Don'ts

- Do keep the scene visible, and show the result after installation.
- Do support clicking to install on touch devices.
- Don't reveal good/bad labels or savings before purchase.
- Don't show technical measurement jargon in player-facing product details.
- Don't imply that local leaderboard data is shared between devices.

## Physical placement and learning ownership

Canonical placement metadata: src/placements.ts; physical rendering: src/physical.ts.
All 30 products have independent room anchors and named slots. The last installed
fixture occupies a replacement slot. Explicit exclusive groups now also reverse the retired financial effect, without a refund.
Shop shelf slots have surface contact anchors. Native buttons own all market input;
Phaser shop sprites never intercept a touch. Default shelf presentation is object-only.
Hover/focus/first tap reveals a compact tag, second tap or İncele opens details.

Lesson copy/snapshots: src/learning.ts. Main owns showLesson/scheduleLesson/memory.
Cards use warm cream, dark green, gold border, thumbnail and category icon. Their
500ms entrance follows installation; no timer dismisses educational content. Only
short game status disappears after 3.2 seconds. Acknowledged cards and reminders
remain in the same saved game and are available at the final screen. Separate bill,
spending and combination figures describe the simulation. Neutral choices use an
informational pulse; bad choices use orange and a short shake, with no success sound.
Bathroom meters sit left of center so the actual high shower arm remains visible.

## Purpose and real-life transfer

Keep the existing scene art, physical anchors and shelf system. The 4 October pass
adds meaning around them: a short skippable introduction, three advisory goals per
period, contextual shelves, scene-specific no-cost ideas and a compact idea bag.
HUD owns baseline/current bill/savings/cash; abstract score belongs to the final.
Learning cards remain persistent. Only the combo surprise and game status fade.
The final proceeds from bill reveal to exactly three practical pledges, then a cream
keepsake with organization and both participants. Pledges never affect ranking.
No quiz, avatar, time pressure or additional progression system.

## TL and corrective choices

Currency owner: src/economy.ts; no decimal currency in player UI. Preserve the existing
palette, typefaces, scene anchors and shelf slots. Product details add one neutral
three-line budget calculation, shared by all consequence types. Kind is internal;
no pre-purchase class, color, order or badge depends on it. Market order is static.
Show comparison-only simulation wording in market help and once in the final.
Opportunity counts sit below room titles without colliding with the three-goal card.
Purchase receipt and flying thumbnail are brief; persistent education still follows installation.
Replacement impact is distinct from the new product impact and combo bonus in learning cards.
The period recap uses existing product thumbnails, not a new video or dashboard.

| Previous rule                                      | Current decision                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Financial effects accumulate for replacement slots | Five explicit exclusive groups replace their active effect; complementary items accumulate. |
| 40% purchase confirmation                          | A shared 30% budget note in the existing purchase detail; one ALALIM action.                |
| Abstract credit values                             | TL examples at x10, score normalized, v1 records migrated once.                             |

## Güncel sadeleştirme kararı — önceki oyuncu sunum kurallarının yerine geçer

Mevcut renkler, fontlar ve sahne koordinatları korunur. HUD yalnız mevcut para,
skor ve dönemi gösterir; skor aynı model fonksiyonudur. footer() tek ana eylem ve
en fazla bir ikincil düğme üretir. Haritaya dön (oda), Dönemi bitir (harita) aktif iş varken ikincildir.
activeOpportunity() aynı anda tek zone seçer; bekleyen ürün ve okunmamış kart
önceliklidir. Bir seçim iyi/kötü/nötr olmasına bakılmadan öğrenme sonrası ilerler.
Phaser ve HTML aynı aktif zone'u kullanır. Görev paneli en fazla iki kısa maddelidir.

Market originScene/originZone bağlamını kaydeder; sadece ilgili en fazla üç seçenek
sunar. Satın alma purchase() ile aynı işlemde oyuncuyu ürünün odasına geçirir.
place-ready mevcut install() ile kalibre edilmiş slota yerleştirir. Öğrenmenin tam
verisi saklanır; başlık, sonuç ve kısa çıkarım görünür. Kart otomatik kapanmaz,
Escape kapatmaz; tek ANLADIM düğmesiyle ilerler. Gizli eski ekran/model kodları
uyumluluk için tutulur. Fiyatlar, etkiler, ödüller, yüzdeler ve skor değişmez.
Gelecek slotlar enabled:false; hiçbir asset veya mini-game çalıştırmaz.

## 5 Ekim 2026 — karar odaklı revizyon (önceki sadeleştirme kurallarını günceller)

Görsel dil, arka planlar, kayıt ve dönem sistemi korunur. Yeni oyun decisionVersion=1
ile başlar. Eski oyun ve sonuçlar eski kurallarla okunur; yeni liderlik tablosu yalnız
aynı karar puanı sürümünü karşılaştırır. Eski sonuçlar yönetimde ve CSV/JSON yedekte kalır.
HUD: DÖNEM, KALAN PARA, SKOR. Üç nötr seçenek aynı düğme/raf dilini kullanır.
Ürün: incele → satın al → otomatik odaya dön → yerleştir → kalıcı ANLADIM kartı.
Davranış: aynı ortak dialog içinde üç seçenek. Dolulukta seçim ardından ÇALIŞTIR.
Atık/çamaşır: nesneye dokun → hedefe dokun; klavye ile aynı düğmeler kullanılabilir.
İlk eşleştirme puana sayılır; yanlışlar düzeltilebilir, yeniden puan üretmez.
Temel kararlar 100 üzerinden; iki iyi seçenek eşit puan alabilir. Para puana eklenmez.
Leğen, zamanlayıcı ve çatı isteğe bağlı, puansız ve atlanabilir.
Tek aktif sorun gösterilir; öğrenme kartı onaylanmadan sıradaki soruna geçilmez.
Yeni veri src/decisions altında fırsat/fiyat/puan/metin/asset/kaynak olarak ayrıdır.
Sahne ve HTML boyutu ResizeObserver ile aynı parent ölçüsüne bağlanır.
Yeni sprite raf boyutu slot sınırından hesaplanır; oda kurulumları ayrı metadata taşır.

## Mutfak atıklarının sahnede gösterimi

Atıklar mutfağa ilk girişte tezgâh ve masa üzerinde görünür. Doğru ayrıştırılan
nesne sahneden kaldırılır; ilgili poşet masanın ön kenarına asılır. Altı poşet
masanın perspektifini izleyerek yan yana dizilir. İlerleme kayıtla birlikte korunur.
Seçim ekranında atıklar dağınık bir yüzeye yerleşir; hedef poşetlerin sırası
atıklardan bağımsızdır ve her tıklamada yer değiştirmez. Puan kuralları değişmez.

Before/after scene contract: initial fixtures remain until installation, never disappear merely on purchase. Packaging uses four distinct tabletop slots with matching raw/packaged positions. Laundry scene reflects each persisted sorting placement independently. Existing legacy games retain their rendering.


## 6 Ekim 2026 ekonomi revizyonu
Merkezi fiyat kataloğu src/data/market-prices.json. Fiyat, karar puanından bağımsızdır. Dönem katkısı yeni tasarrufun %25’i, tavan ₺500; son dönem satış geliri bir defa ₺7.500. Gelir ekranı onaysız kapanmaz. Eksik fiyat satın almayı engeller, bilinmeyen bedel sıfır gibi gösterilmez. Mevcut akkor ampul ürün rafında satılmaz. LED şerit ayrı ve puansız destek aydınlatmasıdır. Ayrıntılar EKONOMI-REVIZYON-RAPORU.md.

# Ana revizyon raporu — 5 Ekim 2026

Mevcut Phaser/Vite oyunu üzerinden devam edildi. Kayıt, 26 kurum, iki katılımcı,
arka planlar, dört dönem, ses, yönetim, CSV/JSON korunur.

## Değişiklikler

- 21 fırsat: 18 temel karar, 3 puansız isteğe bağlı adım. Her temel seçimde en az üç alternatif/hedef vardır.
- 51 karar seçeneği; bunların 33'ü satın alınıp kurulabilen ürünlerdir. İki ayrıştırma oyunu ayrıca 6 ve 3 hedef sunar.
- Market yalnız ilgili alternatifleri gösterir. Ürünler raf yüzeyine oturur; etiket dokunma/hover ile açılır.
- Satın alma → otomatik odaya dönüş → tek tık kurulum → kapanmayan ANLADIM kartı korunur.
- Atık ve çamaşır ayırma: nesne seç, hedefe dokun. İlk seçim puana sayılır; hatalar düzeltilebilir.
- Makine doluluğu: erken veya uygun tam yük seçilebilir; ardından BU YÜKLE ÇALIŞTIR. Sıcaklık senaryosu normal kir ve özel hijyen gereksinimi olmadığını belirtir.
- Banyoya su seviyesi motor efektiyle dolan leğen, sifon/diş fırçalama/hijyen kararları eklendi.
- Yeni oyunda çamaşır zamanlayıcısı, kurutmalık ve asma görevi kaldırıldı. Sulama zamanlayıcısı puansız yardımcı ekipman.
- Puan para bakiyesinden ayrıdır; en çok 1.800. Eşit iyi seçenekler eşit puan alır. Rastgele puan yoktur.
- Eski oyunlar eski kurallarla devam eder. Eski sonuçlar yönetim/yedekte korunur; farklı puan sürümleri yeni liderlik tablosunda karıştırılmaz.
- Ekran yeniden boyutlandırma ve statik dosya önbelleğindeki Origin varyasyonu hataları düzeltildi.

## Ana dosyalar

- `src/decisions/opportunities.json`: odalar, senaryolar, seçenekler ve mini oyun hedefleri.
- `src/decisions/economy.json`: fiyatlar ve örnek fatura etkileri.
- `src/decisions/scores.json`: karar puanları ve her puanın gerekçesi.
- `src/decisions/copy.json`: oyuncu metinleri.
- `src/decisions/assets.json`, `placements.json`: görsel eşlemesi ve ürün yerleşimleri.
- `src/decisions/sourceNotes.json`: kaynaklar, açık senaryo varsayımları.
- `src/decisions/index.ts`: veri bileşimi, deterministik karar/ayırma durumu ve doğrulama.
- `src/model.ts`, `navigation.ts`, `main.ts`: kayıt, akış, skor ve UI entegrasyonu.
- `src/scene.ts`, `physical.ts`, `placements.ts`, `style.css`: fiziksel kurulum, raflar, leğen suyu ve arayüz.
- `scripts/offline.mjs`: yerel uygulama önbelleği.

## Görseller

19 orijinal kaynak dosya `public/assets/source/` altında değişmeden saklandı.
44 oyun sprite'ı ve 3 yalnız duş başlığı kurulum kırpımı üretildi; toplam 47 yerel WebP.
`public/assets/sprites/manifest.json` kaynak SHA256, kesim ve türetilen dosya bilgisini taşır.
Tekrarlanabilir kesim: `scripts/build_revision_sprites.py` (Python + Pillow).
Dosya adı/içeriği uyuşmayan iki sheet görsele göre eşlendi: IRRIGATION_METHODS_FINAL musluk üçlüsü,
IRRIGATION_TIMER_INSTALLED hortum/fıskiye/damla üçlüsüdür. Yeni AI görseli üretilmedi.

## Fırsat matrisi

| ROOM         | OPPORTUNITY                      | CHOICE COUNT | BEST SCORE | MIN SCORE | ASSET STATUS    | COPY STATUS           |
| ------------ | -------------------------------- | -----------: | ---------: | --------: | --------------- | --------------------- |
| Mutfak       | Damlayan musluk                  |            3 |        100 |        20 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Mutfak       | Mutfaktaki atıklar               |            6 |        100 |         0 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Banyo        | Duş başlığı                      |            3 |        100 |        20 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Banyo        | Isınırken akan su (isteğe bağlı) |            1 |          0 |         0 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Banyo        | Sifon seçimi                     |            3 |        100 |        20 | UI / hotspot    | Kısa sonuç + açıklama |
| Banyo        | Diş fırçalarken su               |            3 |        100 |        20 | UI / hotspot    | Kısa sonuç + açıklama |
| Banyo        | Kirli kâğıt                      |            3 |        100 |        20 | UI / hotspot    | Kısa sonuç + açıklama |
| Oturma odası | Aydınlatma                       |            3 |        100 |        20 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Ofis         | Aydınlatma                       |            3 |        100 |        20 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Ofis         | Mesai sonrası cihazlar           |            3 |        100 |        20 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Çamaşırhane  | Çamaşırları ayır                 |            3 |        100 |         0 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Çamaşırhane  | Makineyi ne zaman çalıştıralım?  |            3 |        100 |        20 | UI / hotspot    | Kısa sonuç + açıklama |
| Çamaşırhane  | Yıkama programı                  |            3 |        100 |        20 | UI / hotspot    | Kısa sonuç + açıklama |
| Bahçe        | Sebze sıraları                   |            3 |        100 |        40 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Bahçe        | Sulama zamanı                    |            3 |        100 |        40 | UI / hotspot    | Kısa sonuç + açıklama |
| Bahçe        | Sulama süresi (isteğe bağlı)     |            1 |          0 |         0 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Depo         | Mercimek ambalajı                |            3 |        100 |        40 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Depo         | Elma ambalajı                    |            3 |        100 |        40 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Depo         | Havlu teslimi                    |            3 |        100 |        20 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Depo         | Şal teslimi                      |            3 |        100 |        20 | Kesilmiş sprite | Kısa sonuç + açıklama |
| Çatı         | Güneş yatırımı (isteğe bağlı)    |            1 |          0 |         0 | Kesilmiş sprite | Kısa sonuç + açıklama |

## Doğrulama ve sınırlar

- Dört dönem ve 21 fırsat üretim derlemesinde baştan sona oynandı. Bir atık hatası içeren koşu 1.783 / 1.800 puanla bitti.
- 1366×768, 1536×864, 1920×1080: marketler, odalar, karar ve öğrenme ekranları kaydedildi.
- 844×390 ve 390×844: dokunmatik nesne/hedef akışı, yatay taşma kontrolü.
- İnternet kapalı yeniden açılış, 47 sprite, resmî sonuç, iki isim, CSV ve JSON silme/geri yükleme geçti.
- Ayrıştırma ekranında axe WCAG A/AA taraması: 0 ihlal. Bu tüm uygulama için kapsamlı erişilebilirlik sertifikası değildir.
- Öğrenme kartı 4,2 saniye sonra ve Escape tuşunda açık kaldı; yalnız ANLADIM ile kapandı.

Tüm fiyatlar geçici oyun değeridir; piyasa araştırması yapılmadı. Fatura etkileri simülasyondur.
Duş seçenekleri örnek model profilleridir; küçük başlık her zaman verimlidir genellemesi yapılmaz.
Ambalaj puanları açık iade/tekrar kullanım/elden teslim senaryosuna bağlıdır; malzemeler için evrensel üstünlük iddiası yoktur.
Yerel atık toplama uygulamaları değişebilir. Kaynak açıklamaları veri dosyasında bulunur.
Kayıtlar bu tarayıcıdadır; çok cihazlı sunucu sıralaması bu revizyonun kapsamında değildir.

## Son test durumu

39/39 birim testi geçti. TypeScript ve üretim derlemesi başarılı.
33 ürün alternatifi ayrı kurulum görüntüleriyle kontrol edildi. Zamanlayıcı mevcut
bahçe musluğunun ucuna bağlandı; hortumların kaynağı aynı musluğa taşındı.
Kaynaklar ve 47 türetilmiş görsel yerel dosya olarak doğrulandı.

Premium statik denetimi ortak `btn()` üreticisi için bir `actionless-button` bulgusu
verir. Bu yanlış pozitiftir: düğmeler `data-action` taşır; `main.ts` ortak kök click
listener'ı bunları `action()` işleyicisine gönderir. Tam akış ve dokunmatik testleri
bu düğmeleri gerçekten kullanmıştır. Denetim JSON'u bu tek bulguyu gizlemeden korur.
Bilinen açık oyun akışı hatası kalmadı; fiyatların ve örnek fatura etkilerinin
organizasyon tarafından son kez onaylanması gerekir.

## Ek güncelleme — mutfak atıkları

`src/kitchen-waste.ts` tezgâh/masa atıklarını ve masaya asılan poşetleri tanımlar.
Ayrıştırılan her atık kaldırılır; poşeti yan yana asılı sıraya eklenir. Seçim
penceresi dağınık nesne yerleşimi ve farklı hedef sırası kullanır.
`scripts/waste-update.cjs`: ilk görünüm, üç atık sonrası ara durum, tamamlanma,
yeniden açılış, 1366/1920 ve 390 piksel ekran kontrolleri geçti.

## 5 Ekim — Önce / sonra sahne görselleri
- Depodaki mercimek, elma, havlu ve atkının ambalajsız kaynak görselleri eklendi. Dört ayrı masa konumu, ilgili ürün kurulunca kendi ambalajlı haliyle değişir; diğer ürünler görünür kalır.
- Banyo duş kolunda başlangıç başlığı, ev ve atölye duylarında başlangıç ampulleri gösterilir. Satın alma eski görseli kaldırmaz; kurulum kaldırır.
- Çamaşırhanede üç çamaşır grubu zeminde görünür; doğru ayrıştırılan grup kendi sepetine dönüşür. Görünüm kayıtlı ayrıştırma ilerlemesinden üretilir.
- Önceki mutfak atık/poşet düzeni korundu. Ekonomi ve oyun akışı değiştirilmedi.
- Kaynak kırpımları: scripts/add_before_assets.py. Görsel kontrol: scripts/before-after-qa.cjs; beş sahne × iki durum × iki çözünürlük. Derleme ve 39 test başarılı.

# Güncel QA — 5 Ekim 2026

En güncel kabul raporu [REVIZYON-RAPORU.md](REVIZYON-RAPORU.md), kanıtlar
`qa/main-revision/` altındadır. 39 birim testi; dört dönem / 21 fırsat; üç masaüstü
boyutu; iki dokunmatik boyutu; çevrimdışı açılış ve 47 sprite; resmî sonuç, CSV/JSON,
silme/geri yükleme geçti. Ayrıştırma ekranı axe taraması 0 ihlal verdi.
Eski aşağıdaki rapor önceki teslimin tarihsel kaydıdır; yeni akışın test girişleri
`revision-flow.cjs`, `revision-offline.cjs`, `revision-placements.cjs` dosyalarıdır.

---

# Sade arayüz doğrulaması — 4 Ekim 2026

Bu tur yalnız oyuncu sunumu ve yönlendirme sadeleştirildi. Üstte Mevcut Para,
Skor ve Dönem; solda en fazla iki kısa madde; odada tek aktif sorun görünür.
Market yalnız ilgili en fazla üç seçenek sunar. Satın alma otomatik odaya döner,
YERLEŞTİR mevcut slota kurar. Öğrenme kartı ANLADIM ile kapanır ve sıradaki sorun açılır.

## Sonuçlar

- `pnpm test`: 33 test geçti. Eski ekonomi, skor, kayıt ve kurulum testleri ile
  yeni bağlam kaydı, gizli ürün/future slot ve tek sorun ilerlemesi kontrolleri.
- `pnpm build`: TypeScript ve üretim derlemesi geçti; 90 yerel dosyalı offline manifest üretildi.
- İlk akış: satın alma, otomatik dönüş, tek düğmeyle yerleştirme ve reload geçti.
- Full flow: dört dönem, görünür odalar, serbest/resmî sonuç, kurum kilidi,
  liderlik tablosu, yönetim CRUD, CSV ve JSON yedek/geri yükleme geçti.
- Refinement: 10 ürün/sahne/ekran boyutu kombinasyonu; dokunma, iyi/nötr/kötü
  sonuçlar, kalıcı öğrenme, 7,2 saniye bekleme, Escape ve reload geçti.
- Touch: 1024×768 dokunma emülasyonunda satın alma ve tek düğmeyle kurulum geçti.
- UX: 1920×1080, 1366×768 ve 1024×768; harita, mutfak, banyo, market, ofis,
  çamaşırhane ve bahçe. 36 axe taramasında sıfır ihlal.
- Market bağlamı reload sonrası korunur; satın alma sonrası room ve inventory aynı
  kayıt işleminde saklanır. Bekleyen ürün reload sonrası yeniden YERLEŞTİR gösterir.
- Perde markette, Atık haritada, envanter ve ikincil fikir menüleri ana akışta yoktur.

## Korunanlar

İterasyon öncesi paketle karşılaştırıldı: 89 dosya byte düzeyinde aynı. Bunlar tüm
görseller, fiziksel yerleştirme renderer'ı, placement metadatası, ekonomi sabitleri
ve tam öğrenme verisidir. Ürün fiyat/impact/bonus değerleri ve score/savingPercent
fonksiyonları değişmedi. Öğrenmenin yalnız görünen içeriği kısaltıldı; kayıtları silinmedi.
13 gelecek slot enabled:false olarak config'tedir, yeni runtime asset bağımlılığı yoktur.

## Kontrol sınırları

Premium strict audit, ortak data-action düğme yardımcısında tek actionless-button
bulgusu verir. Kök click delegasyonunu tanımayan statik tarayıcı için yanlış pozitif
olarak elle değerlendirildi; gerçek tıklama testleri geçti. Audit temiz sayılmadı.

Önceki meaning/tl/motion/accessibility betikleri eski menü ve HUD beklentileri taşır;
bu turda bunların tümü yeniden çalıştırılmadı. Güncel UX, full-flow, refinement,
e2e ve touch senaryoları yeni oyuncu akışına uyarlandı. Yanlış slot, tekrar satın alma,
iade etmeme ve gizlenen eski mekaniklerin matematiği model testlerinde korunur.

Testler izole tarayıcı kayıtlarında çalıştı. Tablet kontrolü emülasyondur; gerçek
katılımcılarla kullanılabilirlik ve fiziksel tablet saha testi yapılmadı. Liderlik
tablosu hâlâ tek tarayıcı/cihaz içindedir. TL tutarları örnek simülasyon değerleridir.

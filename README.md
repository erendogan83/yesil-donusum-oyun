# Yeşil Dönüşüm

Mevcut Vite + TypeScript + Phaser 3 oyununun 5 Ekim 2026 revizyonu.
Arka planlar, kayıt sistemi, dört dönem ve oyun görsel dili korunmuştur.
Ayrıntılı değişiklik ve seçenek matrisi: [REVIZYON-RAPORU.md](REVIZYON-RAPORU.md).

## Oynama

Windows'ta **BASLAT.cmd** dosyasını açın. Node.js 22+ gerekir.
Tarayıcı `http://127.0.0.1:4173` adresinde açılır; konsol açık kalsın.
Alternatif: `node serve.mjs`. `dist/` depoda tutulmaz; ilk çalıştırmada BASLAT.cmd paketleri kurup oyunu derler
(`npm install && npm run build`). Hazır `dist/` klasörünü başka bir yerden aldıysanız doğrudan çalışır.
`dist/index.html` dosyasını çift tıklamak yerine yerel sunucuyu kullanın.

## Güncel oyun

- 8 görünür alan, 4 dönem; 18 temel karar ve 3 puansız isteğe bağlı fırsat.
- 51 karar seçeneği; 33 kurulabilir ürün. Temel seçimlerin hepsinde en az 3 alternatif/hedef.
- Ürün: sorunu gör → markette incele → satın al → otomatik odaya dön → yerleştir → ANLADIM.
- Atık ve çamaşır ayırma: nesneyi hedefe sürükleyip bırak (ya da nesneye, sonra hedefe dokun). Yanlış hedef bırakılabilir:
  ilk yanlış eşleştirme ₺50 krediden götürür ve o nesnenin puanını da götürür; tekrar denemek ücretsizdir ama puan getirmez.
- Oda sonu: oda bitince "BÖLÜMÜ BİTİR" haritaya döner, onay sormaz. Dönem sonu yalnız haritadadır; tamamlanmamış temel adım varsa hangi alanlar olduğunu yazan bir onay çıkar. İsteğe bağlı fırsatlar (leğen, LED şerit, zamanlayıcı, çatı) dönemi bitirmeye engel olmaz.
- Yanlış çözüm sorunu çözmez: musluk damlamaya, ışık/duş boşa akmaya devam eder.
- Doluluk ve yıkama programı, sifon, diş fırçalama, hijyen ve sulama saati kısa davranış seçimleridir.
- Leğen, sulama zamanlayıcısı ve çatı yatırımı isteğe bağlıdır; puan avantajı sağlamaz.
- HUD: DÖNEM, KALAN PARA, SKOR. Öğrenme kartları otomatik kapanmaz.
- Finalde kooperatif ve iki katılımcı, toplam skor ve üç gerçek hayat adımı korunur.

## Skor ve para

Yeni oyunlar `decisionVersion: 1` kullanır. Toplam en çok **1.800 karar puanı** alınır.
Aynı kararlar aynı puanı üretir; para, animasyon süresi veya rastgelelik puana eklenmez.
İki seçenek eşit gerekçeyle doğruysa eşit puan verilir. Her fırsat yalnız bir kez puanlanır.

Başlangıç aylık gideri ₺10.000, bütçe ₺2.500. Fiyatlar ve fatura etkileri geçici simülasyon değerleridir;
piyasa fiyatı veya gerçek tasarruf vaadi değildir. Satın alma bütçeyi, kurulum örnek gideri değiştirir.
Dönem ödülü mevcut kuralla korunur: yeni gider azalmasının %50'si, en çok ₺500.

## Kayıtlar ve kurumlar

`public/organizations.json` mevcut 26 kurumun tam adlarını içerir. İki katılımcı adı zorunludur.
Deneme sonuçları liderlik tablosuna eklenmez. Resmî sonuç kurumu kilitler; aynı kurum tekrar resmî sonuç yazamaz.
Otomatik kayıt anahtarı `yesil-donusum-v1`, veritabanı biçimi v2 olarak korunur.

Eski oyunlar eski karar/ekonomi kurallarıyla devam eder; eski sonuçlar yeniden puanlanmaz.
Yeni liderlik tablosu yalnız aynı karar puanı sürümünü karşılaştırır. Eski sonuçlar yönetim ve yedekte korunur.
Önceki sürümün 30 ürünü ve kaldırılan görevleri eski kayıt uyumluluğu için kodda bulunur, yeni akışta sunulmaz.

Yönetim: `http://127.0.0.1:4173/#admin`. CSV, JSON yedek, silme ve geri yükleme burada bulunur.
CSV puan kuralını da belirtir. Kayıtlar yalnız bu tarayıcıdadır; bulut eşitlemesi yoktur.
Yönetim ekranı kimlik doğrulama sınırı değildir. Etkinlikte görevli cihazı kullanın ve JSON yedeği alın.

## Veri ve görseller

`src/decisions/` altında fırsat, fiyat, puan, copy, asset, placement ve kaynak notları ayrı dosyalardadır.
`index.ts` bu verileri birleştirir. Eski `src/data.ts` kayıt uyumluluğu için korunur.
Yeni 47 WebP, kullanıcının sheet'lerinden kırpılmıştır; AI görseli üretilmemiştir.
19 orijinal (~36 MB) depoya konmaz; yerelde saklanır. Sprite yeniden üretmek için bunları `public/assets/source/` altına geri kopyalayın.
Kaynak hash'leri ve kesimler `public/assets/sprites/manifest.json` içindedir.
Yeniden üretim: `python scripts/build_revision_sprites.py` (Pillow gerekir).
Kurulum koordinatları `src/decisions/placements.json` ve `src/placements.ts` içindedir.

## Çevrimdışı

Tüm temel oyun dosyaları lokaldir. İlk başarılı üretim açılışında service worker önbelleğe alır.
Önbellekleme tamamlanmadan bağlantıyı kesmeyin. Orijinal üretim sheet'leri önbelleğe alınmaz;
oyunda kullanılan tüm kırpılmış görseller alınır. Tarayıcı verilerini silmek kayıtları da siler.
Geliştirme sunucusunda service worker kurulmaz.

## Cloudflare Pages (pages.dev)

Oyun tamamen statiktir; sunucu kodu veya ortam değişkeni gerekmez. Hash tabanlı yönlendirme
(`#admin`) kullandığı için yönlendirme kuralı da gerekmez.

**Git ile (önerilen):** Cloudflare panelinde _Workers & Pages → Create → Pages → Connect to Git_.
Build command: `npm run build` (pnpm de olur), Build output directory: `dist`, Node 22 (`.node-version`).

**Doğrudan yükleme:** `npm run deploy` (ilk seferde `wrangler login` ister) ya da `npm run build` sonrası
`dist/` klasörünü panelde _Upload assets_ ile yükleyin. Proje adı `yesil-donusum` ise adres
`https://yesil-donusum.pages.dev` olur.

`public/_headers` önbellek ve güvenlik başlıklarını belirler: `js/` ve `css/` (hash'li) bir yıl önbelleğe alınır,
`index.html`, `sw.js` ve `organizations.json` her seferinde doğrulanır. Derleme, varsa orijinal sheet'leri
(`assets/source/`) `dist/` dışında bırakır; Pages sınırlarının (dosya başına 25 MiB, 20.000 dosya) çok altındayız.
`node serve.mjs` aynı başlıkları yerelde uygular, böylece CSP sorunları dağıtımdan önce görülür.
Kayıtlar tarayıcıya özeldir: `pages.dev` adresindeki kayıtlar yerel `127.0.0.1` kayıtlarıyla paylaşılmaz.
Kurum listesi için `public/organizations.json` düzenlenip yeniden dağıtılmalıdır.

## Geliştirme ve doğrulama

```sh
pnpm install
pnpm dev --port 5175
pnpm test
pnpm build
pnpm run format:check
```

Chrome kurulu olmalıdır. Tam akış `pnpm run test:e2e` (varsayılan 5175).
Üretim testleri için `pnpm preview --port 4180` açın; `GAME_URL` ile adresi değiştirebilirsiniz.
`pnpm run test:sorting` sürükle-bırak, yanlış hedef cezası ve hover kararlılığını sınar (varsayılan 4173; `node serve.mjs`).
`pnpm run test:offline` internet kapalı açılış, dokunmatik, resmî sonuç, CSV/JSON ve erişilebilirlik testidir.
`pnpm run test:placements` 33 ürünün kurulu sahne görüntülerini üretir (4180).
`qa/main-revision/` test raporları ve ekran görüntülerini içerir.
Önceki `scripts/e2e.cjs`, `full-flow.cjs`, `tl.cjs`, `meaning.cjs`, `ux.cjs` eski akışın tarihsel testleridir;
yeni kabul testi giriş noktaları `revision-flow.cjs` ve `revision-offline.cjs` dosyalarıdır.
Testler izole tarayıcı bağlamında çalışır; kullanıcının açık oyun kaydını değiştirmez.

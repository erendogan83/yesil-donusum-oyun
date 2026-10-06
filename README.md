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
Serbest deneme sonuçları liderlik tablosunun Serbest sekmesinde görünür. Resmî sonuç kurumu kilitler; aynı kurum tekrar resmî sonuç yazamaz.
Otomatik kayıt anahtarı `yesil-donusum-v1`, veritabanı biçimi v2 olarak korunur.

Eski oyunlar eski karar/ekonomi kurallarıyla devam eder; eski sonuçlar yeniden puanlanmaz.
Yeni liderlik tablosu yalnız aynı karar puanı sürümünü karşılaştırır. Eski sonuçlar yönetim ve yedekte korunur.
Önceki sürümün 30 ürünü ve kaldırılan görevleri eski kayıt uyumluluğu için kodda bulunur, yeni akışta sunulmaz.

Yönetim: `http://127.0.0.1:4173/#admin`. CSV, JSON yedek, silme ve geri yükleme burada bulunur.
CSV puan kuralını ve oyun türünü de belirtir. Sonuçlar ayrıca ortak D1 tablosuna gönderilir (aşağıda); bu cihazdaki kayıt yedek olarak kalır.
Ortak tablodaki silme işlemleri yönetim anahtarı ister; bu cihazdaki yerel kayıtlar için ekran kimlik doğrulaması yoktur, görevli cihazını kullanın ve JSON yedeği alın.

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

Oyunun kendisi statiktir. Ortak liderlik tablosu için `functions/` klasöründeki Pages Functions ve bir D1
veritabanı kullanılır (aşağıda). Hash tabanlı yönlendirme (`#admin`) kullanıldığı için yönlendirme kuralı gerekmez.

**Git ile (önerilen):** Cloudflare panelinde _Workers & Pages → Create → Pages → Connect to Git_.
Build command: `npm run build`, Build output directory: `dist`, Node 22 (`.node-version`).
`functions/` klasörü otomatik algılanır. **Panelden dosya yükleme (Upload assets) Functions'ı içermez**; ortak tablo
için Git bağlantısını ya da `npm run deploy` (ilk seferde `wrangler login` ister) komutunu kullanın.
Proje adı `yesil-donusum` ise adres `https://yesil-donusum.pages.dev` olur.

### Ortak liderlik tablosu (D1) kurulumu

1. Panel → _Storage & Databases → D1 → Create database_ (ad: `yesil-donusum-db`). Tabloyu oluşturmanız gerekmez,
   API ilk istekte kendisi kurar (isteğe bağlı: `schema.sql`).
2. Pages projesi → _Settings → Bindings → Add → D1 database_: değişken adı **`DB`**, veritabanı: `yesil-donusum-db`.
3. Pages projesi → _Settings → Variables and secrets → Add_: **`ADMIN_TOKEN`** (tür: Secret), güçlü bir parola.
   Admin sayfasında silme için bu anahtar istenir. İkisini de _Production_ ve _Preview_ için ekleyin.
4. Yeniden dağıtın (Deployments → Retry deployment ya da yeni bir push).

Yerelde denemek için: `npm run build && npm run dev:cf` (`http://127.0.0.1:8788`, anahtar `secret123`).
`npm run test:api` ve `npm run test:board` bu sunucuya karşı çalışır.

- **Kim görür:** Tüm cihazların sonuçları aynı tabloda toplanır; tablo 15 sn'de bir kendini yeniler.
  _Resmî_ ve _Serbest_ sekmeleri vardır. Sınırsız sayıda takım/kurum olabilir; kurum listesi `public/organizations.json`.
- **Kurum başına bir resmî sonuç:** Aynı kurum ikinci kez resmî bitirirse sunucu sonucu otomatik olarak _Serbest_ yapar.
  Listede olmayan bir kurum adı da serbest sayılır.
- **Bağlantı yoksa:** Biten oyun cihazda bekler ve bağlantı gelince otomatik gönderilir. Sunucu yoksa (yerel
  `node serve.mjs`) tablo bu cihazdaki resmî sonuçları gösterir.
- **Yönetim (`/#admin`):** Anahtarla giriş yapınca tek tek sonuç silme, serbest denemeleri toplu silme, tüm kayıtları
  silme (etkinlik öncesi sıfırlama) ve tüm cihazlardan CSV indirme açılır. Anahtar yalnız o sekmede tutulur.
- **Güvenlik sınırı:** Oyun tarayıcıda çalıştığı için sunucu puanın gerçekten oynanarak kazanıldığını doğrulayamaz;
  yalnızca biçim ve sınırları (0–2000 puan vb.) denetler. Silme/sıfırlama ise anahtarsız mümkün değildir.

`public/_headers` önbellek ve güvenlik başlıklarını belirler: `js/` ve `css/` (hash'li) bir yıl önbelleğe alınır,
`index.html`, `sw.js` ve `organizations.json` her seferinde doğrulanır. Derleme, varsa orijinal sheet'leri
(`assets/source/`) `dist/` dışında bırakır; Pages sınırlarının (dosya başına 25 MiB, 20.000 dosya) çok altındayız.
`node serve.mjs` aynı başlıkları yerelde uygular, böylece CSP sorunları dağıtımdan önce görülür.
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

# UI behavior contract

## Business sources

The latest pasted user revision is the task authority. Preserve the existing project.
ZIP contains art only. The latest request supplies 26 organization names; no backend is provided.
TL amounts are example simulation values, not market prices or real utility calculations.
Economy choices not numerically specified in brief are explicit game-balance values in src/data.ts.
Period payout: min(floor(max(0, previous period final bill - current bill) * 0.5), 500), once per period.
Use INITIAL_BILL (10000) as the first period baseline. RoundResult.saving is incremental, never cumulative.
Competition scope: one supervised browser/device. Shared authoritative contest server is not implemented.

## Canonical UI Map

| Capability     | Canonical owner                 | Source of truth                   | Allowed variants                                             | Verification                           |
| -------------- | ------------------------------- | --------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| Select/Listbox | Native datalist in registration | Brief searchable institution list | Platform-owned popup accepted; exact official match required | Browser registration, official fixture |
| Form           | attachForm in src/main.ts       | Brief team entry                  | Practice free text / official known organization             | Empty names and real names tests       |
| Scrollbar      | src/style.css global baseline   | DESIGN.md                         | Standard / forced colors                                     | Static + browser                       |
| Toast          | announce in src/main.ts         | Brief short immediate feedback    | Normal / negative                                            | Purchase/install failure paths         |
| Dialog         | showModal native dialog         | Accessible overlay requirements   | Product / confirmation / help                                | Escape, focus containment              |
| CRUD           | transaction in src/main.ts      | Brief autosave/admin/results      | Atomic local snapshot, revision + Web Locks                  | Model + end-to-end tests               |

## Flow ledger

- Start → team → tutorial → kitchen. Map is always reachable from rooms.
- Market purchase → explicit inventory receipt → correct room → select → click snap zone or install button.
- Wrong zone never consumes inventory or extra spending. Disabled purchases explain funds/ownership.
- Compatible inventory items highlighted; incompatible item explains destination and offers navigation.
- End period requires confirmation. Settlement immutable until Continue; repeat settlement rejected.
- Four rounds introduce room groups. No random events. Four free moves per game.
- Final practice score is displayed but never written to official leaderboard.
- Official finish and result persistence share one atomic localStorage write. One completed score per institution.
- Official mode only enabled when organizations.json contains exactly 26 distinct nonempty strings.
- No fabricated institutions; test fixture institutions are test-only.
- Leaderboard: savings descending, then score descending, earlier finish breaks exact ties; at most 26 entries.
- Admin route #admin, outside player navigation; local convenience interface, not authentication.
- Delete a score resets that institution's right, after explicit confirmation and file backup.
- Restore confirms replacement, validates schema, preserves current raw snapshot as download.
- Autosave on begin, purchase, install, free action, navigation and period transitions. Refresh offers Continue.
- Storage failure preserves last committed state; error remains visible. Corrupt data never silently cleared.
- Multi-tab writes serialized with Web Locks and stale revision checks. Storage events reload latest state.

## Locale, access and data lifecycle

Turkish copy and numeric formatting. Native datalist popup is deliberately platform-owned.
Native buttons everywhere in the accessible overlay; canvas is presentation-only to screen readers.
Non-modal inventory drawer does not trap focus. Modal dialog does. Escape dismisses overlays.
All placement has a click alternative; dragging is not required by this implementation.
No external analytics or data transmission. Names remain on this device until replaced/restored/deleted.
Completed results remain until admin deletion. Active game is replaced only after confirmation.
Production service worker precaches local resources; first successful load or local server is required.
This offline build does not claim tamper-proof contest enforcement across devices.

## Focused refinement contract

- Placement and shelf owner: src/placements.ts. Render owner: src/physical.ts.
- Market: object only → hover/first tap tag → second tap/İncele detail. Native DOM owns input.
- Installation persists a lesson snapshot atomically with the economic move.
- Learning: 500ms delayed entrance, no auto-dismiss, Escape blocked, Tab contained.
- ANLADIM acknowledges; SONRA HATIRLAT flags the memory entry. Both preserve content.
- Fikir Çantam shows a title and sentence, and reopens the same snapshot. Refresh restores pending cards.
- A toast carries only transient game status, never the educational explanation.
- All money scales by MONEY_SCALE; normalized score retains the previous range. Exclusive replacements reverse the previous active contribution.

## Purpose-pass behavior

- Both names are required. Legacy saves stay readable and request the missing second name on resume.
- Intro lines reveal within eight seconds; HAZIRIZ can skip. The scene remains visible.
- src/journey.ts owns three advisory goals per round, contextual products and practical ideas.
- Discoveries and considered products persist with the existing atomic save owner.
- Incomplete goals warn before settlement but never force an action or alter score.
- Contextual shelves filter by room/zone/unlock, never by good/bad consequence.
- Scene parasız fikir actions share the existing global four-action cap.
- Purchases consuming more than 30% of cash show a shared-decision sentence in the neutral product detail.
- Combo surprise lasts 3 seconds; persistent lesson appears afterward. Sound mute remains shared.
- Three labeled starter ideas prevent a no-action final from getting stuck; these are not fake achievements.
- Final requires exactly three collected/starter ideas to create the keepsake. Pledges are saved to
  active state and the matching official result; practice stays outside the leaderboard.
- Migration preserves historical paid rewards, cash and published scores, marks legacy rewards,
  and normalizes historical saving to the period delta. Future settlement uses the corrected formula.

## TL v2 lifecycle

- economy.ts owns INITIAL_BILL, INITIAL_BUDGET, MONEY_SCALE, reward rate/cap, fmtMoney.
- installed retains historical ownership. activeInstallations alone renders installed products
  and supplies combo/zone checks. replacedInstallations records retired products; moves retain
  original cost/impact and replacedBy. New moves record reversalImpact separately.
- No refund or free re-purchase; a new alternative must first be purchased normally.
- Only the five user-specified groups are exclusive. Same room or zone alone never means exclusion.
- v1 to v2 conversion includes active bill/budget, moves, round history, lesson snapshots and
  result bill/budget. Stored scores and rankings are preserved. Repeated migration is idempotent.
- Existing additive v1 alternatives keep their historical net balance through legacyAdjustment;
  only the last fixture is active. Future changes use the new replacement rule.
- Atomic localStorage transactions, Web Locks, corrupt-record protection and quota rollback remain.
- The market uses neither kind nor feedback/lesson content before purchase. Static shelf order
  is shared by practice and official games; contextual shelves use exact room + zone + unlock.
- The detail always computes remaining cash; insufficient funds show the missing amount and
  disable ALALIM. Above 30%, a sentence prompts discussion without revealing the outcome.
- Receipt fades after 3 seconds (keyboard focus delays removal); inventory remains available.
- Idle hint appears after 40 seconds, only in a room without a modal, at most once per room/round.
  Pointer/key activity resets it. It names no product or correct answer.
- Budget thought appears once per round on a purchase leaving at most 36% of initial cash;
  budgetMoments persists that bound. It never changes the economy.

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


## 6 Ekim 2026 ekonomi revizyonu
Merkezi fiyat kataloğu src/data/market-prices.json. Fiyat, karar puanından bağımsızdır. Dönem katkısı yeni tasarrufun %25’i, tavan ₺500; son dönem satış geliri bir defa ₺7.500. Gelir ekranı onaysız kapanmaz. Eksik fiyat satın almayı engeller, bilinmeyen bedel sıfır gibi gösterilmez. Mevcut akkor ampul ürün rafında satılmaz. LED şerit ayrı ve puansız destek aydınlatmasıdır. Ayrıntılar EKONOMI-REVIZYON-RAPORU.md.

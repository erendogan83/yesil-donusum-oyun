import { marketPrice, priceLabel, existingFixture } from "./data/market-prices";
import { acknowledgeSales } from "./model";
import { FINAL_SALES_INCOME } from "./economy";
import { wasteItemOrder, wasteTargetOrder } from "./kitchen-waste";
import {
  opportunities as decisionOpportunities,
  nextOpportunity,
  zoneFor,
  maximumScore,
  copy as decisionCopy,
  recordChoice,
  sortItem,
  skipOptional,
} from "./decisions";
import {
  activeOpportunity,
  nextRoom,
  pendingRooms,
  optionalLeft,
} from "./navigation";
import { returnLabels, roomLocatives, offeredProduct } from "./navigation";
import {
  INITIAL_BILL,
  INITIAL_BUDGET,
  LARGE_PURCHASE_SHARE,
  SORT_MISTAKE_PENALTY,
  fmtMoney,
  signedMoney,
  SIMULATION_NOTE,
} from "./economy";
import Phaser from "phaser";
import { miniGoals, ideas, solutions, roundIdea } from "./journey";
import { discover, consider, setPledges, migrateDatabase } from "./model";
import { cueSound } from "./sound";
import {
  fetchResults,
  remoteRanking,
  submitResult,
  flushOutbox,
  pendingCount,
  adminCheck,
  adminDelete,
  adminBulkDelete,
  storedToken,
  storeToken,
  type RemoteResult,
  type SubmitStatus,
} from "./remote";
let marketContext: { room: RoomId; zone: string } | null = null;
let goalFlash: string[] = [],
  finalStep: "result" | "pledges" | "card" = "result",
  pledgeDraft: string[] = [];
let introTimers: number[] = [],
  comboUntil = 0;
const comboOverlay = document.createElement("div");
comboOverlay.id = "combo-celebration";
comboOverlay.setAttribute("role", "status");
document.body.append(comboOverlay);
import { shelfSlots } from "./placements";
import { productLesson, freeLesson } from "./learning";
import { primeSound, decisionSound, toggleSound, soundEnabled } from "./sound";
const learningDialog = document.createElement("dialog");
learningDialog.id = "learning-dialog";
learningDialog.setAttribute("aria-labelledby", "lesson-title");
document.body.append(learningDialog);
learningDialog.addEventListener("cancel", (e) => e.preventDefault());
learningDialog.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const buttons = Array.from(
    learningDialog.querySelectorAll<HTMLButtonElement>(
      "button:not([disabled])",
    ),
  );
  const first = buttons[0],
    last = buttons.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
  }
});
let lessonTimer = 0,
  activeLesson = "",
  marketSelected = "";
import "./style.css";
import { World, W, H, reduced, type View } from "./scene";
import {
  rooms,
  products,
  categories,
  roomById,
  productById,
  freeActions,
  roundNames,
  roundHints,
  combos,
  type Category,
  type RoomId,
} from "./data";
import {
  zoneResolved,
  start,
  purchase,
  install,
  freeMove,
  endRound,
  continueRound,
  finish,
  finishNow,
  score,
  savingPercent,
  ranking,
  feedback,
  csv,
  emptyDatabase,
  validDatabase,
  STORAGE_KEY,
  type State,
  type Database,
  type Team,
  type Result,
} from "./model";

const ui = document.querySelector<HTMLDivElement>("#ui")!;
const dialog = document.querySelector<HTMLDialogElement>("#dialog")!;
const status = document.querySelector<HTMLDivElement>("#status")!;
const saveStatus = document.querySelector<HTMLDivElement>("#save-status")!;
const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(n);
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const asset = (key: string) => `assets/${key}.webp`;
const art = (key: string, cls = "") =>
  `<img class="${cls}" src="${asset(key)}" alt="" draggable="false"/>`;
const btn = (label: string, action: string, cls = "", extra = "") =>
  `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
let db: Database = emptyDatabase(),
  organizations: string[] = [],
  view: View = location.hash === "#admin" ? "admin" : "start",
  category: Category = "Su",
  marketPage = 0;
let inventoryOpen = false,
  selectedProduct: string | null = null,
  toastTimer = 0,
  modalReturn: HTMLElement | null = null,
  storageBlocked = false,
  adminPage = 0,
  actionBusy = false,
  comboTimer = 0;
let mode: Team["mode"] = "practice";
// Shared leaderboard (null = backend unreachable, per-device board is used).
let remote: RemoteResult[] | null = null,
  boardMode: "official" | "practice" = "official",
  adminToken = storedToken(),
  adminAuthed = false,
  remotePage = 0,
  boardTimer = 0;
async function refreshRemote() {
  remote = await fetchResults();
  const typing = document.activeElement?.id === "admin-token";
  if ((view === "leaderboard" || view === "admin") && !typing && !dialog.open)
    render();
}
async function verifyAdmin() {
  adminAuthed = !!adminToken && (await adminCheck(adminToken)) === true;
  if (!adminAuthed) {
    adminToken = "";
    storeToken("");
  }
}
const toRemote = (
  s: State,
  local?: { score: number; savingPercent: number; completedAt: string },
): RemoteResult => ({
  id: s.id,
  organization: s.team.organization,
  first: s.team.first,
  second: s.team.second,
  mode: s.team.mode,
  score: local?.score ?? score(s),
  bill: s.bill,
  budget: s.budget,
  savingPercent: local?.savingPercent ?? savingPercent(s),
  rulesVersion: 1,
  completedAt: local?.completedAt ?? new Date().toISOString(),
});
// What happened to this game's result on its way to the shared board.
let submitInfo: SubmitStatus | "sending" | "" = "";
const submitText = (s: State): string =>
  ({
    "": "",
    sending: "Sonuç gönderiliyor…",
    sent:
      s.team.mode === "official"
        ? "✓ Sonuç liderlik tablosuna kaydedildi."
        : "✓ Sonuç liderlik tablosunun Serbest sekmesine kaydedildi.",
    downgraded:
      "✓ Kaydedildi. Bu kurum için resmî sonuç zaten vardı; sonucunuz serbest deneme olarak yer aldı.",
    queued: "Sonuç bu cihazda bekliyor; bağlantı gelince otomatik gönderilir.",
    unavailable:
      "Ortak tabloya ulaşılamadı. Sonuç bu cihazda kayıtlı; tekrar deneyebilirsiniz.",
  })[submitInfo];
async function submitFinished() {
  const s = db.active;
  if (!s || s.phase !== "finished" || s.decisionVersion !== 1) return;
  submitInfo = "sending";
  if (view === "final" && finalStep === "result") render();
  const status = await submitResult(
    toRemote(
      s,
      db.results.find((r) => r.id === s.id),
    ),
  );
  if (status === "downgraded")
    announce(
      "Bu kurum için resmî sonuç zaten vardı. Sonucunuz serbest deneme olarak kaydedildi.",
    );
  else if (status === "sent")
    announce(
      s.team.mode === "official"
        ? "Sonucunuz liderlik tablosuna gönderildi."
        : "Serbest sonucunuz liderlik tablosuna gönderildi.",
    );
  else if (status === "queued")
    announce(
      "Sonuç bu cihazda bekliyor; bağlantı gelince otomatik gönderilir.",
      true,
    );
  submitInfo = status;
  if (view === "final" && finalStep === "result") render();
  void refreshRemote();
}
window.addEventListener("online", () => void flushOutbox());
const world = new World("World");
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#302b21",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [world],
  render: { antialias: true, pixelArt: false },
  input: { activePointers: 3 },
  audio: { noAudio: true },
});
world.onReady = () => render();
// Test hook: lets browser QA inspect the Phaser scene (only with ?qa).
if (new URLSearchParams(location.search).has("qa"))
  (window as unknown as { __world: World }).__world = world;

const gentleOverlay = document.createElement("aside");
gentleOverlay.id = "gentle-hint";
gentleOverlay.setAttribute("aria-live", "polite");
document.body.append(gentleOverlay);
const purchaseReceipt = document.createElement("aside");
purchaseReceipt.id = "purchase-receipt";
purchaseReceipt.setAttribute("aria-label", "Satın alma");
document.body.append(purchaseReceipt);
const budgetThought = document.createElement("aside");
budgetThought.id = "budget-thought";
budgetThought.setAttribute("role", "status");
document.body.append(budgetThought);
let idleTimer = 0,
  receiptTimer = 0,
  budgetTimer = 0;
const idleShown = new Set<string>();
function resetIdle() {
  clearTimeout(idleTimer);
  gentleOverlay.replaceChildren();
  idleTimer = window.setTimeout(() => {
    const s = db.active;
    if (
      !s ||
      s.phase !== "playing" ||
      view !== "room" ||
      dialog.open ||
      learningDialog.open ||
      inventoryOpen ||
      document.hidden
    )
      return;
    const key = `${s.id}:${s.round}:${s.room}`;
    if (idleShown.has(key)) return;
    idleShown.add(key);
    gentleOverlay.innerHTML = `<p>Bir yerde takıldınız mı?</p>${btn("KÜÇÜK BİR İPUCU", "idle-hint", "ghost")}`;
  }, 40000);
}
window.addEventListener("pointerdown", (e) => {
  if (!gentleOverlay.contains(e.target as Node)) resetIdle();
});
window.addEventListener("keydown", (e) => {
  if (!gentleOverlay.contains(e.target as Node)) resetIdle();
});
function hideReceipt() {
  clearTimeout(receiptTimer);
  purchaseReceipt.replaceChildren();
}
function showReceipt(id: string) {
  const p = productById(id);
  hideReceipt();
  purchaseReceipt.innerHTML = `${art(p.asset)}<div><b>Çantana eklendi.</b></div>`;
  receiptTimer = window.setTimeout(() => {
    if (purchaseReceipt.contains(document.activeElement)) {
      receiptTimer = window.setTimeout(hideReceipt, 4000);
    } else hideReceipt();
  }, 3000);
}
function purchaseAnimation(id: string, source?: DOMRect) {
  if (reduced()) return;
  const target = document
    .querySelector(".contextual-action .primary")
    ?.getBoundingClientRect();
  if (!source || !target) return;
  const img = document.createElement("img");
  img.src = asset(productById(id).asset);
  img.alt = "";
  img.className = "purchase-flight";
  document.body.append(img);
  img.style.left = `${source.x + source.width / 2 - 35}px`;
  img.style.top = `${source.y + source.height / 2 - 35}px`;
  const anim = img.animate(
    [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(1.2)", opacity: 1, offset: 0.2 },
      {
        transform: `translate(${target.x - source.x}px,${target.y - source.y}px) scale(.3)`,
        opacity: 0,
      },
    ],
    { duration: 700, easing: "ease-in-out" },
  );
  anim.onfinish = () => img.remove();
}
function showBudgetMoment() {
  clearTimeout(budgetTimer);
  budgetThought.innerHTML = `<p>Kasa’da <b>${fmtMoney(db.active!.budget)}</b> kaldı.</p><p>Bir büyük yatırım mı,<br/>birkaç küçük dokunuş mu?</p>`;
  budgetTimer = window.setTimeout(() => budgetThought.replaceChildren(), 7000);
}
function opportunities(room: RoomId) {
  const s = db.active!,
    r = roomById(room),
    done = r.zones.filter((z) => zoneResolved(s, room, z.id)).length;
  return `<div class="opportunities"><span>${r.zones.length} fırsat · ${done} tamamlandı</span><span aria-hidden="true">${r.zones.map((z) => (zoneResolved(s, room, z.id) ? "✓" : "●")).join(" ")}</span>${done === r.zones.length ? "<small>Bu alanı güzel toparladınız.</small>" : ""}</div>`;
}

function announce(message: string, bad = false) {
  clearTimeout(toastTimer);
  status.textContent = message;
  status.className = `visible ${bad ? "error-tone" : ""}`;
  toastTimer = window.setTimeout(() => (status.className = ""), 3200);
}
function persistent(message: string) {
  saveStatus.textContent = message;
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!validDatabase(parsed)) throw Error("Kayıt biçimi okunamadı.");
      db = migrateDatabase(parsed);
    } else {
      db = emptyDatabase();
    }
    storageBlocked = false;
    persistent("");
  } catch {
    storageBlocked = true;
    persistent(
      "Kayıt okunamadı. Mevcut veri korunuyor. Yönetim ekranından yedekleyip kaydı kurtarın.",
    );
  }
}
load();
async function transaction(fn: (current: Database) => Database) {
  const run = () => {
    if (storageBlocked)
      throw Error(
        "Kayıt sorunu çözülmeden oyun ilerletilemiyor. Mevcut verinizi yönetim ekranından yedekleyin.",
      );
    const raw = localStorage.getItem(STORAGE_KEY);
    const current: unknown = raw ? JSON.parse(raw) : emptyDatabase();
    if (!validDatabase(current))
      throw Error("Kayıt okunamadı. Mevcut veri korunuyor.");
    if (current.revision !== db.revision) {
      db = migrateDatabase(current);
      throw Error(
        "Oyun başka bir sekmede değişti. Güncel kayıt alındı; işlemi yeniden deneyin.",
      );
    }
    const next = { ...fn(structuredClone(db)), revision: db.revision + 1 };
    if (!validDatabase(next))
      throw Error("İşlem kaydedilemedi. Son geçerli oyun kaydı korunuyor.");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      persistent(
        "Oyun kaydedilemedi. Tarayıcı depolamasını kontrol edin; son işlem uygulanmadı.",
      );
      throw Error("Kayıt için yer açılamadı. Son işlem uygulanmadı.");
    }
    db = next;
    persistent("");
  };
  if (navigator.locks) await navigator.locks.request(STORAGE_KEY, run);
  else run();
}
async function mutate(fn: (s: State) => State) {
  const before =
    db.active?.phase === "playing"
      ? miniGoals(db.active)
          .filter((g) => g.done)
          .map((g) => g.id)
      : [];
  await transaction((d) => {
    if (!d.active) throw Error("Önce bir oyun başlatın.");
    return { ...d, active: fn(d.active) };
  });
  goalFlash =
    db.active?.phase === "playing"
      ? miniGoals(db.active)
          .filter((g) => g.done && !before.includes(g.id))
          .map((g) => g.id)
      : [];
  if (goalFlash.length) cueSound("goal");
}
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    closeModal();
    load();
    if (db.active && view !== "admin" && view !== "start") view = stateView();
    render();
    announce("Diğer sekmedeki güncel kayıt yüklendi.");
  }
});
async function loadOrganizations() {
  try {
    const response = await fetch("./organizations.json");
    if (!response.ok) throw Error();
    const list: unknown = await response.json();
    if (
      Array.isArray(list) &&
      list.length > 0 &&
      list.every((x) => typeof x === "string" && x.trim()) &&
      new Set(list).size === list.length
    )
      organizations = list;
  } catch {
    organizations = [];
  }
  render();
}
void loadOrganizations();
void flushOutbox().then(refreshRemote);
if (adminToken)
  void verifyAdmin().then(() => {
    if (view === "admin") render();
  });
function stateView(): View {
  const s = db.active;
  if (!s) return "start";
  return s.phase === "finished"
    ? "final"
    : s.phase === "summary"
      ? "summary"
      : s.room === "map"
        ? "map"
        : s.room === "market"
          ? "market"
          : "room";
}
function switchView(v: View) {
  marketSelected = "";
  hideReceipt();
  clearTimeout(budgetTimer);
  budgetThought.replaceChildren();
  resetIdle();
  clearTimeout(comboTimer);
  comboOverlay.classList.remove("visible");
  comboUntil = 0;
  clearTimeout(toastTimer);
  status.className = "";
  view = v;
  window.dispatchEvent(new Event("yesil-view-change"));
  clearInterval(boardTimer);
  if (v === "leaderboard" || v === "admin" || v === "registration") {
    void refreshRemote();
    if (v !== "registration")
      boardTimer = window.setInterval(() => void refreshRemote(), 15000);
  }
  inventoryOpen = false;
  selectedProduct = null;
  render();
}
function showModal(content: string) {
  dialog.className = "";
  modalReturn =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  dialog.innerHTML =
    btn("×", "close", "close", 'aria-label="Pencereyi kapat"') + content;
  if (!dialog.open) dialog.showModal();
  const focus =
    dialog.querySelector<HTMLElement>("[autofocus]") ??
    dialog.querySelector<HTMLElement>("button:not(.close)") ??
    dialog.querySelector<HTMLElement>("button");
  focus?.focus({ preventScroll: true });
  dialog.scrollTop = 0;
}
function closeModal() {
  introTimers.forEach(clearTimeout);
  introTimers = [];
  if (dialog.open) dialog.close();
  modalReturn?.focus();
}
dialog.addEventListener("close", () => modalReturn?.focus());
function confirmAction(
  title: string,
  body: string,
  action: string,
  label: string,
) {
  showModal(
    `<p class="eyebrow">Birlikte karar verin</p><h2 id="dialog-title">${title}</h2><p>${body}</p><div class="actions">${btn("Vazgeç", "close", "ghost", "autofocus")}${btn(label, action, "primary")}</div>`,
  );
}

function hud() {
  const s = db.active!;
  return `<header class="hud simple-hud"><div class="hud-brand"><small>DÖNEM</small><b>${s.round} / 4</b></div><div class="meters"><div class="meter cash"><small>KALAN PARA</small><strong id="budget-value">${fmtMoney(s.budget)}</strong></div><div class="meter score"><small>SKOR</small><strong id="score-value">${fmt(score(s))}</strong></div></div>${btn(soundEnabled() ? "Ses açık" : "Ses kapalı", "sound", "ghost sound-toggle")}${btn("?", "help", "ghost help-button", 'aria-label="Oyun rehberi"')}</header>`;
}
function readyProduct() {
  const s = db.active!;
  return s.inventory
    .map(productById)
    .find((p) => p.room === s.room && offeredProduct(p));
}
function footer() {
  const s = db.active!;
  let label = "DEVAM ET",
    action = "end",
    hint = "Bu dönem için hazırsınız.";
  let secondary = "";
  if (view === "market") {
    const origin = s.originScene || marketContext?.room || "kitchen";
    label = "GERİ DÖN";
    action = `take:${origin}`;
    hint = "Bir seçeneğe dokunup inceleyebilirsin.";
  } else if (view === "room") {
    const p = readyProduct(),
      r = roomById(s.room as RoomId),
      z = activeOpportunity(s, r.id);
    if (p) {
      label = "YERLEŞTİR";
      action = "place-ready";
      hint = "Seçimin hazır. Haydi bunu yerine koyalım.";
      secondary = btn("Daha sonra", "map", "ghost quiet-end");
    } else if (z) {
      label =
        s.decisionVersion === 1 && nextOpportunity(s, r.id)?.kind !== "product"
          ? "BAŞLA"
          : "ÇÖZÜM ARA";
      action = `solve:${r.id}:${z.id}`;
      hint = "";
      const op = nextOpportunity(s, r.id);
      secondary =
        s.decisionVersion === 1 && op && !op.core
          ? btn("Şimdilik geç", `optional-skip:${op.id}`, "ghost")
          : btn("Haritaya dön", "map", "ghost quiet-end");
    } else {
      // This room is finished: leaving it needs no confirmation.
      label = "BÖLÜMÜ BİTİR";
      action = "continue-room";
      hint = "Buradaki adım tamam.";
    }
  } else {
    const next = nextRoom(s);
    if (next) {
      action = `room:${next.id}`;
      hint = `${next.name} ile devam edebilirsin.`;
      secondary = btn("Dönemi bitir", "end", "ghost quiet-end");
    } else {
      secondary = "";
      label = "DÖNEMİ BİTİR";
      hint = optionalLeft(s)
        ? "Temel adımlar tamam. İstersen isteğe bağlı fırsatlara da bakabilirsin."
        : "Bu dönemin tüm adımları tamam.";
    }
  }
  // On the map the player can also end the whole game and save the score.
  if (view === "map" && s.decisionVersion === 1)
    secondary += btn("Oyunu bitir ve kaydet", "finish-now", "ghost quiet-end");
  return `<nav class="nav-footer contextual-footer" aria-label="Sonraki adım"><div class="contextual-action">${hint ? `<p>${esc(hint)}</p>` : ""}<div class="actions">${btn(label, action, "primary")}${secondary}</div></div></nav>`;
}
function inventory() {
  const s = db.active!;
  return `<section class="inventory" aria-labelledby="inventory-title"><div class="row spread"><h3 id="inventory-title">Envanter</h3>${btn("Kapat", "inventory", "ghost")}</div>${
    s.inventory.length
      ? `<div class="inventory-items">${s.inventory
          .map((id) => {
            const p = productById(id),
              compatible = s.room === p.room;
            return btn(
              `${art(p.asset)}${esc(p.name)}<small>${compatible ? "Burada kullanılabilir" : roomById(p.room).name}</small>`,
              `select:${id}`,
              `inventory-item ${compatible ? "compatible" : ""}`,
            );
          })
          .join("")}</div>`
      : `<p class="muted">Çantanız henüz boş. Marketten bir ürün seçip buraya dönün.</p>${btn("Markete git", "market", "primary")}`
  }</section>`;
}
function startScreen() {
  return `<section class="title-screen"><div class="eyebrow">BİRLİKTE ÜRET • BİRLİKTE DÖNÜŞTÜR</div><h1>YEŞİL<br/><span>DÖNÜŞÜM</span></h1><p>Bütçeni yönet.<br/>Doğru seçimleri yap.<br/>Aylık gideri düşür.</p>${db.active && db.active.phase !== "finished" ? `<p class="subtle">Yarım kalan oyununuz var.</p>${btn("DEVAM ET", "resume", "primary")}` : btn("OYUNA BAŞLA", "new", "primary")}${db.active && db.active.phase !== "finished" ? btn("Yeni oyun", "new", "ghost", 'style="margin-top:12px"') : ""}<div class="seal"><small>BİR YERLEŞKE</small><b>4</b><small>DÖNEM • BİRLİKTE</small></div><footer class="start-footer"><span>Bir kooperatif. İki oyuncu. Birlikte değişen bir gelecek.</span>${btn("Liderlik tablosu ↗", "leaderboard", "ghost")}</footer></section>`;
}
function registration() {
  return `<section class="panel-screen"><div class="register-panel"><p class="eyebrow">ÖNCE TANIŞALIM</p><h2>Bu dönüşüm<br/>sizinle başlıyor.</h2><p class="muted">Birlikte düşünün, birlikte karar verin.</p><form id="team-form" novalidate><fieldset class="mode-choice" style="border:0;padding:0"><legend class="subtle">Oyun türü</legend><label><input type="radio" name="mode" value="practice" ${mode === "practice" ? "checked" : ""}/> Serbest deneme</label><label><input type="radio" name="mode" value="official" ${mode === "official" ? "checked" : ""} ${organizations.length > 0 ? "" : "disabled"}/> Resmî yarışma</label></fieldset>${organizations.length === 0 ? '<p class="subtle">Resmî yarışma kurum listesi yüklendiğinde açılır.</p>' : ""}<label class="field"><span>Kooperatif / Kurum</span><div class="search-row"><input id="organization" name="organization" list="organizations" autocomplete="organization" maxlength="180" placeholder="Kurum adını yazın veya arayın" aria-describedby="form-error"/><button type="button" data-action="clear-org" aria-label="Kurum aramasını temizle">×</button></div><datalist id="organizations">${organizations.map((o) => `<option value="${esc(o)}"></option>`).join("")}</datalist></label><label class="field" for="first"><span>1. Katılımcı</span><input id="first" name="first" required autocomplete="given-name" maxlength="80" aria-describedby="form-error"/></label><label class="field" for="second"><span>2. Katılımcı</span><input id="second" name="second" autocomplete="off" maxlength="80" aria-describedby="form-error" required/></label><p class="error" id="form-error" role="alert"></p><button type="submit" class="primary">BİRLİKTE BAŞLAYALIM →</button><p class="subtle" style="margin:12px 0 0">Deneme sonuçları liderlik tablosuna eklenmez.<br/>Serbest deneme sonuçları liderlik tablosunun "Serbest" sekmesinde görünür.</p></form>${btn("← Geri", "start", "ghost back")}</div></section>`;
}
function mapScreen() {
  const s = db.active!;
  if (s.salesIncomeGranted && !s.salesIncomeAcknowledged)
    return `<section class="sales-screen"><div class="sales-panel"><p class="eyebrow">4. DÖNEM</p><h2>SATIŞLAR ARTTI</h2><p>Bu ay kooperatifin siparişleri arttı.</p><p class="sales-amount">Kasaya <strong>+${fmtMoney(FINAL_SALES_INCOME)}</strong> eklendi.</p><p>Kalan paranla birlikte artık daha büyük yatırımları da değerlendirebilirsin.</p><p class="sales-balance">Kalan para <b>${fmtMoney(s.budget)}</b></p>${btn("SON DÖNEME BAŞLA", "sales-start", "gold")}</div></section>`;
  return `${hud()}<section aria-label="Yerleşke haritası"><div class="location"><span class="eyebrow">KOOPERATİF YERLEŞKESİ</span><h2>${roundNames[s.round - 1]}</h2></div>${rooms
    .filter((r) => r.id !== "waste")
    .map((r) =>
      btn(
        `<span class="dot"></span>${r.zones.some((z) => zoneResolved(s, r.id, z.id)) ? "✓ " : ""}${r.name}${r.round > s.round ? `<small>${r.round}. dönem</small>` : ""}`,
        `room:${r.id}`,
        `hotspot ${r.round > s.round ? "locked" : ""}`,
        `style="left:${r.map[0]}%;top:${r.map[1]}%" aria-label="${r.name}${r.round > s.round ? ", " + r.round + ". dönemde açılır" : ""}"`,
      ),
    )
    .join(
      "",
    )}<div class="map-hint">Bir odaya dokunun, birlikte başlayalım.</div></section>${footer()}${inventoryOpen ? inventory() : ""}`;
}
function roomScreen() {
  const s = db.active!,
    r = roomById(s.room as RoomId),
    z = activeOpportunity(s, r.id),
    p = readyProduct();
  return `${hud()}<section aria-label="${r.name}"><div class="location task-panel"><h2>${r.name}</h2>${z ? `<small>Bugünkü hedef</small><ul><li>${p ? "Seçimin hazır." : z.problem}</li><li>${p ? "Haydi bunu yerine koyalım." : s.decisionVersion === 1 ? "Birlikte karar verin." : "Bir çözüm seç ve yerine koy."}</li></ul>` : "<p>Buradaki adım tamam.</p>"}</div>${z && !p ? btn(s.decisionVersion === 1 ? z.name : z.problem, `zone:${z.id}`, "zone active-problem", `style="left:${z.x}%;top:${z.y + 9}%"`) : ""}</section>${footer()}`;
}
function marketScreen() {
  const s = db.active!,
    ps = world.stock(category, s.round, 0, contextIds());
  const existing = contextIds()?.find(existingFixture);
  return `${hud()}<section aria-label="Yeşil Market"><div class="market-sign"><h2>Yeşil Market</h2><p>${marketContext ? roomById(marketContext.room).name + " için seçenekler" : "Bir çözüm seçelim."}</p></div>${ps
    .map((p, i) => {
      const slot = shelfSlots(category)[i];
      return `<div class="market-product ${marketSelected === p.id ? "selected" : ""}" data-slot="${slot.id}" style="left:${(slot.x / W) * 100}%;top:${(slot.y / H) * 100}%">${btn("", `product:${p.id}`, "market-hit", `aria-label="${esc(p.name)}, ${priceLabel(p.id, p.price)}. İncele." aria-expanded="${marketSelected === p.id}"`)}<div class="product-peek"><b>${esc(p.name)}</b><small>${priceLabel(p.id, p.price)}</small>${btn("İncele", `inspect:${p.id}`, "ghost")}</div></div>`;
    })
    .join(
      "",
    )}${existing ? `<aside class="existing-choice"><b>Odadaki eski ampul hâlâ çalışıyor.</b><p>Yeni ürün almadan kullanmaya devam edebilirsin.</p>${btn("ESKİ AMPULLE DEVAM ET · ₺0", `keep-existing:${existing}`, "ghost")}</aside>` : ""}${!ps.length ? '<div class="market-empty"><p>Burada bekleyen bir seçim yok. Odaya dönebilirsin.</p></div>' : ""}</section>${footer()}`;
}
function summaryScreen() {
  const s = db.active!,
    h = s.history.at(-1)!;
  const changes = s.moves.filter((m) => m.round === s.round);
  return `<section class="summary-screen period-result"><p class="eyebrow">DÖNEM ${s.round} TAMAMLANDI</p><h2>${roundNames[s.round - 1]}</h2><div class="bill-journey"><div><small>ÖNCE</small><span class="before">${fmtMoney(h.before)}</span></div><span aria-hidden="true">→</span><div><small>ŞİMDİ</small><strong class="big-number" id="result-bill">${fmtMoney(h.after)}</strong></div></div><div class="period-totals"><p><small>BU DÖNEM CEBİNDE KALAN</small><b id="result-saving">${fmtMoney(h.saving)}</b></p><p><small>KASA’YA GERİ DÖNEN</small><b id="result-reward">${signedMoney(h.reward)}</b></p></div>${h.after > h.before ? '<p class="subtle">Bu dönem gider yükseldi. Sonraki kararında ürünün işlevine de bak.</p>' : ""}${
    changes.length
      ? `<div class="round-recap" aria-label="Bu dönem değiştirdikleriniz">${changes
          .slice(0, 6)
          .map((m) => {
            const a =
              productById(m.id) ?? freeActions.find((a) => a.id === m.id)!;
            return `<figure>${art(a.asset)}<figcaption>${esc(m.name)}${m.replacedBy ? " · Değiştirildi" : ""}</figcaption></figure>`;
          })
          .join(
            "",
          )}${changes.length > 6 ? `<span>+${changes.length - 6} hamle</span>` : ""}</div>`
      : ""
  }<p class="carryover-note">Tasarrufundan kasana ${signedMoney(h.reward)} geri döndü.${s.round < 4 ? " Kalan paran sonraki döneme aktarılacak." : ""}</p><div class="period-idea"><span class="eyebrow">BU DÖNEMİN FİKRİ</span><p>“${esc(roundIdea(s))}”</p></div>${btn(s.round === 4 ? "BÜYÜK FİNALE GEÇ →" : `${s.round + 1}. DÖNEME GEÇ →`, "continue", "gold")}</section>`;
}
function awards() {
  const s = db.active!,
    best = [...s.moves]
      .filter((m) => !m.replacedBy && m.impact < 0)
      .sort((a, b) => a.impact - b.impact)[0],
    smart = [...s.moves]
      .filter((m) => !m.replacedBy && m.cost > 0 && m.impact < 0)
      .sort((a, b) => a.impact / a.cost - b.impact / b.cost)[0],
    bad = s.moves.find((m) => m.impact > 0);
  return `<div class="awards"><div class="award"><span class="eyebrow">EN GÜÇLÜ HAMLENİZ</span><p>${best ? esc(best.name) + " ile fark yarattınız." : "Yeni çözümler denemek için bir fırsatınız var."}</p></div><div class="award"><span class="eyebrow">EN AKILLI BÜTÇE KARARINIZ</span><p>${smart ? esc(smart.name) + " bütçenizi iyi değerlendirdi." : s.actions.length ? "Para harcamadan değişimi başlattınız." : "Küçük yatırımlarla başlayabilirsiniz."}</p></div><div class="award"><span class="eyebrow">BİR SONRAKİ SEFER DÜŞÜNEBİLECEĞİNİZ</span><p>${s.replacedInstallations.length ? "Bir kararınızı sonradan değiştirdiniz." : bad ? esc(bad.name) + " tüketimi artırdı." : s.inventory.length ? "Çantanızdaki ürünler kurulmayı bekliyor." : s.combos.length ? "Birbirini tamamlayan seçimleri sürdürün." : "Birbirini tamamlayan çözümleri deneyin."}</p></div></div>`;
}
function finalScreen() {
  const s = db.active!,
    pct = savingPercent(s),
    names = esc([s.team.first, s.team.second].filter(Boolean).join(" & "));
  if (finalStep === "pledges")
    return `<section class="summary-screen pledge-screen"><p class="eyebrow">GERÇEK HAYATTA 3 HAMLEMİZ</p><h2>Peki buradan ne götürüyoruz?</h2><p>Bugün gördüğünüz fikirlerden üçünü seçin.<br/>Hangisini gerçekten denemek istersiniz?</p><div class="pledge-options" role="group" aria-label="Fikir çantamdan üç seçim">${ideas(
      s,
    )
      .map(
        (i) =>
          `<label class="pledge-option"><input type="checkbox" name="pledge" value="${i.id}" ${pledgeDraft.includes(i.id) ? "checked" : ""} ${pledgeDraft.length === 3 && !pledgeDraft.includes(i.id) ? "disabled" : ""}/><span>${esc(i.pledge)}${i.starter ? "<small>Başlangıç fikri</small>" : ""}</span></label>`,
      )
      .join(
        "",
      )}</div><p id="pledge-count" role="status">${pledgeDraft.length} / 3 seçildi</p><div class="row">${btn("Sonucumuza dön", "final-result", "ghost")}${btn("3 YEŞİL HAMLEMİZİ KAYDET", "pledges-save", "gold", pledgeDraft.length === 3 ? "" : "disabled")}</div><p class="subtle">Bu seçimler yarışma skorunu ve sıralamayı değiştirmez.</p></section>`;
  if (finalStep === "card" && s.realLifePledges)
    return `<section class="summary-screen pledge-finale"><div class="pledge-keepsake"><p class="eyebrow">BİZİM 3 YEŞİL HAMLEMİZ</p><h2>${esc(s.team.organization)}</h2><p class="team-signature">${names}</p><ol>${s.realLifePledges.map((p) => `<li>${esc(p)}</li>`).join("")}</ol><p class="closing-line">Küçük başlayın. Birlikte sürdürün.</p></div><div class="row">${btn("LİDERLİK TABLOSUNU GÖR", "leaderboard", "gold")}${btn("Seçimlerimizi değiştir", "pledges", "ghost")}${btn("Sonucumuz", "final-result", "ghost")}</div></section>`;
  return `<section class="summary-screen final-result ${s.decisionVersion === 1 ? "decision-final" : ""}"><p class="eyebrow">4 DÖNEM TAMAMLANDI</p><h2 class="final-org">${esc(s.team.organization)}</h2><p class="final-names">${names}</p><div class="final-reveal"><span>${fmtMoney(INITIAL_BILL)} <span aria-hidden="true">↓</span></span><small>FİNAL AYLIK GİDER</small><strong id="result-bill">${fmtMoney(s.bill)}</strong><b>%${fmt(Math.abs(pct))} ${pct >= 0 ? "DAHA AZ GİDER" : "DAHA FAZLA GİDER"}</b></div><div class="final-score">TOPLAM SKOR <b>${fmt(score(s))}${s.decisionVersion === 1 ? " / " + fmt(maximumScore) : ""}</b></div><div class="final-economy"><p>Kalan para<b>${fmtMoney(s.budget)}</b></p><p>Toplam yatırım<b>${fmtMoney(s.moves.reduce((n, m) => n + m.cost, 0) + s.inventory.reduce((n, id) => n + (s.purchaseCosts?.[id] ?? productById(id).price), 0))}</b></p><p>Tahmini dönemsel tasarruf<b>${fmtMoney(Math.max(0, INITIAL_BILL - s.bill))}</b></p></div>${awards()}<div class="row">${btn("GERÇEK HAYATTA 3 HAMLEMİZ →", "pledges", "gold")}</div>${s.decisionVersion === 1 ? `<p class="submit-status" role="status">${esc(submitText(s)) || "Sonuç henüz liderlik tablosuna gönderilmedi."}</p>${submitInfo === "sending" || submitInfo === "sent" || submitInfo === "downgraded" ? "" : btn(submitInfo === "" ? "SONUCU LİDERLİK TABLOSUNA GÖNDER" : "TEKRAR GÖNDER", "resubmit", "ghost")}` : ""}<p class="subtle">${s.team.mode === "practice" ? "Serbest deneme • Sonucunuz liderlik tablosunun Serbest sekmesinde yer alır." : "Resmî sonuç liderlik tablosuna gönderildi."}</p><p class="simulation-note">${SIMULATION_NOTE}</p></section>`;
}
interface BoardRow {
  org: string;
  names: string;
  score: number;
}
function boardMarkup(rows: BoardRow[]) {
  if (!rows.length)
    return `<div class="empty-result"><h3>İlk başarı hikâyesi sizi bekliyor.</h3><p>${boardMode === "official" ? "Resmî oyun tamamlandığında sonuç burada görünür." : "Serbest deneme tamamlandığında sonuç burada görünür."}</p></div>`;
  return `<div class="podium">${rows
    .slice(0, 3)
    .map(
      (r, i) =>
        `<article class="podium-place"><div class="medal">${i + 1}</div><h3>${esc(r.org)}</h3><p>${esc(r.names)}</p><strong>${fmt(r.score)}</strong><p>toplam puan</p></article>`,
    )
    .join("")}</div><ol class="ranks" start="4">${rows
    .slice(3, 300)
    .map(
      (r, i) =>
        `<li><span class="rank-number">${i + 4}</span><div class="rank-team">${esc(r.org)}<small>${esc(r.names)}</small></div><strong>${fmt(r.score)} puan</strong></li>`,
    )
    .join("")}</ol>`;
}
function leaderboard() {
  const live = remote !== null;
  const names = (a: string, b: string) => [a, b].filter(Boolean).join(" & ");
  const official: BoardRow[] = live
    ? remoteRanking(remote!, "official").map((r) => ({
        org: r.organization,
        names: names(r.first, r.second),
        score: r.score,
      }))
    : ranking(db.results.filter((r) => r.rulesVersion === 1)).map((r) => ({
        org: r.team.organization,
        names: names(r.team.first, r.team.second),
        score: r.score,
      }));
  const practice: BoardRow[] = live
    ? remoteRanking(remote!, "practice").map((r) => ({
        org: r.organization,
        names: names(r.first, r.second),
        score: r.score,
      }))
    : [];
  const tab = (id: "official" | "practice", label: string, n: number) =>
    btn(
      `${label} (${n})`,
      `board:${id}`,
      `ghost board-tab ${boardMode === id ? "active" : ""}`,
      `role="tab" aria-selected="${boardMode === id}"`,
    );
  return `<section class="leaderboard"><div class="center"><p class="eyebrow">BİRLİKTE BÜYÜYEN BAŞARI</p><h2>Dönüşümün öncüleri</h2><p class="muted">${live ? "Tüm cihazlardan gelen sonuçlar · kendiliğinden güncellenir" : "Ortak tabloya ulaşılamadı; bu cihazdaki resmî sonuçlar gösteriliyor"} · Toplam karar puanına göre sıralanır</p><div class="board-tabs" role="tablist">${tab("official", "Resmî", official.length)}${tab("practice", "Serbest", practice.length)}</div></div>${boardMarkup(boardMode === "official" ? official : practice)}<div class="row" style="justify-content:center;margin-top:25px">${btn("← Açılışa dön", "start", "ghost")}${db.active?.phase === "finished" ? btn("Sonucuma dön", "final", "primary") : ""}</div></section>`;
}
function adminRemote() {
  const pending = pendingCount();
  if (remote === null)
    return `<div class="admin-remote"><h3>Ortak liderlik tablosu</h3><p class="subtle">Sunucuya ulaşılamadı ya da henüz kurulmadı. Bu cihazdan gönderilmeyi bekleyen sonuç: ${pending}.</p><div class="row">${btn("Tekrar dene", "admin-refresh", "ghost")}</div></div>`;
  const rows = [...remote].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    ),
    perPage = 8,
    pages = Math.max(1, Math.ceil(rows.length / perPage));
  remotePage = Math.max(0, Math.min(remotePage, pages - 1));
  const login = adminAuthed
    ? `<p class="subtle">Yönetim anahtarı doğrulandı: silme açık.</p><div class="row">${btn("Serbest denemeleri sil", "rbulk:practice", "danger")}${btn("Tüm sunucu kayıtlarını sil", "rbulk:all", "danger")}${btn("Çıkış", "admin-logout", "ghost")}</div>`
    : `<label class="field"><span>Yönetim anahtarı (silmek için)</span><input type="password" id="admin-token" autocomplete="off" aria-describedby="admin-login-hint"/></label><div class="row">${btn("Giriş", "admin-login", "primary")}${btn("Göster / gizle", "admin-reveal", "ghost")}</div><p class="subtle" id="admin-login-hint">Anahtar Cloudflare'de ADMIN_TOKEN olarak tanımlanır.</p>`;
  return `<div class="admin-remote"><h3>Ortak liderlik tablosu · ${remote.length} kayıt</h3><p class="subtle">Resmî: ${remote.filter((r) => r.mode === "official").length} · Serbest: ${remote.filter((r) => r.mode === "practice").length} · Bu cihazda bekleyen: ${pending}</p>${login}<div class="row">${btn("CSV indir (tüm cihazlar)", "csv-remote", "primary")}${btn("Bu cihazdaki sonuçları sunucuya gönder", "push-local", "ghost")}${btn("Yenile", "admin-refresh", "ghost")}</div><div class="results">${
    rows
      .slice(remotePage * perPage, (remotePage + 1) * perPage)
      .map(
        (r) =>
          `<article><div class="row spread"><strong>${esc(r.organization)}</strong><span>${r.mode === "official" ? "Resmî" : "Serbest"} · ${fmt(r.score)} puan</span></div><p>${esc([r.first, r.second].join(" & "))}</p><p class="subtle">${new Date(r.completedAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>${adminAuthed ? btn("Bu sonucu sil", `rdelete:${r.id}`, "danger") : ""}</article>`,
      )
      .join("") || "<p>Henüz kayıt yok.</p>"
  }</div><div class="row">${btn("← Önceki", "rpage:-1", "ghost", remotePage === 0 ? "disabled" : "")}<span>Sayfa ${remotePage + 1} / ${pages}</span>${btn("Sonraki →", "rpage:1", "ghost", remotePage + 1 >= pages ? "disabled" : "")}</div></div>`;
}
function admin() {
  const all = ranking(db.results),
    perPage = 8;
  adminPage = Math.max(
    0,
    Math.min(adminPage, Math.ceil(all.length / perPage) - 1),
  );
  return `<section class="admin"><div class="row spread"><h2>Etkinlik yönetimi</h2>${btn("Oyuna dön", "leave-admin", "ghost")}</div><p>Etkinlik görevlisi içindir. Ortak tablodan silmek için yönetim anahtarı gerekir.</p><p class="subtle">Kurum listesi: ${organizations.length} kurum.</p>${adminRemote()}<h3>Bu cihazdaki kayıtlar</h3><p class="subtle">Sonuç sayısı: ${all.length}.</p><div class="row">${btn("CSV indir", "csv", "primary")}${btn("Tüm kayıtları yedekle", "backup")}${btn("Ham kaydı indir", "raw-backup", "ghost")}</div><label class="import">Yedeği geri yükle (JSON)<input type="file" id="restore-file" accept="application/json,.json"/></label><p class="subtle">Kurumları public/organizations.json dosyasına benzersiz tam adlar olarak ekleyin ve yeniden dağıtın. Bu cihazdaki kayıtlar için yönetim anahtarı gerekmez; cihazı görevli gözetiminde kullanın.</p><div class="results">${
    all
      .slice(adminPage * perPage, (adminPage + 1) * perPage)
      .map(
        (r) =>
          `<article><div class="row spread"><strong>${esc(r.team.organization)}</strong><span>%${fmt(r.savingPercent)} · ${fmt(r.score)} puan</span></div><p>${esc([r.team.first, r.team.second].filter(Boolean).join(" & "))}</p><p class="subtle">${new Date(r.completedAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>${btn("Hatalı sonucu sil / yarışma hakkını aç", `delete:${r.id}`, "danger")}</article>`,
      )
      .join("") || "<p>Henüz resmî sonuç yok.</p>"
  }</div><div class="row">${btn("← Önceki", "admin-page:-1", "ghost", adminPage === 0 ? "disabled" : "")}<span>Sayfa ${adminPage + 1} / ${Math.max(1, Math.ceil(all.length / perPage))}</span>${btn("Sonraki →", "admin-page:1", "ghost", (adminPage + 1) * perPage >= all.length ? "disabled" : "")}</div></section>`;
}
function render() {
  if (!world.ready) return;
  if (
    !db.active &&
    ["map", "room", "market", "summary", "final"].includes(view)
  )
    view = "start";
  const names: Record<View, string> = {
    start: "Yeşil Dönüşüm",
    registration: "Takım girişi",
    map: "Yerleşke",
    room:
      db.active && db.active.room !== "map" && db.active.room !== "market"
        ? roomById(db.active.room).name
        : "Mekân",
    market: "Yeşil Market",
    summary: "Dönem sonu",
    final: "Büyük final",
    leaderboard: "Liderlik tablosu",
    admin: "Etkinlik yönetimi",
  };
  document.querySelector<HTMLElement>("#stage")!.dataset.room =
    view === "room" ? db.active?.room : "";
  document.title = `${names[view]} · Yeşil Dönüşüm`;
  const stockIds = contextIds();
  world.show(view, db.active, category, 0, false, stockIds);
  ui.innerHTML = {
    start: startScreen,
    registration,
    map: mapScreen,
    room: roomScreen,
    market: marketScreen,
    summary: summaryScreen,
    final: finalScreen,
    leaderboard,
    admin,
  }[view]();
  scheduleLesson();
  if (view === "registration") attachForm();
  if (view === "admin") attachRestore();
  if (view === "final" && finalStep === "pledges") attachPledges();
}
function animateMeters(before: State) {
  const s = db.active!;
  for (const [id, from, to] of [
    ["score", score(before), score(s)],
    ["budget", before.budget, s.budget],
  ] as const) {
    const el = document.querySelector<HTMLElement>(`#${id}-value`);
    if (!el || from === to) continue;
    if (!reduced()) {
      const began = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - began) / 750);
        el.textContent = (id === "score" ? fmt : fmtMoney)(
          Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))),
        );
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    const delta = document.createElement("span");
    delta.className = "delta " + (id === "score" && to < from ? "bad" : "");
    delta.textContent = `${to > from ? "+" : ""}${id === "score" ? fmt(to - from) : fmtMoney(to - from)}`;
    el.parentElement?.append(delta);
    setTimeout(() => delta.remove(), 1900);
  }
}
// Official results from other devices also lock their institution.
const remoteOfficialAsResults = () =>
  (remote ?? [])
    .filter((r) => r.mode === "official")
    .map((r) => ({ team: { organization: r.organization } }) as Result);
function attachForm() {
  const form = document.querySelector<HTMLFormElement>("#team-form")!;
  form.addEventListener("change", () => {
    mode = (new FormData(form).get("mode") ?? "practice") as Team["mode"];
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form),
      error = document.querySelector<HTMLElement>("#form-error")!;
    const team: Team = {
      organization: String(data.get("organization") ?? ""),
      first: String(data.get("first") ?? ""),
      second: String(data.get("second") ?? ""),
      mode: String(data.get("mode")) as Team["mode"],
    };
    const button = form.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    )!;
    button.disabled = true;
    try {
      const s: State = {
        ...start(
          team,
          [...db.results, ...remoteOfficialAsResults()],
          organizations,
        ),
        decisionVersion: 1,
        decisions: [],
        sorting: {},
      };
      await transaction((d) => ({ ...d, active: s }));
      switchView("map");
      tutorial();
    } catch (err) {
      error.textContent = (err as Error).message;
      let firstInvalid: HTMLInputElement | null = null;
      for (const field of ["organization", "first", "second"]) {
        const input = form.elements.namedItem(field) as HTMLInputElement;
        const invalid =
          !input.value.trim() ||
          (field === "organization" &&
            team.mode === "official" &&
            (!organizations.includes(input.value.trim()) ||
              [...db.results, ...remoteOfficialAsResults()].some(
                (r) => r.team.organization === input.value.trim(),
              )));
        input.setAttribute("aria-invalid", String(invalid));
        if (invalid && !firstInvalid) firstInvalid = input;
      }
      firstInvalid?.focus();
      button.disabled = false;
    }
  });
}
function tutorial() {
  showModal(
    `<p class="eyebrow">BİR YERLEŞKE · DÖRT DÖNEM</p><h2 id="dialog-title">Boşa gideni birlikte bulalım.</h2><div class="intro-lines"><p class="intro-line">Bu yerleşkede bazı şeyler gereğinden fazla harcanıyor.</p><p class="intro-line">4 dönem boyunca boşa gideni bul.</p><p class="intro-line">Seçimlerini yap; sonuçlarını gör ve puanını topla.</p></div><div class="intro-loop">BUL <span>→</span> SEÇ <span>→</span> UYGULA <span>→</span> SONUCU GÖR</div><p class="intro-takeaway">Her karar bir kez puanlanır. Aynı kararlar aynı puanı getirir.</p><div class="actions">${btn("HAZIRIZ!", "tutorial-done", "gold")}</div>`,
  );
  dialog.className = "intro-dialog";
  dialog.querySelector(".close")?.remove();
}
dialog.addEventListener("cancel", (e) => {
  if (dialog.classList.contains("intro-dialog") && db.active?.tutorial)
    e.preventDefault();
});
async function productDetail(id: string) {
  const p = productById(id),
    s = db.active!;
  if (!p) return;
  await mutate((s) => consider(s, id));
  render();
  const owned = s.inventory.includes(id) || s.installed.includes(id);
  const review = marketPrice(id)?.priceTL === null;
  const affordable = !review && s.budget >= p.price;
  const remaining = s.budget - p.price;
  const solar = id === "rev-roof-bonus-solar";
  const large = solar || (!review && p.price > s.budget * LARGE_PURCHASE_SHARE);
  const packaging = id.startsWith("rev-pack-");
  showModal(
    `<p class="eyebrow">YEŞİL MARKET · ${esc(p.category)}${solar ? " · BÜYÜK YATIRIM" : ""}</p>${art(p.asset, "product-art")}<h2 id="dialog-title">${esc(p.name)}</h2><p class="product-feature">${esc(p.feature)}</p><p class="product-use">${esc(p.description)}</p><dl class="purchase-math"><div><dt>${packaging ? "1 adet ambalaj payı" : "Fiyat"}</dt><dd>${priceLabel(id, p.price)}</dd>${solar ? '<p class="panel-price-note">Yalnız panel fiyatıdır.</p>' : ""}${marketPrice(id)?.priceStatus === "estimate" ? '<p class="panel-price-note">Bu fiyat oyun için tahmini bir değerdir.</p>' : ""}</div>${review ? "" : `<div class="remaining"><dt>${affordable ? "Kalan" : "Bu ürün için eksik"}</dt><dd id="purchase-remaining">${fmtMoney(Math.abs(remaining))}</dd></div>`}</dl>${solar ? '<details class="price-detail"><summary>Fiyata neler dahil?</summary><p>İnverter, konstrüksiyon, kablolama, proje, montaj ve işçilik dahil değildir.</p></details>' : ""}${packaging ? '<p class="panel-price-note">İçindeki ürünün bedeli hariçtir. Çoklu paketten hesaplanan adet payı olabilir.</p>' : ""}${review ? '<p class="error">Paket içeriği ve fiyatı doğrulanıyor. Şimdilik satın alınamaz.</p>' : !owned && !affordable ? `<p class="error">🔒 ${fmtMoney(-remaining)} daha gerekiyor.</p>` : !owned && large ? '<p class="budget-question">Bu büyük bir harcama. Birlikte karar verin.</p>' : ""}<div class="actions">${btn("BİR DAHA BAK", "close", "ghost")}${btn(owned ? "Zaten sizde" : "SATIN AL", `buy:${id}`, "primary", owned || !affordable ? "disabled" : "")}</div>`,
  );
  dialog.classList.add("product-dialog");
}
async function goRoom(id: RoomId) {
  const r = roomById(id);
  if (!r) return;
  if (r.round > db.active!.round) {
    announce(`${r.name}, ${r.round}. dönemde açılacak.`);
    return;
  }
  await mutate((s) => ({
    ...s,
    room: id,
    originScene: id,
    originZone: undefined,
  }));
  switchView("room");
}
async function installProduct(id: string, zone: string) {
  const s = db.active!,
    p = productById(id),
    before = structuredClone(s);
  await mutate((s) => {
    const next = install(s, id, s.room as RoomId, zone);
    if (s.decisionVersion === 1) return recordChoice(next, id);
    return {
      ...next,
      lessons: [
        ...(s.lessons || []),
        productLesson(
          p,
          next.moves.at(-1)!.impact,
          next.bill - s.bill,
          !p.requires || s.activeInstallations.includes(p.requires),
          next.moves.at(-1)!.reversalImpact ?? 0,
        ),
      ],
    };
  });
  selectedProduct = null;
  inventoryOpen = false;
  render();
  animateMeters(before);
  const lesson = db.active!.lessons!.at(-1)!;
  world.effect(db.active!.bill - before.bill, p.room, p.zone, id, lesson.tone);
  world.zoomProduct(id);
  decisionSound(lesson.tone);
  scheduleLesson();
}
function freeModal() {
  const s = db.active!;
  showModal(
    `<p class="eyebrow">BÜTÇE GEREKTİRMEZ</p><h2 id="dialog-title">Para harcamadan yapabileceklerin</h2><p>Bazen çözüm alışveriş yapmak değil. Oyun boyunca dört fikir uygulayabilirsiniz. <b>${4 - s.actions.length} hak kaldı.</b><br/>Size en uygun alışkanlığı birlikte seçin.</p><div class="free-cards">${freeActions
      .map((a) => {
        const used = s.actions.includes(a.id),
          locked = roomById(a.room).round > s.round;
        return btn(
          `${art(a.asset)}<span><b>${a.name}</b><small>${used ? "Uygulandı" : locked ? roomById(a.room).round + ". dönemde açılır" : a.text}</small></span>`,
          `free:${a.id}`,
          "free-card",
          used || locked || s.actions.length >= 4 ? "disabled" : "",
        );
      })
      .join("")}</div>`,
  );
}
function journal() {
  const s = db.active!;
  showModal(
    `<p class="eyebrow">DÖNÜŞÜM DEFTERİ</p><h2 id="dialog-title">Hamleleriniz</h2>${s.moves.length ? `<ul class="journal">${s.moves.map((m) => `<li><span>${esc(m.name)}<small>${roomById(m.room).name} · ${m.round}. dönem</small></span><b>${m.impact > 0 ? "+" : ""}${fmtMoney(m.impact)}</b></li>`).join("")}</ul>` : "<p>İlk hamleniz sizi bekliyor. Mutfakta başlayabilirsiniz.</p>"}${s.combos.length ? `<p>Birlikte çalışan seçimler:<br/>${s.combos.map((id) => combos.find((c) => c.id === id)!.name).join(" · ")}</p>` : ""}<p class="subtle">Başlangıç gideri ${fmtMoney(INITIAL_BILL)} · Şimdi ${fmtMoney(s.bill)}</p>`,
  );
}
function download(name: string, contents: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([contents], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
let pendingRestore: Database | null = null;
function attachRestore() {
  document
    .querySelector<HTMLInputElement>("#restore-file")
    ?.addEventListener("change", async (e) => {
      const input = e.target as HTMLInputElement,
        file = input.files?.[0];
      if (!file) return;
      try {
        if (file.size > 5_000_000)
          throw Error("Yedek çok büyük. En fazla 5 MB yükleyin.");
        const value: unknown = JSON.parse(await file.text());
        if (!validDatabase(value))
          throw Error("Bu dosya geçerli bir oyun yedeği değil.");
        pendingRestore = migrateDatabase(value);
        confirmAction(
          "Yedek geri yüklensin mi?",
          `${value.results.length} sonuç ve varsa yarım oyun yüklenecek. Şimdiki kayıt otomatik olarak dosyaya yedeklenecek.`,
          "restore-confirm",
          "YEDEĞİ YÜKLE",
        );
      } catch (err) {
        announce((err as Error).message, true);
      }
      input.value = "";
    });
}
async function finishRound() {
  await mutate(endRound);
  closeModal();
  switchView("summary");
  cueSound("round");
  animateResult();
}
async function action(action: string) {
  const [kind, ...parts] = action.split(":"),
    arg = parts.join(":");
  switch (kind) {
    case "sales-start":
      await mutate(acknowledgeSales);
      render();
      break;
    case "keep-existing": {
      if (!existingFixture(arg)) throw Error("Bu mevcut bir eşya değil.");
      const p = productById(arg);
      await mutate((s) => ({
        ...recordChoice(s, arg),
        room: p.room,
        originScene: p.room,
      }));
      closeModal();
      switchView("room");
      scheduleLesson();
      break;
    }
    case "decision":
      openDecision(arg);
      break;
    case "load-select":
      selectedLoad = arg;
      openDecision("laundry-load");
      break;
    case "choose": {
      const before = structuredClone(db.active!);
      await mutate((s) => recordChoice(s, arg));
      closeModal();
      render();
      animateMeters(before);
      decisionSound(db.active!.lessons!.at(-1)!.tone);
      scheduleLesson();
      break;
    }
    case "optional-skip":
      await mutate((s) => skipOptional(s, arg));
      closeModal();
      render();
      break;
    case "sort-select":
      selectedSortItem = arg;
      openDecision(activeSort);
      break;
    case "sort-target":
      if (!selectedSortItem) {
        sortNotice = { text: "Önce bir nesne seç.", bad: true };
        openDecision(activeSort);
        break;
      }
      await sortDrop(selectedSortItem, arg);
      break;
    case "place-ready": {
      const p = readyProduct();
      if (p) await installProduct(p.id, p.zone);
      break;
    }
    case "continue-room":
      await mutate((s) => ({ ...s, room: "map" }));
      switchView("map");
      break;
    case "money-info":
      showModal(
        `<h2 id="dialog-title">Oyundaki tutarlar</h2><p>${SIMULATION_NOTE}</p>${btn("ANLADIM", "close", "primary")}`,
      );
      break;
    case "receipt-close":
      hideReceipt();
      break;
    case "idle-hint":
      gentleOverlay.innerHTML =
        "<p>Bu odadaki parlayan noktalara bir göz atın.</p>";
      window.setTimeout(() => gentleOverlay.replaceChildren(), 6000);
      break;
    case "close":
      closeModal();
      break;
    case "start":
      closeModal();
      switchView("start");
      break;
    case "new":
      if (db.active && db.active.phase !== "finished") {
        confirmAction(
          "Yeni bir başlangıç mı?",
          "Yarım kalan oyununuzun yerine yeni oyun başlayacak. Tamamlanmış sonuçlar korunur.",
          "new-confirm",
          "YENİ OYUN",
        );
      } else switchView("registration");
      break;
    case "new-confirm":
      await transaction((d) => ({ ...d, active: null }));
      closeModal();
      switchView("registration");
      break;
    case "resume":
      if (!db.active?.team.second.trim()) {
        completeTeam();
        break;
      }
      switchView(stateView());
      if (db.active?.tutorial) tutorial();
      break;
    case "clear-org": {
      const field = document.querySelector<HTMLInputElement>("#organization")!;
      field.value = "";
      field.focus();
      break;
    }
    case "tutorial-done":
      await mutate((s) => ({ ...s, tutorial: false, room: "map" }));
      closeModal();
      switchView("map");
      break;
    case "help":
      showModal(
        `<h2 id="dialog-title">Birlikte, adım adım.</h2><p>Soruna bak, bir çözüm seç, yerine koy.</p><p>Oyun kendiliğinden kaydolur.</p>${btn("ANLADIM", "close", "primary")}<div class="secondary-tools">${btn("Başka odaya geç", "map", "ghost")}${btn("Mola ver", "pause", "ghost")}${btn("Tutarlar hakkında", "money-info", "ghost")}${db.active && db.active.phase !== "finished" && db.active.decisionVersion === 1 ? btn("Oyunu bitir ve kaydet", "finish-now", "ghost") : ""}</div>`,
      );
      break;
    case "pause":
      showModal(
        `<p class="eyebrow">OYUNUNUZ KAYITLI</p><h2 id="dialog-title">Bir nefes molası.</h2><p>İstediğiniz zaman kaldığınız yerden devam edebilirsiniz.</p><div class="actions">${btn("Oyuna dön", "close", "primary")}${btn("Açılışa dön", "start", "ghost")}</div>`,
      );
      break;
    case "map":
      closeModal();
      await mutate((s) => ({ ...s, room: "map" }));
      switchView("map");
      break;
    case "room":
      closeModal();
      await goRoom(arg as RoomId);
      break;
    case "market":
      marketContext = null;
      closeModal();
      await mutate((s) => ({
        ...s,
        originScene:
          s.room !== "map" && s.room !== "market"
            ? s.room
            : s.originScene || "kitchen",
        room: "market",
      }));
      switchView("market");
      break;
    case "category":
      marketContext = null;
      marketSelected = "";
      category = arg as Category;
      marketPage = 0;
      render();
      break;
    case "page":
      marketSelected = "";
      marketPage = Math.max(0, marketPage + Number(arg));
      render();
      break;
    case "product":
      if (marketSelected === arg) await productDetail(arg);
      else {
        marketSelected = arg;
        render();
        document
          .querySelector<HTMLButtonElement>(`[data-action="inspect:${arg}"]`)
          ?.focus();
      }
      break;
    case "inspect":
      await productDetail(arg);
      break;
    case "sound":
      toggleSound();
      render();
      break;
    case "memory":
      memory();
      break;
    case "lesson":
      closeModal();
      showLesson(arg);
      break;
    case "lesson-ack":
    case "lesson-later":
      await mutate((s) => ({
        ...s,
        lessons: (s.lessons || []).map((l) =>
          l.id === activeLesson
            ? {
                ...l,
                acknowledged: kind === "lesson-ack",
                remind: kind === "lesson-later",
              }
            : l,
        ),
      }));
      learningDialog.close();
      activeLesson = "";
      render();
      document
        .querySelector<HTMLButtonElement>(".contextual-action .primary")
        ?.focus();
      break;
    case "buy":
    case "buy-confirm": {
      const before = structuredClone(db.active!),
        p = productById(arg);
      await mutate((s) => ({
        ...purchase(s, arg),
        originScene: p.room,
        originZone: p.zone,
        room: p.room,
      }));
      closeModal();
      switchView("room");
      animateMeters(before);
      cueSound("purchase");
      document
        .querySelector<HTMLButtonElement>('[data-action="place-ready"]')
        ?.focus();
      break;
    }
    case "take":
      hideReceipt();
      closeModal();
      await goRoom(arg as RoomId);
      render();
      break;
    case "inventory":
      selectedProduct = null;
      inventoryOpen = !inventoryOpen;
      render();
      break;
    case "select": {
      const p = productById(arg);
      if (db.active!.room !== p.room) {
        showModal(
          `<h2 id="dialog-title">Buraya uygun değil.</h2><p>${p.name}, ${roomById(p.room).name.toLocaleLowerCase("tr")} alanında kullanılır.</p><div class="actions">${btn("Çantaya dön", "close", "ghost")}${btn("Mekâna git", `take:${p.room}`, "primary")}</div>`,
        );
      } else {
        selectedProduct = arg;
        inventoryOpen = false;
        render();
        world.highlight(p.room, p.zone);
      }
      break;
    }
    case "cancel-selection":
      selectedProduct = null;
      render();
      break;
    case "install-selected":
      if (selectedProduct)
        await installProduct(
          selectedProduct,
          productById(selectedProduct).zone,
        );
      break;
    case "zone": {
      if (selectedProduct) {
        await installProduct(selectedProduct, arg);
      } else {
        const r = roomById(db.active!.room as RoomId),
          z = r.zones.find((z) => z.id === arg)!;
        await mutate((s) => discover(s, r.id, z.id));
        render();
        showModal(
          `<p class="eyebrow">${r.name} · ${z.name}</p><h2 id="dialog-title">${esc(z.problem)}</h2><p>Bu noktaya uygun seçeneklere bakıp karar verebilirsiniz.</p><div class="actions">${btn("ÇÖZÜM ARA", `solve:${r.id}:${z.id}`, "primary")}${btn("ŞİMDİLİK BIRAK", "close", "ghost")}</div>`,
        );
      }
      break;
    }
    case "open-inventory":
      closeModal();
      inventoryOpen = true;
      render();
      break;
    case "free":
      if (!arg) {
        freeModal();
        break;
      } else {
        const before = structuredClone(db.active!);
        await mutate((s) => {
          const next = freeMove(s, arg);
          return {
            ...next,
            lessons: [
              ...(s.lessons || []),
              freeLesson(arg, next.moves.at(-1)!.impact, next.bill - s.bill),
            ],
          };
        });
        closeModal();
        render();
        animateMeters(before);
        world.effect(db.active!.bill - before.bill);
        decisionSound("good");
        announce("Alışkanlık uygulandı");
        celebrateCombos(before);
        break;
      }
    case "solve": {
      const [room, zone] = arg.split(":");
      const op = decisionOpportunities.find((o) => zoneFor(o) === zone);
      if (db.active!.decisionVersion === 1 && op && op.kind !== "product") {
        openDecision(op.id);
        break;
      }
      marketContext = { room: room as RoomId, zone };
      await mutate((s) => discover(s, room as RoomId, zone));
      const relevant = solutions(marketContext.room, zone, db.active!.round);
      category = relevant[0]?.category || "Su";
      marketPage = 0;
      closeModal();
      await mutate((s) => ({
        ...s,
        originScene: room as RoomId,
        originZone: zone,
        room: "market",
      }));
      switchView("market");
      break;
    }
    case "all-market":
      marketContext = null;
      marketSelected = "";
      marketPage = 0;
      render();
      break;
    case "team-complete": {
      const input = dialog.querySelector<HTMLInputElement>("#legacy-second")!,
        name = input.value.trim();
      if (!name) {
        input.setAttribute("aria-invalid", "true");
        dialog.querySelector("#team-error")!.textContent =
          "İki katılımcının adını da yazın.";
        input.focus();
        break;
      }
      await mutate((s) => ({ ...s, team: { ...s.team, second: name } }));
      closeModal();
      switchView(stateView());
      if (db.active?.tutorial) tutorial();
      break;
    }
    case "pledges":
      pledgeDraft = ideas(db.active!)
        .filter((i) => db.active!.realLifePledges?.includes(i.pledge))
        .map((i) => i.id);
      finalStep = "pledges";
      render();
      break;
    case "pledges-save":
      await transaction((d) => setPledges(d, pledgeDraft));
      finalStep = "card";
      render();
      cueSound("final");
      break;
    case "final-result":
      finalStep = "result";
      render();
      break;
    case "journal":
      journal();
      break;
    case "end":
      // Nothing required is left: finish the period without asking.
      if (!nextRoom(db.active!)) {
        await finishRound();
        break;
      }
      showModal(
        `<h2 id="dialog-title">${db.active!.round}. dönemi bitirelim mi?</h2><p>Şu alanlarda henüz yapılmamış temel adımlar var: <b>${pendingRooms(
          db.active!,
        )
          .map((r) => esc(r.name))
          .join(
            ", ",
          )}</b>. Bitirirsen bunlar sonraki döneme kalır.</p><div class="actions">${btn("DEVAM EDELİM", "close", "primary")}${btn("DÖNEMİ BİTİR", "end-confirm", "ghost")}</div>`,
      );
      break;
    case "end-confirm":
      await finishRound();
      break;
    case "continue":
      await transaction((d) => {
        const next = { ...d, active: continueRound(d.active!) };
        return next.active.phase === "finished" ? finish(next) : next;
      });
      finalStep = "result";
      switchView(stateView());
      cueSound(db.active!.phase === "finished" ? "final" : "goal");
      animateResult();
      if (db.active!.phase === "finished") {
        submitInfo = "";
        void submitFinished();
      }
      break;
    case "leaderboard":
      switchView("leaderboard");
      break;
    case "final":
      switchView("final");
      break;
    case "leave-admin":
      location.hash = "";
      switchView("start");
      break;
    case "csv":
      download(
        "yesil-donusum-sonuclar.csv",
        csv(db.results),
        "text/csv;charset=utf-8",
      );
      break;
    case "backup":
      download("yesil-donusum-yedek.json", JSON.stringify(db, null, 2));
      break;
    case "raw-backup":
      download(
        "yesil-donusum-ham-kayit.txt",
        localStorage.getItem(STORAGE_KEY) ?? "",
        "text/plain",
      );
      break;
    case "finish-now":
      confirmAction(
        "Oyunu şimdi bitirelim mi?",
        "Kalan bölümler atlanır. Şimdiye kadar verdiğiniz kararların puanı hesaplanır ve liderlik tablosuna kaydedilir. Bu işlem geri alınamaz.",
        "finish-now-confirm",
        "BİTİR VE KAYDET",
      );
      break;
    case "finish-now-confirm":
      await transaction((d) => finish({ ...d, active: finishNow(d.active!) }));
      finalStep = "result";
      submitInfo = "";
      closeModal();
      switchView("final");
      cueSound("final");
      animateResult();
      void submitFinished();
      break;
    case "resubmit":
      await submitFinished();
      break;
    case "board":
      boardMode = arg === "practice" ? "practice" : "official";
      render();
      break;
    case "rpage":
      remotePage = Math.max(0, remotePage + Number(arg));
      render();
      break;
    case "admin-refresh":
      await flushOutbox();
      await refreshRemote();
      announce(remote ? "Liste yenilendi." : "Sunucuya ulaşılamadı.", !remote);
      break;
    case "admin-login": {
      const input = document.querySelector<HTMLInputElement>("#admin-token");
      const token = input?.value.trim() ?? "";
      if (!token) {
        announce("Yönetim anahtarını yazın.", true);
        break;
      }
      const result = await adminCheck(token);
      if (result !== true) {
        announce(result === null ? "Sunucuya ulaşılamadı." : result, true);
        break;
      }
      adminToken = token;
      adminAuthed = true;
      storeToken(token);
      render();
      announce("Yönetim anahtarı doğrulandı.");
      break;
    }
    case "admin-reveal": {
      const input = document.querySelector<HTMLInputElement>("#admin-token");
      if (input) input.type = input.type === "password" ? "text" : "password";
      break;
    }
    case "admin-logout":
      adminToken = "";
      adminAuthed = false;
      storeToken("");
      render();
      break;
    case "rdelete": {
      const r = remote?.find((r) => r.id === arg);
      if (r)
        confirmAction(
          "Sonuç silinsin mi?",
          `${esc(r.organization)} · ${r.mode === "official" ? "Resmî" : "Serbest"} · ${fmt(r.score)} puan. Kayıt tüm cihazlar için ortak tablodan silinir.`,
          `rdelete-confirm:${arg}`,
          "SONUCU SİL",
        );
      break;
    }
    case "rdelete-confirm":
      try {
        await adminDelete(arg, adminToken);
        closeModal();
        await refreshRemote();
        announce("Sonuç silindi.");
      } catch (err) {
        closeModal(); // The toast sits behind an open dialog.
        announce((err as Error).message, true);
      }
      break;
    case "rbulk":
      confirmAction(
        arg === "all"
          ? "Tüm sunucu kayıtları silinsin mi?"
          : "Serbest denemeler silinsin mi?",
        arg === "all"
          ? "Resmî ve serbest tüm sonuçlar ortak tablodan silinir. Geri alınamaz; önce CSV indirin."
          : "Serbest deneme sonuçlarının hepsi ortak tablodan silinir. Resmî sonuçlar kalır.",
        `rbulk-confirm:${arg}`,
        "SİL",
      );
      break;
    case "rbulk-confirm":
      try {
        const n = await adminBulkDelete(
          arg === "all" ? "all" : "practice",
          adminToken,
        );
        closeModal();
        await refreshRemote();
        announce(`${n} kayıt silindi.`);
      } catch (err) {
        closeModal();
        announce((err as Error).message, true);
      }
      break;
    case "push-local": {
      for (const r of db.results)
        if (r.rulesVersion === 1)
          await submitResult({
            id: r.id,
            organization: r.team.organization,
            first: r.team.first,
            second: r.team.second,
            mode: "official",
            score: r.score,
            bill: r.bill,
            budget: r.budget,
            savingPercent: r.savingPercent,
            rulesVersion: 1,
            completedAt: r.completedAt,
          });
      await refreshRemote();
      announce(
        remote ? "Bu cihazdaki sonuçlar gönderildi." : "Sunucuya ulaşılamadı.",
        !remote,
      );
      break;
    }
    case "csv-remote":
      if (!remote) {
        announce("Sunucuya ulaşılamadı.", true);
        break;
      }
      download(
        "yesil-donusum-tum-sonuclar.csv",
        csv(
          remote.map((r) => ({
            rulesVersion: 1 as const,
            id: r.id,
            team: {
              organization: r.organization,
              first: r.first,
              second: r.second,
              mode: r.mode,
            },
            bill: r.bill,
            budget: r.budget,
            savingPercent: r.savingPercent,
            score: r.score,
            completedAt: r.completedAt,
          })),
        ),
        "text/csv;charset=utf-8",
      );
      break;
    case "admin-page":
      adminPage += Number(arg);
      render();
      break;
    case "delete": {
      const r = db.results.find((r) => r.id === arg);
      if (r)
        confirmAction(
          "Sonuç silinsin mi?",
          `${esc(r.team.organization)} sonucunu sileceksiniz. Kurum yeniden resmî oyun oynayabilecek. Önce otomatik yedek indirilecek.`,
          `delete-confirm:${arg}`,
          "SONUCU SİL",
        );
      break;
    }
    case "delete-confirm":
      download("yesil-donusum-silme-oncesi.json", JSON.stringify(db, null, 2));
      await transaction((d) => ({
        ...d,
        results: d.results.filter((r) => r.id !== arg),
      }));
      closeModal();
      render();
      announce("Sonuç silindi. Kurumun yarışma hakkı açıldı.");
      break;
    case "restore-confirm":
      if (pendingRestore) {
        download(
          "yesil-donusum-geri-yukleme-oncesi.txt",
          localStorage.getItem(STORAGE_KEY) ?? "",
          "text/plain",
        );
        const next = { ...pendingRestore, revision: db.revision + 1 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        db = next;
        storageBlocked = false;
        persistent("");
        pendingRestore = null;
        closeModal();
        render();
        announce("Yedek geri yüklendi.");
      }
      break;
  }
}
for (const root of [ui, dialog, learningDialog, gentleOverlay, purchaseReceipt])
  root.addEventListener("click", async (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-action]",
    );
    if (!button || button.disabled || actionBusy) return;
    primeSound();
    const name = button.dataset.action!;
    actionBusy = true;
    document.querySelector("#stage")!.setAttribute("aria-busy", "true");
    button.disabled = true;
    try {
      await action(name);
    } catch (err) {
      announce((err as Error).message, true);
    } finally {
      actionBusy = false;
      document.querySelector("#stage")!.setAttribute("aria-busy", "false");
      if (button.isConnected) button.disabled = false;
    }
  });
window.addEventListener("hashchange", () => {
  closeModal();
  switchView(location.hash === "#admin" ? "admin" : "start");
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !dialog.open && !learningDialog.open) {
    inventoryOpen = false;
    selectedProduct = null;
    render();
  }
});
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // A tab left open keeps running the old code. When a new version takes over,
  // reload as soon as nothing is in progress (saved games resume anyway).
  const hadController = !!navigator.serviceWorker.controller;
  let updateWaiting = false;
  const idle = () =>
    !dialog.open &&
    !learningDialog.open &&
    ["start", "leaderboard", "admin"].includes(view);
  window.addEventListener("yesil-view-change", () => {
    if (updateWaiting && idle()) location.reload();
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return; // First install: nothing stale to replace.
    updateWaiting = true;
    if (idle()) location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then(async (registration) => {
        // Offline, update() rejects; that must not report a failed offline setup.
        await registration.update().catch(() => {});
        // Look for a new version whenever the tab comes back to the front.
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) void registration.update().catch(() => {});
        });
        return registration;
      })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        console.info("Offline cache ready");
      })
      .catch(() => {
        persistent(
          "Çevrimdışı hazırlık tamamlanamadı. Bu oturum açıkken oyun çalışır.",
        );
      });
  });
}
// UI and canvas share a fixed landscape coordinate system. Portrait remains a compact fallback.
new ResizeObserver(() => {
  if (!game.scale.canvas) return;
  game.scale.getParentBounds();
  game.scale.refresh();
}).observe(document.querySelector("#game")!);

function scheduleLesson() {
  clearTimeout(lessonTimer);
  if (!["room", "map", "market"].includes(view) || learningDialog.open) return;
  if (db.active?.salesIncomeGranted && !db.active.salesIncomeAcknowledged)
    return;
  const next = db.active?.lessons?.find((l) => !l.acknowledged && !l.remind);
  if (next)
    lessonTimer = window.setTimeout(
      () => {
        if (!dialog.open) showLesson(next.id);
        else scheduleLesson();
      },
      Math.max(500, comboUntil - Date.now()),
    );
}
function showLesson(id: string) {
  const l = db.active?.lessons?.find((l) => l.id === id);
  if (!l) return;
  activeLesson = id;
  learningDialog.dataset.room = db.active?.room;
  learningDialog.innerHTML = `<div class="lesson-top">${l.asset ? art(l.asset, "lesson-art") : ""}<div><p class="eyebrow">SEÇİMİN SONUCU</p><h2 id="lesson-title">${esc(l.title)}</h2></div></div><p>${esc(l.result)}</p>${l.takeaway ? `<p class="takeaway">${esc(l.takeaway)}</p>` : ""}<div class="actions">${btn("ANLADIM", "lesson-ack", "primary")}</div>`;
  if (!learningDialog.open) learningDialog.showModal();
}
function memory() {
  const bag = ideas(db.active!);
  showModal(
    `<p class="eyebrow">FİKİRLERİ YANINA AL</p><h2 id="dialog-title">Fikir Çantam</h2><div class="idea-list">${bag.map((i) => `<article class="idea-entry">${i.asset ? art(i.asset) : '<span class="idea-leaf" aria-hidden="true">✧</span>'}<div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p>${i.starter ? "<small>Başlangıç fikri</small>" : ""}${i.lessonId ? btn("Yeniden bak", `lesson:${i.lessonId}`, "ghost") : ""}</div></article>`).join("")}</div>${btn("Hamle geçmişi", "journal", "ghost")}`,
  );
}
const ahaText: Record<string, string> = {
  meter: "Hımm… Gider değişmedi.",
  "solar-lamp": "Güneşli göründü, ama asıl gider yerinde durdu.",
  "shower-b": "Güçlü hissettirdi… su da güçlü aktı.",
};
function contextIds() {
  if (view !== "market" || !db.active) return undefined;
  const s = db.active,
    room = s.originScene || "kitchen";
  const zone = s.originZone || activeOpportunity(s, room)?.id;
  marketContext = zone ? { room, zone } : null;
  const op = decisionOpportunities.find((o) => zoneFor(o) === zone);
  const ps =
    s.decisionVersion === 1
      ? (op?.choices || []).map(productById).filter(Boolean)
      : zone
        ? solutions(room, zone, s.round).slice(0, 3)
        : [];
  category = ps[0]?.category || "Su";
  return ps.map((p) => p.id);
}
function goalCard() {
  const goals = miniGoals(db.active!);
  return `<aside class="mini-goals" aria-label="Bugünün üç hamlesi"><p class="eyebrow">BUGÜNÜN 3 HAMLESİ <b>${goals.filter((g) => g.done).length} / 3</b></p><ul>${goals.map((g) => `<li class="${g.done ? "done" : ""} ${goalFlash.includes(g.id) ? "goal-new" : ""}"><span aria-hidden="true">${g.done ? "✓" : "○"}</span>${esc(g.label)}</li>`).join("")}</ul></aside>`;
}
function sceneIdea(room: RoomId) {
  const s = db.active!,
    a = freeActions.find((a) => a.room === room);
  if (!a) return "";
  const used = s.actions.includes(a.id),
    full = s.actions.length >= 4;
  return `<aside class="scene-idea"><p class="eyebrow">PARASIZ FİKİR</p><p>${esc(a.text)}</p>${btn(used ? "BU FİKRİ UYGULADIN" : "BUNU YAPALIM", `free:${a.id}`, "ghost", used || full ? "disabled" : "")}${full && !used ? "<small>Dört fikrini kullandın; bunu gerçek hayata taşıyabilirsin.</small>" : ""}</aside>`;
}
function celebrateCombos(before: State) {
  const earned = combos.filter(
    (c) => db.active!.combos.includes(c.id) && !before.combos.includes(c.id),
  );
  if (!earned.length) return;
  comboUntil = Date.now() + 3000;
  clearTimeout(lessonTimer);
  comboOverlay.innerHTML = `<span aria-hidden="true">✦</span><b>BİRLİKTE DAHA GÜÇLÜ!</b><p>İki hamle birbirini tamamladı.</p><small>Ek kazanç · ${fmtMoney(-earned.reduce((n, c) => n + c.bonus, 0))}</small>`;
  comboOverlay.classList.add("visible");
  cueSound("combo");
  world.cameras.main.flash(reduced() ? 0 : 240, 221, 205, 148);
  clearTimeout(comboTimer);
  comboTimer = window.setTimeout(
    () => comboOverlay.classList.remove("visible"),
    3000,
  );
  scheduleLesson();
}
function completeTeam() {
  showModal(
    `<p class="eyebrow">OYUNUNUZ KORUNUYOR</p><h2 id="dialog-title">Ekibimizi tamamlayalım.</h2><p>Bu kayıt eski sürümden. ${esc(db.active!.team.first)} ile oynayacak ikinci kişinin adını ekleyin.</p><label class="field">2. Katılımcı<input id="legacy-second" maxlength="80" aria-describedby="team-error" required /></label><p id="team-error" role="alert"></p>${btn("KALDIĞIMIZ YERDEN", "team-complete", "primary")}`,
  );
}
function animateResult() {
  const s = db.active!;
  if (reduced()) return;
  const values: [string, number, number, boolean][] = [
    [
      "result-bill",
      view === "summary" ? s.history.at(-1)!.before : INITIAL_BILL,
      s.bill,
      false,
    ],
  ];
  if (view === "summary") {
    const h = s.history.at(-1)!;
    values.push(
      ["result-saving", 0, h.saving, false],
      ["result-reward", 0, h.reward, true],
    );
  }
  for (const [id, from, to, signed] of values) {
    const el = document.getElementById(id);
    if (!el) continue;
    const began = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - began) / 1100);
      el.textContent = (signed ? signedMoney : fmtMoney)(
        Math.round(from + (to - from) * (1 - (1 - t) ** 3)),
      );
      if (t < 1 && el.isConnected) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
function attachPledges() {
  ui.querySelectorAll<HTMLInputElement>("input[name=pledge]").forEach((input) =>
    input.addEventListener("change", () => {
      pledgeDraft = Array.from(
        ui.querySelectorAll<HTMLInputElement>("input[name=pledge]:checked"),
      ).map((i) => i.value);
      const count = ui.querySelector("#pledge-count");
      if (count) count.textContent = `${pledgeDraft.length} / 3 seçildi`;
      ui.querySelector<HTMLButtonElement>(
        "[data-action=pledges-save]",
      )!.disabled = pledgeDraft.length !== 3;
      ui.querySelectorAll<HTMLInputElement>("input[name=pledge]").forEach(
        (i) => (i.disabled = pledgeDraft.length === 3 && !i.checked),
      );
    }),
  );
}

// Behaviour choices have no product art; a small icon keeps the cards readable.
const choiceIcons: Record<string, string> = {
  "rev-flush-half": "💧",
  "rev-flush-full": "🌊",
  "rev-flush-hold": "⏳",
  "rev-toothbrush-open": "🚰",
  "rev-toothbrush-closed": "🪥",
  "rev-toothbrush-brief": "💦",
  "rev-hygiene-paper": "📦",
  "rev-hygiene-other": "🗑️",
  "rev-hygiene-organic": "🍎",
  "rev-laundry-program-eco": "❄️",
  "rev-laundry-program-normal": "🌡️",
  "rev-laundry-program-hot": "🔥",
  "rev-irrigation-time-morning": "🌅",
  "rev-irrigation-time-noon": "☀️",
  "rev-irrigation-time-evening": "🌇",
};
let selectedSortItem = "",
  activeSort = "",
  selectedLoad = "",
  sortNotice: { text: string; bad: boolean } | null = null,
  sortFlash: { id: string; ok: boolean } | null = null,
  suppressClick = false;
// A drag ends with a click on the piece; that click must not re-select it.
dialog.addEventListener(
  "click",
  (e) => {
    if (suppressClick) {
      e.stopPropagation();
      e.preventDefault();
    }
  },
  true,
);
async function sortDrop(itemId: string, targetId: string) {
  const o = decisionOpportunities.find((o) => o.id === activeSort);
  const item = o?.items?.find((i) => i.id === itemId);
  if (!o || !item) return;
  const bag = o.id === "waste-sort" ? "poşet" : "sepet";
  const correct = item.target === targetId;
  const first = !db.active!.sorting?.[o.id]?.firstAnswers[itemId];
  const before = structuredClone(db.active!);
  await mutate((s) => sortItem(s, o.id, itemId, targetId));
  const lost = before.budget - db.active!.budget;
  selectedSortItem = correct ? "" : itemId;
  sortFlash = { id: targetId, ok: correct };
  sortNotice = correct
    ? { text: `Harika, doğru ${bag}! 👏`, bad: false }
    : {
        text: first
          ? `Üzgünüm, yanlış ${bag}. ${lost > 0 ? fmtMoney(lost) + " krediniz gitti. " : ""}Hadi şimdi doğru ${bag}e yerleştirelim.`
          : `Bu ${bag} olmadı. Bir daha deneyelim, doğrusu yakında!`,
        bad: true,
      };
  if (db.active!.decisions?.some((d) => d.opportunityId === o.id)) {
    closeModal();
    sortNotice = sortFlash = null;
    render();
    animateMeters(before);
    scheduleLesson();
  } else {
    render();
    animateMeters(before);
    openDecision(o.id);
  }
}
function attachSortDrag() {
  const targetAt = (x: number, y: number) =>
    document
      .elementsFromPoint(x, y)
      .find((el) => el.classList.contains("sorting-target")) as
      HTMLElement | undefined;
  dialog.querySelectorAll<HTMLElement>(".sorting-piece").forEach((piece) =>
    piece.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const itemId = piece.dataset.item!,
        startX = e.clientX,
        startY = e.clientY;
      let ghost: HTMLElement | null = null,
        over: HTMLElement | undefined;
      const hover = (el?: HTMLElement) => {
        if (over === el) return;
        over?.classList.remove("drop-hover");
        over = el;
        over?.classList.add("drop-hover");
      };
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        if (!ghost) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return;
          ghost = piece.cloneNode(true) as HTMLElement;
          ghost.removeAttribute("data-action");
          ghost.classList.remove("selected");
          ghost.removeAttribute("data-waste");
          ghost.removeAttribute("data-item");
          ghost.classList.add("drag-ghost");
          ghost.style.width = `${piece.offsetWidth}px`;
          dialog.append(ghost);
          piece.classList.add("dragging");
        }
        // Near the dialog edge, scroll so every bag stays reachable.
        const edge = dialog.getBoundingClientRect();
        if (ev.clientY > edge.bottom - 50) dialog.scrollTop += 14;
        else if (ev.clientY < edge.top + 50) dialog.scrollTop -= 14;
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
        hover(targetAt(ev.clientX, ev.clientY));
      };
      const end = async (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        if (!ghost) return;
        const target =
          ev.type === "pointerup"
            ? targetAt(ev.clientX, ev.clientY)
            : undefined;
        ghost.remove();
        hover(undefined);
        piece.classList.remove("dragging");
        suppressClick = true;
        setTimeout(() => (suppressClick = false), 0);
        if (!target || actionBusy) return;
        actionBusy = true;
        document.querySelector("#stage")!.setAttribute("aria-busy", "true");
        try {
          await sortDrop(itemId, target.dataset.target!);
        } catch (err) {
          sortNotice = { text: (err as Error).message, bad: true };
          openDecision(activeSort);
        } finally {
          actionBusy = false;
          document.querySelector("#stage")!.setAttribute("aria-busy", "false");
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    }),
  );
}
function openDecision(id: string) {
  const o = decisionOpportunities.find((o) => o.id === id);
  if (!o) return;
  if (o.kind === "sorting") {
    if (activeSort !== id) {
      selectedSortItem = "";
      sortNotice = sortFlash = null;
    }
    activeSort = id;
    const placed = db.active!.sorting?.[id]?.placed || [];
    const answers = db.active!.sorting?.[id]?.firstAnswers || {};
    const mistakes = o.items!.filter(
      (i) => answers[i.id] !== undefined && answers[i.id] !== i.target,
    ).length;
    const waste = id === "waste-sort";
    const items = waste
      ? wasteItemOrder.map((id) => o.items!.find((i) => i.id === id)!)
      : o.items!;
    const targets = waste
      ? wasteTargetOrder.map((id) => o.targets!.find((t) => t.id === id)!)
      : o.targets!;
    showModal(
      `<p class="eyebrow">${esc(roomById(o.roomId).name)} · ${placed.length} / ${o.items!.length}</p><h2 id="dialog-title">${esc(o.title)}</h2><p>${esc(o.scenario)}</p><p class="subtle">Nesneyi doğru yere sürükle ya da dokunup seç. İlk eşleştirme puana sayılır; yanlış ${activeSort === "waste-sort" ? "poşet" : "sepet"} ${fmtMoney(SORT_MISTAKE_PENALTY)} krediden götürür.</p>${mistakes ? `<p class="sort-mistakes">Hatalı ilk eşleştirme: ${mistakes}</p>` : ""}<p class="sort-instruction">${selectedSortItem ? "Şimdi uygun yeri seç." : "Önce bir nesneye dokun ya da sürükle."}</p>${sortNotice ? `<p class="sort-feedback ${sortNotice.bad ? "bad" : ""}" role="status">${esc(sortNotice.text)}</p>` : ""}<div class="sorting-items" style="--columns:${o.items!.length}">${items
        .filter((i) => !placed.includes(i.id))
        .map((i) =>
          btn(
            `${art(i.asset)}<span>${esc(i.title)}</span>`,
            `sort-select:${i.id}`,
            `sorting-piece ${selectedSortItem === i.id ? "selected" : ""}`,
            `aria-pressed="${selectedSortItem === i.id}" data-waste="${i.id}" data-item="${i.id}"`,
          ),
        )
        .join(
          "",
        )}</div><div class="sorting-targets" style="--columns:${o.targets!.length}">${targets
        .map((t) =>
          btn(
            `${art(t.asset)}<span>${esc(t.title)}</span><span class="bag-contents" aria-hidden="true">${o
              .items!.filter((i) => i.target === t.id && placed.includes(i.id))
              .map((i) => art(i.asset))
              .join("")}</span>`,
            `sort-target:${t.id}`,
            `sorting-target ${sortFlash?.id === t.id ? (sortFlash.ok ? "right" : "wrong") : ""}`,
            `data-target="${t.id}"`,
          ),
        )
        .join("")}</div>${btn("Ara ver", "close", "ghost")}`,
    );
    sortFlash = null;
    attachSortDrag();
    dialog.classList.add("sorting-dialog");
    if (waste) dialog.classList.add("waste-sorting-dialog");
  } else {
    showModal(
      `<p class="eyebrow">${esc(roomById(o.roomId).name)}</p><h2 id="dialog-title">${esc(o.title)}</h2><p>${esc(o.scenario)}</p><div class="decision-options">${o.choices.map((id, i) => btn(`${choiceIcons[id] ? `<span class="decision-icon" aria-hidden="true">${choiceIcons[id]}</span>` : ""}${o.kind === "load" ? `<span class="load-drum" style="--fill:${[25, 50, 80][i]}%" aria-hidden="true"></span>` : ""}<b>${esc(decisionCopy[id].title)}</b><span>${esc(decisionCopy[id].shortDescription)}</span>`, `${o.kind === "load" ? "load-select" : "choose"}:${id}`, `decision-option ${selectedLoad === id ? "selected" : ""}`)).join("")}</div>${o.kind === "load" ? btn("BU YÜKLE ÇALIŞTIR", `choose:${selectedLoad}`, "primary", o.choices.includes(selectedLoad) ? "" : "disabled") : ""}${btn("Bir daha bak", "close", "ghost")}`,
    );
  }
}

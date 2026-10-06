import { marketPrice, existingFixture } from "./data/market-prices";
import {
  decisionScore,
  decisionLesson,
  validDecisions,
  assertChoice,
  type Decision,
  type SortingProgress,
} from "./decisions";
import {
  INITIAL_BILL,
  INITIAL_BUDGET,
  MONEY_SCALE,
  ROUND_REWARD_RATE,
  ROUND_REWARD_CAP,
  FINAL_SALES_INCOME,
} from "./economy";
import {
  products,
  productById,
  roomById,
  freeActions,
  combos,
  type RoomId,
} from "./data";
import {
  validLesson,
  productLesson,
  freeLesson,
  type Lesson,
} from "./learning";
import { ideas, type Discovery, type Consideration } from "./journey";
export interface Team {
  organization: string;
  first: string;
  second: string;
  mode: "practice" | "official";
}
export interface Move {
  replacedBy?: string;
  reversalImpact?: number;
  id: string;
  name: string;
  impact: number;
  cost: number;
  room: RoomId;
  round: number;
}
export interface RoundResult {
  legacyReward?: boolean;
  round: number;
  before: number;
  after: number;
  saving: number;
  reward: number;
}
export interface State {
  salesIncomeGranted?: boolean;
  salesIncomeAcknowledged?: boolean;
  purchaseCosts?: Record<string, number>;
  decisionVersion?: 1;
  decisions?: Decision[];
  sorting?: Record<string, SortingProgress>;
  version: 1 | 2;
  id: string;
  team: Team;
  round: number;
  bill: number;
  budget: number;
  inventory: string[];
  installed: string[]; // All purchases ever installed; never refunded.
  activeInstallations: string[];
  replacedInstallations: string[];
  legacyAdjustment?: number;
  budgetMoments?: number[];
  actions: string[];
  combos: string[];
  moves: Move[];
  history: RoundResult[];
  phase: "playing" | "summary" | "finished";
  room: RoomId | "map" | "market";
  tutorial: boolean;
  originScene?: RoomId;
  originZone?: string;
  lessons?: Lesson[];
  journeyVersion?: 1;
  discoveries?: Discovery[];
  considered?: Consideration[];
  realLifePledges?: string[];
}
export interface Result {
  rulesVersion?: 1;
  id: string;
  team: Team;
  bill: number;
  budget: number;
  savingPercent: number;
  score: number;
  completedAt: string;
  realLifePledges?: string[];
}
export interface Database {
  version: 1 | 2;
  revision: number;
  active: State | null;
  results: Result[];
}
export const emptyDatabase = (): Database => ({
  version: 2,
  revision: 0,
  active: null,
  results: [],
});
export const score = (s: State) =>
  s.decisionVersion === 1
    ? decisionScore(s)
    : Math.max(
        0,
        Math.round(
          ((INITIAL_BILL - s.bill) / MONEY_SCALE) * 20 +
            (s.budget / MONEY_SCALE) * 2 +
            s.combos.length * 150 +
            s.actions.length * 75,
        ),
      );
export const savingPercent = (s: State) =>
  Math.round(((INITIAL_BILL - s.bill) / INITIAL_BILL) * 1000) / 10;
export function start(
  team: Team,
  results: Result[],
  organizations: string[],
): State {
  const clean = {
    ...team,
    organization: team.organization.trim(),
    first: team.first.trim(),
    second: team.second.trim(),
  };
  if (!clean.organization || !clean.first || !clean.second)
    throw Error("Kooperatifi ve iki katılımcının adını da yazın.");
  if (Object.values(clean).some((x) => x.length > 180))
    throw Error("İsimleri 180 karakterden kısa yazın.");
  if (clean.mode === "official") {
    if (
      organizations.length !== 26 ||
      !organizations.includes(clean.organization)
    )
      throw Error("Resmî oyun için doğrulanmış kurum listesinden seçim yapın.");
    if (results.some((r) => r.team.organization === clean.organization))
      throw Error(
        "Bu kurumun tamamlanmış bir yarışma sonucu var. Serbest denemeyi seçin.",
      );
  }
  return {
    version: 2,
    id: crypto.randomUUID(),
    team: clean,
    round: 1,
    bill: INITIAL_BILL,
    budget: INITIAL_BUDGET,
    inventory: [],
    installed: [],
    activeInstallations: [],
    replacedInstallations: [],
    budgetMoments: [],
    actions: [],
    combos: [],
    moves: [],
    history: [],
    phase: "playing",
    room: "map",
    tutorial: true,
    journeyVersion: 1,
    discoveries: [],
    considered: [],
    lessons: [],
  };
}
function playable(s: State) {
  if (s.version !== 2) throw Error("Önce eski kaydı güncel biçime dönüştürün.");
  if (!s.team.first.trim() || !s.team.second.trim())
    throw Error("Kooperatifi ve iki katılımcının adını da yazın.");
  if (s.phase !== "playing") throw Error("Önce dönem ekranını tamamlayın.");
}
export function purchase(s: State, id: string): State {
  playable(s);
  if (s.decisionVersion === 1) {
    assertChoice(s, id);
    if (s.inventory.length) throw Error("Önce hazır ürününü yerleştir.");
  }
  const p = products.find((p) => p.id === id);
  if (!p) throw Error("Ürün bulunamadı.");
  if (existingFixture(id))
    throw Error("Mevcut ampul satın alınmaz; devam et seçeneğini kullan.");
  if (marketPrice(id)?.priceTL === null)
    throw Error("Bu ürünün fiyatı inceleniyor. Şimdilik satın alınamaz.");
  if (roomById(p.room).round > s.round)
    throw Error("Bu ürün sonraki dönemde gelecek.");
  if (s.inventory.includes(id) || s.installed.includes(id))
    throw Error("Bu ürün zaten sizde.");
  if (s.budget < p.price)
    throw Error(
      "Mevcut para bu ürüne yetmiyor. Daha uygun bir seçenek deneyin.",
    );
  const budget = s.budget - p.price;
  const budgetMoments = s.budgetMoments || [];
  return {
    ...s,
    budget,
    inventory: [...s.inventory, id],
    purchaseCosts: { ...s.purchaseCosts, [id]: p.price },
    budgetMoments:
      budget <= INITIAL_BUDGET * 0.36 && !budgetMoments.includes(s.round)
        ? [...budgetMoments, s.round]
        : budgetMoments,
  };
}
function applyCombos(s: State): State {
  const earned = combos.filter(
    (c) =>
      !s.combos.includes(c.id) &&
      c.products.every((id) => s.activeInstallations.includes(id)) &&
      c.actions.every((id) => s.actions.includes(id)),
  );
  return {
    ...s,
    combos: [...s.combos, ...earned.map((c) => c.id)],
    bill: Math.max(0, s.bill - earned.reduce((n, c) => n + c.bonus, 0)),
  };
}
export function install(
  s: State,
  id: string,
  room: RoomId,
  zone: string,
): State {
  playable(s);
  if (!s.inventory.includes(id)) throw Error("Önce ürünü marketten alın.");
  const p = productById(id);
  if (p.room !== room || p.zone !== zone)
    throw Error("Buraya uygun değil. Ürünü kendi alanında deneyin.");
  const previous = p.exclusiveGroup
    ? s.activeInstallations.find(
        (id) => productById(id).exclusiveGroup === p.exclusiveGroup,
      )
    : undefined;
  const oldImpact = previous
    ? s.moves.find((m) => m.id === previous)!.impact
    : 0;
  const requested =
    p.requires && !s.activeInstallations.includes(p.requires) ? 0 : p.impact;
  const withoutOld = Math.max(0, s.bill - oldImpact);
  const bill = Math.max(0, withoutOld + requested);
  const impact = bill - withoutOld;
  return applyCombos({
    ...s,
    bill,
    inventory: s.inventory.filter((x) => x !== id),
    installed: [...s.installed, id],
    activeInstallations: [
      ...s.activeInstallations.filter((x) => x !== previous),
      id,
    ],
    replacedInstallations: previous
      ? [...s.replacedInstallations, previous]
      : s.replacedInstallations,
    moves: [
      ...s.moves.map((m) => (m.id === previous ? { ...m, replacedBy: id } : m)),
      {
        id,
        name: p.name,
        impact,
        cost: s.purchaseCosts?.[id] ?? p.price,
        room,
        round: s.round,
        ...(previous ? { reversalImpact: withoutOld - s.bill } : {}),
      },
    ],
  });
}
export function freeMove(s: State, id: string): State {
  playable(s);
  const a = freeActions.find((a) => a.id === id);
  if (!a) throw Error("Hamle bulunamadı.");
  if (s.actions.length >= 4) throw Error("Dört parasız fikri uyguladınız.");
  if (s.actions.includes(id)) throw Error("Bu hamleyi zaten yaptınız.");
  if (roomById(a.room).round > s.round) throw Error("Bu alan henüz açılmadı.");
  return applyCombos({
    ...s,
    bill: Math.max(0, s.bill + a.impact),
    actions: [...s.actions, id],
    moves: [
      ...s.moves,
      {
        id,
        name: a.name,
        impact: a.impact,
        cost: 0,
        room: a.room,
        round: s.round,
      },
    ],
  });
}
export function endRound(s: State): State {
  playable(s);
  const before = s.history.at(-1)?.after ?? INITIAL_BILL;
  const saving = Math.max(0, before - s.bill);
  const reward = Math.min(
    Math.floor(saving * ROUND_REWARD_RATE),
    ROUND_REWARD_CAP,
  );
  return {
    ...s,
    phase: "summary",
    budget: s.budget + reward,
    history: [
      ...s.history,
      { round: s.round, before, after: s.bill, saving, reward },
    ],
  };
}
export function continueRound(s: State): State {
  if (s.phase !== "summary") throw Error("Henüz dönem bitmedi.");
  return s.round === 4
    ? { ...s, phase: "finished" }
    : {
        ...s,
        round: s.round + 1,
        phase: "playing",
        room: "map",
        ...(s.round === 3 && s.decisionVersion === 1 && !s.salesIncomeGranted
          ? {
              budget: s.budget + FINAL_SALES_INCOME,
              salesIncomeGranted: true,
              salesIncomeAcknowledged: false,
            }
          : {}),
      };
}
export function acknowledgeSales(s: State): State {
  if (s.round !== 4 || !s.salesIncomeGranted || s.phase !== "playing")
    throw Error("Satış geliri ekranı henüz açık değil.");
  return { ...s, salesIncomeAcknowledged: true };
}
export function finish(db: Database): Database {
  if (!db.active || db.active.phase !== "finished")
    throw Error("Oyun henüz tamamlanmadı.");
  const s = db.active;
  if (s.team.mode === "practice" || db.results.some((r) => r.id === s.id))
    return db;
  if (db.results.some((r) => r.team.organization === s.team.organization))
    throw Error("Bu kurum için sonuç zaten kaydedilmiş.");
  return {
    ...db,
    results: [
      ...db.results,
      {
        id: s.id,
        team: s.team,
        bill: s.bill,
        budget: s.budget,
        savingPercent: savingPercent(s),
        score: score(s),
        completedAt: new Date().toISOString(),
        ...(s.decisionVersion ? { rulesVersion: s.decisionVersion } : {}),
        ...(s.realLifePledges ? { realLifePledges: s.realLifePledges } : {}),
      },
    ],
  };
}
export const ranking = (results: Result[]) =>
  [...results].sort(
    (a, b) =>
      (b.rulesVersion ?? 0) - (a.rulesVersion ?? 0) ||
      (a.rulesVersion === 1 && b.rulesVersion === 1
        ? b.score - a.score
        : b.savingPercent - a.savingPercent) ||
      b.score - a.score ||
      a.completedAt.localeCompare(b.completedAt),
  );
export function zoneResolved(s: State, room: RoomId, zone: string) {
  const actions: Record<string, string> = {
    lights: "home:light",
    stock: "kitchen:food",
    full: "laundry:machine",
    off: "workshop:power",
    dawn: "garden:beds",
    reuse: "storage:packing",
    separate: "waste:sorting",
    short: "bathroom:shower",
  };
  return (
    s.actions.some((id) => actions[id] === `${room}:${zone}`) ||
    s.moves.some(
      (m) =>
        m.room === room &&
        !m.replacedBy &&
        s.activeInstallations.includes(m.id) &&
        m.impact < 0 &&
        products.some((p) => p.id === m.id && p.zone === zone),
    )
  );
}
export function feedback(s: State, id: string): string {
  const p = productById(id);
  return p.requires && !s.activeInstallations.includes(p.requires)
    ? "Depo kuruldu, ama suyu toplayan bağlantı yok. Tek başına tüketimi azaltmadı."
    : p.feedback;
}
export function validDatabase(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false;
  const d = value as Database;
  const validTeam = (t: Team) =>
    t &&
    typeof t.organization === "string" &&
    !!t.organization.trim() &&
    t.organization.length <= 180 &&
    typeof t.first === "string" &&
    !!t.first.trim() &&
    t.first.length <= 180 &&
    typeof t.second === "string" &&
    t.second.length <= 180 &&
    ["practice", "official"].includes(t.mode);
  if (
    ![1, 2].includes(d.version) ||
    !Number.isInteger(d.revision) ||
    d.revision < 0 ||
    !Array.isArray(d.results) ||
    d.results.length > 26 ||
    d.results.some(
      (r) =>
        !r ||
        !validTeam(r.team) ||
        !validPledges(r.realLifePledges) ||
        r.team.mode !== "official" ||
        typeof r.id !== "string" ||
        ![r.bill, r.budget, r.score, r.savingPercent].every(Number.isFinite) ||
        r.bill < 0 ||
        r.budget < 0 ||
        r.score < 0 ||
        typeof r.completedAt !== "string" ||
        !Number.isFinite(Date.parse(r.completedAt)),
    )
  )
    return false;
  if (
    new Set(d.results.map((r) => r.id)).size !== d.results.length ||
    new Set(d.results.map((r) => r.team.organization)).size !== d.results.length
  )
    return false;
  const s = d.active;
  if (s === null) return true;
  if (!validDecisions(s)) return false;
  if (
    s.salesIncomeGranted !== undefined &&
    typeof s.salesIncomeGranted !== "boolean"
  )
    return false;
  if (
    s.salesIncomeAcknowledged !== undefined &&
    typeof s.salesIncomeAcknowledged !== "boolean"
  )
    return false;
  if (s.salesIncomeGranted && s.round !== 4) return false;
  if (s.salesIncomeAcknowledged && !s.salesIncomeGranted) return false;
  if (
    s.purchaseCosts !== undefined &&
    (!s.purchaseCosts ||
      Array.isArray(s.purchaseCosts) ||
      typeof s.purchaseCosts !== "object" ||
      Object.entries(s.purchaseCosts).some(
        ([id, cost]) =>
          !products.some((p) => p.id === id) ||
          !Number.isFinite(cost) ||
          cost < 0,
      ))
  )
    return false;
  if (!(
    !!s &&
    s.version === d.version &&
    typeof s.id === "string" &&
    typeof s.tutorial === "boolean" &&
    (s.originScene === undefined || !!roomById(s.originScene)) &&
    (s.originZone === undefined ||
      (!!s.originScene &&
        roomById(s.originScene)?.zones.some((z) => z.id === s.originZone))) &&
    validTeam(s.team) &&
    Number.isInteger(s.round) &&
    s.round >= 1 &&
    s.round <= 4 &&
    Number.isFinite(s.bill) &&
    s.bill >= 0 &&
    Number.isFinite(s.budget) &&
    s.budget >= 0 &&
    ["playing", "summary", "finished"].includes(s.phase) &&
    [
      "map",
      "market",
      "kitchen",
      "bathroom",
      "home",
      "workshop",
      "laundry",
      "garden",
      "storage",
      "waste",
      "roof",
    ].includes(s.room) &&
    [s.inventory, s.installed].every(
      (a) =>
        Array.isArray(a) &&
        a.every((id) => products.some((p) => p.id === id)) &&
        new Set(a).size === a.length,
    ) &&
    Array.isArray(s.actions) &&
    s.actions.length <= 4 &&
    new Set(s.actions).size === s.actions.length &&
    s.actions.every((id) => freeActions.some((a) => a.id === id)) &&
    Array.isArray(s.combos) &&
    s.combos.every((id) => combos.some((c) => c.id === id)) &&
    Array.isArray(s.moves) &&
    Array.isArray(s.history)
  ))
    return false;
  if (s.inventory.some((id) => s.installed.includes(id))) return false;
  if (
    s.moves.some(
      (m) =>
        !m ||
        typeof m.name !== "string" ||
        (!products.some((p) => p.id === m.id) &&
          !freeActions.some((a) => a.id === m.id)) ||
        ![
          "kitchen",
          "bathroom",
          "home",
          "workshop",
          "laundry",
          "garden",
          "storage",
          "waste",
          "roof",
        ].includes(m.room) ||
        ![m.impact, m.cost].every(Number.isFinite) ||
        !Number.isInteger(m.round) ||
        m.round < 1 ||
        m.round > s.round,
    )
  )
    return false;
  if (
    s.history.length !== (s.phase === "playing" ? s.round - 1 : s.round) ||
    s.history.some(
      (h, i) =>
        !h ||
        h.round !== i + 1 ||
        ![h.before, h.after, h.reward, h.saving].every(
          (n) => Number.isFinite(n) && n >= 0,
        ),
    )
  )
    return false;
  if (
    s.lessons !== undefined &&
    (!Array.isArray(s.lessons) ||
      s.lessons.length > 40 ||
      !s.lessons.every(validLesson) ||
      new Set(s.lessons.map((l) => l.id)).size !== s.lessons.length)
  )
    return false;
  if (s.journeyVersion !== undefined && s.journeyVersion !== 1) return false;
  if (!validPledges(s.realLifePledges)) return false;
  if (s.realLifePledges && s.phase !== "finished") return false;
  if (
    s.discoveries !== undefined &&
    (!Array.isArray(s.discoveries) ||
      s.discoveries.length > 100 ||
      s.discoveries.some(
        (d) =>
          !d ||
          !Number.isInteger(d.round) ||
          d.round < 1 ||
          d.round > s.round ||
          !roomById(d.room)?.zones.some((z) => z.id === d.zone) ||
          roomById(d.room).round > d.round,
      ) ||
      new Set(s.discoveries.map((d) => `${d.round}:${d.room}:${d.zone}`))
        .size !== s.discoveries.length)
  )
    return false;
  if (
    s.considered !== undefined &&
    (!Array.isArray(s.considered) ||
      s.considered.length > 120 ||
      s.considered.some(
        (c) =>
          !c ||
          !Number.isInteger(c.round) ||
          c.round < 1 ||
          c.round > s.round ||
          !products.some(
            (p) => p.id === c.productId && roomById(p.room).round <= c.round,
          ),
      ) ||
      new Set(s.considered.map((c) => `${c.round}:${c.productId}`)).size !==
        s.considered.length)
  )
    return false;
  if (s.version === 2) {
    const active = s.activeInstallations,
      retired = s.replacedInstallations;
    if (
      ![active, retired].every(
        (a) =>
          Array.isArray(a) &&
          new Set(a).size === a.length &&
          a.every((id) => s.installed.includes(id)),
      )
    )
      return false;
    if (
      active.some((id) => retired.includes(id)) ||
      active.length + retired.length !== s.installed.length
    )
      return false;
    const groups = active
      .map((id) => productById(id).exclusiveGroup)
      .filter(Boolean);
    if (new Set(groups).size !== groups.length) return false;
    if (
      s.installed.some((id) => s.moves.filter((m) => m.id === id).length !== 1)
    )
      return false;
    if (
      s.moves.some(
        (m) =>
          (m.reversalImpact !== undefined &&
            !Number.isFinite(m.reversalImpact)) ||
          (m.replacedBy !== undefined &&
            (!retired.includes(m.id) ||
              !s.installed.includes(m.replacedBy) ||
              productById(m.id)?.exclusiveGroup !==
                productById(m.replacedBy)?.exclusiveGroup)),
      )
    )
      return false;
    if (
      s.legacyAdjustment !== undefined &&
      !Number.isFinite(s.legacyAdjustment)
    )
      return false;
    if (
      s.budgetMoments !== undefined &&
      (!Array.isArray(s.budgetMoments) ||
        new Set(s.budgetMoments).size !== s.budgetMoments.length ||
        s.budgetMoments.some(
          (n) => !Number.isInteger(n) || n < 1 || n > s.round,
        ))
    )
      return false;
  }
  return s.phase !== "finished" || s.round === 4;
}
export const STORAGE_KEY = "yesil-donusum-v1";
export function csv(results: Result[]): string {
  const cell = (v: string | number) =>
    '"' +
    String(v)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      [
        "Sıra",
        "Kurum",
        "1. Katılımcı",
        "2. Katılımcı",
        "Tasarruf %",
        "Skor",
        "Aylık gider (TL)",
        "Kasa (TL)",
        "Tarih",
        "Puan kuralı",
      ],
      ...ranking(results).map((r, i) => [
        i + 1,
        r.team.organization,
        r.team.first,
        r.team.second,
        r.savingPercent,
        r.score,
        r.bill,
        r.budget,
        r.completedAt,
        r.rulesVersion === 1 ? "Karar puanı v1" : "Eski ekonomi puanı",
      ]),
    ]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n")
  );
}

function validPledges(p: unknown): boolean {
  return (
    p === undefined ||
    (Array.isArray(p) &&
      p.length === 3 &&
      new Set(p).size === 3 &&
      p.every(
        (x) => typeof x === "string" && x.trim().length > 0 && x.length <= 240,
      ))
  );
}
export function discover(s: State, room: RoomId, zone: string): State {
  playable(s);
  const r = roomById(room);
  if (!r || r.round > s.round || !r.zones.some((z) => z.id === zone))
    throw Error("Bu nokta henüz açık değil.");
  const d = { round: s.round, room, zone };
  if (
    s.discoveries?.some(
      (x) => x.round === d.round && x.room === room && x.zone === zone,
    )
  )
    return s;
  return { ...s, discoveries: [...(s.discoveries || []), d] };
}
export function consider(s: State, productId: string): State {
  playable(s);
  const p = products.find((p) => p.id === productId);
  if (!p || roomById(p.room).round > s.round)
    throw Error("Bu ürün henüz açık değil.");
  if (
    s.considered?.some((c) => c.round === s.round && c.productId === productId)
  )
    return s;
  return {
    ...s,
    considered: [...(s.considered || []), { round: s.round, productId }],
  };
}
export function setPledges(db: Database, ids: string[]): Database {
  const s = db.active;
  if (!s || s.phase !== "finished") throw Error("Önce dört dönemi tamamlayın.");
  const options = ideas(s),
    selected = ids.map((id) => options.find((i) => i.id === id));
  if (ids.length !== 3 || new Set(ids).size !== 3 || selected.some((i) => !i))
    throw Error("Fikir çantanızdan tam 3 farklı hamle seçin.");
  const realLifePledges = selected.map((i) => i!.pledge);
  if (!validPledges(realLifePledges)) throw Error("Tam 3 farklı hamle seçin.");
  return {
    ...db,
    active: { ...s, realLifePledges },
    results: db.results.map((r) =>
      r.id === s.id ? { ...r, realLifePledges } : r,
    ),
  };
}
export function migrateDatabase(value: unknown): Database {
  if (!validDatabase(value)) throw Error("Kayıt biçimi okunamadı.");
  const db = structuredClone(value),
    s = db.active;
  if (db.version === 1) {
    for (const result of db.results) {
      result.bill *= MONEY_SCALE;
      result.budget *= MONEY_SCALE;
    }
    if (s) {
      s.bill *= MONEY_SCALE;
      s.budget *= MONEY_SCALE;
      s.moves = s.moves.map((m) => ({
        ...m,
        cost: m.cost * MONEY_SCALE,
        impact: m.impact * MONEY_SCALE,
      }));
      s.history = s.history.map((h) => ({
        ...h,
        before: h.before * MONEY_SCALE,
        after: h.after * MONEY_SCALE,
        saving: Math.max(0, h.before - h.after) * MONEY_SCALE,
        reward: h.reward * MONEY_SCALE,
      }));
      s.lessons = s.lessons?.map((l) => ({
        ...l,
        billImpact: l.billImpact * MONEY_SCALE,
        comboImpact: l.comboImpact * MONEY_SCALE,
        spent: l.spent * MONEY_SCALE,
      }));
      s.activeInstallations = [];
      s.replacedInstallations = [];
      for (const id of s.installed) {
        const group = productById(id).exclusiveGroup;
        const previous = group
          ? s.activeInstallations.find(
              (x) => productById(x).exclusiveGroup === group,
            )
          : undefined;
        if (previous) {
          s.activeInstallations = s.activeInstallations.filter(
            (x) => x !== previous,
          );
          s.replacedInstallations.push(previous);
          s.moves = s.moves.map((m) =>
            m.id === previous ? { ...m, replacedBy: id } : m,
          );
        }
        s.activeInstallations.push(id);
      }
      // Preserve historical net amounts; do not re-score old games on migration.
      s.legacyAdjustment = s.moves
        .filter((m) => s.replacedInstallations.includes(m.id))
        .reduce((n, m) => n + m.impact, 0);
      s.version = 2;
    }
    db.version = 2;
  }
  if (!s) return db;
  s.purchaseCosts ??= {};
  for (const id of s.inventory)
    s.purchaseCosts[id] ??=
      marketPrice(id)?.previousPriceTL ?? productById(id).price;
  s.budgetMoments ??= [];

  const legacy = s.journeyVersion !== 1;
  s.discoveries ??= [];
  s.considered ??= [];
  s.lessons ??= [];
  for (const m of s.moves) {
    const p = products.find((p) => p.id === m.id),
      id = p ? m.id : "free-" + m.id;
    if (!s.lessons.some((l) => l.id === id)) {
      const lesson = p
        ? p.id.startsWith("rev-")
          ? decisionLesson(p.id)
          : productLesson(p, m.impact, m.impact, m.impact !== 0 || !p.requires)
        : freeLesson(m.id, m.impact, m.impact);
      s.lessons.push({ ...lesson, acknowledged: true });
    }
  }
  if (legacy) {
    s.history = s.history.map((h) => ({
      ...h,
      saving: Math.max(0, h.before - h.after),
      legacyReward: true,
    }));
  }
  s.journeyVersion = 1;
  if (!validDatabase(db))
    throw Error("Kayıt güvenle dönüştürülemedi. Eski veri korunuyor.");
  return db;
}

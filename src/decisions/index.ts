import { marketPrice, existingFixture } from "../data/market-prices";
import sourceNotes from "./sourceNotes.json";
import raw from "./opportunities.json";
import economyData from "./economy.json";
import scoresData from "./scores.json";
import copyData from "./copy.json";
import assetsData from "./assets.json";
import type { Product, RoomId, Category } from "../data";
import type { State } from "../model";
import type { Lesson } from "../learning";
import { SORT_MISTAKE_PENALTY } from "../economy";
export interface Opportunity {
  id: string;
  roomId: RoomId;
  title: string;
  scenario: string;
  x: number;
  y: number;
  kind: string;
  core: boolean;
  round: number;
  choices: string[];
  targets?: { id: string; title: string; asset: string }[];
  items?: { id: string; title: string; asset: string; target: string }[];
}
export const opportunities = raw as Opportunity[];
export const economy: Record<string, { priceTL: number; billImpact: number }> =
  Object.fromEntries(
    Object.entries(economyData).map(([id, value]) => [
      id,
      { ...value, priceTL: marketPrice(id)?.priceTL ?? 0 },
    ]),
  );
export const points: Record<string, { decisionScore: number; reason: string }> =
  scoresData;
export const copy: Record<
  string,
  {
    title: string;
    shortDescription: string;
    resultTitle: string;
    resultText: string;
    whyText: string;
  }
> = copyData;
export const assets: Record<
  string,
  { asset: string; installationSlot: string }
> = assetsData;
export const opportunityFor = (id: string) =>
  opportunities.find((o) => o.choices.includes(id));
export const zoneFor = (o: Opportunity) => `rev-${o.id}`;
const categoryFor = (room: RoomId): Category =>
  (
    ({
      kitchen: "Su",
      bathroom: "Su",
      home: "Enerji",
      workshop: "Enerji",
      laundry: "Ev",
      garden: "Bahçe",
      storage: "Gıda",
      roof: "Enerji",
      waste: "Atık / Yeniden kullanım",
    }) as const
  )[room];
export const decisionProducts: Product[] = opportunities
  .filter((o) => o.kind === "product")
  .flatMap((o) =>
    o.choices.map((id) => ({
      id,
      name: copy[id].title,
      price: economy[id].priceTL,
      feature: copy[id].shortDescription,
      description: o.scenario,
      category: categoryFor(o.roomId),
      room: o.roomId,
      zone: zoneFor(o),
      asset: assets[id].asset,
      impact: economy[id].billImpact,
      feedback: copy[id].resultText,
      kind: "neutral" as const,
      exclusiveGroup: `decision-${o.id}`,
    })),
  );
export interface Decision {
  opportunityId: string;
  choiceId: string;
  round: number;
}
export interface SortingProgress {
  firstAnswers: Record<string, string>;
  placed: string[];
}
export const completed = (s: State, o: Opportunity) =>
  !!s.decisions?.some((d) => d.opportunityId === o.id);
export function nextOpportunity(s: State, room: RoomId) {
  return opportunities.find(
    (o) => o.roomId === room && o.round <= s.round && !completed(s, o),
  );
}
export function decisionScore(s: State) {
  return (s.decisions || []).reduce((sum, d) => {
    const o = opportunities.find((o) => o.id === d.opportunityId)!;
    if (!o?.core) return sum;
    if (o.kind === "sorting") {
      const answers = s.sorting?.[o.id]?.firstAnswers || {};
      return (
        sum +
        Math.round(
          (points[`sort-${o.id}`].decisionScore *
            o.items!.filter((i) => answers[i.id] === i.target).length) /
            o.items!.length,
        )
      );
    }
    return sum + (points[d.choiceId]?.decisionScore || 0);
  }, 0);
}
function eligible(s: State, o: Opportunity) {
  if (
    s.phase !== "playing" ||
    o.round > s.round ||
    completed(s, o) ||
    nextOpportunity(s, o.roomId)?.id !== o.id
  )
    throw Error("Bu karar şu anda açık değil.");
}
export function assertChoice(s: State, id: string) {
  const o = opportunityFor(id);
  if (!o) throw Error("Seçenek bulunamadı.");
  eligible(s, o);
  return o;
}
export function decisionLesson(id: string): Lesson {
  const o = opportunityFor(id)!,
    c = copy[id];
  return {
    id,
    title: c.resultTitle,
    result: c.resultText,
    realLife: "",
    takeaway: c.whyText,
    memoryName: c.title,
    asset: assets[id].asset,
    category: categoryFor(o.roomId),
    billImpact: economy[id].billImpact,
    comboImpact: 0,
    spent: economy[id].priceTL,
    tone: !o.core
      ? "neutral"
      : points[id].decisionScore >= 100
        ? "good"
        : points[id].decisionScore >= 60
          ? "neutral"
          : "bad",
    acknowledged: false,
    remind: false,
  };
}
export function recordChoice(s: State, id: string): State {
  const o = assertChoice(s, id);
  if (o.kind === "product" && !existingFixture(id) && !s.installed.includes(id))
    throw Error("Önce ürünü yerleştir.");
  return {
    ...s,
    decisions: [
      ...(s.decisions || []),
      { opportunityId: o.id, choiceId: id, round: s.round },
    ],
    lessons: [
      ...(s.lessons || []),
      {
        ...decisionLesson(id),
        spent: existingFixture(id)
          ? 0
          : (s.moves.find((m) => m.id === id)?.cost ??
            decisionLesson(id).spent),
      },
    ],
  };
}
export function skipOptional(s: State, id: string): State {
  const o = opportunities.find((o) => o.id === id)!;
  eligible(s, o);
  if (o.core) throw Error("Bu temel bir karar.");
  return {
    ...s,
    decisions: [
      ...(s.decisions || []),
      { opportunityId: id, choiceId: "skip", round: s.round },
    ],
  };
}
export function sortItem(
  s: State,
  id: string,
  itemId: string,
  target: string,
): State {
  const o = opportunities.find((o) => o.id === id)!;
  eligible(s, o);
  const item = o.items?.find((i) => i.id === itemId);
  if (!item || !o.targets?.some((t) => t.id === target))
    throw Error("Geçersiz eşleştirme.");
  const old = s.sorting?.[id] || { firstAnswers: {}, placed: [] };
  if (old.placed.includes(itemId)) return s;
  const firstTry = old.firstAnswers[itemId] === undefined;
  const progress = {
    firstAnswers: {
      ...old.firstAnswers,
      [itemId]: old.firstAnswers[itemId] ?? target,
    },
    placed: item.target === target ? [...old.placed, itemId] : old.placed,
  };
  // A wrong first answer costs money once; retries are free but never score.
  const penalty =
    firstTry && item.target !== target
      ? Math.min(s.budget, SORT_MISTAKE_PENALTY)
      : 0;
  const next = {
    ...s,
    budget: s.budget - penalty,
    sorting: { ...s.sorting, [id]: progress },
  };
  if (progress.placed.length !== o.items!.length) return next;
  const lesson: Lesson = {
    id: `sort-${id}`,
    title: "Ayırma tamamlandı.",
    result:
      id === "waste-sort"
        ? "Temiz ambalajları ayırdın. Kirli peçete bu sistemde diğer atığa gider."
        : "Beyaz, renkli ve koyu çamaşırları ayırdın. Evde bakım etiketlerini de kontrol et.",
    realLife: "",
    takeaway: "",
    memoryName: o.title,
    asset: o.items![0].asset,
    category: categoryFor(o.roomId),
    billImpact: 0,
    comboImpact: 0,
    spent: 0,
    tone: "neutral",
    acknowledged: false,
    remind: false,
  };
  return {
    ...next,
    decisions: [
      ...(s.decisions || []),
      { opportunityId: id, choiceId: "sorted", round: s.round },
    ],
    lessons: [...(s.lessons || []), lesson],
  };
}
// Compatibility only: the briefly released price revision stored a keep-existing
// choice without a purchase or installation. Never fabricate either on recovery.
function savedExistingBulb(s: State, id: string) {
  if (
    ![
      "rev-light-home-incandescent",
      "rev-light-workshop-incandescent",
    ].includes(id)
  )
    return false;
  return (
    !s.inventory.includes(id) &&
    !s.moves.some((m) => m.id === id) &&
    !!s.lessons?.some(
      (l) =>
        l.id === id &&
        l.spent === 0 &&
        l.billImpact === 0 &&
        l.title === "Mevcut ampulle devam ettin.",
    )
  );
}
export function validDecisions(s: State): boolean {
  try {
    if (s.decisionVersion === undefined) return true;
    if (
      s.decisionVersion !== 1 ||
      !Array.isArray(s.decisions) ||
      new Set(s.decisions.map((d) => d.opportunityId)).size !==
        s.decisions.length
    )
      return false;
    return (
      s.decisions.every((d) => {
        const o = opportunities.find((o) => o.id === d.opportunityId);
        if (
          !o ||
          !Number.isInteger(d.round) ||
          d.round < o.round ||
          d.round > s.round
        )
          return false;
        if (d.choiceId === "skip") return !o.core;
        if (o.kind === "sorting") {
          const p = s.sorting?.[o.id];
          return (
            d.choiceId === "sorted" &&
            !!p &&
            o.items!.every((i) => p.placed.includes(i.id))
          );
        }
        return (
          o.choices.includes(d.choiceId) &&
          (o.kind !== "product" ||
            s.installed.includes(d.choiceId) ||
            savedExistingBulb(s, d.choiceId))
        );
      }) &&
      Object.entries(s.sorting || {}).every(([id, p]) => {
        const o = opportunities.find((o) => o.id === id);
        return (
          !!o?.items &&
          Array.isArray(p.placed) &&
          new Set(p.placed).size === p.placed.length &&
          p.placed.every(
            (x) =>
              o.items!.some((i) => i.id === x) &&
              Object.hasOwn(p.firstAnswers, x),
          ) &&
          Object.entries(p.firstAnswers).every(
            ([i, t]) =>
              o.items!.some((x) => x.id === i) &&
              o.targets!.some((x) => x.id === t),
          )
        );
      })
    );
  } catch {
    return false;
  }
}

export const practicalPledges: Record<string, string> = {
  tap: "Evde damlayan muslukları kontrol edeceğiz.",
  "waste-sort": "Temiz ambalajları kirli peçetelerden ayıracağız.",
  shower: "Duş başlığının akış özelliğini kontrol edeceğiz.",
  basin: "Duş ısınırken akan temiz suyu uygun bir işte kullanacağız.",
  flush: "Yeterli olduğunda yarım sifonu kullanacağız.",
  toothbrush: "Diş fırçalarken musluğu kapatacağız.",
  hygiene: "Kirli peçete ve ıslak mendilleri geri dönüşüme karıştırmayacağız.",
  "light-home":
    "Evde sık kullandığımız lambalar için LED seçeneklerine bakacağız.",
  "light-workshop": "Kooperatifin aydınlatma ihtiyacını gözden geçireceğiz.",
  "office-power": "Mesai sonunda uygun cihazların elektriğini kapatacağız.",
  "laundry-sort":
    "Çamaşırları renklerine ve bakım etiketlerine göre ayıracağız.",
  "laundry-load": "Makineyi sıkıştırmadan uygun tam yükle çalıştıracağız.",
  "laundry-program":
    "Günlük çamaşırlarda etikete uygun düşük sıcaklığı değerlendireceğiz.",
  irrigation: "Sulama suyunu bitkinin köküne yönlendireceğiz.",
  "irrigation-time": "Sıcak günlerde sulamayı serin saatlere bırakacağız.",
  "irrigation-timer": "Sulama ayarını toprağın ihtiyacına göre yapacağız.",
  "pack-lentil": "Uygun gıdalar için iade ve dolum düzenini araştıracağız.",
  "pack-apple": "Alışverişte filemizi tekrar kullanacağız.",
  "pack-towel": "Elden teslimlerde gereksiz ikinci ambalajı azaltacağız.",
  "pack-scarf": "Tekstil tesliminde ürüne yeterli ambalajı seçeceğiz.",
  "roof-bonus": "Güneş yatırımı öncesinde çatı uygunluğunu araştıracağız.",
};
export function pledgeFor(id: string) {
  const o =
    opportunityFor(id) || opportunities.find((o) => `sort-${o.id}` === id);
  return o ? practicalPledges[o.id] : undefined;
}

export const maximumScore = opportunities
  .filter((o) => o.core)
  .reduce(
    (sum, o) =>
      sum +
      (o.kind === "sorting"
        ? points[`sort-${o.id}`].decisionScore
        : Math.max(...o.choices.map((id) => points[id].decisionScore))),
    0,
  );

export const choices = opportunities.flatMap((o) =>
  o.choices.map((id) => ({
    id,
    opportunityId: o.id,
    ...copy[id],
    ...economy[id],
    ...points[id],
    ...assets[id],
    sourceNote: sourceNotes[o.id as keyof typeof sourceNotes],
  })),
);

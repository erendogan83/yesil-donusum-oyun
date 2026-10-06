import { existingFixture } from "./data/market-prices";
import {
  nextOpportunity,
  completed,
  zoneFor,
  opportunityFor,
  opportunities,
} from "./decisions";
import {
  rooms,
  products,
  productById,
  roomById,
  type RoomId,
  type Room,
  type Product,
} from "./data";
import type { State } from "./model";

// Progress is a choice made, not a judgement of whether that choice saved money.
export function activeOpportunity(s: State, room: RoomId) {
  const r = roomById(room);
  if (s.decisionVersion === 1) {
    const lesson = s.lessons?.find((l) => !l.acknowledged && !l.remind);
    const pending =
      lesson &&
      (opportunityFor(lesson.id) ||
        opportunities.find((o) => `sort-${o.id}` === lesson.id));
    const o = pending?.roomId === room ? pending : nextOpportunity(s, room);
    return o ? r.zones.find((z) => z.id === zoneFor(o)) : undefined;
  }
  const ready = s.inventory
    .map(productById)
    .find((p) => p.room === room && offeredProduct(p));
  const pending = s.lessons?.find(
    (l) => !l.acknowledged && !l.remind && productById(l.id)?.room === room,
  );
  if (ready || pending)
    return r.zones.find(
      (z) => z.id === (ready || productById(pending!.id)).zone,
    );
  return r.zones.find(
    (z) =>
      !z.id.startsWith("rev-") &&
      products.some(
        (p) => offeredProduct(p) && p.room === room && p.zone === z.id,
      ) &&
      !s.installed.some((id) => {
        const p = productById(id);
        return p.room === room && p.zone === z.id;
      }),
  );
}
// A step the section cannot be finished without. Optional opportunities (leğen,
// LED şerit, zamanlayıcı, çatı) never count as unfinished work.
const required = (s: State, r: Room) =>
  s.decisionVersion === 1
    ? opportunities.some(
        (o) =>
          o.roomId === r.id && o.core && o.round <= s.round && !completed(s, o),
      )
    : !!activeOpportunity(s, r.id);
const playableRooms = (s: State) =>
  rooms.filter((r) => r.id !== "waste" && r.round <= s.round);
/** Rooms that still hold a required step, in map order. */
export const pendingRooms = (s: State) =>
  playableRooms(s).filter((r) => required(s, r));
export const nextRoom = (s: State) => pendingRooms(s)[0];
/** True when only optional opportunities are left somewhere. */
export const optionalLeft = (s: State) =>
  playableRooms(s).some((r) => !required(s, r) && activeOpportunity(s, r.id));

export const returnLabels: Record<RoomId, string> = {
  kitchen: "MUTFAĞA DÖN",
  bathroom: "BANYOYA DÖN",
  home: "OTURMA ODASINA DÖN",
  workshop: "OFİSE DÖN",
  laundry: "ÇAMAŞIRHANEYE DÖN",
  garden: "BAHÇEYE DÖN",
  storage: "DEPOYA DÖN",
  roof: "ÇATIYA DÖN",
  waste: "ATIK ALANINA DÖN",
};
export const roomLocatives: Record<RoomId, string> = {
  kitchen: "Mutfakta",
  bathroom: "Banyoda",
  home: "Oturma odasında",
  workshop: "Ofiste",
  laundry: "Çamaşırhanede",
  garden: "Bahçede",
  storage: "Depoda",
  roof: "Çatıda",
  waste: "Atık alanında",
};
export const offeredProduct = (p: Product) =>
  p.id !== "curtain" && p.room !== "waste" && !existingFixture(p.id);

// Reserved configuration only: no rendering, input handler, asset or economy dependency.
export interface FutureInteraction {
  id: string;
  sceneId: RoomId;
  x: number;
  y: number;
  enabled: false;
  compatibleProducts?: string[];
  existingZone?: string;
}
export const futureInteractions: FutureInteraction[] = [
  { id: "living-led-strip", sceneId: "home", x: 79, y: 37, enabled: false },
  {
    id: "office-light",
    sceneId: "workshop",
    x: 30,
    y: 16,
    enabled: false,
    compatibleProducts: ["led", "bulb"],
  },
  {
    id: "office-device-plug",
    sceneId: "workshop",
    x: 66,
    y: 50,
    enabled: false,
    existingZone: "power",
    compatibleProducts: ["meter", "smart-plug", "strip", "basic-strip"],
  },
  {
    id: "kitchen-waste-sorting",
    sceneId: "kitchen",
    x: 35,
    y: 65,
    enabled: false,
  },
  { id: "laundry-sort", sceneId: "laundry", x: 50, y: 65, enabled: false },
  {
    id: "laundry-load",
    sceneId: "laundry",
    x: 31,
    y: 49,
    enabled: false,
    existingZone: "machine",
  },
  { id: "bathroom-flush", sceneId: "bathroom", x: 38, y: 58, enabled: false },
  { id: "bathroom-basin", sceneId: "bathroom", x: 68, y: 66, enabled: false },
  {
    id: "bathroom-toothbrush",
    sceneId: "bathroom",
    x: 30,
    y: 42,
    enabled: false,
  },
  {
    id: "garden-irrigation-method",
    sceneId: "garden",
    x: 53,
    y: 63,
    enabled: false,
  },
  {
    id: "garden-irrigation-time",
    sceneId: "garden",
    x: 45,
    y: 63,
    enabled: false,
  },
  {
    id: "garden-irrigation-duration",
    sceneId: "garden",
    x: 61,
    y: 63,
    enabled: false,
  },
  {
    id: "packaging-material-choice",
    sceneId: "storage",
    x: 51,
    y: 63,
    enabled: false,
  },
];

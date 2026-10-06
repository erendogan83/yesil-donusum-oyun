import Phaser from "phaser";
import type { State } from "./model";
import type { RoomId } from "./data";
import { placements } from "./placements";

const rawSlots = [
  { id: "lentil", x: 716, y: 542 },
  { id: "apple", x: 839, y: 583 },
  { id: "towel", x: 678, y: 589 },
  { id: "scarf", x: 802, y: 644 },
];
const laundrySlots = [
  { id: "white", x: 655, y: 710 },
  { id: "color", x: 822, y: 757 },
  { id: "dark", x: 995, y: 801 },
];
export const beforeAfterAssets = [
  ...rawSlots.map((s) => `sprites/generated/${s.id}-before`),
  ...laundrySlots.flatMap((s) => [
    `sprites/generated/clothes-${s.id}`,
    `sprites/generated/basket-${s.id}`,
  ]),
];
// Inventory purchases do not remove the original: only installation does.
export function visibleBeforeSlots(s: State) {
  return rawSlots.filter(
    (slot) =>
      !s.activeInstallations.some((id) =>
        id.startsWith(`rev-pack-${slot.id}-`),
      ),
  );
}
export function renderBeforeAfter(scene: Phaser.Scene, s: State, room: RoomId) {
  if (!s.decisionVersion) return;
  const installed = (prefix: string) =>
    s.activeInstallations.some((id) => id.startsWith(prefix));
  for (const [location, prefix, template] of [
    ["home", "rev-light-home-", "rev-light-home-incandescent"],
    ["workshop", "rev-light-workshop-", "rev-light-workshop-incandescent"],
    ["bathroom", "rev-shower-", "rev-shower-classic"],
  ] as const) {
    if (room !== location || installed(prefix)) continue;
    const m = placements[template];
    const asset = m.asset ?? "sprites/generated/bulb-incandescent";
    scene.add
      .image(m.x, m.y, asset)
      .setOrigin(m.anchorX, m.anchorY)
      .setScale(m.scale)
      .setAngle(m.rotation)
      .setDepth(m.zIndex)
      .setData("beforeSlot", m.slotId);
  }
  const place = (
    asset: string,
    x: number,
    y: number,
    width: number,
    key: string,
  ) => {
    scene.add.ellipse(x, y - 3, width * 0.74, 12, 0x30271b, 0.09).setDepth(11);
    const image = scene.add
      .image(x, y, asset)
      .setOrigin(0.5, 0.98)
      .setDepth(12)
      .setData("stateSlot", key);
    image.setScale(width / image.width);
  };
  if (room === "storage")
    for (const slot of visibleBeforeSlots(s))
      place(
        `sprites/generated/${slot.id}-before`,
        slot.x,
        slot.y,
        94,
        `packing_${slot.id}`,
      );
  if (room === "laundry")
    for (const slot of laundrySlots) {
      const sorted = s.sorting?.["laundry-sort"]?.placed.includes(slot.id);
      place(
        `sprites/generated/${sorted ? "basket" : "clothes"}-${slot.id}`,
        slot.x,
        slot.y,
        sorted ? 130 : 116,
        `laundry_${slot.id}`,
      );
      if (sorted) {
        const clothes = scene.add
          .image(slot.x, slot.y - 44, `sprites/generated/clothes-${slot.id}`)
          .setOrigin(0.5, 0.98)
          .setDepth(12.1);
        clothes.setScale(76 / clothes.width);
      }
    }
}

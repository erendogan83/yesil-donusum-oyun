import Phaser from "phaser";
import type { State } from "./model";
// Fixed, independent presentation orders keep answers from lining up while
// preserving the same challenge and stable targets after every click.
export const wasteItemOrder = [
  "organic",
  "metal",
  "paper",
  "tissue",
  "glass",
  "plastic",
];
export const wasteTargetOrder = [
  "glass",
  "other",
  "plastic",
  "paper",
  "organic",
  "metal",
];
const slots = [
  {
    id: "paper",
    target: "paper",
    x: 437,
    y: 379,
    width: 78,
    angle: -9,
    hookX: 430,
    hookY: 646,
  },
  {
    id: "plastic",
    target: "plastic",
    x: 584,
    y: 388,
    width: 39,
    angle: 19,
    hookX: 478,
    hookY: 666,
  },
  {
    id: "glass",
    target: "glass",
    x: 999,
    y: 480,
    width: 49,
    angle: 0,
    hookX: 526,
    hookY: 686,
  },
  {
    id: "metal",
    target: "metal",
    x: 447,
    y: 648,
    width: 38,
    angle: -12,
    hookX: 574,
    hookY: 706,
  },
  {
    id: "organic",
    target: "organic",
    x: 739,
    y: 681,
    width: 77,
    angle: 8,
    hookX: 622,
    hookY: 726,
  },
  {
    id: "tissue",
    target: "other",
    x: 620,
    y: 697,
    width: 54,
    angle: -16,
    hookX: 670,
    hookY: 746,
  },
];
export const kitchenWasteAssets = slots.flatMap((s) => [
  `sprites/generated/waste-${s.id}`,
  `sprites/generated/bag-${s.target}`,
]);
export function renderKitchenWaste(scene: Phaser.Scene, state: State) {
  if (state.decisionVersion !== 1) return;
  const placed = state.sorting?.["waste-sort"]?.placed || [];
  for (const s of slots) {
    if (!placed.includes(s.id)) {
      scene.add
        .ellipse(s.x, s.y - 2, s.width * 0.75, 7, 0x30281e, 0.12)
        .setDepth(15);
      const img = scene.add
        .image(s.x, s.y, `sprites/generated/waste-${s.id}`)
        .setOrigin(0.5, 0.96)
        .setAngle(s.angle)
        .setDepth(16)
        .setData("wasteItem", s.id);
      img.setScale(s.width / img.width);
    } else {
      // Each handle is secured to a small hook on the table apron. The row
      // follows the table's perspective instead of floating in screen space.
      scene.add.circle(s.hookX, s.hookY, 2.5, 0x62523c).setDepth(17);
      const img = scene.add
        .image(s.hookX, s.hookY + 2, `sprites/generated/bag-${s.target}`)
        .setOrigin(0.5, 0.04)
        .setDepth(18)
        .setData("wasteBag", s.target);
      img.setScale(48 / img.width);
    }
  }
}

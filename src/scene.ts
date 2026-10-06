import { beforeAfterAssets, renderBeforeAfter } from "./before-after";
import { kitchenWasteAssets, renderKitchenWaste } from "./kitchen-waste";
import { activeOpportunity } from "./navigation";
import { opportunities, zoneFor } from "./decisions";
import { offeredProduct } from "./navigation";
import { signedMoney } from "./economy";
import Phaser from "phaser";
import { placements, problemSources, shelfSlots } from "./placements";
import { renderPlaced, renderShelf, closeup } from "./physical";
import type { Tone } from "./learning";
import {
  rooms,
  products,
  roomById,
  productById,
  type Category,
  type RoomId,
} from "./data";
import { zoneResolved, type State } from "./model";
export const W = 1536,
  H = 960;
export const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export type View =
  | "start"
  | "registration"
  | "map"
  | "market"
  | "room"
  | "summary"
  | "final"
  | "leaderboard"
  | "admin";
export class World extends Phaser.Scene {
  ready = false;
  onReady = () => {};
  onProduct = (_id: string) => {};
  onZone = (_id: string) => {};
  private displayKey = "";
  preload() {
    const label = this.add
      .text(W / 2, H / 2, "Yerleşke hazırlanıyor…", {
        fontFamily: "Georgia",
        fontSize: "32px",
        color: "#f3e8d0",
      })
      .setOrigin(0.5);
    const bar = this.add.rectangle(W / 2, H / 2 + 55, 0, 4, 0xe4c57e);
    this.load.on("progress", (n: number) => (bar.width = 400 * n));
    this.load.on("loaderror", () => {
      label.setText("Görseller yüklenemedi. Sayfayı yenileyin.");
    });
    rooms.forEach((r) => this.load.image(r.asset, `assets/${r.asset}.webp`));
    ["bg_main_overview_base", "bg_market_base"].forEach((k) =>
      this.load.image(k, `assets/${k}.webp`),
    );
    const keys = new Set(
      products.flatMap((p) => [
        p.asset,
        ...(p.installedAsset ? [p.installedAsset] : []),
      ]),
    );
    [
      "sprites/generated/bag-other",
      "sheet-03-1",
      "sheet-04-6",
      "sheet-08-4",
      "sheet-05-2",
      "sheet-05-3",
      "sheet-02-1",
      "sheet-03-2",
      "sheet-04-4",
      "sheet-04-3",
    ].forEach((k) => keys.add(k));
    beforeAfterAssets.forEach((k) => keys.add(k));
    kitchenWasteAssets.forEach((k) => keys.add(k));
    Object.values(placements).forEach((p) => {
      if (p.asset) keys.add(p.asset);
    });
    keys.forEach((k) => this.load.image(k, `assets/${k}.webp`));
  }
  create() {
    const dot = this.make.graphics({ x: 0, y: 0 });
    dot.fillStyle(0xffffff);
    dot.fillCircle(5, 5, 5);
    dot.generateTexture("dot", 10, 10);
    dot.destroy();
    this.ready = true;
    this.onReady();
  }
  show(
    view: View,
    state: State | null,
    category: Category = "Su",
    page = 0,
    force = false,
    ids?: string[],
  ) {
    if (!this.ready) return;
    const key = [
      view,
      state?.room,
      state?.round,
      state?.activeInstallations.join(","),
      state?.actions.join(","),
      state?.sorting?.["waste-sort"]?.placed.join(","),
      state?.sorting?.["laundry-sort"]?.placed.join(","),
      state && state.room !== "map" && state.room !== "market"
        ? activeOpportunity(state, state.room)?.id
        : "",
      category,
      page,
      ids?.join(","),
    ].join("|");
    if (this.displayKey === key && !force) return;
    this.displayKey = key;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    let bg = "bg_main_overview_base";
    if (
      view === "room" &&
      state &&
      state.room !== "map" &&
      state.room !== "market"
    )
      bg = roomById(state.room).asset;
    if (view === "market") bg = "bg_market_base";
    this.add.image(W / 2, H / 2, bg).setDisplaySize(1536, 1024);
    if (
      [
        "start",
        "registration",
        "final",
        "leaderboard",
        "admin",
        "summary",
      ].includes(view)
    )
      this.add.rectangle(
        W / 2,
        H / 2,
        W,
        H,
        0x1d281d,
        view === "start" ? 0.26 : 0.65,
      );
    if (view === "map") {
      rooms
        .filter((r) => r.id !== "waste")
        .forEach((r) => {
          if (state && r.round <= state.round) {
            const ring = this.add.ellipse(
              (r.map[0] * W) / 100,
              (r.map[1] * H) / 100 + 18,
              48,
              17,
              0xf0d48e,
              0.45,
            );
            if (!reduced())
              this.tweens.add({
                targets: ring,
                alpha: 0.1,
                scale: 1.3,
                yoyo: true,
                repeat: -1,
                duration: 1600,
              });
          }
        });
    }
    if (view === "start" && !reduced())
      this.add.particles(0, 0, "dot", {
        x: { min: 0, max: W },
        y: { min: 0, max: H },
        quantity: 1,
        frequency: 650,
        lifespan: 5000,
        speedY: -20,
        speedX: 10,
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.35, end: 0 },
        tint: 0xffe6a3,
      });
    if (view === "room" && state) {
      this.room(state);
    }
    if (view === "market" && state) {
      renderShelf(
        this,
        this.stock(category, state.round, page, ids),
        category,
        state,
      );
    }

    if (!reduced()) this.cameras.main.fadeIn(250, 40, 33, 23);
  }
  stock(category: Category, round: number, page: number, ids?: string[]) {
    return products
      .filter(
        (p) =>
          offeredProduct(p) &&
          (ids ? ids.includes(p.id) : p.category === category) &&
          roomById(p.room).round <= round,
      )
      .slice(page * 6, page * 6 + 6);
  }
  private room(s: State) {
    const r = roomById(s.room as RoomId);
    const active = activeOpportunity(s, r.id);
    if (s.decisionVersion === 1 && r.id === "bathroom")
      this.add
        .image(800, 655, "sprites/generated/bag-other")
        .setOrigin(0.5, 0.98)
        .setScale(0.14)
        .setDepth(12);
    // A problem keeps showing until a choice actually fixes it: a wrong or
    // neutral choice must not make the leak, glow or flow disappear.
    const decided = (zone: string) =>
      s.decisionVersion === 1 &&
      opportunities.some(
        (o) =>
          zoneFor(o) === zone &&
          s.decisions?.some((d) => d.opportunityId === o.id),
      );
    for (const z of r.zones.filter(
      (z) => z.id === active?.id || decided(z.id),
    )) {
      if (
        s.decisionVersion === 1 &&
        ![
          "rev-tap",
          "rev-shower",
          "rev-light-home",
          "rev-light-workshop",
        ].includes(z.id)
      )
        continue;
      const resolved =
        z.id === "tap"
          ? s.installed.includes("repair")
          : zoneResolved(s, r.id, z.id);
      const [x, y] = problemSources[r.id]?.[z.id] ?? [
        (z.x * W) / 100,
        (z.y * H) / 100,
      ];
      if (!resolved) {
        if (z.effect === "water" || z.effect === "dry") {
          if (reduced()) this.add.ellipse(x, y + 20, 16, 25, 0x74ccdf, 0.85);
          else
            this.add.particles(x, y, "dot", {
              frequency: z.effect === "water" ? 240 : 160,
              x: { min: -4, max: 4 },
              speedY: { min: 45, max: 95 },
              speedX: { min: -8, max: 8 },
              gravityY: 110,
              lifespan: 720,
              scaleX: { start: 0.5, end: 0.25 },
              scaleY: { start: 1.15, end: 0.6 },
              alpha: { start: 0.9, end: 0 },
              tint: 0x91dfed,
            });
        } else if (z.effect === "energy") {
          const glow = this.add.circle(x, y, 35, 0xffd571, 0.28);
          if (!reduced())
            this.tweens.add({
              targets: glow,
              alpha: 0.05,
              scale: 1.55,
              duration: 1100,
              yoyo: true,
              repeat: -1,
            });
        } else if (z.effect === "air") {
          for (let i = 0; i < 3; i++) {
            const gust = this.add
              .ellipse(x - 65 + i * 50, y, 8, 48, 0xc3e0df, 0.35)
              .setAngle(40);
            if (!reduced())
              this.tweens.add({
                targets: gust,
                x: gust.x + 45,
                y: y + 45,
                alpha: 0,
                duration: 1800,
                delay: i * 350,
                repeat: -1,
              });
          }
        } else {
          (r.id === "waste" ? ["sheet-04-1", "sheet-04-3"] : ["sheet-04-3"])
            .filter(
              (k) =>
                this.textures.exists(k) &&
                !s.activeInstallations.some(
                  (id) => productById(id).asset === k,
                ),
            )
            .forEach((k, i) => {
              const clutter = this.add.image(x + (i - 1) * 33, y + 25, k);
              clutter.setScale(85 / clutter.width).setAngle(i * 13 - 10);
            });
        }
      }
    }
    renderBeforeAfter(this, s, r.id);
    renderPlaced(this, s, r.id);
    if (r.id === "kitchen") renderKitchenWaste(this, s);
  }
  zoomProduct(id: string) {
    closeup(this, id);
  }
  highlight(room: RoomId, zone: string) {
    const z = roomById(room).zones.find((z) => z.id === zone)!;
    const ring = this.add
      .ellipse((z.x * W) / 100, (z.y * H) / 100, (z.width * W) / 100 + 50, 80)
      .setStrokeStyle(4, 0xffdfa0, 0.95)
      .setDepth(10);
    if (!reduced())
      this.tweens.add({
        targets: ring,
        alpha: 0.3,
        scale: 1.08,
        yoyo: true,
        repeat: 3,
        duration: 400,
        onComplete: () => ring.destroy(),
      });
    else this.time.delayedCall(3000, () => ring.destroy());
  }
  effect(
    delta: number,
    room?: RoomId,
    zone?: string,
    productId?: string,
    tone: Tone = delta < 0 ? "good" : delta > 0 ? "bad" : "neutral",
  ) {
    const z =
      room && zone ? roomById(room).zones.find((z) => z.id === zone) : null;
    const spot = productId ? placements[productId] : null;
    const x = spot?.x ?? (z ? (z.x * W) / 100 : W * 0.52),
      y = Math.max(145, spot?.y ?? (z ? (z.y * H) / 100 : H * 0.46));
    const label = this.add
      .text(x, y, delta === 0 ? "Kuruldu" : signedMoney(delta), {
        fontFamily: "Georgia",
        fontStyle: "bold",
        fontSize: "48px",
        color:
          tone === "bad"
            ? "#ffd5b7"
            : tone === "neutral"
              ? "#c6e1e1"
              : "#fff1ae",
        stroke: "#34412c",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(40);
    if (!reduced()) {
      const placed = this.children.list.find(
        (child) => child.getData("productId") === productId,
      ) as Phaser.GameObjects.Image | undefined;
      if (placed && productId && !placements[productId]?.plane) {
        const scaleX = placed.scaleX,
          scaleY = placed.scaleY;
        const endY = placed.y;
        placed.setScale(scaleX * 0.94, scaleY * 0.94).setY(endY - 7);
        this.tweens.add({
          targets: placed,
          scaleX,
          scaleY,
          y: endY,
          duration: 440,
          ease: "Back.Out",
        });
      }
      this.tweens.add({
        targets: label,
        y: y - 100,
        alpha: 0,
        duration: 2600,
        ease: "Cubic.Out",
        onComplete: () => label.destroy(),
      });
      if (productId === "rev-led-strip") {
        const warm = this.add
          .ellipse(1100, 342, 116, 25, 0xffd69a, 0.23)
          .setAngle(14)
          .setDepth(15);
        this.tweens.add({
          targets: warm,
          alpha: 0,
          duration: 500,
          onComplete: () => warm.destroy(),
        });
        return;
      }
      if (tone === "bad") this.cameras.main.shake(150, 0.002);
      if (tone === "neutral") {
        const pulse = this.add
          .circle(x, y, 28)
          .setStrokeStyle(2, 0xb0d3d6, 0.8)
          .setDepth(35);
        this.tweens.add({
          targets: pulse,
          scale: 1.8,
          alpha: 0,
          duration: 1100,
          onComplete: () => pulse.destroy(),
        });
        return;
      }
      const spark = this.add
        .particles(x, y, "dot", {
          emitting: false,
          speed: { min: 35, max: 130 },
          lifespan: 900,
          scale: { start: 0.7, end: 0 },
          tint: tone === "bad" ? [0xda9165] : [0xe6d391, 0xc4dd9b],
          alpha: { start: 0.8, end: 0 },
        })
        .setDepth(30);
      spark.explode(tone === "bad" ? 7 : 15);
      this.time.delayedCall(1100, () => spark.destroy());
    } else this.time.delayedCall(2000, () => label.destroy());
  }
}

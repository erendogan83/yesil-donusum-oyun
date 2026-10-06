import Phaser from "phaser";
import {
  placements,
  shelfSlots,
  shelfTransform,
  type Placement,
  type Point,
} from "./placements";
import {
  productById,
  roomById,
  type Product,
  type RoomId,
  type Category,
} from "./data";
import type { State } from "./model";

function triangle(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  s: Point[],
  d: Point[],
) {
  const ux = s[1][0] - s[0][0],
    uy = s[1][1] - s[0][1],
    vx = s[2][0] - s[0][0],
    vy = s[2][1] - s[0][1],
    den = ux * vy - vx * uy;
  const dx = d[1][0] - d[0][0],
    dy = d[1][1] - d[0][1],
    ex = d[2][0] - d[0][0],
    ey = d[2][1] - d[0][1];
  const a = (dx * vy - ex * uy) / den,
    c = (ux * ex - vx * dx) / den,
    b = (dy * vy - ey * uy) / den,
    f = (ux * ey - vx * dy) / den;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(...d[0]);
  ctx.lineTo(...d[1]);
  ctx.lineTo(...d[2]);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(
    a,
    b,
    c,
    f,
    d[0][0] - a * s[0][0] - c * s[0][1],
    d[0][1] - b * s[0][0] - f * s[0][1],
  );
  ctx.drawImage(source, 0, 0);
  ctx.restore();
}
export function placedTexture(scene: Phaser.Scene, p: Product, m: Placement) {
  const source = m.asset ?? p.installedAsset ?? p.asset;
  if (!m.crop && !m.plane) return source;
  const key = `placed-${p.id}`;
  if (scene.textures.exists(key)) return key;
  const original = scene.textures
    .get(source)
    .getSourceImage() as HTMLImageElement;
  if (m.crop) {
    const [x, y, w, h] = m.crop,
      t = scene.textures.createCanvas(key, w, h)!;
    t.context.drawImage(original, x, y, w, h, 0, 0, w, h);
    if (p.id === "shower-b") t.context.clearRect(0, 0, 180, 32);
    t.refresh();
  } else if (m.plane) {
    const t = scene.textures.createCanvas(key, 1536, 960)!,
      q = m.plane;
    triangle(
      t.context,
      original,
      [q.source[0], q.source[1], q.source[2]],
      [q.target[0], q.target[1], q.target[2]],
    );
    triangle(
      t.context,
      original,
      [q.source[0], q.source[2], q.source[3]],
      [q.target[0], q.target[2], q.target[3]],
    );
    t.refresh();
  }
  return key;
}
function polyline(
  scene: Phaser.Scene,
  points: Point[],
  width: number,
  color: number,
  depth: number,
  alpha = 1,
) {
  const g = scene.add.graphics().setDepth(depth);
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(...points[0]);
  points.slice(1).forEach((p) => g.lineTo(...p));
  g.strokePath();
  return g;
}
function irrigation(scene: Phaser.Scene, m: Placement) {
  // Narrow tubing follows the visible soil corridors between rows; it never
  // traverses the paved paths as a rectangular kit sticker.
  const rows: Point[][] = [
    [
      [707, 509],
      [1010, 397],
    ],
    [
      [768, 549],
      [1074, 437],
    ],
    [
      [822, 587],
      [1129, 474],
    ],
    [
      [913, 626],
      [1228, 510],
    ],
    [
      [980, 661],
      [1293, 546],
    ],
    [
      [1045, 695],
      [1351, 583],
    ],
  ];
  const headers: Point[][] = [
    [
      [697, 503],
      [818, 589],
    ],
    [
      [901, 620],
      [1045, 703],
    ],
    [
      [736, 253],
      [786, 278],
      [1003, 365],
      [1192, 459],
      [1375, 553],
    ],
    [
      [1192, 459],
      [1165, 480],
      [1129, 474],
    ],
  ];
  if (m.slotId === "garden_drip_rows")
    headers[2].splice(0, 1, [672, 187], [674, 260]);
  [...headers, ...rows].forEach((points) => {
    polyline(scene, points, 4, 0x332f22, m.zIndex, 0.8);
    polyline(
      scene,
      points.map(([x, y]) => [x, y - 0.8]),
      1.1,
      0x74766a,
      m.zIndex + 0.1,
      0.65,
    );
  });
  rows.forEach(([a, b]) => {
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      scene.add
        .circle(
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          2.4,
          0x29352a,
        )
        .setDepth(m.zIndex + 0.2);
    }
  });
}
export function renderPlaced(scene: Phaser.Scene, s: State, room: RoomId) {
  const current = s.activeInstallations.filter(
    (id) => placements[id].sceneId === room,
  );
  for (const id of current) {
    const p = productById(id),
      m = placements[id];
    if (
      m.replaceExisting &&
      current.some(
        (other) =>
          other !== id &&
          placements[other].slotId === m.slotId &&
          current.indexOf(other) > current.indexOf(id),
      )
    )
      continue;
    if (m.render === "maintenance") continue;
    if (m.render === "irrigation") {
      irrigation(scene, m);
      const foliage = "garden-foliage";
      if (!scene.textures.exists(foliage)) {
        const t = scene.textures.createCanvas(foliage, 1536, 1024)!;
        t.context.drawImage(
          scene.textures
            .get(roomById(room).asset)
            .getSourceImage() as CanvasImageSource,
          0,
          0,
        );
        const pixels = t.context.getImageData(0, 0, 1536, 1024);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const r = pixels.data[i],
            g = pixels.data[i + 1],
            b = pixels.data[i + 2];
          if (!(g > r * 1.025 && g > b * 1.16)) pixels.data[i + 3] = 0;
        }
        t.context.putImageData(pixels, 0, 0);
        t.refresh();
      }
      scene.add.image(768, 480, foliage).setDepth(m.zIndex + 0.5);
      continue;
    }
    if (m.render === "seal") {
      polyline(
        scene,
        [
          [491, 74],
          [492, 285],
          [761, 321],
        ],
        2,
        0xa99871,
        m.zIndex,
        0.65,
      );
      continue;
    }
    if (m.shadow) {
      const sh = m.shadow;
      scene.add
        .ellipse(sh.x, sh.y, sh.width, sh.height, 0x242414, sh.alpha)
        .setAngle(sh.rotation ?? 0)
        .setDepth(m.zIndex - 0.2);
    }
    if (m.cable) {
      polyline(
        scene,
        m.cable,
        3,
        m.sceneId === "garden" ? 0x777266 : 0x443e32,
        m.zIndex - 0.1,
      );
      polyline(
        scene,
        m.cable.map(([x, y]) => [x - 1, y]),
        0.8,
        0xcac5b2,
        m.zIndex,
      );
    }
    if (m.plane) {
      const shadow = scene.add.graphics().setDepth(m.zIndex - 0.2);
      shadow.fillStyle(0x171f18, 0.25);
      shadow.fillPoints(
        m.plane.target.map(([x, y]) => new Phaser.Geom.Point(x + 4, y + 7)),
        true,
      );
    }
    const key = placedTexture(scene, p, m);
    const img = scene.add
      .image(m.plane ? 0 : m.x, m.plane ? 0 : m.y, key)
      .setOrigin(m.anchorX, m.anchorY)
      .setScale(m.scale, m.scaleY ?? m.scale)
      .setAngle(m.rotation)
      .setDepth(m.zIndex)
      .setData("productId", id);
    if (id === "rev-basin-place") {
      const water = scene.add
        .ellipse(1105, 596, 150, 57, 0x8fcbd0, 0.55)
        .setDepth(m.zIndex + 0.1)
        .setScale(0.25);
      scene.tweens.add({
        targets: water,
        scaleX: 1,
        scaleY: 1,
        duration: 1600,
        ease: "Sine.Out",
      });
    }
    if (m.flipX) img.setFlipX(true);
    if (m.mask) {
      const shape = scene.add.graphics().setVisible(false);
      shape.fillStyle(0xffffff);
      shape.fillPoints(
        m.mask.map(([x, y]) => new Phaser.Geom.Point(x, y)),
        true,
      );
      img.setMask(shape.createGeometryMask());
    }
    for (const polygon of m.occluders ?? []) {
      const shape = scene.add.graphics().setVisible(false);
      shape.fillStyle(0xffffff);
      shape.fillPoints(
        polygon.map(([x, y]) => new Phaser.Geom.Point(x, y)),
        true,
      );
      scene.add
        .image(768, 480, roomById(room).asset)
        .setMask(shape.createGeometryMask())
        .setDepth(m.zIndex + 0.2);
    }
  }
}
export function renderShelf(
  scene: Phaser.Scene,
  products: Product[],
  category: Category,
  s: State,
) {
  const slots = shelfSlots(category);
  for (const [i, p] of products.entries()) {
    const slot = slots[i],
      frame = scene.textures.get(p.asset).getSourceImage(),
      t = shelfTransform(p, slot, frame.width, frame.height);
    scene.add
      .ellipse(t.x, t.y - 1, t.width * 0.76, 5, 0x241c10, slot.shadowAlpha)
      .setDepth(slot.zIndex - 0.1);
    scene.add
      .image(t.x, t.y, p.asset)
      .setOrigin(0.5, 0.975)
      .setScale(t.scale)
      .setDepth(slot.zIndex)
      .setAlpha(
        s.installed.includes(p.id) || s.inventory.includes(p.id) ? 0.7 : 1,
      );
  }
}
export function closeup(scene: Phaser.Scene, id: string) {
  if (id !== "tap-a" && id !== "rev-tap-aerator") return;
  const p = productById(id),
    m = placements[id];
  if (!m) return;
  const key = "zoom-" + id;
  if (!scene.textures.exists(key)) {
    const t = scene.textures.createCanvas(key, 220, 220)!,
      ctx = t.context,
      zoom = 4.2;
    ctx.drawImage(
      scene.textures
        .get(roomById(p.room).asset)
        .getSourceImage() as CanvasImageSource,
      m.x - 110 / zoom,
      m.y + 32 - 110 / zoom,
      220 / zoom,
      220 / zoom,
      0,
      0,
      220,
      220,
    );
    const source = scene.textures
      .get(placedTexture(scene, p, m))
      .getSourceImage() as HTMLImageElement;
    ctx.save();
    ctx.translate(110, 110);
    ctx.rotate((m.rotation * Math.PI) / 180);
    ctx.scale(m.scale * zoom, m.scale * zoom);
    ctx.drawImage(
      source,
      -source.width * m.anchorX,
      -source.height * m.anchorY,
    );
    ctx.restore();
    t.refresh();
  }
  const x = 1170,
    y = 260,
    shape = scene.add.graphics().setVisible(false);
  shape.fillStyle(0xffffff);
  shape.fillCircle(x, y, 104);
  const ring = scene.add
    .circle(x, y, 109, 0x283a2c, 0.92)
    .setStrokeStyle(3, 0xe4c57e)
    .setDepth(45);
  const img = scene.add
    .image(x, y, key)
    .setMask(shape.createGeometryMask())
    .setDepth(46);
  const label = scene.add
    .text(x, y + 122, "Musluk ucu · yakın plan", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#f3e8d0",
      backgroundColor: "#2c3c2c",
      padding: { x: 12, y: 6 },
    })
    .setOrigin(0.5)
    .setDepth(46);
  const line = polyline(
    scene,
    [
      [m.x + 12, m.y],
      [1005, 330],
      [1063, y + 35],
    ],
    1,
    0xe4c57e,
    44,
    0.65,
  );
  scene.time.delayedCall(4000, () => {
    [shape, ring, img, label, line].forEach((o) => o.destroy());
  });
}

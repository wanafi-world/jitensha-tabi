// 自転車・人・背景のドット絵描画（キャンバス 320×180）
import { itemById } from "./data.js";
import { shade } from "./pixel.js";

const GHOST = "#8d8a80";
const SKIN = "#f3c9a0";
const SKIN_D = "#d9a273";
const SKIN_DD = "#b97f55";
const OUTLINE = "#2b1d14";

export const GROUND = 170;
export const RIDER_X = 278;
export const BIKE_OX_ALONE = 26; // 自転車だけのとき中央に寄せる
export const BIKE_OX_RIDER = -6; // 人と並ぶとき

// 太いフレーム（カーボンや極太アルミ）とラグ付きのクロモリ
const FAT = new Set(["tarmac", "domane", "caad13"]);
const LUGGED = new Set(["surly-lht"]);

// 自転車の骨格。実車の寸法比（ホイール径 680mm ≒ 76px）から決めている。
export function geometry(ox = 0, oy = 0) {
  const P = (x, y) => ({ x: x + ox, y: y + oy });
  return {
    R: P(92, 132), F: P(202, 132), BB: P(137, 140),
    ST: P(119, 83), HT: P(184, 77), HB: P(189, 93),
    SP: P(115, 69), STEM: P(197, 70), wheelR: 38,
  };
}

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const add = (a, x, y) => ({ x: a.x + x, y: a.y + y });

// ---------- 自転車 ----------

function drawWheel(p, c, wheels, tires, spin) {
  const R = 38;
  const tw = tires ? tires.width + 1 : 3;
  if (tires) {
    p.ring(c.x, c.y, R, tires.tireColor, tw, { shaded: true, light: 0.12, tread: tires.id === "gravelking" ? 1.5 : 3 });
    if (tires.wall) p.ring(c.x, c.y, R - tw + 2, tires.wall, 2, { shaded: true });
    // ロゴ
    for (let i = 0; i < 3; i++) {
      const a = -2.2 + i * 0.06;
      p.px(c.x + Math.cos(a) * (R - 1), c.y + Math.sin(a) * (R - 1), "#d9d9d9");
    }
  } else {
    p.ring(c.x, c.y, R, GHOST, 1, { dashed: true });
  }

  const inner = R - tw;
  if (wheels) {
    const rimT = wheels.rim + 1;
    p.ring(c.x, c.y, inner, wheels.rimColor, rimT, { shaded: true, light: wheels.rim >= 4 ? 0.12 : 0.35 });
    if (wheels.rim >= 4) {
      // ディープリムのロゴ
      for (let a = 0.3; a < 1.2; a += 0.05) p.px(c.x + Math.cos(a) * (inner - 2), c.y + Math.sin(a) * (inner - 2), "#e8e8e8");
      for (let a = 3.4; a < 4.3; a += 0.05) p.px(c.x + Math.cos(a) * (inner - 2), c.y + Math.sin(a) * (inner - 2), "#e8e8e8");
    } else {
      p.ring(c.x, c.y, inner - rimT + 1, shade(wheels.rimColor, 0.5), 1); // ブレーキ面
    }
    // スポーク（左右が交差して見える組み方）
    const spokeEnd = inner - rimT;
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * Math.PI * 2;
      const twist = i % 2 ? 0.28 : -0.28;
      const col = i % 2 ? "#c9c9c9" : "#9a9a9a";
      p.line(c.x + Math.cos(a) * 3, c.y + Math.sin(a) * 3,
        c.x + Math.cos(a + twist) * spokeEnd, c.y + Math.sin(a + twist) * spokeEnd, col);
    }
    // バルブ
    const va = spin - 0.12;
    p.rect(c.x + Math.cos(va) * (inner - rimT - 2) - 1, c.y + Math.sin(va) * (inner - rimT - 2) - 1, 2, 2, "#c0c0c0");
    // ハブ
    p.disc(c.x, c.y, 4, "#8a8a8a", true);
    p.disc(c.x, c.y, 1, "#3a3a3a");
  } else {
    p.ring(c.x, c.y, inner - 1, GHOST, 1, { dashed: true });
    p.ring(c.x, c.y, 3, GHOST, 1);
  }
}

function drawChainring(p, bb, metal, crank, isRoad) {
  const r = 12;
  // 歯
  for (let i = 0; i < 36; i++) {
    const a = crank + (i / 36) * Math.PI * 2;
    p.px(bb.x + Math.cos(a) * (r + 1), bb.y + Math.sin(a) * (r + 1), shade(metal, -0.3));
  }
  p.ring(bb.x, bb.y, r, metal, 3, { shaded: true });
  if (isRoad) p.ring(bb.x, bb.y, r - 4, shade(metal, -0.15), 2, { shaded: true }); // インナー
  // スパイダー
  for (let i = 0; i < 4; i++) {
    const a = crank + Math.PI / 4 + (i / 4) * Math.PI * 2;
    p.line(bb.x, bb.y, bb.x + Math.cos(a) * (r - 2), bb.y + Math.sin(a) * (r - 2), shade(metal, -0.1), 2);
  }
}

function drawSaddle(p, s, saddle) {
  const c = saddle.saddleColor;
  const hi = shade(c, 0.35), lo = shade(c, -0.4);
  // 横から見たサドル：後ろが厚く、先が細い
  p.rect(s.x - 12, s.y - 4, 10, 3, c);
  p.rect(s.x - 2, s.y - 3, 10, 2, c);
  p.rect(s.x + 8, s.y - 2, 3, 1, c);
  p.rect(s.x - 12, s.y - 4, 14, 1, hi);
  p.rect(s.x - 13, s.y - 3, 1, 2, c);
  p.rect(s.x - 12, s.y - 1, 9, 1, lo);
  // レール
  p.line(s.x - 9, s.y, s.x + 7, s.y - 1, "#a0a0a0");
  if (saddle.id === "brooks") {
    for (const x of [-11, -8, -5]) p.px(s.x + x, s.y - 3, "#e6c58f"); // 鋲
    p.ring(s.x - 9, s.y + 2, 2, "#8a8a8a", 1); // スプリング
  }
  if (saddle.id === "antares") p.rect(s.x - 10, s.y - 3, 6, 1, "#1d1d1d"); // ロゴ
  p.rect(s.x - 1, s.y - 1, 3, 3, "#5a5a5a"); // クランプ
}

function drawBar(p, h, bar, group) {
  const c = bar.tape;
  const stripes = [c, shade(c, -0.25)];
  const metal = group ? group.metal : "#6a6a6a";
  if (bar.shape === "drop") {
    const pts = [h, add(h, 5, -1), add(h, 9, 1), add(h, 11, 5), add(h, 11, 10), add(h, 8, 14), add(h, 3, 15)];
    for (let i = 0; i < pts.length - 1; i++) p.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, c, 3, false, i ? stripes : null);
    // STIレバー（ブラケットとレバー）
    p.rect(h.x + 6, h.y - 5, 4, 5, metal);
    p.rect(h.x + 6, h.y - 5, 4, 1, shade(metal, 0.4));
    p.rect(h.x + 9, h.y - 6, 2, 2, shade(metal, -0.2));
    p.line(h.x + 10, h.y, h.x + 13, h.y + 9, shade(metal, 0.1), 2);
    p.px(h.x + 3, h.y + 16, "#1d1d1d"); // バーエンド
  } else if (bar.shape === "bullhorn") {
    const pts = [h, add(h, 9, 0), add(h, 13, -2), add(h, 15, -6)];
    for (let i = 0; i < pts.length - 1; i++) p.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, c, 3, false, stripes);
    p.line(h.x + 15, h.y - 6, h.x + 16, h.y + 2, "#bdbdbd", 2); // ブレーキレバー
  } else {
    p.line(h.x - 2, h.y + 1, h.x + 3, h.y - 1, "#7a7a7a", 3);
    p.rect(h.x + 1, h.y - 3, 8, 4, c); // グリップ
    p.rect(h.x + 1, h.y - 3, 8, 1, shade(c, 0.3));
    for (let i = 2; i < 8; i += 2) p.px(h.x + 1 + i, h.y - 1, shade(c, -0.3));
    p.line(h.x + 2, h.y - 3, h.x + 10, h.y - 4, "#bdbdbd", 1); // ブレーキレバー
    p.rect(h.x - 1, h.y - 4, 3, 2, metal); // シフター
  }
}

export function drawBike(p, bike, { ox = 0, oy = 0, spin = 0, crank = 0 } = {}) {
  const g = geometry(ox, oy);
  const frame = itemById(bike.frame);
  const wheels = itemById(bike.wheels);
  const tires = itemById(bike.tires);
  const group = itemById(bike.group);
  const bar = itemById(bike.bar);
  const saddle = itemById(bike.saddle);
  const isRoad = bar && bar.shape !== "flat";

  p.shadow((g.R.x + g.F.x) / 2, GROUND + oy, 74, 3, "rgba(60,40,20,0.22)");

  drawWheel(p, g.R, wheels, tires, spin);
  drawWheel(p, g.F, wheels, tires, spin);

  // 奥側のクランク
  if (group) {
    const a = crank + Math.PI;
    const e = { x: g.BB.x + Math.cos(a) * 15, y: g.BB.y + Math.sin(a) * 15 };
    p.line(g.BB.x, g.BB.y, e.x, e.y, shade(group.metal, -0.45), 3);
    p.rect(e.x - 3, e.y - 1, 7, 2, "#1a1a1a");
  }

  // チェーン、スプロケット、リアディレイラー
  if (group) {
    const m = group.metal;
    for (let i = 0; i < 5; i++) p.ring(g.R.x, g.R.y, 8 - i, i % 2 ? shade(m, -0.3) : shade(m, 0.2), 1);
    const chain = ["#5a5a5a", "#8a8a8a"];
    const jockeyTop = add(g.R, 1, 12), jockeyBot = add(g.R, -2, 19);
    p.line(g.BB.x, g.BB.y - 12, g.R.x, g.R.y - 8, null, 1, false, chain);
    p.line(g.BB.x, g.BB.y + 12, jockeyBot.x, jockeyBot.y + 2, null, 1, false, chain);
    p.line(jockeyBot.x, jockeyBot.y, jockeyTop.x, jockeyTop.y, shade(m, -0.2), 3);
    p.disc(jockeyTop.x, jockeyTop.y, 2, shade(m, 0.2));
    p.disc(jockeyBot.x, jockeyBot.y, 2, shade(m, 0.2));
    p.rect(g.R.x - 1, g.R.y + 2, 5, 5, m);
    p.rect(g.R.x - 1, g.R.y + 2, 5, 1, shade(m, 0.4));
  }

  // フレーム
  const fat = frame && FAT.has(frame.id);
  const seatCluster = add(g.ST, 1, 4);
  const tubes = [
    [g.BB, g.ST, fat ? 4 : 3],
    [g.ST, g.HT, fat ? 4 : 3],
    [g.BB, g.HB, fat ? 6 : 4],
    [g.BB, g.R, 3],
    [seatCluster, g.R, 2],
  ];
  // フォーク（少し前に曲がる）
  const fork = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const ctrl = { x: g.HB.x + 3, y: g.HB.y + 30 };
    fork.push({
      x: (1 - t) ** 2 * g.HB.x + 2 * (1 - t) * t * ctrl.x + t * t * g.F.x,
      y: (1 - t) ** 2 * g.HB.y + 2 * (1 - t) * t * ctrl.y + t * t * g.F.y,
    });
  }

  if (frame) {
    const col = frame.color;
    for (const [a, b, t] of tubes) p.tube(a, b, t, col);
    for (let i = 0; i < fork.length - 1; i++) p.tube(fork[i], fork[i + 1], i < 3 ? 4 : 3, col);
    p.tube(g.HT, g.HB, 6, col);
    // ヘッドバッジ
    const badge = lerp(g.HT, g.HB, 0.5);
    p.rect(badge.x - 1, badge.y - 2, 3, 4, frame.accent);
    p.px(badge.x, badge.y - 1, shade(frame.accent, -0.5));
    // ダウンチューブのロゴ：文字っぽい点の並び
    for (let i = 0; i < 9; i++) {
      const q = lerp(g.HB, g.BB, 0.22 + i * 0.045);
      p.rect(q.x - 1, q.y - 1, 2, (i % 3) === 1 ? 1 : 2, frame.accent);
    }
    // トップチューブのライン
    const tt0 = lerp(g.ST, g.HT, 0.55), tt1 = lerp(g.ST, g.HT, 0.8);
    p.line(tt0.x, tt0.y, tt1.x, tt1.y, frame.accent, 1);
    // ラグ
    if (LUGGED.has(frame.id)) {
      for (const j of [g.HT, g.HB, g.ST]) p.disc(j.x, j.y, 3, shade(col, -0.25), true);
    }
    // BB とエンド
    p.disc(g.BB.x, g.BB.y, 4, shade(col, -0.15), true);
    p.disc(g.R.x, g.R.y, 2, shade(col, -0.3));
    // シートポストとクランプ
    p.tube(g.ST, g.SP, 2, "#a8a8a8");
    p.rect(g.ST.x - 2, g.ST.y - 1, 5, 2, "#3a3a3a");
    // ヘッドパーツ、コラムスペーサー、ステム
    p.rect(g.HT.x - 2, g.HT.y - 2, 5, 2, "#2a2a2a");
    p.rect(g.HT.x - 2, g.HT.y - 5, 4, 3, "#3c3c3c");
    p.tube(add(g.HT, -1, -5), g.STEM, 3, "#3a3a3a");
    p.px(g.STEM.x - 1, g.STEM.y - 1, "#9a9a9a");
    // ボトルケージとボトル
    const dt = { x: g.HB.x - g.BB.x, y: g.HB.y - g.BB.y };
    const len = Math.hypot(dt.x, dt.y);
    const n = { x: dt.y / len, y: -dt.x / len }; // 三角の内側
    const b0 = add(lerp(g.BB, g.HB, 0.22), n.x * 6, n.y * 6);
    const b1 = add(lerp(g.BB, g.HB, 0.56), n.x * 6, n.y * 6);
    p.tube(b0, b1, 7, "#e9e3cf");
    p.tube(lerp(b0, b1, 0.1), lerp(b0, b1, 0.85), 1, "#3a6fd8");
    p.rect(b1.x - 1, b1.y - 2, 3, 3, "#2a2a2a");
    p.line(b0.x, b0.y, b1.x - 3, b1.y + 1, "#4a4a4a");
    // ブレーキキャリパー
    if (group) {
      const m = group.metal;
      p.rect(g.HB.x + 1, g.HB.y + 1, 4, 3, m);
      p.line(g.HB.x + 4, g.HB.y + 2, g.HB.x + 6, g.HB.y + 6, m, 2);
      const sb = lerp(seatCluster, g.R, 0.3);
      p.rect(sb.x - 1, sb.y - 1, 4, 3, m);
      // ケーブル
      p.line(g.STEM.x - 2, g.STEM.y + 2, g.HT.x - 6, g.HT.y + 8, "#2a2a2a");
      const c0 = lerp(g.HB, g.BB, 0.1), c1 = lerp(g.HB, g.BB, 0.85);
      p.line(c0.x + 1, c0.y + 2, c1.x + 1, c1.y + 2, shade(col, -0.45));
      // フロントディレイラー
      const fd = lerp(g.BB, g.ST, 0.25);
      p.rect(fd.x - 1, fd.y - 2, 5, 4, m);
      p.rect(fd.x - 1, fd.y - 2, 5, 1, shade(m, 0.4));
    }
  } else {
    for (const [a, b] of tubes) p.line(a.x, a.y, b.x, b.y, GHOST, 1, true);
    for (let i = 0; i < fork.length - 1; i++) p.line(fork[i].x, fork[i].y, fork[i + 1].x, fork[i + 1].y, GHOST, 1, true);
    p.line(g.HT.x, g.HT.y, g.HB.x, g.HB.y, GHOST, 1, true);
  }

  // サドル
  if (saddle) drawSaddle(p, g.SP, saddle);
  else p.line(g.SP.x - 12, g.SP.y - 3, g.SP.x + 10, g.SP.y - 3, GHOST, 1, true);

  // ハンドル
  if (bar) drawBar(p, g.STEM, bar, group);
  else p.line(g.STEM.x, g.STEM.y, g.STEM.x + 11, g.STEM.y + 10, GHOST, 1, true);

  // 手前側のクランク、チェーンリング、ペダル
  if (group) {
    drawChainring(p, g.BB, group.metal, crank, isRoad);
    const e = { x: g.BB.x + Math.cos(crank) * 15, y: g.BB.y + Math.sin(crank) * 15 };
    p.tube(g.BB, e, 3, group.metal === "#9aa0a6" ? "#c7cbcf" : "#2e2e30");
    p.rect(e.x - 4, e.y, 9, 3, "#1d1d1d");
    p.rect(e.x - 4, e.y, 9, 1, "#4a4a4a");
    p.disc(g.BB.x, g.BB.y, 2, "#cfcfcf", true);
    p.px(e.x, e.y - 1, "#cfcfcf");
  } else {
    p.ring(g.BB.x, g.BB.y, 12, GHOST, 1, { dashed: true });
  }
}

// 各パーツの範囲（点滅する枠とタップ判定に使う）
export function slotRegions(id, ox = 0) {
  const g = geometry(ox);
  const box = (c, r) => ({ x: c.x - r, y: c.y - r, w: r * 2 + 1, h: r * 2 + 1 });
  switch (id) {
    case "frame": return [{ x: g.R.x + 4, y: g.HT.y - 8, w: g.HB.x - g.R.x + 6, h: g.BB.y - g.HT.y + 14 }];
    case "wheels": return [box(g.R, 33), box(g.F, 33)];
    case "tires": return [box(g.R, 40), box(g.F, 40)];
    case "group": return [{ x: g.R.x - 10, y: g.BB.y - 20, w: g.BB.x - g.R.x + 30, h: 38 }];
    case "bar": return [{ x: g.STEM.x - 4, y: g.STEM.y - 9, w: 22, h: 28 }];
    case "saddle": return [{ x: g.SP.x - 15, y: g.SP.y - 8, w: 28, h: 12 }];
    default: return [];
  }
}

// タップ位置からどのパーツかを判定する（キャンバス座標）
export function hitPart(x, y, ox = 0) {
  const g = geometry(ox);
  const d = (a) => Math.hypot(x - a.x, y - a.y);
  const inBox = (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  if (inBox(slotRegions("saddle", ox)[0])) return "saddle";
  if (inBox(slotRegions("bar", ox)[0])) return "bar";
  if (d(g.BB) <= 18 || d(g.R) <= 9) return "group";
  for (const c of [g.R, g.F]) {
    const r = d(c);
    if (r >= 32 && r <= 41) return "tires";
    if (r < 32) return "wheels";
  }
  if (inBox(slotRegions("frame", ox)[0])) return "frame";
  return null;
}

// ---------- 人 ----------

// 立ち姿の人（足元の中心が x, y）
export function drawRider(p, outfit, x, y) {
  const helmet = itemById(outfit.helmet);
  const top = itemById(outfit.top);
  const bottom = itemById(outfit.bottom);
  const shoes = itemById(outfit.shoes);

  p.shadow(x, y, 18, 2, "rgba(60,40,20,0.25)");

  // くつ
  const [s0, s1] = shoes ? shoes.colors : [GHOST, GHOST];
  for (const side of [-1, 1]) {
    const sx = side < 0 ? x - 12 : x + 2;
    p.rect(sx, y - 6, 10, 5, s0);
    p.rect(sx + (side < 0 ? -1 : 1), y - 4, 10, 3, s0);
    p.rect(sx, y - 6, 10, 1, shade(s0, 0.4));
    p.rect(sx + (side < 0 ? -1 : 1), y - 1, 10, 1, shoes?.id === "sneaker" ? "#f6f1e4" : "#1a1a1a"); // ソール
    if (shoes?.id === "sneaker") { for (let i = 2; i < 8; i += 2) p.px(sx + i, y - 5, s1); p.rect(sx + (side < 0 ? 0 : 7), y - 4, 3, 2, s1); }
    else { p.rect(sx + 2, y - 5, 6, 1, s1); p.rect(sx + 2, y - 3, 6, 1, s1); }
  }

  // くつした
  p.rect(x - 11, y - 12, 8, 6, "#f2efe6"); p.rect(x + 3, y - 12, 8, 6, "#f2efe6");
  p.rect(x - 11, y - 12, 8, 1, "#d6d1c4"); p.rect(x + 3, y - 12, 8, 1, "#d6d1c4");

  // あし
  const legTop = y - 46;
  for (const lx of [x - 11, x + 3]) {
    p.rect(lx, legTop, 8, 34, SKIN);
    p.rect(lx + 6, legTop, 2, 34, SKIN_D);
    p.rect(lx + 2, legTop + 17, 4, 1, SKIN_D); // ひざ
    p.rect(lx + 1, legTop + 26, 2, 5, shade(SKIN, 0.2)); // すね
  }

  // ボトムス
  const [b0, b1] = bottom ? bottom.colors : [GHOST, GHOST];
  const isHalf = bottom?.id === "shorts";
  const blen = isHalf ? 24 : 18;
  p.rect(x - 12, legTop - 4, 24, blen, b0);
  p.rect(x - 12, legTop - 4, 24, 1, shade(b0, 0.3));
  p.rect(x - 1, legTop + 4, 2, blen - 8, shade(b0, -0.35));
  p.rect(x + 8, legTop - 4, 4, blen, shade(b0, -0.2));
  if (isHalf) {
    p.rect(x - 12, legTop + blen - 6, 10, 2, shade(b0, -0.25)); // すそのまくり
    p.rect(x + 2, legTop + blen - 6, 10, 2, shade(b0, -0.25));
    p.rect(x - 9, legTop + 1, 4, 5, shade(b0, -0.2)); // ポケット
  } else {
    p.rect(x - 12, legTop + blen - 6, 10, 2, b1 !== b0 ? b1 : "#3a3a3a"); // すそのグリッパー
    p.rect(x + 2, legTop + blen - 6, 10, 2, b1 !== b0 ? b1 : "#3a3a3a");
    p.rect(x - 12, legTop + 3, 3, 8, shade(b0, 0.15)); // パッドのふくらみ
  }

  // からだ（トップス）
  const bodyTop = legTop - 34;
  const [t0, t1] = top ? top.colors : [GHOST, GHOST];
  const isTee = top?.id === "tshirt";
  p.rect(x - 13, bodyTop + 2, 26, 32, t0);
  p.rect(x - 12, bodyTop, 24, 2, t0);
  p.rect(x - 13, bodyTop + 2, 26, 1, shade(t0, 0.35));
  p.rect(x + 9, bodyTop + 3, 4, 31, shade(t0, -0.2));
  p.rect(x - 13, bodyTop + 33, 26, 1, shade(t0, -0.3));
  if (isTee) {
    p.rect(x - 5, bodyTop, 10, 3, shade(t0, -0.3)); // 丸首
    p.rect(x - 3, bodyTop, 6, 2, SKIN);
    p.rect(x - 6, bodyTop + 10, 6, 5, shade(t0, 0.2)); // ロゴ
  } else {
    if (t1 !== t0) p.rect(x - 13, bodyTop + 12, 26, 4, t1); // 胸のライン
    if (top?.id === "rapha-jersey") { p.rect(x - 13, bodyTop + 12, 26, 4, t1); p.rect(x - 13, bodyTop + 13, 26, 1, "#ffffff"); }
    if (top?.id === "pearl-jersey") { for (let i = 0; i < 26; i += 4) p.rect(x - 13 + i, bodyTop + 22, 2, 2, t1); }
    p.rect(x - 4, bodyTop - 1, 8, 3, t1 !== t0 ? t1 : shade(t0, -0.3)); // えり
    p.rect(x, bodyTop + 1, 1, 24, shade(t0, 0.5)); // ファスナー
    p.rect(x - 1, bodyTop + 1, 3, 2, "#c0c0c0");
  }

  // うで
  for (const side of [-1, 1]) {
    const ax = side < 0 ? x - 19 : x + 13;
    p.rect(ax, bodyTop + 2, 6, 11, t0);
    p.rect(ax, bodyTop + 12, 6, 2, isTee ? shade(t0, -0.2) : (t1 !== t0 ? t1 : shade(t0, -0.3)));
    p.rect(ax, bodyTop + 14, 6, 14, SKIN);
    p.rect(ax + (side < 0 ? 0 : 4), bodyTop + 14, 2, 14, SKIN_D);
    // 手（ジャージならグローブ）
    p.rect(ax, bodyTop + 28, 6, 6, isTee ? SKIN : "#2a2a2a");
    if (!isTee) p.rect(ax + 1, bodyTop + 32, 4, 2, SKIN);
  }

  // くび
  p.rect(x - 4, bodyTop - 4, 8, 4, SKIN_D);

  // あたま
  const hy = bodyTop - 26; // 頭の上端
  p.rect(x - 11, hy + 2, 22, 20, SKIN);
  p.rect(x - 10, hy + 1, 20, 22, SKIN);
  p.rect(x + 8, hy + 4, 2, 17, SKIN_D);
  p.rect(x - 9, hy + 22, 18, 1, SKIN_D);
  // みみ
  p.rect(x - 13, hy + 10, 2, 6, SKIN_D); p.rect(x + 11, hy + 10, 2, 6, SKIN_DD);
  // かみ
  const hair = "#3b2a20";
  p.rect(x - 11, hy + 1, 22, 6, hair);
  p.rect(x - 12, hy + 4, 3, 8, hair);
  p.rect(x + 9, hy + 4, 3, 8, hair);
  p.rect(x - 6, hy + 6, 5, 2, hair);
  p.rect(x + 2, hy + 6, 4, 1, hair);
  // かお
  p.rect(x - 7, hy + 10, 4, 1, hair); p.rect(x + 3, hy + 10, 4, 1, hair); // まゆ
  for (const ex of [x - 6, x + 3]) {
    p.rect(ex, hy + 12, 3, 4, OUTLINE);
    p.px(ex, hy + 12, "#ffffff");
  }
  p.rect(x - 9, hy + 17, 3, 2, "#f2a08a"); p.rect(x + 6, hy + 17, 3, 2, "#f2a08a"); // ほっぺ
  p.px(x, hy + 16, SKIN_DD);
  p.rect(x - 2, hy + 19, 4, 1, "#a4553f"); // くち

  // ヘルメット
  if (helmet) {
    const [h0, h1] = helmet.colors;
    const rows = [[-7, 7], [-10, 10], [-12, 12], [-13, 13], [-13, 13], [-14, 14], [-14, 14], [-14, 14], [-14, 14]];
    rows.forEach(([a, b], i) => p.rect(x + a, hy - 6 + i, b - a, 1, h0));
    p.rect(x - 9, hy - 5, 10, 1, shade(h0, 0.5));
    p.rect(x - 14, hy + 2, 28, 1, shade(h0, -0.35));
    // ベンチレーション
    for (const vx of [-9, -3, 3, 9]) p.rect(x + vx - 1, hy - 3, 2, 4, OUTLINE);
    p.rect(x - 13, hy, 26, 1, h1);
    if (helmet.id === "giro") p.rect(x - 14, hy + 2, 6, 2, "#1f1f1f"); // バイザー
    if (helmet.id === "kask") { p.rect(x - 6, hy - 4, 12, 1, h1); p.rect(x - 11, hy + 6, 22, 3, "#222"); p.rect(x - 9, hy + 7, 6, 1, "#6fc3e8"); p.rect(x + 3, hy + 7, 6, 1, "#6fc3e8"); } // サングラス
    // あごひも
    p.line(x - 12, hy + 3, x - 8, hy + 21, "#2a2a2a");
    p.line(x + 12, hy + 3, x + 8, hy + 21, "#2a2a2a");
    p.rect(x - 8, hy + 21, 16, 1, "#2a2a2a");
  }
}

// ---------- 背景 ----------

const WALL = "#eadcbf";

function drawWrench(p, x, y, len, c) {
  p.rect(x, y + 3, 2, len, c);
  p.rect(x, y + 3, 1, len, shade(c, 0.4));
  p.rect(x - 2, y, 6, 4, c);
  p.rect(x, y, 2, 2, "#c9a978");
}

export function drawWorkshop(p, t) {
  const W = p.w;
  // 壁（板張り）
  p.clear(WALL);
  for (let x = 0; x < W; x += 20) {
    p.rect(x, 0, 1, 140, "#d6c39e");
    p.rect(x + 1, 0, 1, 140, "#f4e9d2");
    // 木目
    for (let y = (x * 7) % 23; y < 140; y += 23) p.rect(x + 6, y, 1, 5, "#ddcca9");
  }
  // 腰板
  p.rect(0, 118, W, 22, "#c9a978");
  p.rect(0, 118, W, 2, "#a8854f");
  for (let x = 10; x < W; x += 30) p.rect(x, 120, 1, 20, "#b8965f");

  // 有孔ボードと工具
  p.rect(8, 10, 92, 46, "#7a5a36");
  p.rect(10, 12, 88, 42, "#c9a978");
  for (let y = 15; y < 52; y += 5) for (let x = 13; x < 96; x += 5) p.px(x, y, "#8a6a42");
  drawWrench(p, 16, 16, 22, "#9aa0a6");
  drawWrench(p, 23, 16, 18, "#9aa0a6");
  drawWrench(p, 30, 16, 14, "#9aa0a6");
  p.rect(39, 16, 3, 20, "#c8282e"); p.rect(37, 34, 7, 6, "#c8282e"); p.rect(38, 15, 5, 2, "#8a8a8a"); // ドライバー
  p.ring(58, 30, 9, "#2b2b2b", 2, { shaded: true }); // 予備チューブ
  p.ring(58, 30, 6, "#2b2b2b", 1);
  p.rect(56, 18, 4, 3, "#8a6a42");
  p.rect(73, 16, 14, 4, "#3a6fd8"); p.rect(78, 20, 3, 16, "#9aa0a6"); // ハンマー
  p.rect(73, 16, 14, 1, "#7aa0ee");
  for (let i = 0; i < 5; i++) p.rect(88 + i * 2, 40, 1, 10 - i * 2, "#2b2b2b"); // 六角レンチ
  p.rect(14, 44, 18, 6, "#f0c419"); p.rect(16, 45, 3, 4, "#2b2b2b"); p.rect(21, 45, 3, 4, "#2b2b2b"); // タイヤレバー

  // 日本地図のポスター
  p.rect(110, 8, 46, 40, "#5e4429");
  p.rect(112, 10, 42, 36, "#f6efe0");
  p.rect(112, 10, 42, 6, "#e8622c");
  for (let i = 0; i < 5; i++) p.rect(116 + i * 7, 12, 4, 2, "#fbe7d6");
  const land = "#2f8f5b";
  // 北海道
  p.rect(143, 18, 7, 5, land); p.rect(145, 17, 3, 1, land); p.rect(150, 19, 2, 2, land);
  // 本州（弓なり）
  const honshu = [[143, 25], [143, 29], [140, 32], [136, 34], [131, 35], [126, 36], [121, 37]];
  for (let i = 0; i < honshu.length - 1; i++) p.line(honshu[i][0], honshu[i][1], honshu[i + 1][0], honshu[i + 1][1], land, 3);
  p.rect(137, 35, 3, 2, land); // 伊豆
  // 四国と九州
  p.rect(124, 40, 6, 2, land);
  p.rect(116, 39, 4, 5, land); p.rect(115, 41, 2, 2, land);
  // 沖縄
  p.px(114, 45, land);
  // しまなみ海道に印
  p.px(126, 38, "#c8282e"); p.px(126, 39, "#c8282e");
  p.disc(126, 38, 2, "rgba(200,40,46,0.5)");
  p.text("旅", 145, 37, "#5e4429", 8);

  // 時計
  p.disc(176, 22, 9, "#5e4429");
  p.disc(176, 22, 7, "#f6efe0");
  const mins = t / 1000;
  p.line(176, 22, 176 + Math.cos(mins / 6 - Math.PI / 2) * 5, 22 + Math.sin(mins / 6 - Math.PI / 2) * 5, "#2b2b2b");
  p.line(176, 22, 176 + Math.cos(mins / 72 - 2) * 3, 22 + Math.sin(mins / 72 - 2) * 3, "#2b2b2b");
  p.px(176, 22, "#c8282e");

  // 窓（外は山と空）
  const wx = 214, wy = 8, ww = 96, wh = 58;
  p.rect(wx - 3, wy - 3, ww + 6, wh + 6, "#7a5a36");
  const sky = ["#8fcbe6", "#9fd3e8", "#b0dbec", "#c3e4f0", "#d6edf4"];
  sky.forEach((c, i) => p.rect(wx, wy + i * 8, ww, 8, c));
  p.rect(wx, wy + 40, ww, 18, "#d6edf4");
  // 雲がゆっくり流れる
  for (const [cy, sp, w] of [[16, 300, 18], [28, 520, 12]]) {
    const cx = wx + ((t / sp) % (ww + w)) - w;
    for (let i = 0; i < w; i++) {
      const xx = cx + i;
      if (xx < wx || xx >= wx + ww) continue;
      const hgt = i > 3 && i < w - 3 ? 3 : 2;
      p.rect(xx, cy - (i > w / 3 && i < (2 * w) / 3 ? 1 : 0), 1, hgt, "#ffffff");
    }
  }
  // 山
  for (let i = 0; i < ww; i++) {
    const h1 = 22 - Math.abs(i - 30) * 0.55;
    const h2 = 16 - Math.abs(i - 72) * 0.4;
    const hh = Math.max(h1, h2, 6);
    p.rect(wx + i, wy + wh - hh, 1, hh, "#7fae8a");
    if (h1 > 18) p.rect(wx + i, wy + wh - h1, 1, 2, "#ffffff"); // 雪
  }
  for (let i = 0; i < ww; i += 3) p.rect(wx + i, wy + wh - 5, 2, 5, "#4f8a5f");
  // 窓わく
  p.rect(wx + ww / 2 - 1, wy, 3, wh, "#7a5a36");
  p.rect(wx, wy + wh / 2 - 1, ww, 3, "#7a5a36");
  p.rect(wx - 5, wy + wh + 3, ww + 10, 3, "#5e4429");
  // 窓辺の植木鉢
  p.rect(wx + 6, wy + wh - 4, 8, 7, "#c8622c");
  p.rect(wx + 5, wy + wh - 5, 10, 2, "#a84f22");
  p.rect(wx + 9, wy + wh - 12, 2, 8, "#2f8f5b");
  p.rect(wx + 6, wy + wh - 11, 3, 3, "#3fa86b"); p.rect(wx + 11, wy + wh - 14, 3, 3, "#3fa86b");

  // 棚とタイヤの箱、寝ている猫
  p.rect(8, 76, 70, 3, "#7a5a36");
  p.rect(12, 79, 2, 6, "#5e4429"); p.rect(72, 79, 2, 6, "#5e4429");
  p.rect(12, 62, 16, 14, "#2b4a8a"); p.rect(12, 62, 16, 2, "#4a6ab0"); p.rect(15, 67, 10, 3, "#f0c419");
  p.rect(30, 66, 14, 10, "#c8282e"); p.rect(30, 66, 14, 2, "#e05a5f"); p.rect(33, 70, 8, 2, "#f6efe0");
  // ねこ
  const breathe = Math.floor(t / 900) % 2;
  p.rect(48, 69 + breathe, 20, 7 - breathe, "#f0a85a");
  p.rect(48, 69 + breathe, 20, 1, "#f6c58a");
  p.rect(64, 66 + breathe, 8, 8, "#f0a85a");
  p.px(65, 65 + breathe, "#f0a85a"); p.px(70, 65 + breathe, "#f0a85a");
  p.rect(66, 70 + breathe, 2, 1, "#5e4429"); p.rect(69, 70 + breathe, 2, 1, "#5e4429");
  for (let i = 0; i < 4; i++) p.rect(52 + i * 4, 70 + breathe, 2, 1, "#d8883a");
  p.rect(44, 73, 5, 2, "#f0a85a"); // しっぽ
  if (Math.floor(t / 1800) % 2) p.text("z", 74, 56 - (Math.floor(t / 300) % 3), "#8a6a42", 8);

  // 吊りランプ
  p.rect(160, 0, 1, 50, "#3a3a3a");
  p.rect(154, 50, 13, 5, "#2f8f5b");
  p.rect(152, 55, 17, 2, "#2f8f5b");
  p.rect(157, 57, 7, 2, "#fff3b0");
  p.ctx.fillStyle = "rgba(255, 236, 170, 0.12)";
  p.ctx.beginPath(); p.ctx.moveTo(152, 57); p.ctx.lineTo(169, 57); p.ctx.lineTo(240, 170); p.ctx.lineTo(80, 170); p.ctx.fill();

  // 床
  p.rect(0, 140, W, 40, "#8a6a42");
  for (let y = 140; y < 180; y += 8) p.rect(0, y, W, 1, "#755835");
  for (let y = 140, row = 0; y < 180; y += 8, row++) {
    for (let x = (row % 2) * 30; x < W; x += 60) p.rect(x, y, 1, 8, "#6a4e2f");
    for (let x = (row * 17) % 40; x < W; x += 40) p.rect(x, y + 4, 6, 1, "#94744a");
  }
  p.rect(0, 140, W, 1, "#5e4429");

  // 床置きのフロアポンプ
  p.rect(14, 128, 4, 40, "#c8282e");
  p.rect(14, 128, 1, 40, "#e05a5f");
  p.rect(8, 126, 16, 3, "#2b2b2b");
  p.rect(8, 166, 16, 3, "#2b2b2b");
  p.disc(16, 152, 4, "#f6efe0"); p.px(16, 150, "#c8282e");
  p.line(18, 132, 26, 160, "#2b2b2b");
}

// ---------- 走っている人と自転車 ----------

// 2本の骨（長さ L1, L2）で a から b に届く関節の位置。bend = 1 で前側、-1 で後ろ側に曲がる
function joint(a, b, L1, L2, bend) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let d = Math.hypot(dx, dy);
  const maxD = L1 + L2 - 0.01;
  if (d > maxD) d = maxD;
  const th = Math.atan2(dy, dx);
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const ang = th - bend * A;
  return { x: a.x + Math.cos(ang) * L1, y: a.y + Math.sin(ang) * L1 };
}

function drawLeg(p, hip, foot, outfit, far) {
  const bottom = itemById(outfit.bottom), shoes = itemById(outfit.shoes);
  const dk = (c) => (far ? shade(c, -0.3) : c);
  const knee = joint(hip, foot, 46, 46, 1);
  const short = bottom?.id === "shorts" ? 0.7 : 0.6;
  const bc = bottom ? bottom.colors : [GHOST, GHOST];
  const kneeShort = lerp(hip, knee, short);
  // 太もも
  p.tube(hip, knee, 8, dk(SKIN));
  p.tube(hip, kneeShort, 11, dk(bc[0]));
  if (bc[1] !== bc[0]) { const q = lerp(hip, knee, short - 0.04); p.line(q.x - 3, q.y - 3, q.x + 3, q.y + 3, dk(bc[1]), 2); }
  // すね
  p.tube(knee, foot, 7, dk(SKIN));
  const sock = lerp(knee, foot, 0.8);
  p.tube(sock, foot, 7, dk("#f2efe6"));
  p.disc(knee.x, knee.y, 4, dk(SKIN));
  // くつ
  const sc = shoes ? shoes.colors : [GHOST, GHOST];
  p.rect(foot.x - 6, foot.y - 4, 13, 5, dk(sc[0]));
  p.rect(foot.x - 6, foot.y - 4, 13, 1, dk(shade(sc[0], 0.35)));
  p.rect(foot.x - 6, foot.y + 1, 13, 1, dk("#1a1a1a"));
  p.rect(foot.x - 2, foot.y - 3, 5, 1, dk(sc[1]));
}

// 自転車にまたがって走る人。far leg → 自転車 → 体・腕・手前の脚の順に重ねる
export function drawCyclist(p, bike, outfit, { ox = 0, oy = 0, spin = 0, crank = 0, bob = 0, tired = false } = {}) {
  const g = geometry(ox, oy);
  const bar = itemById(bike.bar);
  const shape = bar ? bar.shape : "flat";
  const pedal = (a) => ({ x: g.BB.x + Math.cos(a) * 15, y: g.BB.y + Math.sin(a) * 15 - 2 });
  const hip = { x: g.SP.x - 3, y: g.SP.y - 7 + bob };

  drawLeg(p, hip, pedal(crank + Math.PI), outfit, true);
  drawBike(p, bike, { ox, oy, spin, crank });

  const top = itemById(outfit.top), helmet = itemById(outfit.helmet);
  const tc = top ? top.colors : [GHOST, GHOST];
  const lean = shape === "drop" ? { x: 36, y: -30 } : shape === "bullhorn" ? { x: 33, y: -33 } : { x: 25, y: -39 };
  if (tired) { lean.y += 4; }
  const sh = { x: hip.x + lean.x, y: hip.y + lean.y };
  const hand = shape === "drop" ? { x: g.STEM.x + 8, y: g.STEM.y - 5 }
    : shape === "bullhorn" ? { x: g.STEM.x + 12, y: g.STEM.y - 3 } : { x: g.STEM.x + 5, y: g.STEM.y - 3 };

  // 体
  p.tube(hip, sh, 16, tc[0]);
  const chest = lerp(hip, sh, 0.62);
  if (tc[1] !== tc[0]) p.tube(lerp(hip, sh, 0.55), lerp(hip, sh, 0.7), 16, tc[1]);
  if (top?.id !== "tshirt") { // 背中のポケット
    const bp = lerp(hip, sh, 0.18);
    p.rect(bp.x - 9, bp.y - 4, 5, 6, shade(tc[0], -0.25));
  }
  p.px(chest.x + 6, chest.y + 4, shade(tc[0], 0.4));

  // 手前の脚
  drawLeg(p, hip, pedal(crank), outfit, false);

  // うで
  const elbow = joint(sh, hand, 22, 22, -1);
  p.tube(sh, lerp(sh, elbow, 0.55), 7, tc[0]);
  p.tube(lerp(sh, elbow, 0.5), elbow, 6, SKIN);
  p.tube(elbow, hand, 5, SKIN);
  p.disc(hand.x, hand.y, 3, top?.id === "tshirt" ? SKIN : "#2a2a2a");

  // くびとあたま
  const head = { x: sh.x + (shape === "drop" ? 11 : 7), y: sh.y - 13 };
  p.tube(sh, { x: head.x - 3, y: head.y + 6 }, 6, SKIN_D);
  p.disc(head.x, head.y, 10, SKIN);
  p.rect(head.x - 10, head.y - 4, 7, 9, "#3b2a20"); // うしろ髪
  p.rect(head.x - 3, head.y, 3, 5, SKIN_D); // みみ
  p.rect(head.x + 5, head.y - 1, 2, 3, OUTLINE); // め
  p.px(head.x + 5, head.y - 1, "#ffffff");
  p.rect(head.x + 4, head.y - 4, 4, 1, "#3b2a20"); // まゆ
  p.rect(head.x + 4, head.y + 6, 3, 1, "#a4553f"); // くち
  p.rect(head.x + 3, head.y + 2, 3, 2, "#f2a08a"); // ほっぺ
  p.px(head.x + 10, head.y + 2, SKIN_D); // はな
  if (tired) { p.rect(head.x - 6, head.y - 14, 2, 3, "#6fc3e8"); p.px(head.x - 6, head.y - 15, "#6fc3e8"); }
  if (helmet) {
    const [h0, h1] = helmet.colors;
    for (let i = 0; i < 9; i++) {
      const w = Math.round(Math.sqrt(1 - ((i - 8) / 9) ** 2) * 13);
      p.rect(head.x - w - 1, head.y - 12 + i, w * 2 + 2, 1, h0);
    }
    p.rect(head.x - 9, head.y - 12, 10, 1, shade(h0, 0.5));
    p.rect(head.x - 13, head.y - 4, 26, 1, shade(h0, -0.35));
    for (const vx of [-7, -2, 3]) p.rect(head.x + vx, head.y - 9, 3, 2, OUTLINE);
    p.rect(head.x - 12, head.y - 6, 24, 1, h1);
    p.line(head.x - 1, head.y - 4, head.x + 3, head.y + 7, "#2a2a2a");
    if (helmet.id === "kask") { p.rect(head.x + 2, head.y - 2, 9, 3, "#222"); p.rect(head.x + 5, head.y - 1, 4, 1, "#6fc3e8"); }
    if (helmet.id === "giro") p.rect(head.x + 9, head.y - 5, 5, 2, "#1f1f1f");
  } else {
    p.rect(head.x - 9, head.y - 10, 18, 6, "#3b2a20");
  }
}

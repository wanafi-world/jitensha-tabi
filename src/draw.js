// 自転車・人・背景のドット絵描画。
import { itemById } from "./data.js";

const GHOST = "#8d8a80";
const SKIN = "#f1c79a";
const SKIN_D = "#d39c6c";

// 自転車の骨格（キャンバス座標）。後で走行画面でも ox, oy をずらして使う。
export function geometry(ox = 0, oy = 0) {
  const P = (x, y) => ({ x: x + ox, y: y + oy });
  return {
    R: P(52, 80), F: P(130, 80), BB: P(88, 84),
    ST: P(80, 49), HT: P(120, 50), HB: P(122, 58),
    SP: P(78, 42), STEM: P(127, 46), wheelR: 24,
  };
}

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function drawWheel(p, c, wheels, tires, spin) {
  const R = 24;
  // タイヤ
  if (tires) {
    p.ring(c.x, c.y, R, tires.tireColor, tires.width);
    if (tires.wall) p.ring(c.x, c.y, R - tires.width + 1, tires.wall, 1);
  } else {
    p.ring(c.x, c.y, R, GHOST, 1, true);
  }
  // ホイール
  const inner = R - (tires ? tires.width : 2);
  if (wheels) {
    const rimT = wheels.rim;
    p.ring(c.x, c.y, inner, wheels.rimColor, rimT);
    if (rimT >= 5) p.ring(c.x, c.y, inner - 1, "#3a3a3a", 1); // ディープリムのロゴ帯
    const spokeEnd = inner - rimT;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * Math.PI * 2;
      p.line(c.x, c.y, c.x + Math.cos(a) * spokeEnd, c.y + Math.sin(a) * spokeEnd, "#b9b9b9");
    }
    p.disc(c.x, c.y, 2, "#7d7d7d");
  } else {
    p.ring(c.x, c.y, inner - 1, GHOST, 1, true);
    p.px(c.x, c.y, GHOST);
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

  drawWheel(p, g.R, wheels, tires, spin);
  drawWheel(p, g.F, wheels, tires, spin);

  // チェーンとスプロケット（フレームの奥側）
  if (group) {
    p.line(g.BB.x, g.BB.y - 7, g.R.x, g.R.y - 4, "#4a4a4a", 1, true);
    p.line(g.BB.x, g.BB.y + 7, g.R.x, g.R.y + 4, "#4a4a4a", 1, true);
    p.ring(g.R.x, g.R.y, 4, group.metal, 2);
    p.rect(g.R.x - 2, g.R.y + 5, 3, 5, group.metal); // リアディレイラー
  }

  // フレーム
  const tubes = [
    [g.BB, g.ST], [g.ST, g.HT], [g.BB, g.HB], [g.BB, g.R], [g.ST, g.R], [g.HB, g.F],
  ];
  if (frame) {
    for (const [a, b] of tubes) p.line(a.x, a.y, b.x, b.y, frame.color, 3);
    p.line(g.HT.x, g.HT.y, g.HB.x, g.HB.y, frame.color, 4);
    // ハイライト
    p.line(g.ST.x + 1, g.ST.y - 1, g.HT.x - 1, g.HT.y - 1, "rgba(255,255,255,0.35)");
    // ダウンチューブのロゴ
    const a = lerp(g.HB, g.BB, 0.3), b = lerp(g.HB, g.BB, 0.65);
    p.line(a.x, a.y, b.x, b.y, frame.accent, 1);
    p.px(g.HT.x + 1, g.HT.y + 3, frame.accent); // ヘッドバッジ
    // シートポスト
    p.line(g.ST.x, g.ST.y, g.SP.x, g.SP.y, "#9a9a9a", 2);
    p.line(g.HT.x, g.HT.y, g.STEM.x, g.STEM.y, "#3a3a3a", 2);
  } else {
    for (const [a, b] of tubes) p.line(a.x, a.y, b.x, b.y, GHOST, 1, true);
    p.line(g.HT.x, g.HT.y, g.HB.x, g.HB.y, GHOST, 1, true);
  }

  // サドル
  const s = g.SP;
  if (saddle) {
    p.rect(s.x - 8, s.y - 2, 14, 2, saddle.saddleColor);
    p.rect(s.x - 9, s.y - 3, 4, 2, saddle.saddleColor);
    if (saddle.id === "brooks") { p.px(s.x - 7, s.y - 1, "#d8b27a"); p.px(s.x + 4, s.y - 1, "#d8b27a"); }
  } else {
    p.line(s.x - 8, s.y - 2, s.x + 6, s.y - 2, GHOST, 1, true);
  }

  // ハンドル
  const h = g.STEM;
  if (bar) {
    const c = bar.tape;
    if (bar.shape === "drop") {
      p.line(h.x, h.y, h.x + 5, h.y, c, 2);
      p.line(h.x + 5, h.y, h.x + 7, h.y + 4, c, 2);
      p.line(h.x + 7, h.y + 4, h.x + 5, h.y + 9, c, 2);
      p.line(h.x + 5, h.y + 9, h.x + 1, h.y + 10, c, 2);
      if (group) p.rect(h.x + 5, h.y - 3, 2, 4, group.metal); // ブラケット
    } else if (bar.shape === "bullhorn") {
      p.line(h.x, h.y, h.x + 7, h.y, c, 2);
      p.line(h.x + 7, h.y, h.x + 9, h.y - 3, c, 2);
    } else {
      p.line(h.x - 1, h.y, h.x + 2, h.y - 1, "#6a6a6a", 2);
      p.rect(h.x + 1, h.y - 2, 4, 2, c);
    }
  } else {
    p.line(h.x, h.y, h.x + 7, h.y, GHOST, 1, true);
  }

  // クランクとチェーンリング（手前側）
  if (group) {
    p.ring(g.BB.x, g.BB.y, 7, group.metal, 2);
    const ex = g.BB.x + Math.cos(crank) * 9, ey = g.BB.y + Math.sin(crank) * 9;
    p.line(g.BB.x, g.BB.y, ex, ey, group.metal === "#9aa0a6" ? "#c7cbcf" : "#2b2b2b", 2);
    p.rect(ex - 2, ey, 5, 2, "#1d1d1d");
    p.disc(g.BB.x, g.BB.y, 1, "#cfcfcf");
  } else {
    p.ring(g.BB.x, g.BB.y, 7, GHOST, 1, true);
  }
}

// タップ位置からどのパーツかを判定する（キャンバス座標）
export function hitPart(x, y) {
  const g = geometry();
  const d = (a) => Math.hypot(x - a.x, y - a.y);
  if (Math.abs(x - (g.SP.x - 2)) <= 9 && Math.abs(y - g.SP.y) <= 5) return "saddle";
  if (x >= g.STEM.x - 3 && x <= g.STEM.x + 11 && y >= g.STEM.y - 5 && y <= g.STEM.y + 12) return "bar";
  if (d(g.BB) <= 11) return "group";
  for (const c of [g.R, g.F]) {
    const r = d(c);
    if (r >= 20 && r <= 27) return "tires";
    if (r < 20) return "wheels";
  }
  if (x > g.R.x && x < g.HT.x + 4 && y > g.ST.y - 4 && y < g.BB.y + 4) return "frame";
  return null;
}

// 立ち姿の人（足元の座標 x, y）
export function drawRider(p, outfit, x, y) {
  const helmet = itemById(outfit.helmet);
  const top = itemById(outfit.top);
  const bottom = itemById(outfit.bottom);
  const shoes = itemById(outfit.shoes);

  // くつ
  const sc = shoes ? shoes.colors : [GHOST, GHOST];
  p.rect(x - 6, y - 3, 5, 3, sc[0]); p.rect(x + 1, y - 3, 5, 3, sc[0]);
  p.rect(x - 6, y - 1, 5, 1, sc[1]); p.rect(x + 1, y - 1, 5, 1, sc[1]);

  // あし
  const legTop = y - 24;
  const isLongShort = bottom && bottom.id === "shorts";
  const bc = bottom ? bottom.colors : [GHOST, GHOST];
  const shortLen = isLongShort ? 11 : 9;
  p.rect(x - 5, legTop, 4, 21, SKIN); p.rect(x + 1, legTop, 4, 21, SKIN);
  p.rect(x - 5, legTop + 21 - 1, 4, 1, SKIN_D); p.rect(x + 1, legTop + 21 - 1, 4, 1, SKIN_D);
  p.rect(x - 5, legTop, 10, shortLen, bc[0]);
  p.rect(x - 1, legTop + 3, 2, shortLen - 3, "#00000033");
  if (bc[1] !== bc[0]) { p.rect(x - 5, legTop + shortLen - 1, 4, 1, bc[1]); p.rect(x + 1, legTop + shortLen - 1, 4, 1, bc[1]); }

  // からだ
  const bodyTop = legTop - 16;
  const tc = top ? top.colors : [GHOST, GHOST];
  p.rect(x - 6, bodyTop, 12, 17, tc[0]);
  if (tc[1] !== tc[0]) { p.rect(x - 6, bodyTop + 6, 12, 2, tc[1]); p.rect(x - 1, bodyTop, 2, 3, tc[1]); }
  // うで
  p.rect(x - 9, bodyTop + 1, 3, 6, tc[0]); p.rect(x + 6, bodyTop + 1, 3, 6, tc[0]);
  p.rect(x - 9, bodyTop + 7, 3, 9, SKIN); p.rect(x + 6, bodyTop + 7, 3, 9, SKIN);

  // あたま
  const headTop = bodyTop - 11;
  p.rect(x - 4, headTop + 2, 8, 9, SKIN);
  p.rect(x - 3, bodyTop - 1, 6, 1, SKIN_D);
  p.px(x - 2, headTop + 6, "#2a2a2a"); p.px(x + 2, headTop + 6, "#2a2a2a");
  p.rect(x - 1, headTop + 9, 3, 1, "#b0604a");
  if (helmet) {
    const [a, b] = helmet.colors;
    p.rect(x - 5, headTop - 1, 10, 5, a);
    p.rect(x - 4, headTop - 2, 8, 1, a);
    p.rect(x - 3, headTop, 2, 1, b); p.rect(x + 1, headTop, 2, 1, b);
    p.rect(x - 5, headTop + 4, 1, 5, "#333");
    p.rect(x + 4, headTop + 4, 1, 5, "#333");
  } else {
    p.rect(x - 5, headTop, 10, 4, "#3b2a20"); // 髪
  }
}

// 自転車屋の作業場の背景
export function drawWorkshop(p, t) {
  p.clear("#e9dcc0");
  // 壁の板
  for (let x = 0; x < p.w; x += 16) p.rect(x, 0, 1, 92, "#d8c8a6");
  // 有孔ボード
  p.rect(8, 8, 70, 30, "#c9a978");
  for (let y = 12; y < 36; y += 5) for (let x = 12; x < 76; x += 5) p.px(x, y, "#8a6a42");
  // 工具
  p.rect(16, 14, 2, 14, "#9aa0a6"); p.rect(14, 12, 6, 3, "#9aa0a6");
  p.rect(26, 14, 2, 16, "#c8282e"); p.rect(24, 28, 6, 3, "#c8282e");
  p.ring(44, 22, 6, "#2b2b2b", 2);
  p.rect(58, 14, 10, 3, "#3a6fd8"); p.rect(62, 17, 2, 10, "#9aa0a6");
  // 窓
  p.rect(140, 8, 42, 30, "#8a6a42");
  const sky = ["#9fd3e8", "#b7e0ee", "#cfeaf2"];
  for (let i = 0; i < 3; i++) p.rect(142, 10 + i * 9, 38, 9, sky[i]);
  p.rect(160, 10, 2, 26, "#8a6a42"); p.rect(142, 22, 38, 2, "#8a6a42");
  // 雲がゆっくり流れる
  const cx = 142 + ((t / 400) % 50) - 8;
  p.rect(Math.max(142, cx), 14, Math.min(8, 180 - cx), 2, "#ffffff");
  // ポスター
  p.rect(92, 10, 26, 22, "#f6efe0");
  p.rect(94, 12, 22, 12, "#e8622c");
  p.disc(105, 22, 4, "#f0c419");
  p.rect(94, 24, 22, 6, "#2f8f5b");
  // 床
  p.rect(0, 92, p.w, 20, "#8a6a42");
  for (let x = 0; x < p.w; x += 24) p.rect(x, 92, 1, 20, "#755835");
  p.rect(0, 92, p.w, 1, "#5e4429");
  // 影
  p.rect(36, 104, 112, 2, "#00000022");
}

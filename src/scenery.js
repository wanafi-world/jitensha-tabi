// 走行画面の景色（キャンバス 480×270）
import { shade } from "./pixel.js";

export const RW = 480, RH = 270;
export const HORIZON = 150;
export const ROAD_Y = 236; // 道の上端
export const BIKE_X = 150; // 自転車の後輪あたりの画面上の位置
export const PX_PER_KM = 300; // 手前の景色の流れる速さ

// 決まった乱数（同じ場所にはいつも同じものが並ぶ）
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function noise(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

// ---------- 空 ----------

// 時刻（時間、小数）から空の色を決める
function skyColors(h) {
  const keys = [
    [0, ["#0d1430", "#1c2550"]], [4.5, ["#141d44", "#2c3560"]],
    [5.5, ["#4a5a9a", "#f0a080"]], [7, ["#7fbfe8", "#cfe8f2"]],
    [15.5, ["#6fb6e6", "#cde9f4"]], [17, ["#6f8fd0", "#f7c27a"]],
    [18, ["#5a4f9a", "#f08a5a"]], [19, ["#1f2556", "#5a4a7a"]],
    [20, ["#0d1430", "#1c2550"]], [24, ["#0d1430", "#1c2550"]],
  ];
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (h >= keys[i][0] && h < keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
  const t = (h - a[0]) / (b[0] - a[0] || 1);
  return [mix(a[1][0], b[1][0], t), mix(a[1][1], b[1][1], t)];
}

export function mix(c1, c2, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = p(c1), B = p(c2);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

// 夜や夕方は全体を少し暗く、色づける
export function tint(h) {
  if (h >= 7 && h < 16.5) return null;
  if (h >= 16.5 && h < 18.5) return "rgba(255,140,60,0.12)";
  if (h >= 5.5 && h < 7) return "rgba(255,170,120,0.10)";
  return "rgba(10,20,60,0.45)";
}

function drawSky(p, h, d, t) {
  const [top, bot] = skyColors(h);
  const bands = 10;
  for (let i = 0; i < bands; i++) {
    const y0 = Math.floor((HORIZON / bands) * i), y1 = Math.floor((HORIZON / bands) * (i + 1));
    p.rect(0, y0, RW, y1 - y0, mix(top, bot, i / (bands - 1)));
  }
  // 星
  if (h < 5.5 || h > 19) {
    for (let i = 0; i < 60; i++) {
      const x = hash(i) * RW, y = hash(i + 99) * (HORIZON - 30);
      if ((Math.floor(t / 400) + i) % 7) p.px(x, y, "#ffffff");
    }
  }
  // 太陽と月
  const dayT = (h - 6) / 12; // 6時〜18時
  if (dayT > -0.05 && dayT < 1.05) {
    const sx = 40 + dayT * (RW - 80), sy = HORIZON - 10 - Math.sin(Math.PI * Math.max(0, Math.min(1, dayT))) * 110;
    const sc = h > 16.5 || h < 7 ? "#ffb060" : "#fff3c0";
    p.disc(sx, sy, 9, shade(sc, -0.05));
    p.disc(sx, sy, 7, sc);
  } else {
    const mt = ((h + 24 - 18) % 24) / 12;
    const mx = 40 + mt * (RW - 80), my = HORIZON - 20 - Math.sin(Math.PI * mt) * 90;
    p.disc(mx, my, 7, "#f2efd8");
    p.disc(mx + 3, my - 2, 6, skyColors(h)[0]);
  }
  // 雲
  const cloudC = h > 16.5 && h < 19 ? "#ffd6b0" : h < 6 || h > 19 ? "#3a4270" : "#ffffff";
  for (let i = 0; i < 6; i++) {
    const w = 30 + hash(i + 7) * 40;
    const x = ((hash(i) * 900 - d * 8 - t / 250 * (0.5 + hash(i + 3))) % (RW + 120) + RW + 120) % (RW + 120) - 60;
    const y = 18 + hash(i + 5) * 70;
    p.rect(x, y, w, 4, cloudC);
    p.rect(x + w * 0.2, y - 3, w * 0.45, 3, cloudC);
    p.rect(x + w * 0.5, y - 5, w * 0.25, 2, cloudC);
    p.rect(x + 4, y + 4, w - 8, 1, shade(cloudC, -0.12));
  }
}

// ---------- 海と遠くの島 ----------

function drawSea(p, h, d, t) {
  const day = h >= 7 && h < 17;
  const top = day ? "#5aa6c8" : h < 19 && h >= 5.5 ? "#7a7aa8" : "#1a2a50";
  const bot = day ? "#2f7fa6" : h < 19 && h >= 5.5 ? "#4a5a8a" : "#0f1a38";
  for (let y = HORIZON; y < RH; y += 4) p.rect(0, y, RW, 4, mix(top, bot, (y - HORIZON) / (RH - HORIZON)));
  // 波のきらめき
  for (let i = 0; i < 90; i++) {
    const y = HORIZON + 3 + hash(i + 40) * (RH - HORIZON - 3);
    const x = ((hash(i) * RW * 3 - d * PX_PER_KM * (0.08 + (y - HORIZON) / 400)) % RW + RW) % RW;
    if ((Math.floor(t / 300) + i) % 3 === 0) p.rect(x, y, 2 + (y - HORIZON) / 30, 1, day ? "#bfe6f2" : "#8a9ac8");
  }
  // 夕日の照り返し
  if (h > 16.3 && h < 18.6) {
    const sx = 40 + ((h - 6) / 12) * (RW - 80);
    for (let y = HORIZON + 2; y < RH; y += 3) {
      const w = 4 + (y - HORIZON) / 5 + Math.sin(y + t / 200) * 2;
      p.rect(sx - w / 2, y, w, 1, "#ffc070");
    }
  }
}

const dayPick = (h, day, eve, night) => (h >= 7 && h < 17 ? day : h < 19 && h >= 5.5 ? eve : night);

function drawFar(p, h, d, far = "islands") {
  const base = dayPick(h, "#7ba3b8", "#8a7aa0", "#1f2a48");
  const near = dayPick(h, "#5f8fa0", "#6a5a80", "#18203a");
  const off = d * PX_PER_KM * 0.05;
  const tall = far === "mountains" || far === "fuji";
  // 奥の山並み（島なら低く途切れる、山なら高く連なる）
  for (let sx = 0; sx < RW; sx++) {
    const wx = (sx + off) / (tall ? 90 : 70);
    const n = noise(wx) * 0.7 + noise(wx * 2.3) * 0.3;
    const hgt = tall ? 18 + n * 70 : Math.max(0, (n - 0.42) * 70);
    if (hgt > 0) p.rect(sx, HORIZON - hgt, 1, hgt + 1, base);
    if (tall && n > 0.72 && h >= 5.5 && h < 19) p.rect(sx, HORIZON - hgt, 1, 2, shade(base, 0.35));
  }
  // 富士山：湖をめぐるにつれて少しずつ見える位置が変わる
  if (far === "fuji") {
    const cx = Math.round(250 + Math.sin(d / 14) * 120);
    const top = 24, baseY = HORIZON + 4, half = 200;
    const body = dayPick(h, "#5a7ea8", "#6a5a90", "#1a2448");
    const snow = dayPick(h, "#f6f8fc", "#ffd8c8", "#8a94b8");
    for (let i = -half; i <= half; i++) {
      const t = Math.abs(i) / half;
      // すそが広がる曲線
      const y = top + (baseY - top) * Math.pow(t, 0.75) + (Math.abs(i) < 9 ? 0 : 0);
      const x = cx + i;
      if (x < 0 || x >= RW) continue;
      p.rect(x, y, 1, baseY - y, i < 0 ? shade(body, 0.08) : body);
      // 雪：ぎざぎざに溶ける
      const sd = 30 + Math.sin(i * 0.9) * 4 + Math.sin(i * 0.31) * 6 - t * 6;
      if (y < top + sd) p.rect(x, y, 1, top + sd - y, i < 0 ? snow : shade(snow, -0.08));
    }
    p.rect(cx - 9, top, 18, 2, shade(snow, -0.15)); // 火口のくぼみ
  }
  // 筑波山：ふたこぶの山
  if (far === "tsukuba") {
    const cx = ((380 - d * PX_PER_KM * 0.02) % (RW + 300) + RW + 300) % (RW + 300) - 150;
    const body = dayPick(h, "#5f8a9a", "#6a5a80", "#18203a");
    for (let i = -110; i < 110; i++) {
      // 女体山と男体山のふたつの峰
      const hgt = Math.max(0, 34 - Math.abs(i) * 0.3, 58 - Math.abs(i + 16) * 1.1, 62 - Math.abs(i - 16) * 1.1);
      if (hgt > 0) p.rect(cx + i, HORIZON - hgt + 2, 1, hgt, body);
    }
  }
  const off2 = d * PX_PER_KM * 0.12;
  for (let sx = 0; sx < RW; sx++) {
    const wx = (sx + off2) / 55 + 50;
    const n = noise(wx) * 0.7 + noise(wx * 2.7) * 0.3;
    const hgt = Math.max(0, (n - 0.5) * 60);
    if (hgt > 0) p.rect(sx, HORIZON + 6 - hgt, 1, hgt, near);
  }
}

// ---------- 島の丘（中景） ----------

function drawHills(p, h, d, segAt) {
  const f = 0.35;
  const g1 = dayPick(h, "#5f9a5a", "#5a7a4a", "#1f3328");
  const g2 = shade(g1, -0.18);
  const forest = dayPick(h, "#3f7a4a", "#3f5a3a", "#16261e");
  const paddy = dayPick(h, "#8cc06a", "#8a9a5a", "#22331e");
  const concrete = dayPick(h, "#a8a8a0", "#9a8a90", "#2a2a38");
  for (let sx = 0; sx < RW; sx += 1) {
    const km = d + (sx - BIKE_X) / (PX_PER_KM * f);
    const seg = segAt(km);
    if (!seg || seg.kind === "bridge" || seg.kind === "ferry") continue;
    const edge = Math.min(seg._local, seg.km - seg._local);
    const fall = Math.min(1, edge / 0.6);
    const n = noise(km * 3) * 0.6 + noise(km * 9) * 0.4;
    if (seg.kind === "shore") {
      // 岸辺：低い草地だけで、水がよく見える
      const hgt = 4 + n * 6;
      p.rect(sx, ROAD_Y - 8 - hgt, 1, hgt + 8, g1);
      continue;
    }
    if (seg.kind === "field" || seg.kind === "city") {
      // 内陸：水面のかわりに田んぼや街並み
      const top = HORIZON + 4;
      const ground = seg.kind === "field" ? paddy : concrete;
      p.rect(sx, top, 1, ROAD_Y - top, ground);
      if (seg.kind === "field") {
        for (let y = top + 6; y < ROAD_Y; y += 7 + Math.floor((y - top) / 12)) p.px(sx, y, shade(paddy, -0.2)); // あぜ
        const hgt = (10 + n * 26) * fall;
        p.rect(sx, top - hgt, 1, hgt, g1);
      } else {
        // 遠くのビル
        const col = Math.floor((km * 300) / 9);
        const bh = 20 + hash(col) * 60;
        p.rect(sx, top - bh + 30, 1, bh, shade(concrete, -0.15 - hash(col + 1) * 0.15));
        if (Math.floor(km * 300) % 3 === 0 && (top - bh + 34) % 6 < 3) for (let y = top - bh + 34; y < top + 26; y += 6) p.px(sx, y, h > 18 || h < 6 ? "#ffd870" : "#c8d8e0");
      }
      continue;
    }
    if (seg.kind === "climb") {
      // 山道：森が近くまで迫る（区間の端はなだらかに）
      const hgt = (40 + n * 60) * fall + 8;
      p.rect(sx, ROAD_Y - hgt, 1, hgt, shade(forest, (Math.floor(km * 300) % 5 === 0) ? -0.15 : 0));
      if ((sx + Math.floor(km * 300)) % 4 === 0) p.px(sx, ROAD_Y - hgt, shade(forest, 0.25));
      continue;
    }
    // 島や街：区間の端ほど低くして海岸線にする
    const hgt = (24 + n * 56) * fall;
    if (hgt < 1) continue;
    p.rect(sx, ROAD_Y - 22 - hgt, 1, hgt + 22, g1);
    if (n > 0.55) p.rect(sx, ROAD_Y - 22 - hgt, 1, 2, shade(g1, 0.2));
    if ((sx + Math.floor(km * 300)) % 7 === 0) p.rect(sx, ROAD_Y - 18 - hgt * 0.5, 1, hgt * 0.4, g2); // 木の影
  }
}

// ---------- 手前の物 ----------

function house(p, x, y, seed, nightLights) {
  const w = 26 + Math.floor(hash(seed) * 14), hh = 18 + Math.floor(hash(seed + 1) * 8);
  const wall = ["#f2ead8", "#e8dcc4", "#d8d0c0", "#efe2c8"][Math.floor(hash(seed + 2) * 4)];
  const roof = ["#3c4a5a", "#5a4a42", "#2f3c4c", "#7a3a2a"][Math.floor(hash(seed + 3) * 4)];
  p.rect(x, y - hh, w, hh, wall);
  p.rect(x + w - 3, y - hh, 3, hh, shade(wall, -0.15));
  // 瓦屋根
  for (let i = 0; i < 6; i++) p.rect(x - 4 + i, y - hh - 6 + i, w + 8 - i * 2, 1, i % 2 ? roof : shade(roof, 0.15));
  p.rect(x - 5, y - hh - 1, w + 10, 2, shade(roof, -0.2));
  // 窓
  const lit = nightLights ? "#ffd870" : "#5a7a8a";
  p.rect(x + 4, y - hh + 5, 6, 5, lit);
  p.rect(x + 14, y - hh + 5, 6, 5, lit);
  p.rect(x + 6, y - 8, 5, 8, "#6a4a2a"); // 戸
}

function citrus(p, x, y, seed, fruit) {
  p.rect(x + 5, y - 10, 3, 10, "#6a4a2a");
  p.disc(x + 6, y - 16, 9, "#3f7f3a");
  p.disc(x + 4, y - 18, 5, "#4f9a48");
  for (let i = 0; i < 6; i++) p.rect(x - 1 + hash(seed + i) * 14, y - 22 + hash(seed + i + 9) * 12, 2, 2, fruit);
}

function crane(p, x, y) {
  p.rect(x, y - 70, 4, 70, "#c8282e");
  for (let i = 0; i < 70; i += 10) p.rect(x, y - 70 + i, 4, 5, "#f2f2f2");
  p.rect(x - 30, y - 72, 60, 4, "#c8282e");
  p.line(x + 2, y - 86, x - 30, y - 72, "#5a5a5a");
  p.line(x + 2, y - 86, x + 30, y - 72, "#5a5a5a");
  p.rect(x, y - 86, 4, 14, "#c8282e");
  p.line(x + 22, y - 68, x + 22, y - 40, "#5a5a5a");
  p.rect(x + 19, y - 40, 7, 4, "#f0c419");
}

function torii(p, x, y) {
  p.rect(x, y - 34, 4, 34, "#d4402e"); p.rect(x + 26, y - 34, 4, 34, "#d4402e");
  p.rect(x - 4, y - 38, 38, 4, "#2a2a2a");
  p.rect(x - 2, y - 34, 34, 2, "#d4402e");
  p.rect(x - 1, y - 28, 32, 3, "#d4402e");
}

function saltPile(p, x, y) {
  for (let i = 0; i < 10; i++) p.rect(x + i, y - 10 + i, 30 - i * 2, 1, i % 2 ? "#f6f6f2" : "#e6e6e0");
  p.rect(x - 4, y - 1, 38, 2, "#b8a888");
}

function beach(p, x, y, seed) {
  p.rect(x, y - 6, 60, 6, "#f0dca8");
  const c = ["#e8622c", "#3a6fd8", "#f0c419"][Math.floor(hash(seed) * 3)];
  p.rect(x + 20, y - 26, 2, 20, "#f2f2f2");
  for (let i = 0; i < 6; i++) p.rect(x + 9 + i, y - 30 + i, 24 - i * 2, 1, i % 2 ? c : "#ffffff");
}

function temple(p, x, y) {
  p.rect(x + 4, y - 22, 40, 22, "#e8dcc4");
  for (let i = 0; i < 9; i++) p.rect(x - 4 + i, y - 32 + i, 56 - i * 2, 1, "#3c4a5a");
  p.rect(x + 18, y - 44, 12, 12, "#3c4a5a");
  p.rect(x + 14, y - 46, 20, 2, "#2c3a4a");
  p.rect(x + 18, y - 14, 12, 14, "#6a4a2a");
}

function towelShop(p, x, y) {
  p.rect(x, y - 30, 44, 30, "#f6efe0");
  p.rect(x, y - 34, 44, 6, "#3a6fd8");
  const cols = ["#e8622c", "#f0c419", "#7fd3c4", "#d8417a"];
  for (let i = 0; i < 4; i++) p.rect(x + 4 + i * 10, y - 24, 7, 12, cols[i]);
}

function pine(p, x, y, seed) {
  const lean = hash(seed) < 0.5 ? -1 : 1;
  p.line(x + 6, y, x + 6 + lean * 4, y - 26, "#5a3a22", 3);
  for (const [dx, dy, w] of [[-4, -26, 22], [2, -34, 16], [-8, -20, 14]]) {
    p.rect(x + dx + lean * 4, y + dy, w, 4, "#2f5f3a");
    p.rect(x + dx + lean * 4 + 2, y + dy - 2, w - 4, 2, "#3f7a4a");
  }
}

function reeds(p, x, y, seed) {
  for (let i = 0; i < 12; i++) {
    const hgt = 10 + hash(seed + i) * 12;
    p.line(x + i * 3, y, x + i * 3 + 2, y - hgt, "#a8a060");
    p.rect(x + i * 3 + 1, y - hgt - 2, 2, 4, "#c8b880");
  }
}

function lotus(p, x, y, seed) {
  p.rect(x - 4, y - 4, 52, 4, "#5a8a8a");
  for (let i = 0; i < 7; i++) {
    const lx = x + hash(seed + i) * 44, ly = y - 6 - hash(seed + i + 3) * 8;
    p.line(lx + 3, y - 2, lx + 3, ly, "#4a7a3a");
    p.rect(lx, ly - 2, 8, 3, "#4f9a48");
    if (i % 3 === 0) { p.rect(lx + 2, ly - 6, 4, 4, "#f2a8c8"); p.px(lx + 3, ly - 6, "#ffffff"); }
  }
}

function buildings(p, x, y, seed, night) {
  const w = 30 + hash(seed) * 20, hh = 50 + hash(seed + 1) * 60;
  const wall = ["#c8c4b8", "#a8b0b8", "#d8cfc0", "#b8a898"][Math.floor(hash(seed + 2) * 4)];
  p.rect(x, y - hh, w, hh, wall);
  p.rect(x + w - 4, y - hh, 4, hh, shade(wall, -0.18));
  p.rect(x, y - hh, w, 2, shade(wall, 0.2));
  for (let wy = y - hh + 6; wy < y - 10; wy += 8) for (let wx = x + 4; wx < x + w - 8; wx += 7)
    p.rect(wx, wy, 4, 4, night && hash(wx * 3 + wy) > 0.4 ? "#ffd870" : "#5a7a8a");
  p.rect(x + w / 2 - 5, y - 10, 10, 10, "#3a3a3a");
}

function sakura(p, x, y, seed) {
  p.rect(x + 6, y - 12, 3, 12, "#5a3a22");
  p.disc(x + 7, y - 20, 11, "#f6c8d8");
  p.disc(x + 3, y - 22, 6, "#fadbe6");
  for (let i = 0; i < 5; i++) p.px(x + hash(seed + i) * 20, y - 6 + hash(seed + i + 1) * 6, "#f6c8d8");
}

function metasequoia(p, x, y) {
  for (const dx of [0, 24]) {
    p.rect(x + dx + 6, y - 10, 3, 10, "#5a3a22");
    for (let i = 0; i < 40; i++) {
      const w = Math.max(1, Math.floor(i / 3));
      p.rect(x + dx + 7 - w, y - 50 + i, w * 2 + 1, 1, i % 4 ? "#5a8a3a" : "#4a7a32");
    }
  }
}

function lavender(p, x, y, seed) {
  for (let i = 0; i < 8; i++) {
    const lx = x + i * 5;
    p.rect(lx, y - 8, 4, 8, "#5a7a4a");
    p.rect(lx, y - 12 - hash(seed + i) * 3, 4, 5, "#9a7ad8");
  }
}

function forestTree(p, x, y, seed) {
  const hgt = 36 + hash(seed) * 20;
  p.rect(x + 7, y - 8, 3, 8, "#4a3020");
  for (let i = 0; i < hgt; i++) {
    const w = Math.floor((i / hgt) * 10) + 1;
    p.rect(x + 8 - w, y - 8 - hgt + i, w * 2, 1, i % 5 ? "#2f5f3a" : "#3f7a4a");
  }
}

function onsen(p, x, y) {
  p.rect(x, y - 26, 40, 26, "#e8dcc4");
  for (let i = 0; i < 6; i++) p.rect(x - 4 + i, y - 32 + i, 48 - i * 2, 1, "#3c4a5a");
  p.rect(x + 10, y - 20, 20, 14, "#2f5f9a"); // のれん
  p.text("♨", x + 14, y - 20, "#ffffff", 12);
  for (let i = 0; i < 3; i++) p.rect(x + 8 + i * 10, y - 44 + Math.sin(i) * 2, 2, 8, "rgba(255,255,255,0.7)");
}

const OBJECTS = { pine, reeds, lotus, buildings, sakura, metasequoia, lavender, forest: forestTree, onsen, houses: house, citrus: (p, x, y, s) => citrus(p, x, y, s, "#f29a1a"), lemon: (p, x, y, s) => citrus(p, x, y, s, "#f2e23a"), crane, torii, salt: saltPile, beach, temple, towel: towelShop };

function drawRoadside(p, h, d, segAt) {
  const night = h < 5.5 || h > 18.7;
  // 30px ごとの区画に景色を1つ置く
  const slot = 46;
  const first = Math.floor((d * PX_PER_KM - BIKE_X) / slot) - 2;
  for (let k = first; k < first + RW / slot + 4; k++) {
    const sx = k * slot - d * PX_PER_KM + BIKE_X;
    const km = (k * slot) / PX_PER_KM;
    const seg = segAt(km);
    const dense = seg && seg.scenery && (seg.scenery[0] === "forest" || seg.scenery[0] === "metasequoia" || seg.scenery[0] === "buildings");
    if (!seg || !seg.scenery || hash(k) < (dense ? 0.05 : 0.35)) continue;
    if (Math.min(seg._local, seg.km - seg._local) < 0.15) continue;
    const kind = seg.scenery[Math.floor(hash(k + 0.5) * seg.scenery.length)];
    if ((kind === "crane" || kind === "torii" || kind === "temple" || kind === "onsen") && hash(k + 2) < 0.75) continue;
    OBJECTS[kind](p, sx, ROAD_Y - 4, k, night);
  }
}

// ---------- 道と橋 ----------

function drawLandRoad(p, x0, x1, h, blue = true) {
  if (x1 <= 0 || x0 >= RW) return;
  x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(RW, Math.ceil(x1));
  const w = x1 - x0;
  p.rect(x0, ROAD_Y - 6, w, 6, "#6a9a4a"); // 草
  p.rect(x0, ROAD_Y, w, RH - ROAD_Y, "#5a5a62"); // 道
  p.rect(x0, ROAD_Y, w, 1, "#8a8a92");
  if (blue) p.rect(x0, ROAD_Y + 18, w, 2, "#2f7fd8"); // 自転車道のブルーライン
  else p.rect(x0, ROAD_Y + 18, w, 1, "#e8e8e8"); // 白線
  p.rect(x0, RH - 6, w, 6, "#4a4a52");
}

function drawGuardrail(p, x0, x1, d) {
  if (x1 <= 0 || x0 >= RW) return;
  const a = Math.max(0, x0), b = Math.min(RW, x1);
  p.rect(a, ROAD_Y - 14, b - a, 3, "#e8e8e8");
  p.rect(a, ROAD_Y - 12, b - a, 1, "#b8b8b8");
  const off = Math.floor(d * PX_PER_KM) % 24;
  for (let x = -off; x < RW; x += 24) if (x >= a && x < b) p.rect(x, ROAD_Y - 14, 2, 12, "#c8c8c8");
}

function drawDeck(p, x0, x1, color, d) {
  if (x1 <= 0 || x0 >= RW) return;
  const a = Math.max(0, Math.floor(x0)), b = Math.min(RW, Math.ceil(x1));
  const w = b - a;
  // 奥の手すり
  p.rect(a, ROAD_Y - 16, w, 2, color);
  const off = Math.floor(d * PX_PER_KM) % 8;
  for (let x = -off; x < RW; x += 8) if (x >= a && x < b) p.rect(x, ROAD_Y - 16, 1, 16, shade(color, -0.15));
  // 路面と桁
  p.rect(a, ROAD_Y, w, 18, "#6a6a72");
  p.rect(a, ROAD_Y, w, 1, "#9a9aa2");
  p.rect(a, ROAD_Y + 14, w, 2, "#2f7fd8");
  p.rect(a, ROAD_Y + 18, w, 10, shade(color, -0.1));
  p.rect(a, ROAD_Y + 18, w, 1, shade(color, 0.2));
  p.rect(a, ROAD_Y + 27, w, 1, shade(color, -0.35));
  // 桁のトラス
  const off2 = Math.floor(d * PX_PER_KM) % 12;
  for (let x = -off2; x < RW; x += 12) if (x >= a && x < b - 6) p.line(x, ROAD_Y + 19, x + 6, ROAD_Y + 26, shade(color, -0.25));
}

function drawFrontRail(p, x0, x1, color, d) {
  if (x1 <= 0 || x0 >= RW) return;
  const a = Math.max(0, Math.floor(x0)), b = Math.min(RW, Math.ceil(x1));
  p.rect(a, RH - 14, b - a, 2, color);
  const off = Math.floor(d * PX_PER_KM * 1.1) % 10;
  for (let x = -off; x < RW; x += 10) if (x >= a && x < b) p.rect(x, RH - 14, 2, 14, shade(color, -0.1));
}

// 橋の塔とケーブル
function drawBridgeStructure(p, seg, sx0, sx1, color) {
  const len = sx1 - sx0;
  const deckY = ROAD_Y - 2;
  const towerTop = 40;
  const tower = (x) => {
    if (x < -20 || x > RW + 20) return;
    p.rect(x - 4, towerTop, 8, deckY - towerTop + 30, color);
    p.rect(x - 4, towerTop, 2, deckY - towerTop + 30, shade(color, 0.3));
    p.rect(x + 2, towerTop, 2, deckY - towerTop + 30, shade(color, -0.25));
    for (let y = towerTop + 20; y < deckY; y += 40) p.rect(x - 6, y, 12, 3, shade(color, -0.15));
    p.rect(x - 5, towerTop - 3, 10, 3, shade(color, -0.1));
    p.px(x, towerTop - 4, "#e84040"); // 航空灯
  };
  const type = seg.bridge.type;
  if (type === "suspension" || type === "triple") {
    const spans = type === "triple" ? 3 : 1;
    const xs = [];
    for (let i = 0; i <= spans; i++) xs.push(sx0 + len * (0.12 + (0.76 * i) / spans));
    // メインケーブルとハンガー
    const cableC = shade(color, -0.2);
    const pts = [{ x: sx0, y: deckY - 4 }];
    for (const x of xs) pts.push({ x, y: towerTop + 2 });
    pts.push({ x: sx1, y: deckY - 4 });
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], B = pts[i + 1];
      const end = i === 0 || i === pts.length - 2;
      for (let x = Math.max(-2, Math.floor(A.x)); x < Math.min(RW + 2, B.x); x++) {
        const t = (x - A.x) / (B.x - A.x);
        const sag = end ? 0 : Math.sin(Math.PI * t) * (deckY - towerTop - 22);
        const y = A.y + (B.y - A.y) * t + sag;
        p.rect(x, y, 1, 2, cableC);
        if (x % 6 === 0 && y < deckY - 4) p.rect(x, y + 2, 1, deckY - y - 4, shade(color, -0.05));
      }
    }
    for (const x of xs) tower(x);
  } else if (type === "stayed") {
    const xs = [sx0 + len * 0.28, sx0 + len * 0.72];
    for (const x of xs) {
      for (let i = 1; i <= 9; i++) {
        const top = towerTop + 6 + i * 3;
        p.line(x, top, x - i * 16, deckY - 4, shade(color, -0.15));
        p.line(x, top, x + i * 16, deckY - 4, shade(color, -0.15));
      }
      tower(x);
    }
  } else if (type === "arch") {
    for (let x = Math.max(0, Math.floor(sx0)); x < Math.min(RW, sx1); x++) {
      const t = (x - sx0) / len;
      const y = deckY - Math.sin(Math.PI * t) * 70;
      p.rect(x, y, 1, 4, color);
      p.rect(x, y, 1, 1, shade(color, 0.3));
      if ((x - Math.floor(sx0)) % 10 === 0 && y < deckY - 6) p.rect(x, y + 4, 1, deckY - y - 6, shade(color, -0.1));
    }
  }
}

function drawSign(p, x, text) {
  if (x < -80 || x > RW + 10) return;
  p.rect(x, ROAD_Y - 40, 2, 40, "#8a8a8a");
  p.rect(x + 50, ROAD_Y - 40, 2, 40, "#8a8a8a");
  const w = Math.max(54, text.length * 10 + 10);
  p.rect(x - 2, ROAD_Y - 58, w, 20, "#2f6fb8");
  p.rect(x - 1, ROAD_Y - 57, w - 2, 18, "#2f6fb8");
  p.rect(x, ROAD_Y - 56, w - 4, 1, "#ffffff");
  p.rect(x, ROAD_Y - 41, w - 4, 1, "#ffffff");
  p.text(text, x + 4, ROAD_Y - 54, "#ffffff", 10);
}

function drawFerry(p, t) {
  const bob = Math.round(Math.sin(t / 400) * 1);
  const y = ROAD_Y + bob;
  p.rect(BIKE_X - 70, y, 300, 34, "#f2f2ee");
  p.rect(BIKE_X - 70, y, 300, 2, "#c8c8c0");
  p.rect(BIKE_X - 70, y + 14, 300, 4, "#2f6fb8");
  p.rect(BIKE_X - 60, y + 30, 280, 4, "#8a2a2a");
  p.rect(BIKE_X + 170, y - 40, 40, 40, "#f2f2ee");
  p.rect(BIKE_X + 174, y - 34, 32, 10, "#5a8aa8");
  p.rect(BIKE_X + 168, y - 44, 44, 4, "#2f6fb8");
  // 波しぶき
  for (let i = 0; i < 6; i++) p.rect(BIKE_X - 74 - ((t / 40 + i * 7) % 30), y + 26 + (i % 3), 4, 1, "#ffffff");
}

// ---------- 名所 ----------

function drawLandmark(p, type, x, h) {
  if (x < -140 || x > RW + 140) return;
  const water = ROAD_Y - 30;
  if (type === "lakeTorii") {
    // 湖の中に立つ朱色の鳥居
    const c = "#d4402e", y = water + 4;
    p.rect(x - 22, y - 58, 6, 58, c); p.rect(x + 16, y - 58, 6, 58, c);
    p.rect(x - 32, y - 66, 64, 5, "#2a2a2a");
    p.rect(x - 30, y - 61, 60, 3, c);
    p.rect(x - 26, y - 50, 52, 4, c);
    p.rect(x - 4, y - 61, 8, 11, c);
    for (let i = 0; i < 4; i++) p.rect(x - 26 + i * 12, y + 2 + (i % 2), 10, 1, "rgba(212,64,46,0.5)"); // 水面に映る
  } else if (type === "castle") {
    const y = ROAD_Y - 40;
    p.rect(x - 50, y + 10, 100, 30, "#8a8a80"); // 石垣
    for (let i = 0; i < 8; i++) p.rect(x - 50 + i * 13, y + 10 + (i % 2) * 8, 12, 1, "#6a6a60");
    const tier = (w, yy) => {
      p.rect(x - w / 2, yy, w, 14, "#f6f2e8");
      p.rect(x - w / 2 - 6, yy - 4, w + 12, 4, "#3a4a5a");
      p.rect(x - w / 2 - 2, yy - 6, w + 4, 2, "#4a5a6a");
      for (let k = -w / 2 + 4; k < w / 2 - 4; k += 8) p.rect(x + k, yy + 4, 3, 4, "#3a3a3a");
    };
    tier(70, y - 4); tier(52, y - 22); tier(34, y - 40);
    p.rect(x - 20, y - 50, 40, 4, "#3a4a5a");
    p.rect(x - 22, y - 54, 4, 4, "#d8b24c"); p.rect(x + 18, y - 54, 4, 4, "#d8b24c"); // しゃちほこ
  } else if (type === "sailboat") {
    // 霞ヶ浦の帆引き船：大きな白い帆
    const y = water;
    p.rect(x - 30, y, 60, 6, "#5a3a22");
    p.rect(x - 26, y + 6, 52, 2, "#3a2a1a");
    p.rect(x - 1, y - 70, 2, 70, "#5a3a22");
    for (let i = 0; i < 62; i++) {
      const w = 20 + Math.sin((i / 62) * Math.PI) * 30;
      p.rect(x - w, y - 68 + i, w * 2, 1, i % 12 === 0 ? "#d8d4c8" : "#f6f4ee");
    }
    p.rect(x - 50, y - 68, 100, 1, "#5a3a22");
  } else if (type === "enoshima") {
    const y = HORIZON + 10;
    const c = dayPick(h, "#4f8a5a", "#4a5a4a", "#16261e");
    for (let i = -60; i < 60; i++) {
      const hgt = Math.max(0, 30 - (i * i) / 120);
      p.rect(x + i, y - hgt, 1, hgt, c);
    }
    p.rect(x + 4, y - 50, 4, 22, "#e8e8e8"); // 展望灯台
    p.rect(x + 1, y - 52, 10, 4, "#c8c8c8");
  }
}

// ---------- 全体 ----------

export function drawRideScene(p, ride, t) {
  const d = ride.dist;
  const h = ride.hour();
  const segAt = (km) => ride.segmentAt(km);

  drawSky(p, h, d, t);
  drawSea(p, h, d, t);
  drawFar(p, h, d, ride.route.far);
  drawHills(p, h, d, segAt);

  // 画面に見えている区間ごとに道や橋を描く
  const leftKm = d - BIKE_X / PX_PER_KM, rightKm = d + (RW - BIKE_X) / PX_PER_KM;
  const visible = ride.segmentsBetween(leftKm - 0.3, rightKm + 0.3);
  for (const s of visible) {
    const x0 = BIKE_X + (s.start - d) * PX_PER_KM, x1 = BIKE_X + (s.start + s.seg.km - d) * PX_PER_KM;
    if (s.seg.kind === "bridge") drawBridgeStructure(p, s.seg, x0, x1, s.seg.bridge.color);
    if (s.seg.landmark) drawLandmark(p, s.seg.landmark.type, x0 + (x1 - x0) * s.seg.landmark.at, h);
  }
  drawRoadside(p, h, d, segAt);
  for (const s of visible) {
    const x0 = BIKE_X + (s.start - d) * PX_PER_KM, x1 = BIKE_X + (s.start + s.seg.km - d) * PX_PER_KM;
    if (s.seg.kind === "bridge") drawDeck(p, x0, x1, s.seg.bridge.color, d);
    else if (s.seg.kind !== "ferry") { drawLandRoad(p, x0, x1, h, ride.route.blueLine); if (s.seg.kind !== "city") drawGuardrail(p, x0, x1, d); }
  }
  for (const s of visible) {
    const x0 = BIKE_X + (s.start - d) * PX_PER_KM;
    if (s.seg.kind !== "ferry" && s.index > 0) drawSign(p, x0 + 20, s.seg.name);
  }
  if (ride.segment().kind === "ferry") drawFerry(p, t);
}

export function drawForeground(p, ride, t) {
  const d = ride.dist;
  const leftKm = d - BIKE_X / PX_PER_KM, rightKm = d + (RW - BIKE_X) / PX_PER_KM;
  for (const s of ride.segmentsBetween(leftKm - 0.3, rightKm + 0.3)) {
    if (s.seg.kind !== "bridge") continue;
    const x0 = BIKE_X + (s.start - d) * PX_PER_KM, x1 = BIKE_X + (s.start + s.seg.km - d) * PX_PER_KM;
    drawFrontRail(p, x0, x1, s.seg.bridge.color, d);
  }
  const tn = tint(ride.hour());
  if (tn) { p.ctx.fillStyle = tn; p.ctx.fillRect(0, 0, RW, RH); }
}

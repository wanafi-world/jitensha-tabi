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

function drawFarIslands(p, h, d) {
  const off = d * PX_PER_KM * 0.05;
  const base = h >= 7 && h < 17 ? "#7ba3b8" : h < 19 && h >= 5.5 ? "#8a7aa0" : "#1f2a48";
  const near = h >= 7 && h < 17 ? "#5f8fa0" : h < 19 && h >= 5.5 ? "#6a5a80" : "#18203a";
  for (let sx = 0; sx < RW; sx++) {
    const wx = (sx + off) / 70;
    const n = noise(wx) * 0.7 + noise(wx * 2.3) * 0.3;
    const hgt = Math.max(0, (n - 0.42) * 70);
    if (hgt > 0) p.rect(sx, HORIZON - hgt, 1, hgt + 1, base);
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
  const g1 = h >= 7 && h < 17 ? "#5f9a5a" : h < 19 && h >= 5.5 ? "#5a7a4a" : "#1f3328";
  const g2 = shade(g1, -0.18);
  for (let sx = 0; sx < RW; sx += 1) {
    const km = d + (sx - BIKE_X) / (PX_PER_KM * f);
    const seg = segAt(km);
    if (!seg || seg.kind === "bridge" || seg.kind === "ferry") continue;
    // 区間の端ほど低くして海岸線にする
    const edge = Math.min(seg._local, seg.km - seg._local);
    const fall = Math.min(1, edge / 0.6);
    const n = noise(km * 3) * 0.6 + noise(km * 9) * 0.4;
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

const OBJECTS = { houses: house, citrus: (p, x, y, s) => citrus(p, x, y, s, "#f29a1a"), lemon: (p, x, y, s) => citrus(p, x, y, s, "#f2e23a"), crane, torii, salt: saltPile, beach, temple, towel: towelShop };

function drawRoadside(p, h, d, segAt) {
  const night = h < 5.5 || h > 18.7;
  // 30px ごとの区画に景色を1つ置く
  const slot = 46;
  const first = Math.floor((d * PX_PER_KM - BIKE_X) / slot) - 2;
  for (let k = first; k < first + RW / slot + 4; k++) {
    const sx = k * slot - d * PX_PER_KM + BIKE_X;
    const km = (k * slot) / PX_PER_KM;
    const seg = segAt(km);
    if (!seg || !seg.scenery || hash(k) < 0.35) continue;
    if (Math.min(seg._local, seg.km - seg._local) < 0.15) continue;
    const kind = seg.scenery[Math.floor(hash(k + 0.5) * seg.scenery.length)];
    if ((kind === "crane" || kind === "torii" || kind === "temple") && hash(k + 2) < 0.75) continue;
    OBJECTS[kind](p, sx, ROAD_Y - 4, k, night);
  }
}

// ---------- 道と橋 ----------

function drawLandRoad(p, x0, x1, h) {
  if (x1 <= 0 || x0 >= RW) return;
  x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(RW, Math.ceil(x1));
  const w = x1 - x0;
  p.rect(x0, ROAD_Y - 6, w, 6, "#6a9a4a"); // 草
  p.rect(x0, ROAD_Y, w, RH - ROAD_Y, "#5a5a62"); // 道
  p.rect(x0, ROAD_Y, w, 1, "#8a8a92");
  p.rect(x0, ROAD_Y + 18, w, 2, "#2f7fd8"); // しまなみのブルーライン
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

// ---------- 全体 ----------

export function drawRideScene(p, ride, t) {
  const d = ride.dist;
  const h = ride.hour();
  const segAt = (km) => ride.segmentAt(km);

  drawSky(p, h, d, t);
  drawSea(p, h, d, t);
  drawFarIslands(p, h, d);
  drawHills(p, h, d, segAt);

  // 画面に見えている区間ごとに道や橋を描く
  const leftKm = d - BIKE_X / PX_PER_KM, rightKm = d + (RW - BIKE_X) / PX_PER_KM;
  const visible = ride.segmentsBetween(leftKm - 0.3, rightKm + 0.3);
  for (const s of visible) {
    const x0 = BIKE_X + (s.start - d) * PX_PER_KM, x1 = BIKE_X + (s.start + s.seg.km - d) * PX_PER_KM;
    if (s.seg.kind === "bridge") drawBridgeStructure(p, s.seg, x0, x1, s.seg.bridge.color);
  }
  drawRoadside(p, h, d, segAt);
  for (const s of visible) {
    const x0 = BIKE_X + (s.start - d) * PX_PER_KM, x1 = BIKE_X + (s.start + s.seg.km - d) * PX_PER_KM;
    if (s.seg.kind === "bridge") drawDeck(p, x0, x1, s.seg.bridge.color, d);
    else if (s.seg.kind !== "ferry") { drawLandRoad(p, x0, x1, h); drawGuardrail(p, x0, x1, d); }
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

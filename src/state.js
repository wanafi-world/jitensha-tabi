// セーブデータと性能計算
import { STARTER, itemById, PART_SLOTS, OUTFIT_SLOTS } from "./data.js";

const KEY = "jitensha-tabi-save-v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.bike && s.outfit && Array.isArray(s.owned)) return { ...structuredClone(STARTER), ...s };
    }
  } catch (_) { /* 保存できない環境でも遊べるようにする */ }
  return structuredClone(STARTER);
}

export function saveState(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (_) {
    // 容量オーバーのときは古い写真を減らしてもう一度
    try { s.posts = s.posts.slice(0, 6); localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* noop */ }
  }
}

export function resetState() {
  try { localStorage.removeItem(KEY); } catch (_) { /* noop */ }
  return structuredClone(STARTER);
}

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

// パーツごとの効き具合
const SPEED_W = { frame: 2, wheels: 1.5, tires: 1.2, group: 1, bar: 0.6, saddle: 0.3 };
const COMFORT_W = { frame: 1.5, wheels: 0.5, tires: 1.5, group: 0.3, bar: 1, saddle: 1.5 };
const DUR_W = { frame: 1.5, wheels: 1, tires: 2, group: 1, bar: 0.3, saddle: 0.3 };

function weighted(items, key, weights) {
  let sum = 0, w = 0;
  for (const [slot, it] of items) { sum += it[key] * weights[slot]; w += weights[slot]; }
  return w ? sum / w : 0;
}

// ステム、シートポスト、チェーンなど細かい部品の重さ
const MISC_WEIGHT = 1.3;

export function bikeWeight(bike) {
  const parts = PART_SLOTS.reduce((s, { id }) => s + (itemById(bike[id])?.weight ?? 0), 0);
  return parts ? parts + MISC_WEIGHT : 0;
}

export function isComplete(map, slots) {
  return slots.every(({ id }) => map[id]);
}

// 0〜100 の5つの性能
export function computeStats(bike, outfit) {
  const parts = PART_SLOTS.map(({ id }) => [id, itemById(bike[id])]).filter(([, it]) => it);
  const clothes = OUTFIT_SLOTS.map(({ id }) => itemById(outfit[id])).filter(Boolean);
  const avg = (arr, k) => (arr.length ? arr.reduce((s, it) => s + it[k], 0) / arr.length : 0);
  const fullW = Object.values(SPEED_W).reduce((a, b) => a + b, 0);
  const coverage = parts.reduce((s, [slot]) => s + SPEED_W[slot], 0) / fullW;

  const weight = bikeWeight(bike);
  const aero = avg(clothes, "aero");
  return {
    weight,
    speed: clamp((weighted(parts, "speed", SPEED_W) * 8.5 + aero * 1.5) * coverage),
    light: parts.length === PART_SLOTS.length ? clamp(((11.5 - weight) / 5) * 100) : 0,
    comfort: clamp((weighted(parts, "comfort", COMFORT_W) * 7 + avg(clothes, "comfort") * 3) * coverage),
    durability: clamp(weighted(parts, "durability", DUR_W) * 10 * coverage),
    style: clamp(avg([...parts.map(([, it]) => it), ...clothes], "style") * 10),
  };
}

export const STAT_LABELS = [
  ["speed", "速さ"], ["light", "軽さ"], ["comfort", "快適さ"], ["durability", "丈夫さ"], ["style", "映え"],
];

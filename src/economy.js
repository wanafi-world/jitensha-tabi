// お金まわり：SNSの収益、リサイクルショップ
import { ALL_ITEMS, itemById } from "./data.js";

export const LIKE_VALUE = 20; // 1いいね = 20円（広告収入やスポンサーのイメージ）

// フォロワーが多いほど写真に「いいね」が付きやすい
export const followerBoost = (followers) => 1 + Math.min(2, followers / 2000);

// 旅の写真を投稿して収益とフォロワーを得る
export function postPhotos(state, photos, routeName) {
  const likes = photos.reduce((s, p) => s + p.likes, 0);
  const income = likes * LIKE_VALUE;
  const newFollowers = Math.round(likes / 4 + photos.length * 3);
  state.money += income;
  state.earnings += income;
  state.likes += likes;
  state.followers += newFollowers;
  const posts = photos.map((p) => ({
    spot: p.spot, likes: p.likes, img: p.thumb, route: routeName, day: state.day, timeLabel: p.timeLabel,
  }));
  state.posts = [...posts.reverse(), ...state.posts].slice(0, 24);
  return { likes, income, newFollowers };
}

// ---------- リサイクルショップ ----------

// 決まった乱数（その日の品ぞろえがリロードで変わらないように）
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// 日が変わると品ぞろえが入れ替わる
export function recycleStock(state) {
  if (state.recycle && state.recycle.day === state.day) return state.recycle;
  const r = rng(state.day * 7919 + 13);
  const pool = ALL_ITEMS.filter((it) => it.price > 0);
  const picks = [];
  const n = 5 + Math.floor(r() * 2);
  while (picks.length < n && picks.length < pool.length) {
    const it = pool[Math.floor(r() * pool.length)];
    if (picks.some((p) => p.id === it.id)) continue;
    // ふつうは新品の5〜7割。たまに掘り出し物（3割前後）
    const lucky = r() < 0.18;
    const rate = lucky ? 0.25 + r() * 0.12 : 0.5 + r() * 0.2;
    picks.push({ id: it.id, price: Math.round((it.price * rate) / 100) * 100, lucky, sold: false });
  }
  state.recycle = { day: state.day, stock: picks };
  return state.recycle;
}

// 持っているものを売ると新品の3割
export const sellPrice = (id) => Math.round((itemById(id).price * 0.3) / 100) * 100;

export const isEquipped = (state, id) => Object.values(state.bike).includes(id) || Object.values(state.outfit).includes(id);

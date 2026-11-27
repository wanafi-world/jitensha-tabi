// ショップ（新品）とリサイクルショップ、SNSの画面
import { PART_SLOTS, OUTFIT_SLOTS, ALL_ITEMS, itemById } from "./data.js";
import { computeStats, STAT_LABELS } from "./state.js";
import { recycleStock, sellPrice, isEquipped, LIKE_VALUE, followerBoost } from "./economy.js";

const $ = (sel) => document.querySelector(sel);
const yen = (n) => "¥" + n.toLocaleString("ja-JP");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ALL_SLOTS = [...PART_SLOTS, ...OUTFIT_SLOTS];
const isPart = (slot) => PART_SLOTS.some((s) => s.id === slot);

export const swatchOf = (it) => it.color || it.rimColor || it.tireColor || it.metal || it.tape || it.saddleColor || (it.colors && it.colors[0]);

export class StoreScreen {
  constructor({ getState, save, toast, onChange }) {
    this.getState = getState;
    this.save = save;
    this.toast = toast;
    this.onChange = onChange;
    this.mode = "shop"; // shop | recycle
    this.tab = "frame"; // shop のカテゴリ／recycle は buy | sell
    this.preview = null; // { slot, id, price, source }
    $("#store-buy").onclick = () => this.buy();
  }

  open(mode, focusId) {
    this.mode = mode;
    this.preview = null;
    if (mode === "shop") {
      const it = focusId && itemById(focusId);
      this.tab = it ? it.slot : (ALL_SLOTS.some((s) => s.id === this.tab) ? this.tab : "frame");
      if (it) this.select(it.id, it.price, "shop");
    } else {
      this.tab = "buy";
    }
    this.render();
  }

  // 作業場の絵に試しに付けた状態を見せる
  maps() {
    const st = this.getState();
    const bike = { ...st.bike }, outfit = { ...st.outfit };
    if (this.preview) (isPart(this.preview.slot) ? bike : outfit)[this.preview.slot] = this.preview.id;
    return { bike, outfit };
  }

  select(id, price, source) {
    const it = itemById(id);
    this.preview = { slot: it.slot, id, price, source };
    this.render();
  }

  buy() {
    const st = this.getState();
    const pv = this.preview;
    if (!pv || st.owned.includes(pv.id)) return;
    if (st.money < pv.price) { this.toast("お金が足りません"); return; }
    st.money -= pv.price;
    st.owned.push(pv.id);
    if (pv.source === "recycle") {
      const s = st.recycle.stock.find((x) => x.id === pv.id);
      if (s) s.sold = true;
    }
    (isPart(pv.slot) ? st.bike : st.outfit)[pv.slot] = pv.id; // 買ったらすぐ付ける
    const it = itemById(pv.id);
    this.toast(`${it.brand} ${it.name} を買って付けました`);
    this.preview = null;
    this.save();
    this.onChange();
    this.render();
  }

  sell(id) {
    const st = this.getState();
    if (isEquipped(st, id)) return;
    const price = sellPrice(id);
    st.owned = st.owned.filter((x) => x !== id);
    st.money += price;
    const it = itemById(id);
    this.toast(`${it.name} を ${yen(price)} で売りました`);
    this.save();
    this.onChange();
    this.render();
  }

  render() {
    const st = this.getState();
    const isShop = this.mode === "shop";
    $("#store-title").textContent = isShop ? "サイクルショップ" : "リサイクルショップ";
    $("#store-tip").textContent = isShop
      ? "新品のパーツと服。選ぶと作業場の自転車で試せます。"
      : `${st.day}日目の品ぞろえ。旅やバイトで日が進むと入れ替わります。掘り出し物があるかも。`;

    // タブ
    const tabs = $("#store-tabs");
    tabs.innerHTML = "";
    const tabList = isShop ? ALL_SLOTS.map((s) => [s.id, s.label]) : [["buy", "買う"], ["sell", "売る"]];
    for (const [id, label] of tabList) {
      const b = document.createElement("button");
      b.className = "tab" + (id === this.tab ? " active" : "");
      b.textContent = label;
      b.onclick = () => { this.tab = id; this.preview = null; this.render(); };
      tabs.appendChild(b);
    }

    // 品物
    const list = $("#store-items");
    list.innerHTML = "";
    let rows = [];
    if (isShop) {
      rows = ALL_ITEMS.filter((it) => it.slot === this.tab && it.price > 0).map((it) => ({ it, price: it.price }));
    } else if (this.tab === "buy") {
      rows = recycleStock(st).stock.map((s) => ({ it: itemById(s.id), price: s.price, lucky: s.lucky, sold: s.sold }));
    } else {
      rows = st.owned.map(itemById).filter((it) => it.price > 0).map((it) => ({ it, price: sellPrice(it.id), sell: true }));
      if (!rows.length) list.innerHTML = `<li class="empty-note">売れるものはまだありません</li>`;
    }
    for (const row of rows) {
      const { it, price } = row;
      const owned = st.owned.includes(it.id);
      const equipped = isEquipped(st, it.id);
      const li = document.createElement("li");
      const selected = this.preview?.id === it.id;
      li.className = "item" + (selected ? " equipped" : "") + ((owned && !row.sell) || row.sold ? " locked" : "");
      const off = !isShop && !row.sell ? Math.round((1 - price / it.price) * 100) : 0;
      let right;
      if (row.sell) right = equipped ? "装着中" : `売る ${yen(price)}`;
      else if (row.sold) right = "売り切れ";
      else if (owned) right = "持っている";
      else right = `${yen(price)}${off ? `<small>${off}%引き</small>` : ""}`;
      li.innerHTML = `
        <span class="swatch" style="background:${swatchOf(it)}"></span>
        <span class="meta">
          <span class="brand">${esc(it.brand)}${row.lucky && !row.sold ? ' <b class="lucky">掘り出し物！</b>' : ""}${!isShop && !row.sell ? ` ・${ALL_SLOTS.find((s) => s.id === it.slot).label}` : ""}</span>
          <span class="name">${esc(it.name)}</span>
          <span class="note">${row.sell ? "" : `新品 ${yen(it.price)}・`}${esc(it.note)}</span>
        </span>
        <span class="state">${right}</span>`;
      if (row.sell) {
        if (!equipped) li.onclick = () => this.sell(it.id);
        else li.classList.add("locked");
      } else if (!owned && !row.sold) {
        li.onclick = () => this.select(it.id, price, isShop ? "shop" : "recycle");
      }
      list.appendChild(li);
    }

    // 試したときの性能の変化と購入ボタン
    const box = $("#store-compare");
    const buyBtn = $("#store-buy");
    if (this.preview) {
      const now = computeStats(st.bike, st.outfit);
      const m = this.maps();
      const next = computeStats(m.bike, m.outfit);
      box.innerHTML = STAT_LABELS.map(([k, label]) => {
        const d = next[k] - now[k];
        return `<div class="stat"><span class="label">${label}</span><span class="bar"><span style="width:${next[k]}%"></span></span>
          <span class="val">${next[k]}${d ? `<em class="${d > 0 ? "up" : "down"}">${d > 0 ? "+" : ""}${d}</em>` : ""}</span></div>`;
      }).join("");
      const it = itemById(this.preview.id);
      buyBtn.hidden = false;
      buyBtn.disabled = st.money < this.preview.price;
      buyBtn.textContent = st.money < this.preview.price ? `お金が足りない（${yen(this.preview.price)}）` : `${it.name} を ${yen(this.preview.price)} で買う`;
    } else {
      box.innerHTML = `<p class="tip">品物を選ぶと、付けたときの性能が見られます。</p>`;
      buyBtn.hidden = true;
    }
    $("#money").textContent = yen(st.money);
  }
}

// ---------- SNS ----------

export function renderSns(st) {
  const boost = followerBoost(st.followers);
  $("#sns-profile").innerHTML = `
    <div class="sns-head">
      <span class="avatar"></span>
      <div><b>@jitensha_tabi</b><span>自転車で日本をめぐってます 🚲</span></div>
    </div>
    <div class="sns-nums">
      <div><b>${st.posts.length}</b><span>投稿</span></div>
      <div><b>${st.followers.toLocaleString("ja-JP")}</b><span>フォロワー</span></div>
      <div><b>${st.likes.toLocaleString("ja-JP")}</b><span>いいね</span></div>
    </div>
    <p class="tip">旅先で撮った写真は、旅の終わりに自動で投稿されます。1いいね ${LIKE_VALUE}円の収入。フォロワーが多いほど次の写真に「いいね」が付きやすくなります（いまは ×${boost.toFixed(2)}）。</p>
    <p class="tip">これまでの収入 <b>${yen(st.earnings)}</b></p>`;
  const tl = $("#sns-timeline");
  tl.innerHTML = st.posts.length
    ? st.posts.map((p) => `<figure><img src="${p.img}" alt=""><figcaption><b>${esc(p.spot)}</b>${p.timeLabel ? ` ・${esc(p.timeLabel)}` : ""}<br><span>${esc(p.route)}・${p.day}日目</span><em>❤ ${p.likes}</em></figcaption></figure>`).join("")
    : `<p class="tip">まだ投稿がありません。旅に出て、撮影スポットで写真を撮ろう。</p>`;
}

import { PART_SLOTS, OUTFIT_SLOTS, ALL_ITEMS, itemById } from "./data.js";
import { Pixel } from "./pixel.js";
import { drawBike, drawRider, drawWorkshop, hitPart, slotRegions, GROUND, RIDER_X, BIKE_OX_ALONE, BIKE_OX_RIDER } from "./draw.js";
import { loadState, saveState, resetState, computeStats, isComplete, STAT_LABELS } from "./state.js";
import { ROUTES, routeById } from "./routes.js";
import { RideScreen } from "./rideScreen.js";
import { StoreScreen, renderSns } from "./store.js";
import { JobScreen, JOBS } from "./jobs.js";

const canvas = document.getElementById("scene");
const p = new Pixel(canvas);
const $ = (sel) => document.querySelector(sel);

let state = loadState();
let screen = "title"; // title | assemble | outfit | route | ride | shop | recycle | sns | jobs | job
let lastT = 0;
let slot = "frame";
let particles = [];
let prevStats = computeStats(state.bike, state.outfit);

const yen = (n) => "¥" + n.toLocaleString("ja-JP");

// ---------- 描画ループ ----------

const withRider = () => !["title", "assemble"].includes(screen);

function bikeOx() {
  return withRider() ? BIKE_OX_RIDER : BIKE_OX_ALONE;
}

function drawBrackets(r, c) {
  const L = 5;
  const { x, y, w, h } = r;
  p.rect(x, y, L, 1, c); p.rect(x, y, 1, L, c);
  p.rect(x + w - L, y, L, 1, c); p.rect(x + w - 1, y, 1, L, c);
  p.rect(x, y + h - 1, L, 1, c); p.rect(x, y + h - L, 1, L, c);
  p.rect(x + w - L, y + h - 1, L, 1, c); p.rect(x + w - 1, y + h - L, 1, L, c);
}

function frame(t) {
  const dt = lastT ? (t - lastT) / 1000 : 0;
  lastT = t;
  if (screen === "ride") {
    rideScreen.frame(t, dt);
    rideScreen.checkFlat();
    requestAnimationFrame(frame);
    return;
  }
  if (screen === "job") {
    jobScreen.frame(t, dt);
    requestAnimationFrame(frame);
    return;
  }
  drawWorkshop(p, t);
  const ox = bikeOx();
  // ショップでは選んだ品物を試しに付けた姿を見せる
  const look = screen === "shop" || screen === "recycle" ? store.maps() : state;
  // タイトル画面ではホイールがゆっくり回る
  const spin = screen === "title" ? t / 900 : 0;
  drawBike(p, look.bike, { ox, spin, crank: screen === "title" ? t / 900 : 0.6 });
  if (withRider()) drawRider(p, look.outfit, RIDER_X, GROUND);

  if (screen === "assemble" && Math.floor(t / 400) % 2 === 0) {
    for (const r of slotRegions(slot, ox)) drawBrackets(r, "#e8622c");
  }

  // パーツを付けたときの火花
  particles = particles.filter((q) => q.life > 0);
  for (const q of particles) {
    q.x += q.vx; q.y += q.vy; q.vy += 0.08; q.life--;
    p.px(q.x, q.y, q.c);
  }
  requestAnimationFrame(frame);
}

function burst(regions, colors) {
  for (const r of regions) {
    for (let i = 0; i < 28; i++) {
      particles.push({
        x: r.x + Math.random() * r.w, y: r.y + Math.random() * r.h,
        vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 1.6,
        life: 20 + Math.random() * 15, c: colors[i % colors.length],
      });
    }
  }
}

// ---------- UI ----------

function setScreen(next) {
  screen = next;
  document.body.dataset.screen = next;
  for (const b of document.querySelectorAll("#nav button")) b.classList.toggle("active", b.dataset.go === next);
  $("#money").textContent = yen(state.money);
  if (next === "route") renderRoutes();
  if (next === "shop" || next === "recycle") store.open(next, pendingShopItem);
  pendingShopItem = null;
  if (next === "sns") renderSns(state);
  if (next === "jobs") renderJobs();
  if (next === "assemble" || next === "outfit") render();
  saveState(state);
}

let pendingShopItem = null;

const store = new StoreScreen({
  getState: () => state,
  save: () => saveState(state),
  toast: (m) => toast(m),
  onChange: () => { prevStats = computeStats(state.bike, state.outfit); },
});

function renderJobs() {
  const list = $("#jobs");
  list.innerHTML = "";
  for (const j of JOBS) {
    const li = document.createElement("li");
    li.className = "open";
    li.innerHTML = `<b>${j.icon} ${j.name}</b><span>${j.pay}</span><span>${j.note}</span>`;
    li.onclick = () => {
      setScreen("job");
      jobScreen.start(j.id, computeStats(state.bike, state.outfit));
    };
    list.appendChild(li);
  }
}

const jobScreen = new JobScreen({
  getState: () => state,
  save: () => saveState(state),
  onExit: () => setScreen("jobs"),
});

function renderRoutes() {
  const list = $("#routes");
  list.innerHTML = "";
  for (const r of ROUTES) {
    const li = document.createElement("li");
    li.className = r.available ? "open" : "";
    li.innerHTML = `<b>${r.name}</b><span>${r.summary}</span>${r.available ? "" : "<em>準備中</em>"}`;
    if (r.available) li.onclick = () => startRide(r.id);
    list.appendChild(li);
  }
  const trips = state.trips || [];
  $("#trip-count").textContent = trips.length ? `これまでの旅 ${trips.length} 回・いいね合計 ❤ ${state.likes || 0}` : "";
}

function startRide(id) {
  setScreen("ride");
  rideScreen.start(routeById(id), computeStats(state.bike, state.outfit));
}

const rideScreen = new RideScreen({
  getState: () => state,
  save: () => saveState(state),
  onExit: () => setScreen("assemble"),
});

function slotsForScreen() {
  return screen === "outfit" ? OUTFIT_SLOTS : PART_SLOTS;
}

function currentMap() {
  return screen === "outfit" ? state.outfit : state.bike;
}

function render() {
  $("#money").textContent = yen(state.money);
  const slots = slotsForScreen();
  if (!slots.some((s) => s.id === slot)) slot = slots[0].id;

  // タブ
  const tabs = $("#tabs");
  tabs.innerHTML = "";
  for (const s of slots) {
    const b = document.createElement("button");
    b.className = "tab" + (s.id === slot ? " active" : "") + (currentMap()[s.id] ? "" : " empty");
    b.textContent = s.label;
    b.onclick = () => { slot = s.id; render(); };
    tabs.appendChild(b);
  }

  // アイテム一覧
  const list = $("#items");
  list.innerHTML = "";
  const equipped = currentMap()[slot];
  for (const it of ALL_ITEMS.filter((i) => i.slot === slot)) {
    const owned = state.owned.includes(it.id);
    const li = document.createElement("li");
    li.className = "item" + (it.id === equipped ? " equipped" : "") + (owned ? "" : " locked");
    const sw = it.color || it.rimColor || it.tireColor || it.metal || it.tape || it.saddleColor || (it.colors && it.colors[0]);
    li.innerHTML = `
      <span class="swatch" style="background:${sw}"></span>
      <span class="meta">
        <span class="brand">${it.brand}</span>
        <span class="name">${it.name}</span>
        <span class="note">${it.note}</span>
      </span>
      <span class="state">${it.id === equipped ? "装着中" : owned ? "つける" : `${yen(it.price)} ▶`}</span>`;
    li.onclick = () => equip(it, owned);
    list.appendChild(li);
  }

  const removeBtn = $("#remove");
  removeBtn.disabled = !equipped;
  removeBtn.textContent = screen === "outfit" ? "ぬぐ" : "外す";

  // 性能
  const st = computeStats(state.bike, state.outfit);
  const box = $("#stats");
  box.innerHTML = "";
  for (const [k, label] of STAT_LABELS) {
    const diff = st[k] - prevStats[k];
    const row = document.createElement("div");
    row.className = "stat";
    row.innerHTML = `<span class="label">${label}</span>
      <span class="bar"><span style="width:${st[k]}%"></span></span>
      <span class="val">${st[k]}${diff ? `<em class="${diff > 0 ? "up" : "down"}">${diff > 0 ? "+" : ""}${diff}</em>` : ""}</span>`;
    box.appendChild(row);
  }
  $("#weight").textContent = st.weight ? `車体 ${st.weight.toFixed(1)} kg` : "";
  prevStats = st;

  // 次へボタン
  const next = $("#next");
  const ready = isComplete(currentMap(), slotsForScreen());
  next.disabled = !ready;
  next.textContent = screen === "outfit" ? "ルートをえらぶ ▶" : "服をえらぶ ▶";
  $("#back").hidden = screen !== "outfit";
  $("#hint").textContent = ready ? "" : "すべての部分をそろえると次へ進めます";

  saveState(state);
}

function equip(it, owned) {
  if (!owned) {
    pendingShopItem = it.id;
    setScreen("shop");
    return;
  }
  const map = currentMap();
  if (map[slot] === it.id) return;
  map[slot] = it.id;
  if (screen === "assemble") {
    burst(slotRegions(slot, bikeOx()), ["#ffe27a", "#ffffff", "#e8622c"]);
    toast("カチッ！");
  } else {
    burst([{ x: RIDER_X - 16, y: GROUND - 110, w: 32, h: 110 }], ["#ffe27a", "#ffffff", "#d8417a"]);
  }
  render();
}

function unequip() {
  const map = currentMap();
  if (!map[slot]) return;
  map[slot] = null;
  render();
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1600);
}

// キャンバスをタップするとそのパーツのタブに切り替わる
canvas.addEventListener("pointerdown", (e) => {
  if (screen !== "assemble") return;
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  const hit = hitPart(x, y, bikeOx());
  if (hit) { slot = hit; render(); }
});

$("#start").onclick = () => setScreen("assemble");
$("#remove").onclick = unequip;
$("#back").onclick = () => setScreen("assemble");
$("#next").onclick = () => setScreen(screen === "assemble" ? "outfit" : "route");
$("#route-back").onclick = () => setScreen("outfit");
for (const b of document.querySelectorAll("#nav button")) {
  b.onclick = () => {
    const go = b.dataset.go;
    if (go === "route" && !(isComplete(state.bike, PART_SLOTS) && isComplete(state.outfit, OUTFIT_SLOTS))) {
      toast("自転車と服をすべてそろえてから出発しよう");
      return;
    }
    setScreen(go);
  };
}
$("#reset").onclick = () => {
  state = resetState();
  prevStats = computeStats(state.bike, state.outfit);
  toast("最初からやり直します");
  setScreen("assemble");
};

document.fonts?.load('8px "DotGothic16"').finally(() => requestAnimationFrame(frame));
setScreen("title");

// 確認用（ブラウザのコンソールから触れる）
window.jitensha = { rideScreen, jobScreen, store, startRide, getState: () => state, routes: { routeById }, stats: () => computeStats(state.bike, state.outfit) };

// バイト：職種ごとのミニゲーム（キャンバス 480×270）
import { Pixel, shade } from "./pixel.js";
import { Ride } from "./ride.js";
import { drawRideScene, drawForeground, RW, RH, BIKE_X, ROAD_Y, PX_PER_KM } from "./scenery.js";
import { drawCyclist, drawRider, geometry, GROUND } from "./draw.js";

const $ = (sel) => document.querySelector(sel);
const yen = (n) => "¥" + n.toLocaleString("ja-JP");

export const JOBS = [
  { id: "repair", name: "自転車屋でパンク修理", pay: "1人 ¥600〜1,500 × 3人", note: "タイヤを外す、穴を探す、空気を入れる。タイミングよく押そう。", icon: "🔧" },
  { id: "delivery", name: "フードデリバリー", pay: "1件 ¥500〜1,600 × 3件", note: "自分の自転車で配達。速さと丈夫さが効く。障害物はジャンプでよける。", icon: "🍱" },
];

const g0 = geometry();
const OX = BIKE_X - g0.R.x;
const OY = ROAD_Y + 16 - GROUND;

export class JobScreen {
  constructor({ getState, save, onExit }) {
    this.canvas = $("#ride");
    this.p = new Pixel(this.canvas);
    this.getState = getState;
    this.save = save;
    this.onExit = onExit;
    this.game = null;
    this.holding = false;
    const down = (e) => { if (!this.active()) return; e.preventDefault?.(); this.holding = true; this.game?.press(); };
    const up = () => { if (!this.active()) return; if (this.holding) { this.holding = false; this.game?.release?.(); } };
    $("#job-action").addEventListener("pointerdown", down);
    $("#job-action").addEventListener("pointerup", up);
    $("#job-action").addEventListener("pointerleave", up);
    this.canvas.addEventListener("pointerdown", (e) => { if (this.active()) down(e); });
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", (e) => { if (this.active() && e.code === "Space") { e.preventDefault(); if (!e.repeat) down(e); } });
    window.addEventListener("keyup", (e) => { if (this.active() && e.code === "Space") up(); });
  }

  active() { return document.body.dataset.screen === "job" && this.game && !this.game.done; }

  start(id, stats) {
    this.game = id === "repair" ? new RepairGame() : new DeliveryGame(stats);
    this.jobId = id;
    $("#job-name").textContent = JOBS.find((j) => j.id === id).name;
    $("#job-result").hidden = true;
    $("#job-action").hidden = false;
  }

  frame(t, dt) {
    const g = this.game;
    if (!g) return;
    g.update(Math.min(dt, 0.05), this.holding);
    g.draw(this.p, t, this.getState());
    $("#job-step").textContent = g.stepText();
    $("#job-earned").textContent = yen(g.earned);
    $("#job-action").textContent = g.actionText();
    const log = g.log.slice(0, 5).map((l) => `<li>${l}</li>`).join("");
    if ($("#job-log").innerHTML !== log) $("#job-log").innerHTML = log;
    if (g.done && !this.paid) this.finish();
  }

  finish() {
    this.paid = true;
    const st = this.getState();
    st.money += this.game.earned;
    st.earnings += this.game.earned;
    st.day += 1;
    this.save();
    $("#job-action").hidden = true;
    const res = $("#job-result");
    res.hidden = false;
    res.innerHTML = `<p>おつかれさま！ バイト代 <b>${yen(this.game.earned)}</b></p>
      <p class="tip">所持金 ${yen(st.money)}・${st.day}日目になりました</p>
      <button class="big" id="job-done">もどる</button>`;
    $("#job-done").onclick = () => { this.game = null; this.paid = false; this.onExit(); };
    $("#money").textContent = yen(st.money);
  }
}

// ---------- パンク修理 ----------

class RepairGame {
  constructor() {
    this.customer = 0;
    this.phase = "lever"; // lever | find | pump | thanks
    this.t = 0;
    this.scores = [];
    this.earned = 0;
    this.log = ["お客さんが来た。「パンクしちゃって……」"];
    this.done = false;
    this.newCustomer();
  }

  newCustomer() {
    this.hole = Math.random() * Math.PI * 2;
    this.pressure = 0;
    this.scores = [];
    this.phase = "lever";
    this.t = 0;
    const looks = [
      { helmet: "giro", top: "pearl-jersey", bottom: "pearl-pants", shoes: "rc3" },
      { helmet: null, top: "montbell-jersey", bottom: "shorts", shoes: "sneaker" },
      { helmet: "kask", top: "rapha-jersey", bottom: "rapha-bib", shoes: "sidi" },
    ];
    this.look = looks[this.customer % 3];
  }

  stepText() {
    const n = `お客さん ${this.customer + 1} / 3`;
    return {
      lever: `${n}：① 印が緑に来たらタイヤレバーを差しこむ`,
      find: `${n}：② 泡が出ている所に針が来たら押す`,
      pump: `${n}：③ 長押しで空気を入れ、緑の所で離す`,
      thanks: `${n}：修理完了！`,
    }[this.phase];
  }
  actionText() { return this.phase === "pump" ? "長押しで空気を入れる" : this.phase === "thanks" ? "…" : "押す（スペース）"; }

  marker() { return Math.sin(this.t * 3.2); }
  needle() { return this.t * 2.2; }

  press() {
    if (this.phase === "lever") {
      const s = Math.max(0, 1 - Math.abs(this.marker()) * 1.6);
      this.scores.push(s);
      this.log.unshift(s > 0.8 ? "スッと外れた！" : s > 0.4 ? "なんとか外れた" : "レバーが滑った……");
      this.phase = "find"; this.t = 0;
    } else if (this.phase === "find") {
      let d = Math.abs(((this.needle() - this.hole) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const s = Math.max(0, 1 - d / 0.9);
      this.scores.push(s);
      this.log.unshift(s > 0.8 ? "穴を一発で見つけた！" : s > 0.3 ? "穴を見つけた" : "穴を探すのに手間取った");
      this.phase = "pump"; this.t = 0;
    }
  }

  release() {
    if (this.phase !== "pump" || this.pressure <= 0.02) return;
    const target = 0.82;
    const s = Math.max(0, 1 - Math.abs(this.pressure - target) / 0.25);
    this.scores.push(s);
    this.log.unshift(this.pressure > 1 ? "入れすぎてバーストしかけた！" : s > 0.8 ? "空気圧ぴったり" : "空気圧がいまいち");
    const avg = this.scores.reduce((a, b) => a + b, 0) / this.scores.length;
    const pay = Math.round((600 + 800 * avg + (avg > 0.85 ? 100 : 0)) / 10) * 10;
    this.earned += pay;
    this.log.unshift(`「ありがとう！」 ${yen(pay)}${avg > 0.85 ? "（チップ込み）" : ""}`);
    this.phase = "thanks"; this.t = 0;
  }

  update(dt, holding) {
    this.t += dt;
    if (this.phase === "pump" && holding) this.pressure = Math.min(1.15, this.pressure + dt * 0.55);
    if (this.phase === "thanks" && this.t > 1.4) {
      this.customer++;
      if (this.customer >= 3) { this.done = true; this.log.unshift("今日のシフト終了"); }
      else { this.newCustomer(); this.log.unshift("次のお客さんが来た"); }
    }
  }

  draw(p, t) {
    // お店の中
    p.clear("#eadcbf");
    for (let x = 0; x < RW; x += 24) { p.rect(x, 0, 1, 190, "#d6c39e"); p.rect(x + 1, 0, 1, 190, "#f4e9d2"); }
    p.rect(0, 190, RW, 80, "#8a6a42");
    for (let y = 190; y < RH; y += 10) p.rect(0, y, RW, 1, "#755835");
    p.rect(0, 186, RW, 6, "#5e4429");
    // 壁のタイヤ
    for (let i = 0; i < 4; i++) p.ring(30 + i * 34, 40, 14, "#2b2b2b", 3, { shaded: true });
    p.rect(14, 22, 140, 2, "#7a5a36");
    // 看板
    p.rect(330, 14, 136, 30, "#2f8f5b");
    p.rect(332, 16, 132, 26, "#3fa86b");
    p.text("サイクルショップ", 398, 22, "#ffffff", 12, "center");

    const cx = 240, cy = 140, R = 70;
    if (this.phase === "find") {
      // 水を張ったたらい
      p.rect(cx - 100, cy + 10, 200, 70, "#9aa0a6");
      p.rect(cx - 96, cy + 14, 192, 62, "#6fb6d8");
      p.rect(cx - 96, cy + 14, 192, 2, "#bfe6f2");
    }
    // タイヤとホイール
    p.ring(cx, cy, R, "#232323", 9, { shaded: true, light: 0.12, tread: 3 });
    p.ring(cx, cy, R - 9, "#9aa0a6", 4, { shaded: true });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + (i % 2 ? 0.2 : -0.2);
      p.line(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, cx + Math.cos(a) * (R - 13), cy + Math.sin(a) * (R - 13), "#b9b9b9");
    }
    p.disc(cx, cy, 6, "#8a8a8a", true);
    p.rect(cx - 2, cy - R - 4, 4, 6, "#c0c0c0"); // バルブ

    if (this.phase === "lever") {
      // タイヤレバー
      p.rect(cx + R - 6, cy - 10, 40, 6, "#f0c419");
      p.rect(cx + R - 10, cy - 12, 6, 10, "#f0c419");
      this.gauge(p, this.marker(), "#7ae07a");
    } else if (this.phase === "find") {
      // 穴から泡
      const hx = cx + Math.cos(this.hole) * (R - 3), hy = cy + Math.sin(this.hole) * (R - 3);
      for (let i = 0; i < 5; i++) {
        const k = ((t / 300 + i * 0.37) % 1);
        p.ring(hx + Math.sin(i * 3 + t / 200) * 3, hy - k * 30, 2, "#e8f8ff", 1);
      }
      // 針
      const a = this.needle();
      p.line(cx, cy, cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14), "#c8282e", 2);
      p.disc(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14), 3, "#c8282e");
    } else if (this.phase === "pump" || this.phase === "thanks") {
      // フロアポンプと空気圧計
      p.rect(380, 90, 8, 100, "#c8282e");
      p.rect(366, 186, 36, 6, "#2b2b2b");
      const hy = 70 + (this.pressure * 60) % 20;
      p.rect(370, hy, 28, 6, "#2b2b2b");
      p.rect(383, hy, 2, 90 - hy + 10, "#9aa0a6");
      p.line(384, 150, cx + 2, cy - R - 2, "#2b2b2b", 2);
      p.disc(420, 110, 24, "#5e4429");
      p.disc(420, 110, 21, "#f6efe0");
      // 目盛り（緑がちょうどいい空気圧）
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 0.8 + (i / 10) * Math.PI * 1.4;
        const c = i >= 7 && i <= 9 ? "#2f8f5b" : i === 10 ? "#c8282e" : "#3b2a1e";
        p.line(420 + Math.cos(a) * 15, 110 + Math.sin(a) * 15, 420 + Math.cos(a) * 20, 110 + Math.sin(a) * 20, c, 2);
      }
      const a = Math.PI * 0.8 + (Math.min(1.15, this.pressure) / 1.15) * Math.PI * 1.4;
      p.line(420, 110, 420 + Math.cos(a) * 17, 110 + Math.sin(a) * 17, "#c8282e", 2);
      if (this.pressure > 1) p.text("パン！", cx, 30, "#c8282e", 20, "center");
    }
    if (this.phase === "thanks") {
      p.rect(cx - 80, 20, 160, 30, "#fbf5e6");
      p.text("ありがとう！", cx, 27, "#3b2a1e", 14, "center");
    }
    // カウンターとお客さん
    drawRider(p, this.look, 60, 190);
    p.rect(96, 150, 50, 40, "#a8854f");
    p.rect(94, 146, 54, 5, "#7a5a36");
    p.rect(104, 136, 14, 10, "#f6efe0"); p.rect(106, 138, 10, 2, "#c8282e"); // レジの伝票
    if (this.phase !== "thanks") {
      p.rect(82, 92, 66, 20, "#fbf5e6");
      p.rect(78, 104, 4, 4, "#fbf5e6");
      p.text("お願いします", 115, 97, "#3b2a1e", 10, "center");
    }
  }

  gauge(p, pos, zone) {
    const cx = 240, y = 248, w = 220;
    p.rect(cx - w / 2, y, w, 8, "#3b2a1e");
    p.rect(cx - w / 2 + 2, y + 2, w - 4, 4, "#f6efe0");
    p.rect(cx - 18, y + 2, 36, 4, zone);
    p.rect(cx + pos * (w / 2 - 4) - 2, y - 4, 4, 16, "#e8622c");
  }
}

// ---------- フードデリバリー ----------

const SHOPS = ["おのみちラーメン", "瀬戸田レモンカフェ", "今治やきとり", "はっさく大福の店", "島のパン屋"];

class DeliveryGame {
  constructor(stats) {
    this.stats = stats;
    this.order = 0;
    this.earned = 0;
    this.log = [];
    this.done = false;
    this.route = { from: "店", to: "お客さん", segments: [{ name: "商店街", kind: "town", km: 2.6, scenery: ["houses", "towel", "houses", "temple"] }] };
    this.newOrder();
  }

  newOrder() {
    this.ride = new Ride(this.route, this.stats, { startMin: 11 * 60 + this.order * 40, rng: () => 0.5 });
    this.ride.log = [];
    this.condition = 100;
    this.jumpY = 0; this.vy = 0;
    this.slow = 0;
    this.kmh = 16 + this.stats.speed * 0.14;
    this.limit = (this.route.segments[0].km / (this.kmh / 3600 * 45)) * 1.25;
    this.time = 0;
    this.arrived = false;
    this.wait = 0;
    this.obstacles = [];
    for (let k = 0.35; k < 2.45; k += 0.16 + Math.random() * 0.18) {
      this.obstacles.push({ km: k, type: ["cone", "puddle", "cat", "box"][Math.floor(Math.random() * 4)], hit: false, passed: false });
    }
    this.log.unshift(`${SHOPS[this.order % SHOPS.length]}の料理を受け取った`);
  }

  stepText() {
    if (this.done) return "今日の配達は終わり";
    const left = Math.max(0, this.limit - this.time);
    return `配達 ${this.order + 1} / 3：あと ${left.toFixed(1)} 秒・料理 ${Math.round(this.condition)}%`;
  }
  actionText() { return "ジャンプ（スペース）"; }

  press() {
    if (this.jumpY === 0 && !this.arrived) this.vy = -300;
  }

  update(dt) {
    if (this.done) return;
    const r = this.ride;
    if (this.arrived) {
      this.wait += dt;
      if (this.wait > 1.6) {
        this.order++;
        if (this.order >= 3) { this.done = true; this.log.unshift("今日の配達は終わり"); }
        else this.newOrder();
      }
      return;
    }
    this.time += dt;
    // ジャンプ
    if (this.vy !== 0 || this.jumpY < 0) {
      this.vy += 900 * dt;
      this.jumpY = Math.min(0, this.jumpY + this.vy * dt);
      if (this.jumpY === 0) this.vy = 0;
    }
    if (this.slow > 0) this.slow -= dt;
    const kmh = this.kmh * (this.slow > 0 ? 0.45 : 1);
    const dk = (kmh / 3600) * 45 * dt;
    r.dist = Math.min(r.total, r.dist + dk);
    r.crank += dk * 60; r.spin += dk * 140;
    r.kmh = kmh;

    // ぶつかり判定（前輪の位置を通るとき）
    const frontKm = r.dist + 110 / PX_PER_KM;
    for (const o of this.obstacles) {
      if (o.passed || frontKm < o.km) continue;
      o.passed = true;
      if (this.jumpY > -14) {
        o.hit = true;
        const dmg = 22 - this.stats.durability * 0.12;
        this.condition = Math.max(0, this.condition - dmg);
        this.slow = 0.7;
        this.log.unshift({ cone: "コーンにぶつかった！", puddle: "水たまりでバシャッ！", cat: "ねこをよけてふらついた！", box: "段ボールに乗り上げた！" }[o.type]);
      }
    }

    if (r.dist >= r.total) {
      this.arrived = true;
      const left = Math.max(0, this.limit - this.time);
      const late = this.time > this.limit;
      const pay = Math.round((500 + 900 * (this.condition / 100) + (late ? -200 : left * 25)) / 10) * 10;
      const finalPay = Math.max(200, pay);
      this.earned += finalPay;
      this.log.unshift(late ? `遅れて到着……「冷めてるよ」 ${yen(finalPay)}` : this.condition > 85 ? `「早い！きれい！」 ${yen(finalPay)}` : `「ありがとう」 ${yen(finalPay)}`);
    }
  }

  draw(p, t, st) {
    const r = this.ride;
    drawRideScene(p, r, t);
    // 障害物
    for (const o of this.obstacles) {
      const x = BIKE_X + (o.km - r.dist) * PX_PER_KM;
      if (x < -20 || x > RW + 20) continue;
      const y = ROAD_Y + 16;
      if (o.type === "cone") {
        for (let i = 0; i < 12; i++) p.rect(x - 1 - i / 2, y - 14 + i, 3 + i, 1, i === 4 || i === 5 ? "#ffffff" : "#e8622c");
        p.rect(x - 9, y - 2, 18, 3, "#2b2b2b");
      } else if (o.type === "puddle") {
        p.shadow(x, y, 16, 2, "#5a9ac8");
        p.rect(x - 8, y - 1, 6, 1, "#bfe6f2");
      } else if (o.type === "cat") {
        const sx = o.hit ? x + 20 : x;
        p.rect(sx - 8, y - 8, 14, 7, "#f0a85a"); p.rect(sx + 4, y - 12, 7, 7, "#f0a85a");
        p.px(sx + 5, y - 13, "#f0a85a"); p.px(sx + 9, y - 13, "#f0a85a");
        p.px(sx + 6, y - 10, "#3b2a1e"); p.px(sx + 9, y - 10, "#3b2a1e");
        p.rect(sx - 12, y - 10, 4, 2, "#f0a85a");
        p.rect(sx - 6, y - 1, 2, 2, "#d8883a"); p.rect(sx + 2, y - 1, 2, 2, "#d8883a");
      } else {
        p.rect(x - 9, y - 12, 18, 12, "#c9a978");
        p.rect(x - 9, y - 12, 18, 2, "#e0c595");
        p.rect(x - 1, y - 12, 2, 12, "#a8854f");
      }
    }
    const oy = OY + Math.round(this.jumpY);
    drawCyclist(p, st.bike, st.outfit, { ox: OX, oy, spin: r.spin, crank: r.crank });
    // 背中の配達バッグ
    const g = geometry(OX, oy);
    const bx = g.SP.x + 2, by = g.SP.y - 46;
    p.rect(bx, by, 24, 22, "#2f8f5b");
    p.rect(bx, by, 24, 2, "#3fa86b");
    p.rect(bx + 5, by + 7, 14, 6, "#f6efe0");
    p.text("🍱", bx + 6, by + 5, "#000", 9);
    drawForeground(p, r, t);
    // ゴールの家
    const gx = BIKE_X + (r.total - r.dist) * PX_PER_KM + 110;
    if (gx < RW + 40) {
      p.rect(gx, ROAD_Y - 60, 50, 60, "#f2ead8");
      for (let i = 0; i < 8; i++) p.rect(gx - 6 + i, ROAD_Y - 68 + i, 62 - i * 2, 1, "#7a3a2a");
      p.rect(gx + 18, ROAD_Y - 26, 14, 26, "#6a4a2a");
      p.text("お届け先", gx + 25, ROAD_Y - 86, "#e8622c", 11, "center");
    }
    if (this.arrived) {
      p.rect(RW / 2 - 90, 30, 180, 30, "#fbf5e6");
      p.text("お届けしました！", RW / 2, 38, "#3b2a1e", 14, "center");
    }
    // 残り時間
    const left = Math.max(0, this.limit - this.time);
    p.rect(10, 10, 104, 10, "#3b2a1e");
    p.rect(12, 12, 100 * Math.min(1, left / this.limit), 6, left < 3 ? "#e8622c" : "#7ae07a");
  }
}

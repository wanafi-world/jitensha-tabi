// 走行画面：描画、HUD、撮影・休憩・パンク・ゴールの操作
import { Pixel } from "./pixel.js";
import { Ride, MODES } from "./ride.js";
import { reversed } from "./routes.js";
import { drawRideScene, drawForeground, RW, RH, BIKE_X, ROAD_Y } from "./scenery.js";
import { drawCyclist, geometry, GROUND } from "./draw.js";

const $ = (sel) => document.querySelector(sel);
const yen = (n) => "¥" + n.toLocaleString("ja-JP");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// 自転車を走行画面の道に置くためのずらし量
const g0 = geometry();
const OX = BIKE_X - g0.R.x;
const OY = ROAD_Y + 16 - GROUND;

export class RideScreen {
  constructor({ getState, save, onExit }) {
    this.canvas = $("#ride");
    this.p = new Pixel(this.canvas);
    this.getState = getState;
    this.save = save;
    this.onExit = onExit;
    this.ride = null;
    this.trip = null;
    this.flash = 0;
    this.shutterT = 0;
    this.lastUi = 0;

    this.canvas.addEventListener("pointerdown", () => this.tap());
    window.addEventListener("keydown", (e) => {
      if (!this.ride || document.body.dataset.screen !== "ride") return;
      if (e.code === "Space") { e.preventDefault(); this.tap(); }
    });
    $("#r-photo").onclick = () => this.openPhoto();
    $("#r-shop").onclick = () => this.openShop();
    $("#r-quit").onclick = () => this.finish(true);
    const modes = $("#r-modes");
    for (const [id, m] of Object.entries(MODES)) {
      const b = document.createElement("button");
      b.className = "sub mode";
      b.dataset.mode = id;
      b.textContent = m.label;
      b.onclick = () => { if (this.ride) { this.ride.mode = id; this.renderModes(); } };
      modes.appendChild(b);
    }
  }

  start(route, stats) {
    this.stats = stats;
    this.route = route;
    this.ride = new Ride(route, stats);
    this.trip = { route, legs: [this.ride], rinko: 0 };
    this.hideOverlay();
    this.buildTicks();
    this.renderModes();
  }

  buildTicks() {
    const r = this.ride;
    const ticks = $("#r-ticks");
    ticks.innerHTML = "";
    r.route.segments.forEach((seg, i) => {
      if (seg.kind !== "bridge") return;
      const el = document.createElement("span");
      el.className = "tick";
      el.style.left = `${((r.starts[i] + seg.km / 2) / r.total) * 100}%`;
      el.title = seg.name;
      ticks.appendChild(el);
    });
    $("#r-from").textContent = r.route.from;
    $("#r-to").textContent = r.route.to;
  }

  renderModes() {
    for (const b of document.querySelectorAll("#r-modes .mode")) b.classList.toggle("active", b.dataset.mode === this.ride.mode);
  }

  // ---------- 毎フレーム ----------

  frame(t, dt) {
    const r = this.ride;
    if (!r) return;
    r.update(Math.min(dt, 0.1));
    const p = this.p;
    drawRideScene(p, r, t);
    const tired = r.stamina < 20;
    const bob = r.status === "riding" && r.segment().kind !== "ferry" ? Math.round(Math.sin(r.crank * 2) * 0.6) : 0;
    drawCyclist(p, this.getState().bike, this.getState().outfit, { ox: OX, oy: OY + bob, spin: r.spin, crank: r.crank, tired });
    // スピード感の線
    if (r.kmh > 24) for (let i = 0; i < 6; i++) {
      const y = 120 + ((i * 37) % 100), x = (RW - ((t / 2 + i * 90) % (RW + 60)));
      p.rect(x, y, 24, 1, "rgba(255,255,255,0.6)");
    }
    drawForeground(p, r, t);

    if (r.status === "photo") this.drawViewfinder(t);
    if (r.status === "flat") this.drawFlat(t);
    if (this.flash > 0) {
      p.ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
      p.ctx.fillRect(0, 0, RW, RH);
      this.flash = Math.max(0, this.flash - dt * 2.5);
    }

    if (r.status === "goal" && !this.goalShown) { this.goalShown = true; this.showGoal(); }
    if (t - this.lastUi > 120) { this.lastUi = t; this.renderHud(); }
  }

  renderHud() {
    const r = this.ride;
    const st = this.getState();
    $("#r-place").textContent = r.segment().name;
    $("#r-clock").textContent = r.clock();
    $("#r-bar").style.width = `${(r.dist / r.total) * 100}%`;
    $("#r-km").textContent = `${r.dist.toFixed(1)} / ${r.total.toFixed(1)} km`;
    $("#r-speed").textContent = `${r.kmh.toFixed(1)} km/h`;
    $("#r-slope").textContent = r.slope > 0 ? "のぼり" : r.slope < 0 ? "くだり" : "";
    const sb = $("#r-stamina");
    sb.style.width = `${r.stamina}%`;
    sb.classList.toggle("low", r.stamina < 25);
    $("#r-stamina-val").textContent = Math.round(r.stamina);
    $("#r-money").textContent = yen(st.money);
    $("#money").textContent = yen(st.money);
    const likes = this.trip.legs.reduce((s, l) => s + l.photos.reduce((a, x) => a + x.likes, 0), 0);
    $("#r-likes").textContent = `❤ ${likes}`;

    const spot = r.status === "riding" ? r.photoSpot() : null;
    const pb = $("#r-photo");
    pb.hidden = !spot;
    if (spot) pb.textContent = `📷 ${spot.name}を撮る`;
    const shop = r.status === "riding" ? r.shop() : null;
    const sbtn = $("#r-shop");
    sbtn.hidden = !shop;
    if (shop) sbtn.textContent = `🍙 ${shop.name}で休憩`;

    const log = $("#r-log");
    const html = r.log.slice(0, 8).map((l) => `<li><span>${l.time}</span>${esc(l.text)}</li>`).join("");
    if (log.innerHTML !== html) log.innerHTML = html;
  }

  tap() {
    const r = this.ride;
    if (!r) return;
    if (r.status === "photo") this.shoot();
    else if (r.status === "flat") {
      const done = r.repairTap();
      this.flash = 0.15;
      if (done) this.hideOverlay();
      else this.renderFlat();
    }
  }

  // ---------- 撮影 ----------

  openPhoto() {
    const r = this.ride;
    const spot = r.photoSpot();
    if (!spot) return;
    r.status = "photo";
    this.photoSpot = spot;
    this.shutterT = performance.now();
    this.showOverlay(`<div class="ov-photo"><p>枠の中の印が真ん中に来たらシャッター！</p>
      <button class="big" id="ov-shoot">📷 シャッター</button></div>`, true);
    $("#ov-shoot").onclick = (e) => { e.stopPropagation(); this.shoot(); };
  }

  markerPos(now) {
    return Math.sin((now - this.shutterT) / 260);
  }

  drawViewfinder() {
    const p = this.p;
    const m = 34;
    p.ctx.fillStyle = "rgba(0,0,0,0.35)";
    p.ctx.fillRect(0, 0, RW, m); p.ctx.fillRect(0, RH - m, RW, m);
    p.ctx.fillRect(0, m, m, RH - 2 * m); p.ctx.fillRect(RW - m, m, m, RH - 2 * m);
    const c = "#ffffff", L = 14;
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [RW - m, m, -1, 1], [m, RH - m, 1, -1], [RW - m, RH - m, -1, -1]]) {
      p.rect(Math.min(x, x + dx * L), y - (dy < 0 ? 1 : 0), L, 2, c);
      p.rect(x - (dx < 0 ? 1 : 0), Math.min(y, y + dy * L), 2, L, c);
    }
    // ピントの印
    const pos = this.markerPos(performance.now());
    const cx = RW / 2, w = 160;
    p.rect(cx - w / 2, RH - m + 12, w, 4, "rgba(255,255,255,0.4)");
    p.rect(cx - 14, RH - m + 10, 28, 8, "rgba(120,230,120,0.7)");
    p.rect(cx + pos * (w / 2) - 2, RH - m + 8, 4, 12, "#ffd84a");
    p.text("● REC", m, RH - m + 8, "#ff5a5a", 10);
    p.text(this.photoSpot.name, RW - m, RH - m + 8, "#ffffff", 10, "right");
  }

  shoot() {
    const r = this.ride;
    if (r.status !== "photo") return;
    const pos = this.markerPos(performance.now());
    const quality = Math.max(0, 1 - Math.abs(pos));
    // ファインダーなしの景色を写真として残す
    r.status = "riding";
    const t = performance.now();
    drawRideScene(this.p, r, t);
    drawCyclist(this.p, this.getState().bike, this.getState().outfit, { ox: OX, oy: OY, spin: r.spin, crank: r.crank });
    drawForeground(this.p, r, t);
    const img = this.canvas.toDataURL("image/png");
    const photo = r.takePhoto(this.photoSpot, quality);
    photo.img = img;
    r.status = "shop"; // 結果を見ている間は止める
    this.flash = 1;
    const grade = quality > 0.9 ? "ピッタリ！" : quality > 0.6 ? "いい感じ" : "ちょっとブレた";
    this.showOverlay(`<div class="ov-card">
      <div class="polaroid"><img src="${img}" alt=""><span>${esc(photo.spot)}</span></div>
      <p class="grade">${grade}${photo.timeLabel ? `・${photo.timeLabel}ボーナス` : ""}</p>
      <p class="likes">❤ ${photo.likes} いいね</p>
      <button class="big" id="ov-go">走りだす ▶</button></div>`);
    $("#ov-go").onclick = () => { r.status = "riding"; this.hideOverlay(); };
  }

  // ---------- 休憩 ----------

  openShop() {
    const r = this.ride;
    const shop = r.shop();
    if (!shop) return;
    r.status = "shop";
    const render = () => {
      const st = this.getState();
      this.showOverlay(`<div class="ov-card">
        <h3>${esc(shop.name)}</h3>
        <p class="sub-t">体力 ${Math.round(r.stamina)} / 100　所持金 ${yen(st.money)}</p>
        <ul class="menu">${shop.items.map((it, i) => `<li><button class="sub" data-i="${i}" ${st.money < it.price ? "disabled" : ""}>
          <b>${esc(it.name)}</b><span>${yen(it.price)}・体力 +${it.stamina}</span></button></li>`).join("")}</ul>
        <button class="big" id="ov-go">出発する ▶</button></div>`);
      for (const b of document.querySelectorAll("#overlay .menu button")) {
        b.onclick = () => {
          const it = shop.items[Number(b.dataset.i)];
          const s = this.getState();
          if (s.money < it.price) return;
          s.money -= it.price;
          r.eat(it);
          this.save();
          render();
        };
      }
      $("#ov-go").onclick = () => { r.status = "riding"; this.hideOverlay(); };
    };
    render();
  }

  // ---------- パンク ----------

  drawFlat(t) {
    const p = this.p;
    if (Math.floor(t / 300) % 2) p.text("パンク！", RW / 2, 40, "#ff5a5a", 20, "center");
  }

  renderFlat() {
    const r = this.ride;
    this.showOverlay(`<div class="ov-flat"><p>パンク！ 連打してチューブを交換しよう</p>
      <div class="meter"><span style="width:${(r.repairTaps / 12) * 100}%"></span></div>
      <button class="big" id="ov-fix">🔧 なおす</button></div>`, true);
    $("#ov-fix").onclick = (e) => { e.stopPropagation(); this.tap(); };
  }

  // ---------- ゴール ----------

  showGoal() {
    const r = this.ride;
    const route = this.route;
    if (route.type === "line" && !r.route.returning) {
      const st = this.getState();
      this.showOverlay(`<div class="ov-card">
        <h3>🎉 ${esc(r.route.to)}に到着！</h3>
        <p class="sub-t">${r.clock()}・体力 ${Math.round(r.stamina)}</p>
        <p>どうやって帰る？</p>
        <div class="choices">
          <button class="sub choice" id="ov-rinko" ${st.money < route.rinkoFare ? "disabled" : ""}>
            <b>輪行で帰る</b><span>${esc(route.rinkoName)}・${yen(route.rinkoFare)}</span></button>
          <button class="sub choice" id="ov-back"><b>走って帰る</b><span>同じ道を${esc(route.from)}まで（帰りは景色の時間帯が変わる）</span></button>
        </div></div>`);
      $("#ov-rinko").onclick = () => {
        const s = this.getState();
        s.money -= route.rinkoFare;
        this.trip.rinko = route.rinkoFare;
        this.save();
        this.finish(false);
      };
      $("#ov-back").onclick = () => {
        const back = new Ride(reversed(route), this.stats, { startMin: r.minutes, stamina: r.stamina });
        back.mode = r.mode;
        this.ride = back;
        this.trip.legs.push(back);
        this.goalShown = false;
        this.hideOverlay();
        this.buildTicks();
        this.renderModes();
      };
    } else {
      this.finish(false);
    }
  }

  finish(quit) {
    const legs = this.trip.legs;
    const km = legs.reduce((s, l) => s + l.dist, 0);
    const minutes = legs.reduce((s, l) => s + l.elapsed(), 0);
    const photos = legs.flatMap((l) => l.photos);
    const likes = photos.reduce((s, x) => s + x.likes, 0);
    const food = legs.reduce((s, l) => s + l.spent, 0);
    const flats = legs.reduce((s, l) => s + l.flats, 0);
    const st = this.getState();
    st.trips = st.trips || [];
    st.trips.push({ route: this.route.id, km: Math.round(km * 10) / 10, minutes: Math.round(minutes), likes, photos: photos.length, quit, date: new Date().toISOString().slice(0, 10) });
    st.likes = (st.likes || 0) + likes;
    this.save();
    this.ride.status = "goal";
    const hm = (m) => `${Math.floor(m / 60)}時間${Math.round(m % 60)}分`;
    this.showOverlay(`<div class="ov-card result">
      <h3>${quit ? "今日はここまで" : "旅のきろく"}</h3>
      <dl>
        <dt>ルート</dt><dd>${esc(this.route.name)}${legs.length > 1 ? "（往復）" : this.trip.rinko ? "（帰りは輪行）" : ""}</dd>
        <dt>走った距離</dt><dd>${km.toFixed(1)} km</dd>
        <dt>かかった時間</dt><dd>${hm(minutes)}</dd>
        <dt>パンク</dt><dd>${flats} 回</dd>
        <dt>食べ物</dt><dd>${yen(food)}</dd>
        ${this.trip.rinko ? `<dt>輪行</dt><dd>${yen(this.trip.rinko)}</dd>` : ""}
      </dl>
      <div class="photos">${photos.map((ph) => `<figure><img src="${ph.img}" alt=""><figcaption>${esc(ph.spot)}<br>❤ ${ph.likes}</figcaption></figure>`).join("") || "<p>写真はありません</p>"}</div>
      <p class="likes">いいね合計 ❤ ${likes}</p>
      <p class="sub-t">いいねはステップ3でお金に変わるようにします</p>
      <button class="big" id="ov-home">作業場にもどる</button></div>`);
    $("#ov-home").onclick = () => { this.hideOverlay(); this.ride = null; this.onExit(); };
  }

  // ---------- オーバーレイ ----------

  showOverlay(html, passthrough = false) {
    const ov = $("#overlay");
    ov.innerHTML = html;
    ov.hidden = false;
    ov.classList.toggle("passthrough", passthrough);
  }

  hideOverlay() {
    const ov = $("#overlay");
    ov.hidden = true;
    ov.innerHTML = "";
    this.goalShown = this.ride?.status === "goal";
  }

  checkFlat() {
    if (this.ride?.status === "flat" && $("#overlay").hidden) this.renderFlat();
  }
}

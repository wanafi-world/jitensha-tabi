// 走行のシミュレーション（速さ、体力、時刻、イベント）
import { totalKm } from "./routes.js";

export const TIME_SCALE = 1.2; // 現実の1秒 = ゲーム内の1.2分
export const MODES = {
  slow: { label: "ゆっくり", speed: 0.8, drain: 0.55 },
  normal: { label: "ふつう", speed: 1, drain: 1 },
  hard: { label: "がんばる", speed: 1.22, drain: 1.8 },
};

export class Ride {
  constructor(route, stats, { startMin = 9 * 60, stamina = 100, rng = Math.random, boost = 1 } = {}) {
    this.boost = boost;
    this.route = route;
    this.stats = stats;
    this.rng = rng;
    this.total = totalKm(route);
    this.dist = 0;
    this.minutes = startMin;
    this.startMin = startMin;
    this.stamina = stamina;
    this.mode = "normal";
    this.status = "riding"; // riding | flat | photo | shop | goal
    this.log = [];
    this.photos = [];
    this.spent = 0;
    this.flats = 0;
    this.kmh = 0;
    this.slope = 0;
    this.crank = 0;
    this.spin = 0;
    this.repairTaps = 0;
    this.shotSpots = new Set();
    this.lastSeg = -1;
    this.hungryWarned = false;
    // 区間の開始位置と風
    let s = 0;
    this.starts = route.segments.map((seg) => { const v = s; s += seg.km; return v; });
    this.wind = route.segments.map((seg) => {
      const r = this.rng();
      const windy = seg.kind === "bridge" ? 0.5 : 0.2;
      return r < windy * 0.6 ? -1 : r > 1 - windy * 0.4 ? 1 : 0;
    });
    this.say(`${route.from}を出発！ ${route.to}まで約${Math.round(this.total)}km`);
  }

  hour() { return (this.minutes / 60) % 24; }
  clock() {
    const m = Math.floor(this.minutes) % (24 * 60);
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  }

  indexAt(km) {
    for (let i = this.starts.length - 1; i >= 0; i--) if (km >= this.starts[i]) return i;
    return 0;
  }
  segIndex() { return Math.min(this.indexAt(this.dist), this.route.segments.length - 1); }
  segment() { return this.route.segments[this.segIndex()]; }
  local() { return this.dist - this.starts[this.segIndex()]; }

  // 景色の描画用：km の位置の区間（区間内の位置 _local 付き）
  segmentAt(km) {
    if (km < 0 || km > this.total) return null;
    const i = this.indexAt(km);
    const seg = this.route.segments[i];
    return { ...seg, _local: km - this.starts[i] };
  }
  segmentsBetween(a, b) {
    const out = [];
    this.route.segments.forEach((seg, i) => {
      const s = this.starts[i];
      if (s + seg.km >= a && s <= b) out.push({ seg, start: s, index: i });
    });
    return out;
  }

  say(text) {
    this.log.unshift({ time: this.clock(), text });
    if (this.log.length > 30) this.log.pop();
  }

  // 坂：橋の手前はのぼり、橋のあとはくだり
  slopeNow() {
    const i = this.segIndex(), seg = this.segment(), loc = this.local();
    if (seg.kind === "bridge" || seg.kind === "ferry") return 0;
    if (seg.slope) return seg.slope;
    const next = this.route.segments[i + 1], prev = this.route.segments[i - 1];
    if (next?.kind === "bridge" && seg.km - loc < 1.0) return 1;
    if (prev?.kind === "bridge" && loc < 0.8) return -1;
    return 0;
  }

  // 撮影スポットの近くにいるか
  photoSpot() {
    const seg = this.segment();
    if (!seg.photo || this.shotSpots.has(seg.photo.name)) return null;
    const pos = seg.km * seg.photo.at;
    return Math.abs(this.local() - pos) < Math.max(0.25, seg.km * 0.12) ? seg.photo : null;
  }

  shop() { return this.segment().shop || null; }

  update(dtSec) {
    if (this.status !== "riding") { this.kmh = 0; return; }
    const dtMin = dtSec * TIME_SCALE;
    const seg = this.segment();
    const st = this.stats;
    const mode = MODES[this.mode];
    this.slope = this.slopeNow();
    const wind = this.wind[this.segIndex()];

    let kmh;
    if (seg.kind === "ferry") {
      kmh = 9;
    } else {
      kmh = (14 + st.speed * 0.13) * mode.speed;
      if (this.slope > 0) kmh *= 0.55 + st.light * 0.003;
      if (this.slope < 0) kmh *= 1.35;
      if (wind < 0) kmh *= 0.85; else if (wind > 0) kmh *= 1.1;
      if (this.stamina <= 0) kmh *= 0.5;
      else if (this.stamina < 20) kmh *= 0.8;
      // 体力
      let drain = 0.22 * mode.drain * (1.25 - st.comfort / 200);
      if (this.slope > 0) drain *= 2.2 - st.light * 0.006;
      if (this.slope < 0) drain *= 0.3;
      if (wind < 0) drain *= 1.3;
      this.stamina = Math.max(0, this.stamina - drain * dtMin);
    }
    this.kmh = kmh;
    const dk = (kmh * dtMin) / 60;
    this.dist = Math.min(this.total, this.dist + dk);
    this.minutes += dtMin;
    if (seg.kind !== "ferry") {
      this.crank += dk * 60;
      this.spin += dk * 140;
    }

    // 区間が変わったときの案内
    const idx = this.segIndex();
    if (idx !== this.lastSeg) {
      this.lastSeg = idx;
      const s = this.segment();
      if (idx > 0) {
        if (s.kind === "bridge") this.say(`${s.name}をわたる。海の上を走る！`);
        else if (s.kind === "ferry") this.say(`${s.name}に自転車ごと乗りこむ`);
        else if (s.kind === "island") this.say(`${s.name}に上陸`);
        else if (s.slope > 0) this.say(`${s.name}。ここからのぼり坂が続く`);
        else if (s.slope < 0) this.say(`${s.name}。気持ちいいくだり坂！`);
        else if (s.kind === "shore") this.say(`${s.name}。水辺を走る`);
        else if (s.kind === "field") this.say(`${s.name}。のどかな道`);
        else this.say(`${s.name}に到着`);
      }
      if (this.wind[idx] < 0 && s.kind !== "ferry") this.say("向かい風が強い……");
      if (this.wind[idx] > 0 && s.kind !== "ferry") this.say("追い風で気持ちいい！");
      if (s.shop) this.say(`${s.shop.name}で休憩できる`);
    }
    if (this.slope > 0 && !this._climbSaid) { if (!this.segment().slope) this.say("橋へののぼり坂"); this._climbSaid = true; }
    if (this.slope <= 0) this._climbSaid = false;
    if (this.stamina < 25 && !this.hungryWarned) { this.say("おなかがすいてきた。どこかで休憩しよう"); this.hungryWarned = true; }
    if (this.stamina > 40) this.hungryWarned = false;

    // パンク
    if (seg.kind !== "ferry") {
      const p = 0.006 * (1.3 - st.durability / 100) * (this.mode === "hard" ? 1.3 : 1);
      if (this.rng() < p * dk) {
        this.status = "flat";
        this.flats++;
        this.repairTaps = 0;
        this.say("プシュー……パンクした！");
      }
    }

    if (this.dist >= this.total) {
      this.status = "goal";
      this.say(`${this.route.to}にゴール！`);
    }
  }

  repairTap() {
    if (this.status !== "flat") return false;
    this.repairTaps++;
    if (this.repairTaps >= 12) {
      this.minutes += 15;
      this.status = "riding";
      this.say("チューブを交換して復活（15分かかった）");
      return true;
    }
    return false;
  }

  eat(item) {
    this.spent += item.price;
    this.stamina = Math.min(100, this.stamina + item.stamina);
    this.minutes += 10;
    this.minutes += item.onsen ? 40 : 0;
    this.say(item.onsen ? `温泉で疲れがとれた。体力 +${item.stamina}` : `${item.name}を${item.drink ? "飲んだ" : "食べた"}。体力 +${item.stamina}`);
  }

  // 撮影の結果。quality は 0〜1（シャッターのタイミング）
  takePhoto(spot, quality) {
    const h = this.hour();
    let timeBonus = 1, timeLabel = "";
    if (h >= 16.5 && h < 18.5) { timeBonus = 1.6; timeLabel = "夕焼け"; }
    else if (h >= 5.5 && h < 8) { timeBonus = 1.3; timeLabel = "朝の光"; }
    else if (h >= 19 || h < 5) { timeBonus = 0.6; timeLabel = "夜"; }
    const base = 30 + this.stats.style * 2;
    const likes = Math.max(1, Math.round(base * this.boost * spot.fame * (0.3 + 0.7 * quality) * timeBonus * (0.85 + this.rng() * 0.3)));
    this.shotSpots.add(spot.name);
    const photo = { spot: spot.name, likes, quality, timeLabel, clock: this.clock() };
    this.photos.push(photo);
    this.say(`${spot.name}を撮った！ ❤ ${likes}`);
    return photo;
  }

  elapsed() { return this.minutes - this.startMin; }
}

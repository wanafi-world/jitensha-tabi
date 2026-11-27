// 低解像度キャンバスに1ピクセル単位で描くための小さな道具。
// アンチエイリアスを使わないので、拡大表示するとドット絵になる。

// 色を明るく（amt > 0）または暗く（amt < 0）する
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1, 7), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  r = f(r); g = f(g); b = f(b);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// 光は左上から当たる
const LX = -0.6, LY = -0.8;

export class Pixel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.w = canvas.width;
    this.h = canvas.height;
  }

  clear(color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  px(x, y, c) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  rect(x, y, w, h, c) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // 太さ付きのブレゼンハム直線。dashed は点線、pattern は色の配列で交互に塗る（チェーンなど）
  line(x0, y0, x1, y1, c, t = 1, dashed = false, pattern = null) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, i = 0;
    const off = Math.floor((t - 1) / 2);
    this.ctx.fillStyle = c;
    for (;;) {
      if (pattern) this.ctx.fillStyle = pattern[(i >> 1) % pattern.length];
      if (!dashed || (i >> 1) % 2 === 0) this.ctx.fillRect(x0 - off, y0 - off, t, t);
      i++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // 立体感のあるパイプ（フレームのチューブなど）
  tube(a, b, t, base) {
    this.line(a.x, a.y, b.x, b.y, shade(base, -0.35), t + 1);
    this.line(a.x, a.y, b.x, b.y, base, t);
    let nx = -(b.y - a.y), ny = b.x - a.x;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
    const o = Math.max(1, Math.floor(t / 2) - 0.5);
    this.line(a.x + nx * o, a.y + ny * o, b.x + nx * o, b.y + ny * o, shade(base, 0.45));
    this.line(a.x - nx * o, a.y - ny * o, b.x - nx * o, b.y - ny * o, shade(base, -0.2));
  }

  // 輪（外径 r、太さ t）。shaded で左上が明るく右下が暗くなる。dashed で「空きスロット」表示
  ring(cx, cy, r, c, t = 1, { dashed = false, shaded = false, tread = 0, light = 0.35 } = {}) {
    const ctx = this.ctx;
    const r2o = (r + 0.5) ** 2, r2i = (r - t + 0.5) ** 2;
    const lightC = shaded ? shade(c, light) : c, dark = shaded ? shade(c, -0.35) : c;
    const treadC = tread ? shade(c, -0.5) : c;
    cx = Math.round(cx); cy = Math.round(cy);
    for (let y = -r - 1; y <= r + 1; y++) {
      for (let x = -r - 1; x <= r + 1; x++) {
        const d = x * x + y * y;
        if (d > r2o || d <= r2i) continue;
        const ang = Math.atan2(y, x);
        if (dashed && Math.floor((ang + Math.PI) * 6) % 2) continue;
        let col = c;
        if (shaded) {
          const v = (x * LX + y * LY) / Math.sqrt(d || 1);
          if (v > 0.55) col = lightC; else if (v < -0.55) col = dark;
        }
        if (tread && d > (r - 0.5) ** 2 && Math.floor((ang + Math.PI) * r / tread) % 2) col = treadC;
        ctx.fillStyle = col;
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }

  disc(cx, cy, r, c, shaded = false) { this.ring(cx, cy, r, c, r + 1, { shaded }); }

  // 楕円の影
  shadow(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(1 - (y / (ry + 0.5)) ** 2));
      this.rect(cx - w, cy + y, w * 2, 1, c);
    }
  }

  text(str, x, y, c, size = 8, align = "left") {
    this.ctx.fillStyle = c;
    this.ctx.font = `${size}px "DotGothic16", monospace`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = "top";
    this.ctx.fillText(str, Math.round(x), Math.round(y));
  }
}

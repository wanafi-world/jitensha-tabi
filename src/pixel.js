// 低解像度キャンバスに1ピクセル単位で描くための小さな道具。
// アンチエイリアスを使わないので、拡大表示するとドット絵になる。

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

  // 太さ付きのブレゼンハム直線
  line(x0, y0, x1, y1, c, t = 1, dashed = false) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, i = 0;
    const off = Math.floor((t - 1) / 2);
    this.ctx.fillStyle = c;
    for (;;) {
      if (!dashed || (i >> 1) % 2 === 0) this.ctx.fillRect(x0 - off, y0 - off, t, t);
      i++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // 輪（外径 r、太さ t）。dashed で点線の「空きスロット」表示になる
  ring(cx, cy, r, c, t = 1, dashed = false) {
    this.ctx.fillStyle = c;
    const r2o = (r + 0.5) ** 2, r2i = (r - t + 0.5) ** 2;
    for (let y = -r - 1; y <= r + 1; y++) {
      for (let x = -r - 1; x <= r + 1; x++) {
        const d = x * x + y * y;
        if (d <= r2o && d > r2i) {
          if (dashed && Math.floor((Math.atan2(y, x) + Math.PI) * 6) % 2) continue;
          this.ctx.fillRect(Math.round(cx) + x, Math.round(cy) + y, 1, 1);
        }
      }
    }
  }

  disc(cx, cy, r, c) { this.ring(cx, cy, r, c, r + 1); }

  text(str, x, y, c, size = 8, align = "left") {
    this.ctx.fillStyle = c;
    this.ctx.font = `${size}px "DotGothic16", monospace`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = "top";
    this.ctx.fillText(str, Math.round(x), Math.round(y));
  }
}

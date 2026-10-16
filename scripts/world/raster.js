// Kleiner Software-Rasterizer: Dreiecke mit Textur, Vertexfarben, einfacher Beleuchtung und Tiefenpuffer.
// proj(v) liefert [bildschirmX, bildschirmY, naehe]; groessere Naehe liegt vorne.
export function makeCanvas(w, h) { return { w, h, data: new Uint8Array(w * h * 4), z: new Float32Array(w * h).fill(-Infinity) }; }

function wrap(c, n, rep, flip) {
  if (!rep) return c < 0 ? 0 : c >= n ? n - 1 : c;
  if (flip) { const per = Math.floor(c / n); const r = ((c % n) + n) % n; return (per & 1) ? n - 1 - r : r; }
  return ((c % n) + n) % n;
}

const LIGHT = (() => { const l = [0.25, 0.85, 0.45]; const n = Math.hypot(...l); return l.map((c) => c / n); })();

export function drawTris(cv, tris, proj, opts = {}) {
  const { w, h, data, z } = cv;
  const onPixel = opts.onPixel;
  const isTrans = (t) => (t.mat?.alpha ?? 31) < 31 || t.mat?.img?.fmt === 1 || t.mat?.img?.fmt === 6;
  const order = [...tris].sort((a, b) => isTrans(a) - isTrans(b));
  for (const tri of order) {
    const m = tri.mat || {}; const img = m.img;
    if (m.alpha === 0) continue;
    const P = tri.v.map(proj);
    const [a, b, c] = tri.v;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], vv = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nrm = [u[1] * vv[2] - u[2] * vv[1], u[2] * vv[0] - u[0] * vv[2], u[0] * vv[1] - u[1] * vv[0]];
    const nl = Math.hypot(...nrm) || 1;
    // Flache Boeden bleiben unveraendert hell, Waende und Daecher werden je nach Lichtrichtung dunkler
    const d = Math.abs((nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1] + nrm[2] * LIGHT[2]) / nl);
    const light = Math.min(1, 0.62 + 0.38 * d / LIGHT[1]);
    const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]);
    const minX = Math.max(0, Math.floor(Math.min(...xs))), maxX = Math.min(w - 1, Math.ceil(Math.max(...xs)));
    const minY = Math.max(0, Math.floor(Math.min(...ys))), maxY = Math.min(h - 1, Math.ceil(Math.max(...ys)));
    if (minX > maxX || minY > maxY) continue;
    const [p0, p1, p2] = P;
    const area = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]);
    if (Math.abs(area) < 1e-9) continue;
    const texW = img?.w || 1, texH = img?.h || 1;
    const alphaMat = (m.alpha ?? 31) / 31;
    const sS = m.sS ?? 1, sT = m.sT ?? 1, oS = (m.tS ?? 0) * texW, oT = (m.tT ?? 0) * texH;
    const repS = m.repS, repT = m.repT, flipS = m.flipS, flipT = m.flipT;
    const tex = img?.data;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const w0 = ((p1[0] - px) * (p2[1] - py) - (p2[0] - px) * (p1[1] - py)) / area;
        const w1 = ((p2[0] - px) * (p0[1] - py) - (p0[0] - px) * (p2[1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const depth = w0 * p0[2] + w1 * p1[2] + w2 * p2[2];
        const zi = y * w + x;
        if (depth < z[zi] - 0.05) continue;
        let r = 255, g = 255, bl = 255, al = 255;
        if (tex) {
          const s = (w0 * tri.uv[0][0] + w1 * tri.uv[1][0] + w2 * tri.uv[2][0]) * sS + oS;
          const t = (w0 * tri.uv[0][1] + w1 * tri.uv[1][1] + w2 * tri.uv[2][1]) * sT + oT;
          const ix = wrap(Math.floor(s), texW, repS, flipS), iy = wrap(Math.floor(t), texH, repT, flipT);
          const ti = (iy * texW + ix) * 4;
          r = tex[ti]; g = tex[ti + 1]; bl = tex[ti + 2]; al = tex[ti + 3];
          if (al < 8) continue;
        }
        const c0 = tri.col[0], c1 = tri.col[1], c2 = tri.col[2];
        const k = light / 255;
        r *= (w0 * c0[0] + w1 * c1[0] + w2 * c2[0]) * k;
        g *= (w0 * c0[1] + w1 * c1[1] + w2 * c2[1]) * k;
        bl *= (w0 * c0[2] + w1 * c1[2] + w2 * c2[2]) * k;
        const A = alphaMat * al / 255;
        const i = zi * 4;
        if (A >= 0.97) {
          data[i] = r; data[i + 1] = g; data[i + 2] = bl; data[i + 3] = 255; z[zi] = depth;
          if (onPixel) onPixel(zi, w0 * tri.v[0][2] + w1 * tri.v[1][2] + w2 * tri.v[2][2]);
        } else {
          const da = data[i + 3] / 255; const oa = A + da * (1 - A);
          data[i] = (r * A + data[i] * da * (1 - A)) / oa; data[i + 1] = (g * A + data[i + 1] * da * (1 - A)) / oa;
          data[i + 2] = (bl * A + data[i + 2] * da * (1 - A)) / oa; data[i + 3] = oa * 255;
        }
      }
    }
  }
}

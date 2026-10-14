/* Núcleo do relevo procedural: gera três imagens do mesmo terreno
   (imagem aérea, carta topográfica e linhas de nível).
   Roda dentro de um Web Worker (terrain-worker.js) ou, se o navegador não
   permitir, na própria página (terrain.js). */
(function (raiz) {
  'use strict';
  const GW = 480, GH = 320;          // grade de alturas
  const OW = 1200, OH = 800;         // imagens finais
  const K = OW / GW;

  const rng = seed => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function noise2(seed) {
    const r = rng(seed), p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    const P = new Uint8Array(512).map((_, i) => p[i & 255]);
    const G = Array.from({ length: 256 }, () => { const a = r() * 6.2832; return [Math.cos(a), Math.sin(a)]; });
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      const dot = (i, j) => { const g = G[P[P[X + i] + Y + j]]; return g[0] * (xf - i) + g[1] * (yf - j); };
      const u = fade(xf), v = fade(yf);
      const a = dot(0, 0) + u * (dot(1, 0) - dot(0, 0));
      const b = dot(0, 1) + u * (dot(1, 1) - dot(0, 1));
      return a + v * (b - a);
    };
  }
  const fbm = (n, x, y, o) => { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); t += a; a *= .5; f *= 2; } return s / t; };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  function altura() {
    const n1 = noise2(11), n2 = noise2(23);
    const h = new Float32Array(GW * GH), agua = new Uint8Array(GW * GH);
    let min = 9, max = -9;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = i / GW * 3.2, y = j / GH * 2.133;
      const wx = fbm(n2, x * .9 + 5, y * .9 + 2, 3) * .9;
      let v = fbm(n1, x * 1.15 + wx, y * 1.15 + wx * .6, 5);
      v += .22 * (1 - i / GW);                        // cai para leste, como a drenagem
      const rio = GH * (.56 + .1 * Math.sin(i / GW * 5.3 + 1.1) + .045 * Math.sin(i / GW * 13 + .4));
      const d = Math.abs(j - rio) / GH;
      v -= .17 * Math.exp(-Math.pow(d / .04, 2));
      if (d < .0125) agua[j * GW + i] = 1;
      h[j * GW + i] = v;
      min = Math.min(min, v); max = Math.max(max, v);
    }
    for (let k = 0; k < h.length; k++) h[k] = (h[k] - min) / (max - min);
    return { h, agua };
  }

  function sombra(h, i, j) {
    const g = (a, b) => h[clamp(b, 0, GH - 1) * GW + clamp(a, 0, GW - 1)];
    const dx = g(i + 1, j) - g(i - 1, j), dy = g(i, j + 1) - g(i, j - 1);
    return clamp(.5 + (-dx - dy) * 7, 0, 1);          // luz vinda de noroeste
  }

  let fabrica = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function canvas(w, h) { return fabrica(w, h); }

  function paraGrande(pix) {
    const small = canvas(GW, GH); small.getContext('2d').putImageData(pix, 0, 0);
    const big = canvas(OW, OH), c = big.getContext('2d');
    c.imageSmoothingQuality = 'high'; c.drawImage(small, 0, 0, OW, OH);
    return big;
  }

  function grao(ctx, alpha) {
    const t = canvas(160, 160), tc = t.getContext('2d'), im = tc.createImageData(160, 160), r = rng(3);
    for (let k = 0; k < im.data.length; k += 4) { const v = r() * 255; im.data[k] = im.data[k + 1] = im.data[k + 2] = v; im.data[k + 3] = 255; }
    tc.putImageData(im, 0, 0);
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(t, 'repeat'); ctx.fillRect(0, 0, OW, OH); ctx.restore();
  }

  function contornos(ctx, h, passo, estilo) {
    const niveis = Math.floor(1 / passo);
    for (let n = 1; n < niveis; n++) {
      const L = n * passo, indice = n % 5 === 0, e = estilo(indice);
      ctx.beginPath();
      for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW - 1; i++) {
        const a = h[j * GW + i], b = h[j * GW + i + 1], c = h[(j + 1) * GW + i + 1], d = h[(j + 1) * GW + i];
        const m = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
        if (m === 0 || m === 15) continue;
        const t = (p, q) => (L - p) / (q - p);
        const T = [i + t(a, b), j], R = [i + 1, j + t(b, c)], B = [i + t(d, c), j + 1], Lf = [i, j + t(a, d)];
        const seg = (p, q) => { ctx.moveTo(p[0] * K, p[1] * K); ctx.lineTo(q[0] * K, q[1] * K); };
        switch (m) {
          case 1: case 14: seg(Lf, B); break;
          case 2: case 13: seg(B, R); break;
          case 3: case 12: seg(Lf, R); break;
          case 4: case 11: seg(T, R); break;
          case 5: seg(Lf, T); seg(B, R); break;
          case 6: case 9: seg(T, B); break;
          case 7: case 8: seg(Lf, T); break;
          case 10: seg(T, R); seg(Lf, B); break;
        }
      }
      ctx.strokeStyle = e.cor; ctx.lineWidth = e.larg; ctx.stroke();
    }
  }

  function construir() {
    const { h, agua } = altura();
    const nf = noise2(37), nm = noise2(51), r = rng(9);

    /* imagem aérea: talhões, mata, rio */
    const pa = new ImageData(GW, GH);
    const paleta = ['#6F8D4B', '#7E9A55', '#93A65C', '#B5AE72', '#5E7E42', '#8DA25D', '#C2B67E', '#A3B068', '#6A8847', '#9CAA62'].map(hex);
    const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    const nw = noise2(77);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i, x = i / GW * 3.2, y = j / GH * 2.133;
      const wx = nw(x * 1.3, y * 1.3) * .3, wy = nw(x * 1.3 + 9, y * 1.3 + 4) * .3;
      const ang = .35, u = ((x + wx) * Math.cos(ang) - (y + wy) * Math.sin(ang)) * 4.6, v = ((x + wx) * Math.sin(ang) + (y + wy) * Math.cos(ang)) * 7;
      const cu = Math.floor(u), cv = Math.floor(v), hh = hash(cu, cv), h2 = hash(cu + 7, cv + 3);
      let c = paleta[Math.floor(hh * paleta.length)].slice();
      const dir = h2 * 3.14, listra = Math.sin((u * Math.cos(dir) + v * Math.sin(dir)) * 22) * (.04 + h2 * .05);
      c = c.map(w => w * (1 + listra));
      const borda = Math.min(u - cu, cu + 1 - u, v - cv, cv + 1 - v);
      if (borda < .035) c = c.map(w => w * .8);
      const mata = fbm(nm, x * 2.2 + 4, y * 2.2 + 1, 3) * .5 + .5;
      if (mata > .62 || h[k] < .1) { const t = clamp((mata - .62) * 8); c = mix(c, hex('#2F4A2A'), Math.max(t, h[k] < .1 ? .8 : 0)); c = c.map(w => w * (.85 + r() * .3)); }
      const s = sombra(h, i, j);
      c = c.map(w => w * (.74 + s * .52));
      if (agua[k]) c = mix(hex('#4E7E8E'), hex('#7FA7AE'), r() * .5);
      pa.data.set([c[0], c[1], c[2], 255], k * 4);
    }
    const aerial = paraGrande(pa), ca = aerial.getContext('2d');
    ca.strokeStyle = 'rgba(226,214,180,.9)'; ca.lineWidth = 7; ca.beginPath();
    ca.moveTo(-20, 735); ca.bezierCurveTo(300, 700, 700, 765, 1220, 705); ca.stroke();
    grao(ca, .22);

    /* carta topográfica: tinta hipsométrica, sombreado, curvas, água */
    const pm = new ImageData(GW, GH);
    const rampa = [[0, '#DCE8C2'], [.35, '#EEEBCB'], [.7, '#EBD9A8'], [1, '#D9BC8A']].map(([t, c]) => [t, hex(c)]);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i, v = h[k], x = i / GW * 3.2, y = j / GH * 2.133;
      let a = rampa[0], b = rampa[1];
      for (let q = 0; q < rampa.length - 1; q++) if (v >= rampa[q][0]) { a = rampa[q]; b = rampa[q + 1]; }
      let c = mix(a[1], b[1], clamp((v - a[0]) / (b[0] - a[0])));
      const mata = fbm(nm, x * 2.2 + 4, y * 2.2 + 1, 3) * .5 + .5;
      if (mata > .64) c = mix(c, hex('#C4D9A6'), clamp((mata - .64) * 6) * .55);
      const s = sombra(h, i, j);
      c = c.map(w => w * (.8 + s * .4));
      if (agua[k]) c = hex('#9CC7DA');
      pm.data.set([c[0], c[1], c[2], 255], k * 4);
    }
    const map = paraGrande(pm), cm = map.getContext('2d');
    contornos(cm, h, .03, i => i ? { cor: 'rgba(110,72,30,.85)', larg: 1.7 } : { cor: 'rgba(130,92,48,.5)', larg: .9 });
    grao(cm, .1);

    /* só as linhas de nível, para fundos escuros */
    const lines = canvas(OW, OH);
    contornos(lines.getContext('2d'), h, .025, i => i ? { cor: 'rgba(230,196,94,.5)', larg: 1.6 } : { cor: 'rgba(217,228,200,.2)', larg: 1 });

    return { aerial, map, lines };
  }

  raiz.TerraCore = {
    OW, OH,
    construir(criar) { if (criar) fabrica = criar; return construir(); }
  };
})(typeof self !== 'undefined' ? self : this);

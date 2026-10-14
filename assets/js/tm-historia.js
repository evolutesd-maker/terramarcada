(() => {
  'use strict';
  /* "Primeiro, o relevo": a carta cadastral se forma sozinha, em time lapse. */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!$('#cad')) return;

  /* mapa de satélite do hero: zoom, perímetro e marcador tocam quando ele aparece e recomeçam ao reaparecer */
  const cartao = $('.map-card');
  if (cartao && 'IntersectionObserver' in window && !reduce) {
    new IntersectionObserver(es => {
      if (es[0].isIntersecting) cartao.classList.add('tocar');
      else { cartao.classList.remove('tocar'); cartao.classList.add('zera'); void cartao.offsetWidth; cartao.classList.remove('zera'); }
    }, { threshold: .35 }).observe(cartao);
  } else if (cartao) cartao.classList.add('tocar');

  /* ---------- Carta cadastral do terreno de exemplo (viewBox 1200 x 800) ---------- */
  const M_POR_PX = 0.21;                      // escala estimada pela foto: 1 px = 0,21 m (ilustrativa)
  /* coordenadas em pixels da foto recortada (1000 x 750) */
  const LOTE = [[380, 203], [620, 203], [620, 548], [415, 548], [384, 305]];
  const VIZ = [
    [[380, 115], [620, 115], [620, 203], [380, 203]],        // lote vizinho, ao norte
    [[317, 305], [384, 305], [415, 548], [317, 548]]         // lote vizinho, a oeste
  ];
  const CTL = [[662, 225], [662, 520], [395, 585]];
  const d = pts => pts.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join(' ') + ' Z';
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const cx = LOTE.reduce((s, p) => s + p[0], 0) / LOTE.length;
  const cy = LOTE.reduce((s, p) => s + p[1], 0) / LOTE.length;
  const perimetro = LOTE.reduce((s, p, i) => s + dist(p, LOTE[(i + 1) % LOTE.length]), 0) * M_POR_PX;
  const area = Math.abs(LOTE.reduce((s, p, i) => { const q = LOTE[(i + 1) % LOTE.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2 * M_POR_PX * M_POR_PX / 10000;
  const fora = (p, k) => { const dx = p[0] - cx, dy = p[1] - cy, n = Math.hypot(dx, dy); return [p[0] + dx / n * k, p[1] + dy / n * k]; };
  const tri = c => `M${c[0]} ${c[1] - 13} L${c[0] + 12} ${c[1] + 9} L${c[0] - 12} ${c[1] + 9} Z`;

  function cadastro() {
    let s = VIZ.map(v => `<path class="nb" pathLength="1" d="${d(v)}"/>`).join('');
    s += `<polygon class="lotfill" points="${LOTE.map(p => p.join(',')).join(' ')}"/>`;
    s += `<path class="lot" pathLength="1" d="${d(LOTE)}"/>`;
    s += LOTE.map((p, i) => {
      const a = LOTE[(i + 1) % LOTE.length], m = [(p[0] + a[0]) / 2, (p[1] + a[1]) / 2], t = fora(m, 40);
      return `<rect class="dimbg" x="${(t[0] - 46).toFixed(0)}" y="${(t[1] - 22).toFixed(0)}" width="92" height="34" rx="17"/>
        <text class="dim" x="${t[0].toFixed(0)}" y="${(t[1] + 3).toFixed(0)}" text-anchor="middle">${Math.round(dist(p, a) * M_POR_PX)} m</text>`;
    }).join('');
    s += CTL.map(c => `<path class="ctl" d="${tri(c)}"/>`).join('');
    s += LOTE.map(p => `<circle class="vx" cx="${p[0]}" cy="${p[1]}" r="12"/>`).join('');
    s += LOTE.map((p, i) => { const t = fora(p, 46); return `<text class="vl" x="${t[0].toFixed(0)}" y="${(t[1] + 9).toFixed(0)}" text-anchor="middle">P${i + 1}</text>`; }).join('');
    return s;
  }
  $('#cad').innerHTML = cadastro();

  const fmt = (v, c) => v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

  /* ---------- PICO: time lapse da carta (toca sozinho, sem depender da rolagem) ---------- */
  const secMapa = $('#mapa'), prancha = $('#prancha'), pMapa = $('#pranchaMapa'), scan = $('#scan');
  const g = {
    nb: $$('#cad .nb'), lot: $('#cad .lot'), fill: $('#cad .lotfill'),
    vx: $$('#cad .vx'), vl: $$('#cad .vl'), dim: $$('#cad .dim'), bg: $$('#cad .dimbg'), ctl: $$('#cad .ctl')
  };
  const eArea = $('#eArea'), ePer = $('#ePer'), rever = $('#rever');
  let largP = 0;
  const medirPrancha = () => { largP = prancha.clientWidth; prancha.style.setProperty('--prancha-w', largP + 'px'); };
  medirPrancha(); addEventListener('resize', medirPrancha);
  const suaviza = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const TOTAL = 8000;                                 // duração do time lapse, em ms

  function aplicar(p, s) {
    pMapa.style.clipPath = `inset(0 ${((1 - s) * 100).toFixed(2)}% 0 0)`;
    scan.style.opacity = s > .003 && s < .995 ? 1 : 0;
    scan.style.transform = `translateX(${(s * largP).toFixed(1)}px)`;
    g.nb.forEach((el, i) => { el.style.strokeDashoffset = (1 - clamp((p - (.16 + i * .025)) / .12)).toFixed(3); });
    g.ctl.forEach((el, i) => { el.style.opacity = clamp((p - (.26 + i * .03)) / .05).toFixed(2); });
    g.lot.style.strokeDashoffset = (1 - clamp((p - .34) / .26)).toFixed(3);
    g.vx.forEach((el, i) => {
      const t = clamp((p - (.36 + i * .04)) / .04);
      el.style.opacity = t.toFixed(2);
      el.style.transform = `scale(${t.toFixed(2)})`;
    });
    g.vl.forEach(el => { el.style.opacity = clamp((p - .6) / .08).toFixed(2); });
    const td = clamp((p - .64) / .1).toFixed(2);
    g.dim.forEach(el => { el.style.opacity = td; });
    g.bg.forEach(el => { el.style.opacity = td; });
    g.fill.style.opacity = clamp((p - .7) / .1).toFixed(2);
    const n = clamp((p - .66) / .18);
    eArea.textContent = fmt(area * n, 2);
    ePer.textContent = fmt(Math.round(perimetro * n), 0);
  }
  function quadro(t) {
    const k = clamp(t / TOTAL), p = k * .88;
    aplicar(p, suaviza(clamp((t - 600) / 2800)));
    prancha.style.setProperty('--zoom', (1 + .05 * k).toFixed(4));          // aproximação lenta, como câmera de time lapse
    const passo = p < .33 ? 1 : p < .67 ? 2 : 3;
    if (secMapa.dataset.passo !== String(passo)) secMapa.dataset.passo = passo;
  }
  let estado = 'parado', raf = 0;
  function tocar() {
    cancelAnimationFrame(raf);
    estado = 'tocando'; secMapa.classList.remove('feito');
    const t0 = performance.now();
    const laco = agora => {
      const t = agora - t0;
      quadro(Math.min(t, TOTAL));
      if (t < TOTAL) raf = requestAnimationFrame(laco); else { estado = 'feito'; secMapa.classList.add('feito'); }
    };
    raf = requestAnimationFrame(laco);
  }
  quadro(0);
  if (reduce) { quadro(TOTAL); estado = 'feito'; }
  else {
    new IntersectionObserver(es => { if (es[0].isIntersecting && estado === 'parado') tocar(); }, { threshold: .55 }).observe(prancha);
    new IntersectionObserver(es => { if (!es[0].isIntersecting && estado === 'feito') { estado = 'parado'; quadro(0); } }, { threshold: 0 }).observe(prancha);
    rever.addEventListener('click', tocar);
  }
})();

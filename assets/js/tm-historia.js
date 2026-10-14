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
  const M_POR_PX = 0.6;                       // escala do exemplo: 1 px = 0,6 m
  const LOTE = [[430, 250], [700, 215], [820, 330], [780, 520], [560, 570], [400, 430]];
  const VIZ = [
    [[210, 300], [430, 250], [400, 430], [230, 470]],
    [[700, 215], [960, 180], [1010, 360], [820, 330]],
    [[820, 330], [1010, 360], [980, 540], [780, 520]],
    [[230, 470], [400, 430], [560, 570], [500, 690], [300, 650]],
    [[560, 570], [780, 520], [980, 540], [940, 700], [700, 720], [500, 690]]
  ];
  const CTL = [[330, 190], [900, 440], [620, 655]];
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
    s += '<path class="rd" pathLength="1" d="M-20 735 C300 700 700 765 1220 705"/>';
    s += `<polygon class="lotfill" points="${LOTE.map(p => p.join(',')).join(' ')}"/>`;
    s += `<path class="lot" pathLength="1" d="${d(LOTE)}"/>`;
    s += LOTE.map((p, i) => {
      const a = LOTE[(i + 1) % LOTE.length], m = [(p[0] + a[0]) / 2, (p[1] + a[1]) / 2], t = fora(m, 34);
      return `<rect class="dimbg" x="${(t[0] - 40).toFixed(0)}" y="${(t[1] - 20).toFixed(0)}" width="80" height="30" rx="15"/>
        <text class="dim" x="${t[0].toFixed(0)}" y="${(t[1] + 1).toFixed(0)}" text-anchor="middle">${Math.round(dist(p, a) * M_POR_PX)} m</text>`;
    }).join('');
    s += CTL.map(c => `<path class="ctl" d="${tri(c)}"/>`).join('');
    s += LOTE.map(p => `<circle class="vx" cx="${p[0]}" cy="${p[1]}" r="10"/>`).join('');
    s += LOTE.map((p, i) => { const t = fora(p, 30); return `<text class="vl" x="${t[0].toFixed(0)}" y="${(t[1] + 7).toFixed(0)}" text-anchor="middle">P${i + 1}</text>`; }).join('');
    return s;
  }
  $('#cad').innerHTML = cadastro();

  const fmt = (v, c) => v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

  /* ---------- PICO: time lapse da carta (toca sozinho, sem depender da rolagem) ---------- */
  const secMapa = $('#mapa'), prancha = $('#prancha'), pMapa = $('#pranchaMapa'), scan = $('#scan');
  const g = {
    nb: $$('#cad .nb'), rd: $('#cad .rd'), lot: $('#cad .lot'), fill: $('#cad .lotfill'),
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
    g.rd.style.strokeDashoffset = (1 - clamp((p - .16) / .18)).toFixed(3);
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
    eArea.textContent = fmt(area * n, 1);
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

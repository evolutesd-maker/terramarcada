(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ---------- QUEM SOMOS: a rota do voo percorre os passos ---------- */
  if ($('#passos')) {
    const cont = $('#passos'), svg = $('#rotaV'), feita = $('.feita', svg), marc = $('#marcador'), passos = $$('.passo');
    const traçar = () => {
      const h = cont.offsetHeight;
      svg.setAttribute('viewBox', `0 0 70 ${h}`);
      const ys = passos.map(p => p.offsetTop + 22);
      let d = `M35 0`;
      ys.forEach((y, i) => { d += ` C ${i % 2 ? 62 : 8} ${y - 60}, ${i % 2 ? 8 : 62} ${y - 20}, 35 ${y}`; });
      d += ` L35 ${h}`;
      $('.trilha', svg).setAttribute('d', d);
      feita.setAttribute('d', d);
      feita.setAttribute('pathLength', '1');
    };
    const mover = () => {
      const r = cont.getBoundingClientRect();
      const p = clamp((innerHeight * .55 - r.top) / r.height);
      feita.style.strokeDashoffset = (1 - p).toFixed(4);
      const comp = $('.trilha', svg).getTotalLength();
      const pt = $('.trilha', svg).getPointAtLength(comp * p);
      marc.style.transform = `translate(${(pt.x - 35).toFixed(1)}px,${pt.y.toFixed(1)}px)`;
      passos.forEach(el => el.classList.toggle('ativo', el.offsetTop + 22 <= p * cont.offsetHeight + 40));
    };
    traçar(); mover();
    if (reduce) { passos.forEach(el => el.classList.add('ativo')); feita.style.strokeDashoffset = 0; }
    else {
      addEventListener('scroll', () => requestAnimationFrame(mover), { passive: true });
      addEventListener('resize', () => { traçar(); mover(); });
      addEventListener('load', () => { traçar(); mover(); });
    }
  }

})();

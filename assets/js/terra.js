/* Carrega o relevo procedural sem travar a página:
   1) tenta gerar em um Web Worker (OffscreenCanvas);
   2) se o navegador ou o ambiente (por exemplo, abrir o arquivo direto do disco)
      não permitir, gera na própria página, depois que a primeira tela já apareceu.
   O resultado é copiado para os <canvas data-terra="aerial|map|lines">. */
(function () {
  'use strict';
  const OW = 1200, OH = 800;
  /* os endereços (com hash do build) ficam em <meta name="terra-core|terra-worker"> */
  const url = n => (document.querySelector('meta[name="' + n + '"]') || {}).content || ('assets/js/' + n + '.js');

  /* nitidez conforme a tela: telas muito largas ou densas recebem as curvas em escala 3 */
  const ESCALAS = { aerial: 2, map: 2, lines: Math.max(screen.width, innerWidth) * (devicePixelRatio || 1) > 2400 ? 3 : 2 };

  function montar(img) {
    document.querySelectorAll('canvas[data-terra]').forEach(c => {
      const fonte = img[c.dataset.terra]; if (!fonte) return;
      const f = fonte.width / OW;                       // as imagens vêm em escala maior que o tamanho lógico
      const [sx, sy, sw, sh] = (c.dataset.crop || `0,0,${OW},${OH}`).split(',').map(Number).map(v => Math.round(v * f));
      c.width = sw; c.height = sh;
      c.getContext('2d').drawImage(fonte, sx, sy, sw, sh, 0, 0, sw, sh);
      c.classList.add('pronto');
    });
    document.documentElement.classList.add('terreno-pronto');
  }

  function naPagina() {
    const s = document.createElement('script');
    s.src = url('terra-core');
    s.onload = () => requestAnimationFrame(() => setTimeout(() => montar(window.TerraCore.construir(null, ESCALAS)), 30));
    document.head.appendChild(s);
  }

  function iniciar() {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return naPagina();
    let w;
    try { w = new Worker(url('terra-worker')); } catch (e) { return naPagina(); }
    let respondeu = false;
    w.onmessage = e => { respondeu = true; w.terminate(); if (e.data.ok) montar(e.data.img); else naPagina(); };
    w.onerror = () => { if (!respondeu) { w.terminate(); naPagina(); } };
    w.postMessage({ escalas: ESCALAS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

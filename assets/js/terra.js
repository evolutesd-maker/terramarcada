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
  const ESCALAS = { so: [...new Set([...document.querySelectorAll('canvas[data-terra]')].map(c => c.dataset.terra))], aerial: 2, map: 2, lines: Math.max(screen.width, innerWidth) * (devicePixelRatio || 1) > 2400 ? 3 : 2 };

  /* desenha um canvas por quadro, no tamanho que a tela realmente mostra (largura x densidade),
     para não travar a página nem gastar memória com imagens maiores que o necessário */
  function montar(img) {
    const cvs = [...document.querySelectorAll('canvas[data-terra]')];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const desenhar = c => {
      const fonte = img[c.dataset.terra]; if (!fonte) return;
      const f = fonte.width / OW;                       // as imagens vêm em escala maior que o tamanho lógico
      const [sx, sy, sw, sh] = (c.dataset.crop || `0,0,${OW},${OH}`).split(',').map(Number).map(v => Math.round(v * f));
      const alvo = Math.ceil((c.offsetWidth || sw) * dpr * 1.15);   // 1,15: folga para o movimento lento de fundo
      const w = Math.max(1, Math.min(sw, alvo)), h = Math.max(1, Math.round(w * sh / sw));
      c.width = w; c.height = h;
      const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high';
      cx.drawImage(fonte, sx, sy, sw, sh, 0, 0, w, h);
      c.classList.add('pronto');
    };
    let i = 0;
    const passo = () => {
      if (i < cvs.length) { desenhar(cvs[i++]); requestAnimationFrame(passo); return; }
      document.documentElement.classList.add('terreno-pronto');
      Object.keys(img).forEach(k => { if (img[k].close) img[k].close(); });   // libera a memória das imagens grandes
    };
    requestAnimationFrame(passo);
  }

  function naPagina() {
    const s = document.createElement('script');
    s.src = url('terra-core');
    s.onload = () => requestAnimationFrame(() => setTimeout(() => montar(window.TerraCore.construir(null, ESCALAS)), 30));
    document.head.appendChild(s);
  }

  /* um trabalho por canvas: qual imagem, qual recorte (em coordenadas lógicas) e em que tamanho desenhar */
  function trabalhos() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return [...document.querySelectorAll('canvas[data-terra]')].map(c => {
      const [sx, sy, sw, sh] = (c.dataset.crop || `0,0,${OW},${OH}`).split(',').map(Number);
      const alvo = Math.ceil((c.offsetWidth || sw) * dpr * 1.15);        // 1,15: folga para o movimento lento de fundo
      const w = Math.max(1, Math.min(Math.round(sw * 3), alvo)), h = Math.max(1, Math.round(w * sh / sw));
      return { el: c, tipo: c.dataset.terra, sx, sy, sw, sh, w, h };
    });
  }

  function receber(jobs, bitmaps) {
    jobs.forEach((j, i) => {
      const bm = bitmaps[i]; if (!bm) return;
      const c = j.el; c.width = j.w; c.height = j.h;
      const r = c.getContext('bitmaprenderer');
      if (r) r.transferFromImageBitmap(bm); else { c.getContext('2d').drawImage(bm, 0, 0); if (bm.close) bm.close(); }
      c.classList.add('pronto');
    });
    document.documentElement.classList.add('terreno-pronto');
  }

  function iniciar() {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return naPagina();
    let w;
    try { w = new Worker(url('terra-worker')); } catch (e) { return naPagina(); }
    let respondeu = false;
    const jobs = trabalhos();
    w.onmessage = e => { respondeu = true; w.terminate(); if (e.data.ok) receber(jobs, e.data.jobs); else naPagina(); };
    w.onerror = () => { if (!respondeu) { w.terminate(); naPagina(); } };
    w.postMessage({ escalas: ESCALAS, jobs: jobs.map(({ el, ...j }) => j) });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

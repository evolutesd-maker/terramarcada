/* Carrega o relevo procedural sem travar a página:
   1) tenta gerar em um Web Worker (OffscreenCanvas), que já devolve cada canvas no tamanho exato;
   2) se o navegador ou o ambiente (por exemplo, abrir o arquivo direto do disco)
      não permitir, gera na própria página, depois que a primeira tela já apareceu.
   O resultado vai para os <canvas data-terra="aerial|map|lines">. */
(function () {
  'use strict';
  const OW = 1200, OH = 800;
  const LIMITE = { aerial: 2, map: 2 };          // escala máxima gerada de cada imagem
  const MAX_PX = 7e6;                                      // teto de pixels por canvas (memória do celular)
  /* os endereços (com hash do build) ficam em <meta name="terra-core|terra-worker"> */
  const url = n => (document.querySelector('meta[name="' + n + '"]') || {}).content || ('assets/js/' + n + '.js');
  let ESCALAS = null;

  /* Um trabalho por canvas: qual imagem, qual recorte (em coordenadas lógicas) e em que tamanho desenhar.
     O canvas é mostrado com object-fit: cover, então o tamanho nasce do lado que "cobre" a caixa:
     num celular em pé, o fundo é bem mais alto que largo e precisa de muito mais pixels por unidade. */
  function trabalhos() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const lista = [...document.querySelectorAll('canvas[data-terra]')].map(c => {
      const [sx, sy, sw, sh] = (c.dataset.crop || `0,0,${OW},${OH}`).split(',').map(Number);
      const W = c.offsetWidth || sw, H = c.offsetHeight || sh;
      const k = Math.max(W / sw, H / sh) * dpr * 1.15;    // 1,15: folga para o movimento lento de fundo
      const j = { el: c, tipo: c.dataset.terra, sx, sy, sw, sh, k };
      if (j.tipo === 'lines') {
        /* só o recorte que o "cover" mostra (centralizado), no tamanho exato da caixa */
        const caixa = W / H, fonte = sw / sh;
        if (caixa < fonte) { const nw = sh * caixa; j.sx = sx + (sw - nw) / 2; j.sw = nw; }
        else { const nh = sw / caixa; j.sy = sy + (sh - nh) / 2; j.sh = nh; }
        j.k = Math.max(W / j.sw, H / j.sh) * dpr * 1.15;
      }
      return j;
    });
    const esc = { so: [...new Set(lista.map(j => j.tipo))].filter(x => x !== 'lines'), aerial: 2, map: 2, lines: 2 };
    ['aerial', 'map'].forEach(t => {
      const m = Math.max(0, ...lista.filter(j => j.tipo === t).map(j => j.k));
      if (m) esc[t] = Math.min(LIMITE[t], Math.max(1.5, Math.ceil(m * 2) / 2));   // passos de 0,5
    });
    lista.forEach(j => {
      let k = j.tipo === 'lines' ? j.k : Math.min(j.k, esc[j.tipo]);
      const px = j.sw * j.sh * k * k; if (px > MAX_PX) k *= Math.sqrt(MAX_PX / px);
      j.w = Math.max(1, Math.round(j.sw * k)); j.h = Math.max(1, Math.round(j.sh * k));
    });
    ESCALAS = esc;
    return lista;
  }

  function aplicar(j, fonte) {          // fonte: ImageBitmap/canvas já no tamanho final (worker) ou imagem grande (página)
    const c = j.el; c.width = j.w; c.height = j.h; c.classList.add('pronto');
    return c;
  }

  function receber(jobs, bitmaps) {
    jobs.forEach((j, i) => {
      const bm = bitmaps[i]; if (!bm) return;
      const c = aplicar(j);
      /* canvas 2D comum (e não 'bitmaprenderer'): o canal de transparência das curvas de nível se mantém em qualquer placa de vídeo */
      const cx = c.getContext('2d'); cx.clearRect(0, 0, c.width, c.height); cx.drawImage(bm, 0, 0);
      if (bm.close) bm.close();
    });
    document.documentElement.classList.add('terreno-pronto');
  }

  /* plano B: gera na própria página e desenha um canvas por quadro */
  function naPagina(jobs) {
    const s = document.createElement('script');
    s.src = url('terra-core');
    s.onload = () => requestAnimationFrame(() => setTimeout(() => {
      const img = window.TerraCore.construir(null, ESCALAS);
      let i = 0;
      const passo = () => {
        if (i < jobs.length) {
          const j = jobs[i++];
          if (j.tipo === 'lines') {
            const c = aplicar(j); c.getContext('2d').drawImage(window.TerraCore.linhas(null, j), 0, 0);
            requestAnimationFrame(passo); return;
          }
          const fonte = img[j.tipo];
          if (fonte) {
            const f = fonte.width / OW, c = aplicar(j), cx = c.getContext('2d');
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(fonte, j.sx * f, j.sy * f, j.sw * f, j.sh * f, 0, 0, j.w, j.h);
          }
          requestAnimationFrame(passo); return;
        }
        document.documentElement.classList.add('terreno-pronto');
      };
      requestAnimationFrame(passo);
    }, 30));
    document.head.appendChild(s);
  }

  function iniciar() {
    const jobs = trabalhos();
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return naPagina(jobs);
    let w;
    try { w = new Worker(url('terra-worker')); } catch (e) { return naPagina(jobs); }
    let respondeu = false;
    w.onmessage = e => { respondeu = true; w.terminate(); if (e.data.ok) receber(jobs, e.data.jobs); else naPagina(jobs); };
    w.onerror = () => { if (!respondeu) { w.terminate(); naPagina(jobs); } };
    w.postMessage({ escalas: ESCALAS, jobs: jobs.map(({ el, k, ...j }) => j) });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

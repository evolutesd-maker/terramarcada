/* Bairro de Ijuí desenhado em vetor (canvas), a partir do quarteirão da foto aérea.
   Duas versões do mesmo lugar, na mesma geometria (1200 x 800):
     aerial = vista aérea estilizada (telhados, árvores, asfalto)
     plan   = planta urbana limpa, com nomes de ruas e do bairro.
   Nítido em qualquer tela: desenha direto no tamanho que o quadro mostra. Nomes e medidas são ilustrativos. */
(function () {
  'use strict';
  const W = 1200, H = 800;
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---------- geometria ---------- */
  const RUAS_V = [{ x: 190, w: 56, nome: 'Rua Quinze de Novembro' }, { x: 720, w: 80, nome: 'Rua 19 de Outubro', av: true }];
  const RUAS_H = [{ y: 88, w: 56, nome: 'Rua do Comércio' }, { y: 640, w: 56, nome: 'Rua Sete de Setembro' }];
  const COLS = [[0, 162], [218, 680], [760, 1200]];
  const LINHAS = [[0, 60], [116, 612], [668, 800]];
  const PROTEGIDO = [380, 190, 680, 612];                 // lote da Terra Marcada e vizinhos (desenhados à mão)
  const PRACA = [800, 140, 1160, 330];
  const LOTE = [[452, 300], [680, 300], [680, 612], [500, 612], [458, 410]];   // lote mapeado (mesmos pontos do cadastro)
  const EMPRESA = [452, 200, 680, 300];                    // lote da Terra Marcada, ao norte
  const OESTE = [[386, 410], [458, 410], [500, 612], [386, 612]];

  const cruza = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

  function lotes() {
    const r = rng(7), saida = [];
    LINHAS.forEach(([y0, y1]) => COLS.forEach(([x0, x1]) => {
      let y = y0;
      while (y < y1 - 20) {
        let h = 96 + r() * 36; if (y + h > y1 - 70) h = y1 - y;
        let x = x0;
        while (x < x1 - 20) {
          let w = 46 + r() * 28; if (x + w > x1 - 46) w = x1 - x;
          const l = [x, y, x + w, y + h];
          if (!cruza(l, PROTEGIDO) && !cruza(l, PRACA) && w > 20 && h > 20) saida.push(l);
          x += w;
        }
        y += h;
      }
    }));
    return saida;
  }

  const TELHAS = ['#B8654A', '#9C4F3A', '#8A8F94', '#C9CCCE', '#A89F94', '#D8D3C8', '#6E5547', '#C27A55', '#7B8085'];
  const GRAMAS = ['#7A9B55', '#6E9150', '#8DA562', '#A3A872', '#5F8446', '#97A767'];

  /* ---------- desenho ---------- */
  function arvore(c, x, y, r, modo) {
    if (modo === 'plan') { c.fillStyle = '#C3D8A8'; c.strokeStyle = '#A9C48C'; c.lineWidth = .8; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.stroke(); return; }
    c.fillStyle = 'rgba(0,0,0,.30)'; c.beginPath(); c.ellipse(x + r * .35, y + r * .5, r * 1.02, r * .85, 0, 0, 6.2832); c.fill();
    const g = c.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
    g.addColorStop(0, '#86B65F'); g.addColorStop(.6, '#4C8040'); g.addColorStop(1, '#2C5629');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
    c.fillStyle = 'rgba(190,230,140,.28)'; c.beginPath(); c.arc(x - r * .35, y - r * .35, r * .45, 0, 6.2832); c.fill();
  }

  function casa(c, x, y, w, h, cor, modo, tipo) {
    if (modo === 'plan') {
      c.fillStyle = '#E4DCCB'; c.strokeStyle = '#C6BCA6'; c.lineWidth = 1; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
      return;
    }
    c.fillStyle = 'rgba(0,0,0,.34)'; c.fillRect(x + 7, y + 9, w, h);                // sombra
    c.fillStyle = cor; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x, y, w, h * .5);              // água do telhado
    c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1.5; c.beginPath();
    if (w >= h) { c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); } else { c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); }
    c.stroke(); c.strokeRect(x, y, w, h);
    if (tipo === 'solar') { c.fillStyle = '#34465A'; c.fillRect(x + w * .18, y + h * .12, w * .4, h * .32); }
  }

  function desenhar(c, modo) {
    const r = rng(21), plan = modo === 'plan';
    /* chão */
    c.fillStyle = plan ? '#F1EDE1' : '#7C8A5C'; c.fillRect(0, 0, W, H);
    /* lotes */
    const L = lotes();
    L.forEach(l => {
      const [x0, y0, x1, y1] = l, w = x1 - x0, h = y1 - y0;
      c.fillStyle = plan ? '#F6F2E7' : GRAMAS[Math.floor(r() * GRAMAS.length)]; c.fillRect(x0 + .5, y0 + .5, w - 1, h - 1);
      if (plan) { c.strokeStyle = '#DDD5C2'; c.lineWidth = .9; c.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1); }
      if (r() < .1) return;                                                          // lote vazio
      const bw = Math.max(18, w * (.5 + r() * .25)), bh = Math.max(18, h * (.34 + r() * .24));
      casa(c, x0 + (w - bw) / 2 + (r() - .5) * 6, y0 + 9 + r() * 8, bw, bh, TELHAS[Math.floor(r() * TELHAS.length)], modo, r() < .25 ? 'solar' : '');
      const n = Math.floor(r() * 3.2);
      for (let i = 0; i < n; i++) arvore(c, x0 + 10 + r() * (w - 20), y0 + h * .62 + r() * (h * .3), 7 + r() * 8, modo);
    });
    /* praça */
    const [px0, py0, px1, py1] = PRACA;
    c.fillStyle = plan ? '#CFE2B6' : '#6B9A4A'; c.beginPath(); c.roundRect(px0, py0, px1 - px0, py1 - py0, 10); c.fill();
    c.strokeStyle = plan ? '#F6F2E7' : '#CDBFA0'; c.lineWidth = plan ? 8 : 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(px0 + 14, py0 + 14); c.lineTo(px1 - 14, py1 - 14); c.moveTo(px1 - 14, py0 + 14); c.lineTo(px0 + 14, py1 - 14); c.moveTo((px0 + px1) / 2, py0 + 10); c.lineTo((px0 + px1) / 2, py1 - 10); c.stroke();
    c.fillStyle = plan ? '#EAE3D2' : '#BFB295'; c.beginPath(); c.arc((px0 + px1) / 2, (py0 + py1) / 2, 30, 0, 6.2832); c.fill();
    c.fillStyle = plan ? '#B9D8E6' : '#6E9DAF'; c.beginPath(); c.arc((px0 + px1) / 2, (py0 + py1) / 2, 18, 0, 6.2832); c.fill();
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; arvore(c, (px0 + px1) / 2 + Math.cos(a) * 150 + (r() - .5) * 18, (py0 + py1) / 2 + Math.sin(a) * 72 + (r() - .5) * 14, 11 + r() * 5, modo); }
    /* lote da Terra Marcada (ao norte): casa com piscina */
    const [ex0, ey0, ex1, ey1] = EMPRESA;
    c.fillStyle = plan ? '#F6F2E7' : '#7E9A58'; c.fillRect(ex0, ey0, ex1 - ex0, ey1 - ey0);
    casa(c, ex0 + 70, ey0 + 8, 110, 46, '#C27A55', modo); casa(c, ex0 + 188, ey0 + 12, 30, 30, '#C9CCCE', modo);
    c.fillStyle = plan ? '#B9D8E6' : '#4FA6C9'; c.fillRect(ex0 + 14, ey0 + 30, 40, 24);
    if (plan) { c.strokeStyle = '#DDD5C2'; c.lineWidth = .9; c.strokeRect(ex0 + .5, ey0 + .5, ex1 - ex0 - 1, ey1 - ey0 - 1); }
    /* lote mapeado: gramado com casa e árvores */
    c.beginPath(); LOTE.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
    c.fillStyle = plan ? '#D5E5BE' : '#77A253'; c.fill();
    casa(c, 470, 330, 100, 70, '#9C6B4F', modo); casa(c, 575, 338, 42, 54, '#C27A55', modo);
    [[560, 450, 24], [610, 500, 20], [520, 540, 18], [640, 380, 22], [600, 330, 16], [490, 470, 15], [575, 570, 17]].forEach(t => arvore(c, t[0], t[1], t[2], modo));
    /* vizinho a oeste: galpão cinza */
    c.beginPath(); OESTE.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
    c.fillStyle = plan ? '#F6F2E7' : '#8C9A68'; c.fill();
    casa(c, 398, 424, 52, 178, '#C9CCCE', modo);
    [[352, 450, 16], [330, 520, 14], [362, 575, 13], [340, 380, 15]].forEach(t => arvore(c, t[0], t[1], t[2], modo));

    /* ruas */
    const ruaV = s => { const x0 = s.x - s.w / 2; c.fillRect(x0, 0, s.w, H); };
    const ruaH = s => { const y0 = s.y - s.w / 2; c.fillRect(0, y0, W, s.w); };
    if (plan) {
      c.fillStyle = '#D9D2BF'; RUAS_V.forEach(s => { c.fillRect(s.x - s.w / 2 - 2, 0, s.w + 4, H); }); RUAS_H.forEach(s => { c.fillRect(0, s.y - s.w / 2 - 2, W, s.w + 4); });
      c.fillStyle = '#FFFFFF'; RUAS_V.forEach(ruaV); RUAS_H.forEach(ruaH);
    } else {
      c.fillStyle = '#B9B3A4'; RUAS_V.forEach(s => c.fillRect(s.x - s.w / 2 - 7, 0, s.w + 14, H)); RUAS_H.forEach(s => c.fillRect(0, s.y - s.w / 2 - 7, W, s.w + 14));
      c.fillStyle = '#524F4C'; RUAS_V.forEach(ruaV); RUAS_H.forEach(ruaH);
      for (let i = 0; i < 2600; i++) { c.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; const v = RUAS_V[Math.floor(r() * 2)]; c.fillRect(v.x - v.w / 2 + r() * v.w, r() * H, 2, 2); }
      c.strokeStyle = 'rgba(240,225,150,.85)'; c.lineWidth = 2.2; c.setLineDash([16, 14]);
      RUAS_V.forEach(s => { c.beginPath(); c.moveTo(s.x, 0); c.lineTo(s.x, H); c.stroke(); });
      RUAS_H.forEach(s => { c.beginPath(); c.moveTo(0, s.y); c.lineTo(W, s.y); c.stroke(); });
      c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,.85)';                                          // faixas de pedestre
      RUAS_H.forEach(h => RUAS_V.forEach(v => { for (let i = 0; i < 6; i++) { c.fillRect(v.x - v.w / 2 + 6 + i * (v.w - 12) / 6, h.y - h.w / 2 - 16, 4, 12); c.fillRect(v.x + v.w / 2 + 12, h.y - h.w / 2 + 6 + i * (h.w - 12) / 6, 12, 4); } }));
      /* carros */
      [[705, 220, 1], [735, 300, 0], [706, 470, 1], [736, 540, 0], [180, 380, 1], [300, 640, 0], [640, 662, 1]].forEach(([x, y, v]) => {
        c.fillStyle = ['#C94D4D', '#E8E8E8', '#3C6FB5', '#222'][Math.floor(r() * 4)]; if (x > 600 && x < 800 || x < 250) c.fillRect(x - 5, y - 10, 10, 20); else c.fillRect(x - 10, y - 5, 20, 10);
      });
    }
    /* grão (aérea) */
    if (!plan) for (let i = 0; i < 5000; i++) { c.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; c.fillRect(r() * W, r() * H, 1.5, 1.5); }

    /* nomes (planta) */
    if (plan) {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const fonte = (t, p) => { c.font = `600 ${t}px "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif`; try { c.letterSpacing = p + 'px'; } catch (e) { /* sem suporte */ } };
      fonte(15, 2); c.fillStyle = '#7C7765';
      RUAS_H.forEach(s => { [330, 960].forEach(x => c.fillText(s.nome.toUpperCase(), x, s.y)); });
      fonte(15, 2); c.save(); c.translate(190, 400); c.rotate(-Math.PI / 2); c.fillText(RUAS_V[0].nome.toUpperCase(), 0, 0); c.restore();
      fonte(14, 2); c.fillStyle = '#6A6553'; c.save(); c.translate(720, 182); c.rotate(-Math.PI / 2); c.fillText(RUAS_V[1].nome.toUpperCase(), 0, 0); c.restore();
      fonte(13, 2); c.fillStyle = '#5E8A3E'; c.fillText('PRAÇA', (PRACA[0] + PRACA[2]) / 2, PRACA[1] + 10);
      c.font = '800 34px "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif'; try { c.letterSpacing = '6px'; } catch (e) { /* sem suporte */ }
      c.fillStyle = 'rgba(46,122,87,.2)'; c.fillText('BAIRRO CENTRO', 982, 392);
      c.fillText('IJUÍ', 982, 432);
      try { c.letterSpacing = '0px'; } catch (e) { /* sem suporte */ }
    }
  }

  function montar() {
    const cvs = [...document.querySelectorAll('canvas[data-cidade]')];
    if (!cvs.length) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const feito = () => {
      cvs.forEach(cv => {
        const k = Math.max(1, Math.min(2.2, (cv.offsetWidth || W) * dpr * 1.1 / W));
        cv.width = Math.round(W * k); cv.height = Math.round(H * k);
        const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0); c.imageSmoothingQuality = 'high';
        desenhar(c, cv.dataset.cidade);
        cv.classList.add('pronto');
      });
    };
    const fontes = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 15px "Bricolage Grotesque"'), document.fonts.load('800 34px "Bricolage Grotesque"')]).catch(() => 0) : Promise.resolve();
    fontes.then(() => requestAnimationFrame(feito));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();

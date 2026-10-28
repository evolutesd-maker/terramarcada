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

  /* paleta sóbria: tons de ortofoto e de planta cadastral, sem cores vivas */
  const TELHAS = ['#8E5A48', '#7A4F41', '#8B8F92', '#A9A79E', '#9C9588', '#B5B2A7', '#5F6469', '#98664F', '#767B7E'];
  const CHAOS = ['#7E8767', '#8A8B6C', '#737D5E', '#979372', '#6D7759', '#868A68'];
  const COPAS = ['#3F5B39', '#46633F', '#385232', '#4D6B44'];

  /* copa irregular: pequeno aglomerado de círculos (aérea) ou símbolo de árvore em linha fina (planta) */
  function arvore(c, x, y, r, modo, rr) {
    if (modo === 'plan') {
      c.strokeStyle = '#8FA57B'; c.lineWidth = .9; c.fillStyle = 'rgba(190,208,170,.35)';
      c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); c.stroke();
      c.fillStyle = '#8FA57B'; c.beginPath(); c.arc(x, y, 1.1, 0, 6.2832); c.fill();
      return;
    }
    c.save(); c.shadowColor = 'rgba(10,18,8,.45)'; c.shadowBlur = r * .8; c.shadowOffsetX = r * .35; c.shadowOffsetY = r * .5;
    const n = 4 + Math.floor(rr() * 3);
    for (let i = 0; i < n; i++) {
      const a = rr() * 6.2832, d = r * .45 * rr();
      c.fillStyle = COPAS[Math.floor(rr() * COPAS.length)];
      c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (.55 + rr() * .3), 0, 6.2832); c.fill();
    }
    c.restore();
    c.fillStyle = 'rgba(150,185,110,.18)'; c.beginPath(); c.arc(x - r * .25, y - r * .25, r * .42, 0, 6.2832); c.fill();
  }

  function casa(c, x, y, w, h, cor, modo) {
    if (modo === 'plan') {
      c.fillStyle = '#DAD7CC'; c.strokeStyle = '#A9A597'; c.lineWidth = .9; c.fillRect(x, y, w, h); c.strokeRect(x + .45, y + .45, w - .9, h - .9);
      return;
    }
    c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 6; c.shadowOffsetX = 4; c.shadowOffsetY = 5;
    c.fillStyle = cor; c.fillRect(x, y, w, h); c.restore();
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(0,0,0,.14)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.beginPath();
    if (w >= h) { c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); } else { c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); }
    c.stroke();
  }

  function hachura(c, x, y, w, h, cor, passo) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = cor; c.lineWidth = .8; c.beginPath();
    for (let k = -h; k < w; k += passo) { c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); }
    c.stroke(); c.restore();
  }

  function desenhar(c, modo) {
    const rr = rng(21), plan = modo === 'plan';
    /* chão */
    c.fillStyle = plan ? '#F3F2EC' : '#6F775B'; c.fillRect(0, 0, W, H);
    /* lotes */
    const L = lotes();
    L.forEach(l => {
      const [x0, y0, x1, y1] = l, w = x1 - x0, h = y1 - y0;
      c.fillStyle = plan ? '#ECEAE2' : CHAOS[Math.floor(rr() * CHAOS.length)]; c.fillRect(x0, y0, w, h);
      c.strokeStyle = plan ? '#BEBAAD' : 'rgba(20,24,14,.35)'; c.lineWidth = plan ? .8 : 1; c.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1);
      if (rr() < .1) return;                                                           // lote vazio
      const bw = Math.max(18, w * (.5 + rr() * .25)), bh = Math.max(18, h * (.34 + rr() * .24));
      casa(c, x0 + (w - bw) / 2 + (rr() - .5) * 6, y0 + 9 + rr() * 8, bw, bh, TELHAS[Math.floor(rr() * TELHAS.length)], modo);
      const n = Math.floor(rr() * 3.2);
      for (let i = 0; i < n; i++) arvore(c, x0 + 10 + rr() * (w - 20), y0 + h * .62 + rr() * (h * .3), 6 + rr() * 6, modo, rr);
    });
    /* praça */
    const [px0, py0, px1, py1] = PRACA, pw = px1 - px0, ph = py1 - py0;
    c.fillStyle = plan ? '#E1E8D6' : '#5F7A4A'; c.fillRect(px0, py0, pw, ph);
    if (plan) { hachura(c, px0, py0, pw, ph, 'rgba(143,165,123,.45)', 9); c.strokeStyle = '#A9B795'; c.lineWidth = .9; c.strokeRect(px0 + .5, py0 + .5, pw - 1, ph - 1); }
    c.strokeStyle = plan ? '#FFFFFF' : '#B8AD93'; c.lineWidth = plan ? 7 : 8; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(px0 + 14, py0 + 14); c.lineTo(px1 - 14, py1 - 14); c.moveTo(px1 - 14, py0 + 14); c.lineTo(px0 + 14, py1 - 14); c.moveTo((px0 + px1) / 2, py0 + 8); c.lineTo((px0 + px1) / 2, py1 - 8); c.stroke();
    if (plan) { c.strokeStyle = '#BDB8A8'; c.lineWidth = .8; c.beginPath(); c.moveTo(px0 + 14, py0 + 14); c.lineTo(px1 - 14, py1 - 14); c.moveTo(px1 - 14, py0 + 14); c.lineTo(px0 + 14, py1 - 14); c.stroke(); }
    c.fillStyle = plan ? '#FFFFFF' : '#C7BDA3'; c.beginPath(); c.arc((px0 + px1) / 2, (py0 + py1) / 2, 28, 0, 6.2832); c.fill();
    if (plan) { c.strokeStyle = '#A9A597'; c.lineWidth = .9; c.stroke(); }
    c.fillStyle = plan ? '#CFE0E8' : '#5E8294'; c.beginPath(); c.arc((px0 + px1) / 2, (py0 + py1) / 2, 15, 0, 6.2832); c.fill();
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; arvore(c, (px0 + px1) / 2 + Math.cos(a) * 150 + (rr() - .5) * 16, (py0 + py1) / 2 + Math.sin(a) * 72 + (rr() - .5) * 12, 10 + rr() * 4, modo, rr); }
    /* lote da Terra Marcada (ao norte): casa com piscina */
    const [ex0, ey0, ex1, ey1] = EMPRESA;
    c.fillStyle = plan ? '#ECEAE2' : '#76805F'; c.fillRect(ex0, ey0, ex1 - ex0, ey1 - ey0);
    casa(c, ex0 + 70, ey0 + 8, 110, 46, '#98664F', modo); casa(c, ex0 + 188, ey0 + 12, 30, 30, '#A9A79E', modo);
    c.fillStyle = plan ? '#CFE0E8' : '#5B8FA3'; c.fillRect(ex0 + 14, ey0 + 30, 40, 24);
    c.strokeStyle = plan ? '#BEBAAD' : 'rgba(20,24,14,.35)'; c.lineWidth = plan ? .8 : 1; c.strokeRect(ex0 + .5, ey0 + .5, ex1 - ex0 - 1, ey1 - ey0 - 1);
    /* lote mapeado: gramado com casa e árvores */
    c.beginPath(); LOTE.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
    c.fillStyle = plan ? '#DCE5CF' : '#6E8B57'; c.fill();
    casa(c, 470, 330, 100, 70, '#8A5A47', modo); casa(c, 575, 338, 42, 54, '#98664F', modo);
    [[560, 450, 21], [610, 500, 18], [520, 540, 16], [640, 380, 19], [600, 330, 14], [490, 470, 13], [575, 570, 15]].forEach(t => arvore(c, t[0], t[1], t[2], modo, rr));
    /* vizinho a oeste: galpão cinza */
    c.beginPath(); OESTE.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
    c.fillStyle = plan ? '#ECEAE2' : '#7B8663'; c.fill();
    casa(c, 398, 424, 52, 178, '#A9A79E', modo);
    [[352, 450, 14], [330, 520, 12], [362, 575, 11], [340, 380, 13]].forEach(t => arvore(c, t[0], t[1], t[2], modo, rr));

    /* ruas */
    const ruaV = s => c.fillRect(s.x - s.w / 2, 0, s.w, H);
    const ruaH = s => c.fillRect(0, s.y - s.w / 2, W, s.w);
    if (plan) {
      c.fillStyle = '#FFFFFF'; RUAS_V.forEach(ruaV); RUAS_H.forEach(ruaH);
      c.strokeStyle = '#A8A59A'; c.lineWidth = .9;                                       // meio-fio em linha fina
      RUAS_V.forEach(s => { [-1, 1].forEach(k => { c.beginPath(); c.moveTo(s.x + k * s.w / 2, 0); c.lineTo(s.x + k * s.w / 2, H); c.stroke(); }); });
      RUAS_H.forEach(s => { [-1, 1].forEach(k => { c.beginPath(); c.moveTo(0, s.y + k * s.w / 2); c.lineTo(W, s.y + k * s.w / 2); c.stroke(); }); });
      c.fillStyle = '#FFFFFF'; RUAS_V.forEach(v => RUAS_H.forEach(h => c.fillRect(v.x - v.w / 2 + 1, h.y - h.w / 2 + 1, v.w - 2, h.w - 2)));
      c.strokeStyle = '#D3D0C5'; c.lineWidth = .8; c.setLineDash([10, 8]);               // eixo tracejado
      RUAS_V.forEach(s => { c.beginPath(); c.moveTo(s.x, 0); c.lineTo(s.x, H); c.stroke(); });
      RUAS_H.forEach(s => { c.beginPath(); c.moveTo(0, s.y); c.lineTo(W, s.y); c.stroke(); });
      c.setLineDash([]);
    } else {
      c.fillStyle = '#B2AE9F'; RUAS_V.forEach(s => c.fillRect(s.x - s.w / 2 - 5, 0, s.w + 10, H)); RUAS_H.forEach(s => c.fillRect(0, s.y - s.w / 2 - 5, W, s.w + 10));
      c.fillStyle = '#4C4C4A'; RUAS_V.forEach(ruaV); RUAS_H.forEach(ruaH);
      for (let i = 0; i < 3200; i++) { c.fillStyle = rr() < .5 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.07)'; const v = RUAS_V[Math.floor(rr() * 2)]; c.fillRect(v.x - v.w / 2 + rr() * v.w, rr() * H, 2, 2); const h2 = RUAS_H[Math.floor(rr() * 2)]; c.fillRect(rr() * W, h2.y - h2.w / 2 + rr() * h2.w, 2, 2); }
      c.strokeStyle = 'rgba(225,220,200,.30)'; c.lineWidth = 1.4; c.setLineDash([14, 16]);   // marca de eixo, bem discreta
      RUAS_V.forEach(s => { c.beginPath(); c.moveTo(s.x, 0); c.lineTo(s.x, H); c.stroke(); });
      RUAS_H.forEach(s => { c.beginPath(); c.moveTo(0, s.y); c.lineTo(W, s.y); c.stroke(); });
      c.setLineDash([]);
    }
    if (!plan) {
      /* aérea: textura fina e leve vinheta, como imagem de drone */
      for (let i = 0; i < 6500; i++) { c.fillStyle = rr() < .5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; c.fillRect(rr() * W, rr() * H, 1.5, 1.5); }
      const v = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .9);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.28)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
    } else {
      /* planta: marcas de coordenadas a cada 100 m lógicos, como em carta cadastral */
      c.strokeStyle = '#9C998C'; c.lineWidth = .9;
      for (let x = 100; x < W; x += 200) for (let y = 100; y < H; y += 200) { c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.moveTo(x, y - 5); c.lineTo(x, y + 5); c.stroke(); }
    }

    /* nomes (planta) */
    if (plan) {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const fonte = (t, p, peso) => { c.font = `${peso || 600} ${t}px "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif`; try { c.letterSpacing = p + 'px'; } catch (e) { /* sem suporte */ } };
      fonte(13, 2.4); c.fillStyle = '#6E6C62';
      RUAS_H.forEach(s => { [330, 960].forEach(x => c.fillText(s.nome.toUpperCase(), x, s.y)); });
      fonte(13, 2.4); c.save(); c.translate(190, 400); c.rotate(-Math.PI / 2); c.fillText(RUAS_V[0].nome.toUpperCase(), 0, 0); c.restore();
      fonte(13, 2.4); c.fillStyle = '#5E5C53'; c.save(); c.translate(720, 182); c.rotate(-Math.PI / 2); c.fillText(RUAS_V[1].nome.toUpperCase(), 0, 0); c.restore();
      fonte(11, 2.4); c.fillStyle = '#6F8460'; c.fillText('PRAÇA', (PRACA[0] + PRACA[2]) / 2, PRACA[1] + 10);
      fonte(30, 8, 700); c.fillStyle = 'rgba(70,92,78,.20)'; c.fillText('BAIRRO CENTRO', 982, 392);
      fonte(22, 10, 700); c.fillText('IJUÍ · RS', 982, 428);
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
    const fontes = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 13px "Bricolage Grotesque"'), document.fonts.load('700 30px "Bricolage Grotesque"')]).catch(() => 0) : Promise.resolve();
    fontes.then(() => requestAnimationFrame(feito));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();

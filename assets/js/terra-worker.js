/* Web Worker: gera o relevo e já entrega cada canvas pronto, no tamanho exato que a tela mostra.
   Assim a página principal só recebe as imagens e nunca redimensiona nada pesado. */
importScripts('terra-core.js');
self.onmessage = e => {
  try {
    const d = e.data || {};
    const img = self.TerraCore.construir((w, h) => new OffscreenCanvas(w, h), d.escalas);
    const jobs = d.jobs || [], saida = [], transf = [];
    for (const j of jobs) {
      if (j.tipo === 'lines') {                                       // curvas: desenhadas direto no tamanho final
        const bm = self.TerraCore.linhas((w, h) => new OffscreenCanvas(w, h), j).transferToImageBitmap();
        saida.push(bm); transf.push(bm); continue;
      }
      const fonte = img[j.tipo]; if (!fonte) { saida.push(null); continue; }
      const f = fonte.width / self.TerraCore.OW;                      // escala em que a imagem foi gerada
      const oc = new OffscreenCanvas(j.w, j.h), cx = oc.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(fonte, j.sx * f, j.sy * f, j.sw * f, j.sh * f, 0, 0, j.w, j.h);
      const bm = oc.transferToImageBitmap(); saida.push(bm); transf.push(bm);
    }
    self.postMessage({ ok: true, jobs: saida }, transf);
  } catch (err) { self.postMessage({ ok: false, erro: String(err) }); }
};

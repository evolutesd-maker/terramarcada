/* Web Worker: gera o relevo fora da thread principal e devolve imagens prontas. */
importScripts('terra-core.js');
self.onmessage = e => {
  try {
    const img = self.TerraCore.construir((w, h) => new OffscreenCanvas(w, h), e.data && e.data.escalas);
    const saida = {}, transf = [];
    for (const k of Object.keys(img)) { saida[k] = img[k].transferToImageBitmap(); transf.push(saida[k]); }
    self.postMessage({ ok: true, img: saida }, transf);
  } catch (e) { self.postMessage({ ok: false, erro: String(e) }); }
};

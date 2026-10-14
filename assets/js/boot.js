/* Marca a página como "com JavaScript" antes da primeira pintura (evita piscar). */
document.documentElement.classList.add("js");
/* Ao trocar de página pelo menu, abre sempre no topo. Só o botão Voltar restaura a posição anterior. */
(function () { try {
  var n = performance.getEntriesByType("navigation")[0];
  if (!location.hash && (!n || n.type === "navigate")) { scrollTo(0, 0); addEventListener("load", function () { if (scrollY) scrollTo(0, 0); }); }
} catch (e) { /* sem suporte: comportamento padrão */ } })();

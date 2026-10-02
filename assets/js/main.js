(function () {
  "use strict";

  var cfg = window.TERRA_MARCADA || {};
  var waNumber = String(cfg.whatsapp || "").replace(/\D/g, "");

  function waLink(message) {
    var text = encodeURIComponent(message || "Olá! Vim pelo site da Terra Marcada.");
    // Sem número configurado, o wa.me abre o WhatsApp para o usuário escolher o contato.
    return waNumber ? "https://wa.me/" + waNumber + "?text=" + text
                    : "https://wa.me/?text=" + text;
  }

  // Links de WhatsApp
  document.querySelectorAll("[data-whatsapp]").forEach(function (el) {
    el.href = waLink(el.getAttribute("data-whatsapp"));
    el.target = "_blank";
    el.rel = "noopener";
  });

  // Dados de contato configuráveis
  function fill(key, value) {
    if (!value) return;
    document.querySelectorAll('[data-fill="' + key + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }
  fill("phone", waNumber ? cfg.whatsappDisplay : "");
  fill("address", cfg.address);
  fill("hours", cfg.hours);
  fill("cnpj", cfg.cnpj);
  if (cfg.email) {
    document.querySelectorAll('[data-fill="email"]').forEach(function (el) {
      el.textContent = cfg.email;
      el.href = "mailto:" + cfg.email;
    });
  }

  // Formulário -> mensagem pronta no WhatsApp
  var form = document.getElementById("wa-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = form.nome.value.trim();
      if (!nome) {
        form.nome.focus();
        form.nome.setAttribute("aria-invalid", "true");
        return;
      }
      form.nome.removeAttribute("aria-invalid");
      var msg = "Olá! Meu nome é " + nome + ".\n" +
                "Assunto: " + form.assunto.value + "\n" +
                (form.cidade.value.trim() ? "Cidade do imóvel: " + form.cidade.value.trim() + "\n" : "") +
                "Gostaria de agendar um atendimento.";
      window.open(waLink(msg), "_blank", "noopener");
    });
  }

  // Menu mobile
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("menu");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Abrir menu" : "Fechar menu");
      document.body.classList.toggle("nav-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menu");
        document.body.classList.remove("nav-open");
      }
    });
  }

  // Sombra no cabeçalho ao rolar
  var header = document.querySelector(".site-header");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Filtro do portfólio
  var chips = document.querySelectorAll(".pf-filters .chip");
  var cards = document.querySelectorAll(".pf-card");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-selected", String(on));
      });
      cards.forEach(function (card) {
        card.hidden = !(f === "todos" || card.getAttribute("data-cat") === f);
      });
    });
  });

  // Animação de entrada
  var reveal = document.querySelectorAll(".card, .type-card, .benefit, .step-list li, .pf-card, .mvv-card, .faq details");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    reveal.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveal.forEach(function (el) { io.observe(el); });
  }

  var ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
})();

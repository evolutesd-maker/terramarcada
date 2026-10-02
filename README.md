# Terra Marcada — site institucional

Site estático (HTML + CSS + JS puro, sem build) da Terra Marcada mapeamento territorial.
Objetivo: levar o visitante a chamar no WhatsApp ou agendar atendimento.

## Como visualizar
Abra `index.html` no navegador ou rode `python3 -m http.server` na pasta.

## Preencher os dados de contato
Edite **apenas** `assets/js/config.js`:

| Campo | Exemplo |
|---|---|
| `whatsapp` | `"5561999998888"` (DDI 55 + DDD + número, só dígitos) |
| `whatsappDisplay` | `"(61) 99999-8888"` |
| `email` | `"contato@terramarcada.com.br"` |
| `address`, `hours`, `cnpj` | textos opcionais |

Enquanto `whatsapp` estiver vazio, os botões abrem o WhatsApp com a mensagem pronta, sem destinatário.

## Portfólio
Os cards em `index.html` (seção `#portfolio`) são exemplos. Substitua título, local e escopo
e troque a `div.pf-media` por `<img class="pf-media" src="assets/img/portfolio/foto.jpg" alt="...">`.

## Cores
Verde `#0B2B22` e amarelo `#D0AC2C` (variáveis no topo de `assets/css/style.css`).

## Publicação
Qualquer hospedagem estática serve (GitHub Pages, Netlify, Cloudflare Pages, etc.).

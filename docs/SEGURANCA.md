# Segurança e publicação

O site é **100% estático** (HTML, CSS e JavaScript). Não existe servidor, banco de dados, login, cookie
ou formulário que envie dados para algum lugar. Isso elimina quase todas as classes de ataque comuns
(injeção de SQL, invasão de painel, vazamento de banco). O que sobra para proteger: a hospedagem, o
domínio, as contas e o que o navegador do visitante executa.

## O que já está no código

| Proteção | Como funciona |
| --- | --- |
| **Política de Conteúdo (CSP)** | Só permite scripts, estilos, fontes e imagens do próprio site. Mesmo que alguém consiga injetar um trecho de HTML, o navegador não executa script de fora nem inline. Está no `<meta>` de cada página e, mais forte, nos cabeçalhos de `deploy/`. |
| **Sem scripts nem estilos inline** | Nenhum `onclick`, nenhum `<script>` embutido. Isso permite uma CSP sem `unsafe-inline`. |
| **Sem terceiros** | As fontes ficam no próprio site (nada de Google Fonts). Não há analytics, CDN nem iframes. O visitante não "vaza" o IP para ninguém além da hospedagem. |
| **Links externos** | Todo link que abre nova aba usa `rel="noopener noreferrer"`. |
| **Formulário** | Os dados nunca saem do navegador por conta própria: o botão apenas abre o WhatsApp com a mensagem pronta. O texto é limpo (caracteres de controle e de inversão de texto são removidos), limitado a 80 caracteres por campo, e o assunto só aceita as opções existentes. |
| **Configuração validada** | Telefone, e-mail e textos de `assets/js/config.js` são validados antes de virar link. |
| **Sem `innerHTML`/`eval`** | O JavaScript escreve apenas texto (`textContent`), nunca HTML. |
| **Cabeçalhos** | `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors` (anti-clickjacking), `Referrer-Policy`, `Permissions-Policy` (câmera, microfone e localização desligados), HSTS, COOP/CORP. |
| **Arquivos ocultos** | `.git`, `.env` e similares são bloqueados nas configurações de Apache/Nginx. |
| **`security.txt`** | `/.well-known/security.txt` diz a quem relatar falhas. |

## Passo a passo para publicar com segurança

1. **Gere a versão final**
   ```bash
   npm install
   SITE_URL=https://www.seudominio.com.br npm run build
   ```
   Publique **somente a pasta `dist/`** (nunca a raiz do repositório). Ela contém CSS/JS minificados com hash,
   `robots.txt`, `sitemap.xml`, `security.txt` e o arquivo `_headers`.
2. **Preencha os dados reais** em `assets/js/config.js` *antes* do build (WhatsApp, e-mail, endereço, CNPJ),
   além dos campos `[entre colchetes]` da Política de Privacidade e do `security.txt`.
3. **Escolha uma hospedagem com HTTPS automático** (Cloudflare Pages, Netlify, Vercel, GitHub Pages).
   - Netlify e Cloudflare Pages leem `dist/_headers` sozinhos.
   - Vercel: copie `deploy/vercel.json` para a raiz do projeto.
   - Apache/Nginx: use `deploy/htaccess.txt` ou `deploy/nginx.conf.example`.
   - GitHub Pages **não permite cabeçalhos personalizados**: a CSP do `<meta>` continua valendo, mas
     `frame-ancestors`, HSTS e `X-Frame-Options` não. Prefira Cloudflare Pages ou Netlify.
4. **Teste os cabeçalhos** depois de publicar em https://securityheaders.com e https://observatory.mozilla.org
   (a meta é nota A ou A+).
5. **Proteja as contas** (é aqui que a maioria dos sites estáticos é invadida):
   - ative **verificação em duas etapas** no GitHub, na hospedagem e no registro do domínio;
   - ative **bloqueio de transferência de domínio** (registrar lock) e, se possível, DNSSEC;
   - use senhas únicas em um gerenciador de senhas;
   - no GitHub: proteja a branch principal (exigir revisão) e deixe o Dependabot ligado (já configurado).
6. **Domínio e e-mail**: configure SPF, DKIM e DMARC no e-mail da empresa para ninguém falsificar mensagens
   em nome da Terra Marcada.
7. **HSTS preload** (opcional): só depois de ter certeza de que o domínio e todos os subdomínios sempre
   terão HTTPS, adicione `; preload` ao cabeçalho HSTS e cadastre em https://hstspreload.org.
8. **Revisão periódica**: renove o `security.txt` a cada ano e rode `npm audit` de vez em quando.

## Se for adicionar algo novo

- Qualquer serviço externo (analytics, mapa, chat, formulário) exige **liberar o domínio na CSP**
  (`deploy/_headers` e nas metas) e **atualizar a Política de Privacidade**.
- Se um dia houver um formulário que envie dados a um servidor, valide **também no servidor**, use CAPTCHA
  com privacidade (ex.: Cloudflare Turnstile), limite de requisições e HTTPS obrigatório.

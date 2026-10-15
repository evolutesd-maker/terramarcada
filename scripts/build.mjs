// Gera a pasta dist/ pronta para publicar: CSS/JS minificados com hash no nome,
// HTML minificado, URLs do site aplicadas e cabeçalhos de segurança copiados.
//
//   SITE_URL=https://www.seudominio.com.br npm run build
import { build } from "esbuild";
import { minify } from "html-minifier-terser";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "dist");
const siteUrl = (process.env.SITE_URL || "").replace(/\/+$/, "");
if (siteUrl && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(siteUrl)) {
  console.error("SITE_URL inválida. Use algo como https://www.seudominio.com.br"); process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets/css"), { recursive: true });
mkdirSync(join(out, "assets/js"), { recursive: true });

// imagens e fontes
cpSync(join(root, "assets/img"), join(out, "assets/img"), { recursive: true, filter: (src) => !src.endsWith("logo-terra-marcada.png") }); // o PNG grande é só a matriz do og-image
cpSync(join(root, "assets/fonts"), join(out, "assets/fonts"), { recursive: true });

// CSS e JS: minifica e coloca o hash do conteúdo no nome (cache eterno e seguro)
const names = {};
const JS = ["boot", "config", "main", "terra", "tm-motor", "tm-historia", "tm-cidade", "tm-sobre"];
async function bundle(entry, outdir, ext, pre) {
  const r = await build({ entryPoints: [join(root, entry)], bundle: false, minify: true, write: false, outdir, target: ["es2019"], legalComments: "none", loader: { ".css": "css", ".js": "js" } });
  const text = pre ? pre(r.outputFiles[0].text) : r.outputFiles[0].text;
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 10);
  const base = entry.split("/").pop().replace(/\.(css|js)$/, "");
  const file = `${base}.${hash}.${ext}`;
  writeFileSync(join(outdir, file), text);
  names[entry] = file;
}
await bundle("assets/css/style.css", join(out, "assets/css"), "css");
await bundle("assets/css/terra-story.css", join(out, "assets/css"), "css");
// o worker do relevo carrega o núcleo pelo nome com hash: gera o núcleo primeiro e troca o nome no worker
await bundle("assets/js/terra-core.js", join(out, "assets/js"), "js");
await bundle("assets/js/terra-worker.js", join(out, "assets/js"), "js", (t) => t.replace("terra-core.js", names["assets/js/terra-core.js"]));
for (const f of JS) await bundle(`assets/js/${f}.js`, join(out, "assets/js"), "js");

// HTML
const pages = ["index.html", "quem-somos.html", "politica-privacidade.html", "404.html"];
for (const page of pages) {
  let html = readFileSync(join(root, page), "utf8");
  for (const c of ["style", "terra-story"]) html = html.replace(new RegExp(`(["'(])(\\/?)assets\\/css\\/${c}\\.css`, "g"), `$1$2assets/css/${names[`assets/css/${c}.css`]}`);
  for (const f of [...JS, "terra-core", "terra-worker"]) {
    html = html.replace(new RegExp(`(["'])(\\/?)assets\\/js\\/${f}\\.js`, "g"), `$1$2assets/js/${names[`assets/js/${f}.js`]}`);
  }
  if (siteUrl) {
    html = html.replaceAll("__SITE_URL__", siteUrl);
  } else {
    // sem domínio definido: remove metadados que exigem URL absoluta
    html = html.replace(/\s*<link rel="canonical"[^>]*__SITE_URL__[^>]*>/g, "")
               .replace(/\s*<meta property="og:(url|image|image:width|image:height)"[^>]*>/g, "")
               .replace(/\s*<meta name="twitter:card"[^>]*>/g, "");
  }
  html = await minify(html, { collapseWhitespace: true, conservativeCollapse: false, removeComments: true, removeRedundantAttributes: false, minifyCSS: false, minifyJS: false, keepClosingSlash: true });
  writeFileSync(join(out, page), html);
}

// arquivos de raiz
for (const f of ["robots.txt", "sitemap.xml", ".well-known/security.txt"]) {
  let t = readFileSync(join(root, f), "utf8");
  t = siteUrl ? t.replaceAll("__SITE_URL__", siteUrl) : t.replace(/^.*__SITE_URL__.*\n?/gm, "");
  const dest = join(out, f);
  mkdirSync(join(dest, ".."), { recursive: true });
  writeFileSync(dest, t);
}
cpSync(join(root, "deploy/_headers"), join(out, "_headers"));

console.log(`dist/ pronto${siteUrl ? ` para ${siteUrl}` : " (sem SITE_URL: canonical, og:image e sitemap omitidos)"}`);
for (const [k, v] of Object.entries(names)) console.log("  ", k, "->", v);

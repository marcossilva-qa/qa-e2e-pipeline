/*
 * Monta a página inicial do GitHub Pages a partir dos artefatos baixados do CI:
 *   site/resultado-<fluxo>/{reports/playwright, reports/newman/*.html, reports/junit.xml, evidencias/**}
 *
 * Uso: node pipeline/indice-pages.ts <pasta-do-site>
 */
import fs from 'node:fs';
import path from 'node:path';

const site = path.resolve(process.argv[2] ?? 'site');
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const rel = (p: string) => path.relative(site, p).split(path.sep).join('/');

function listar(pasta: string, ext: string): string[] {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(pasta, f))
    .sort();
}

function contagem(junit: string): { testes: number; falhas: number } {
  if (!fs.existsSync(junit)) return { testes: 0, falhas: 0 };
  const xml = fs.readFileSync(junit, 'utf8');
  const attr = (n: string) => Number(new RegExp(`<testsuites[^>]*\\s${n}="(\\d+)"`).exec(xml)?.[1] ?? 0);
  return { testes: attr('tests'), falhas: attr('failures') + attr('errors') };
}

fs.mkdirSync(site, { recursive: true });
const fluxos = fs
  .readdirSync(site)
  .filter((d) => d.startsWith('resultado-'))
  .sort();

const cartoes = fluxos
  .map((d) => {
    const raiz = path.join(site, d);
    const fluxo = d.replace('resultado-', '');
    const { testes, falhas } = contagem(path.join(raiz, 'reports', 'junit.xml'));
    const status = testes === 0 ? 'sem-dados' : falhas ? 'falhou' : 'passou';
    const playwright = path.join(raiz, 'reports', 'playwright', 'index.html');
    const newman = listar(path.join(raiz, 'reports', 'newman'), '.html');
    const evidencias = listar(path.join(raiz, 'evidencias'), '.html');
    const links = [
      fs.existsSync(playwright) ? `<a href="${rel(playwright)}">Relatório do Playwright</a>` : '',
      ...newman.map((f) => `<a href="${rel(f)}">Massa (Newman)</a>`),
      ...evidencias.map((f) => `<a href="${rel(f)}">Evidência · ${esc(path.basename(f, '.html'))}</a>`),
    ].filter(Boolean);
    return `<article class="${status}">
      <header><h2>${esc(fluxo)}</h2><span>${status === 'passou' ? `${testes} aprovado(s)` : status === 'falhou' ? `${falhas} de ${testes} com falha` : 'sem resultado'}</span></header>
      <ul>${links.map((l) => `<li>${l}</li>`).join('')}</ul>
    </article>`;
  })
  .join('\n');

const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
fs.writeFileSync(
  path.join(site, 'index.html'),
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Esteira E2E · Relatórios</title>
<style>
  body { margin:0; font:15px/1.5 system-ui,sans-serif; color:#0f172a; background:#f8fafc }
  main { max-width:960px; margin:0 auto; padding:40px 16px }
  h1 { margin:0 0 4px } p { color:#64748b; margin:0 0 28px }
  .grade { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px }
  article { background:#fff; border:1px solid #e2e8f0; border-top:4px solid #94a3b8; border-radius:12px; padding:18px }
  article.passou { border-top-color:#15803d } article.falhou { border-top-color:#b91c1c }
  article header { display:flex; justify-content:space-between; align-items:baseline; gap:8px }
  h2 { margin:0; font-size:18px; text-transform:capitalize } article header span { font-size:13px; color:#64748b }
  ul { padding-left:18px; margin:12px 0 0 } a { color:#1d4ed8 }
</style></head><body><main>
<h1>Esteira E2E</h1><p>Última execução no CI: ${esc(agora)} · massa via API → espera → validação na interface → evidência</p>
<div class="grade">${cartoes || '<p>Nenhum artefato encontrado.</p>'}</div>
</main></body></html>`,
);
console.log(`índice: ${path.join(site, 'index.html')} (${fluxos.length} fluxo(s))`);

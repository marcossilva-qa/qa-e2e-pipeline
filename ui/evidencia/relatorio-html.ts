import type { Massa } from '../../shared/tipos.ts';
import type { Captura } from './evidencia.ts';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Relatório de validações de um cenário: autocontido (prints em base64), abre em qualquer
 * navegador sem servidor e pode ser anexado a um ticket. Nunca contém a senha da massa.
 */
export function relatorioHtml(d: { massa: Massa; execucao: string; capturas: Captura[] }): string {
  const todas = d.capturas.flatMap((c) => c.conferencias);
  const divergentes = todas.filter((c) => !c.ok);
  const status = divergentes.length ? 'reprovado' : 'aprovado';

  const telas = d.capturas
    .map(
      (c, i) => `
    <section class="tela">
      <h2><span class="n">${i + 1}</span>${esc(c.titulo)}</h2>
      ${
        c.conferencias.length
          ? `<table><thead><tr><th>Campo</th><th>Esperado</th><th>Obtido</th><th></th></tr></thead><tbody>
          ${c.conferencias
            .map(
              (x) =>
                `<tr class="${x.ok ? 'ok' : 'div'}"><td>${esc(x.campo)}</td><td>${esc(x.esperado)}</td><td>${esc(x.obtido)}</td><td>${x.ok ? '✓' : '✗'}</td></tr>`,
            )
            .join('')}
        </tbody></table>`
          : ''
      }
      <img alt="${esc(c.titulo)}" src="data:image/png;base64,${c.png.toString('base64')}">
    </section>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Validações · ${esc(d.massa.produtoCatalogo)} · ${esc(d.massa.fluxo)}</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --ok:#15803d; --div:#b91c1c; --bg:#f8fafc; }
  * { box-sizing:border-box } body { margin:0; font:15px/1.5 system-ui,sans-serif; color:var(--ink); background:var(--bg) }
  main { max-width:1100px; margin:0 auto; padding:32px 16px }
  header { display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:space-between }
  h1 { margin:0; font-size:22px } .meta { color:var(--muted); font-size:13px }
  .selo { padding:6px 14px; border-radius:999px; font-weight:600; color:#fff }
  .aprovado { background:var(--ok) } .reprovado { background:var(--div) }
  .resumo { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin:24px 0 }
  .resumo div { background:#fff; border:1px solid var(--line); border-radius:10px; padding:12px 14px }
  .resumo b { display:block; font-size:20px }
  .tela { background:#fff; border:1px solid var(--line); border-radius:12px; padding:20px; margin:16px 0 }
  .tela h2 { margin:0 0 12px; font-size:17px; display:flex; gap:10px; align-items:center }
  .n { display:inline-grid; place-items:center; width:26px; height:26px; border-radius:50%; background:var(--ink); color:#fff; font-size:13px }
  table { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:14px }
  th,td { text-align:left; padding:6px 10px; border-bottom:1px solid var(--line) }
  tr.div td { color:var(--div); font-weight:600 } tr.ok td:last-child { color:var(--ok) }
  img { width:100%; border:1px solid var(--line); border-radius:8px }
</style></head>
<body><main>
  <header>
    <div><h1>${esc(d.massa.produto.nome)}</h1>
    <div class="meta">Fluxo <b>${esc(d.massa.fluxo)}</b> · cenário ${esc(d.massa.produtoCatalogo)} · execução ${esc(d.execucao)}</div></div>
    <span class="selo ${status}">${status === 'aprovado' ? 'Aprovado' : `Reprovado · ${divergentes.length} divergência(s)`}</span>
  </header>
  <div class="resumo">
    <div><span class="meta">Telas</span><b>${d.capturas.length}</b></div>
    <div><span class="meta">Campos conferidos</span><b>${todas.length}</b></div>
    <div><span class="meta">Divergências</span><b>${divergentes.length}</b></div>
    <div><span class="meta">Usuário da massa</span><b style="font-size:14px">${esc(d.massa.usuario.email)}</b></div>
  </div>
  ${telas}
</main></body></html>`;
}

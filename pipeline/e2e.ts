/*
 * Orquestrador da esteira: um comando, do catálogo à evidência.
 *
 *   1. Pré-checagem   cenário existe e não está em standby? Recusa ANTES de criar massa.
 *   2. Massa          Newman roda o fluxo (sequência de pastas da collection) por produto.
 *   3. Espera         estado final confirmado pela API, com critério objetivo de pronto.
 *   4. Validação      Playwright valida e evidencia na interface só as massas prontas.
 *   5. Histórico      uma linha por cenário em execucoes/historico.jsonl.
 *
 * Uso:  node pipeline/e2e.ts <fluxo> <ID...|--todos> [--dry] [--intervalo-s 2] [--max-leituras 10]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { carimbo, criarMassa } from '../api/run.ts';
import { CAMINHOS, RAIZ } from '../shared/caminhos.ts';
import { carregarCatalogo, ehFluxo, FLUXOS, problemasDoCatalogo, selecionar } from '../shared/catalogo.ts';
import type { Massa } from '../shared/tipos.ts';
import { aguardarProcessamento, type ResultadoEspera } from './aguardar.ts';

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    todos: { type: 'boolean', default: false },
    dry: { type: 'boolean', default: !!process.env.DRY },
    'intervalo-s': { type: 'string', default: '2' },
    'max-leituras': { type: 'string', default: '10' },
  },
});

const [fluxo = '', ...ids] = positionals;
if (!ehFluxo(fluxo) || (!opt.todos && ids.length === 0)) {
  console.error(`Uso: npm run e2e -- <${Object.keys(FLUXOS).join('|')}> <ID...|--todos> [--dry]`);
  process.exit(2);
}

const titulo = (n: number, s: string) => console.log(`\n\x1b[1m${n}. ${s}\x1b[0m`);
const execucao = `${carimbo()}-${fluxo}`;

// ── 1. Pré-checagem ─────────────────────────────────────────────────────────
titulo(1, 'Pré-checagem');
const catalogo = carregarCatalogo();
const problemas = problemasDoCatalogo(catalogo);
if (problemas.length) {
  console.error(`catálogo inválido:\n  ${problemas.join('\n  ')}`);
  process.exit(2);
}
const { executar, recusados } = selecionar(catalogo, opt.todos ? 'todos' : ids);
for (const r of recusados) console.log(`  ⏭  ${r.id}: ${r.motivo}`);
for (const p of executar) console.log(`  ✓  ${p.id}: ${FLUXOS[fluxo].join(' → ')}`);
if (executar.length === 0) {
  console.error('nada a executar');
  process.exit(1);
}
if (opt.dry) {
  console.log('\n--dry: plano mostrado, nenhuma massa criada.');
  process.exit(0);
}

// ── 2. Massa ────────────────────────────────────────────────────────────────
titulo(2, `Massa (Newman · ${executar.length} produto(s))`);
const { massas, relatorio } = await criarMassa(fluxo, executar, execucao);
console.log(`  relatório: ${path.relative(RAIZ, relatorio)}`);

// ── 3. Espera ───────────────────────────────────────────────────────────────
titulo(3, 'Espera pelo estado final');
const esperas = new Map<string, ResultadoEspera>();
await Promise.all(
  massas
    .filter((m) => m.falhas.length === 0)
    .map(async (m) => {
      const r = await aguardarProcessamento(m, {
        intervaloMs: Number(opt['intervalo-s']) * 1000,
        maxLeituras: Number(opt['max-leituras']),
      });
      esperas.set(m.produtoCatalogo, r);
      console.log(
        `  ${r.estado === 'pronto' ? '✓' : '✗'}  ${m.produtoCatalogo}: ${r.estado} em ${r.leituras} leitura(s)`,
      );
    }),
);
for (const m of massas.filter((x) => x.falhas.length))
  console.log(`  ✗  ${m.produtoCatalogo}: massa com falha`);

// ── 4. Validação ────────────────────────────────────────────────────────────
titulo(4, 'Validação e evidência (Playwright)');
const prontas = massas.filter((m) => esperas.get(m.produtoCatalogo)?.estado === 'pronto');
let validacaoOk = false;
if (prontas.length) {
  const arquivo = path.join(CAMINHOS.saida, `massa-${execucao}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(prontas, null, 2));
  // Playwright do projeto, direto pelo Node: sem shell, sem npx, versão fixa do package-lock.
  const cli = path.join(RAIZ, 'node_modules', '@playwright', 'test', 'cli.js');
  const pw = spawnSync(process.execPath, [cli, 'test', '--project=ui'], {
    cwd: RAIZ,
    stdio: 'inherit',
    env: { ...process.env, E2E_MASSA: arquivo, E2E_EXECUCAO: execucao },
  });
  validacaoOk = pw.status === 0;
} else console.log('  nenhuma massa pronta para validar');

// ── 5. Histórico e resumo ───────────────────────────────────────────────────
titulo(5, 'Resumo');
const resultado = (m: Massa): string => {
  if (m.falhas.length) return 'falha na massa';
  const e = esperas.get(m.produtoCatalogo)?.estado;
  if (e !== 'pronto') return `espera: ${e}`;
  return validacaoOk ? 'aprovado' : 'ver relatório do Playwright';
};
fs.mkdirSync(path.dirname(CAMINHOS.historico), { recursive: true });
for (const m of massas) {
  const linha = {
    execucao,
    fluxo,
    produto: m.produtoCatalogo,
    usuario: m.usuario.id,
    resultado: resultado(m),
  };
  fs.appendFileSync(CAMINHOS.historico, JSON.stringify(linha) + '\n');
  console.log(
    `  ${linha.resultado === 'aprovado' ? '✓' : '✗'}  ${m.produtoCatalogo.padEnd(14)} ${linha.resultado}`,
  );
  for (const f of m.falhas) console.log(`       ${f}`);
}
console.log(`\n  evidências: evidencias/${execucao}/   ·   relatório: npm run report`);

const tudoOk = massas.every((m) => resultado(m) === 'aprovado');
process.exitCode = tudoOk ? 0 : 1;

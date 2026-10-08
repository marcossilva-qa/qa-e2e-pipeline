/*
 * Camada de massa: roda a collection data-driven no Newman, uma iteração por produto do
 * catálogo, e devolve a massa de cada um (usuário, produto, carrinho) para as próximas etapas.
 *
 * Uso direto (sem a espera e a validação):  node api/run.ts <fluxo> <ID...|--todos>
 */
import fs from 'node:fs';
import path from 'node:path';
import newman from 'newman';
import { CAMINHOS, URLS } from '../shared/caminhos.ts';
import { carregarCatalogo, ehFluxo, FLUXOS, selecionar } from '../shared/catalogo.ts';
import type { Fluxo, Massa, ProdutoCatalogo } from '../shared/tipos.ts';
import { HEADERS_OCULTOS, ocultacoesDoArquivo, segredosNoRelatorio } from './ocultacao.ts';

const PREFIXO = 'MASSA::';

export interface ResultadoMassa {
  massas: Massa[];
  relatorio: string;
}

export function carimbo(data = new Date()): string {
  return data.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}

export async function criarMassa(
  fluxo: Fluxo,
  produtos: ProdutoCatalogo[],
  execucao = `${carimbo()}-${fluxo}`,
): Promise<ResultadoMassa> {
  fs.mkdirSync(CAMINHOS.saida, { recursive: true });
  const relatorio = path.join(CAMINHOS.relatorios, 'newman', `${execucao}.html`);
  const dados = path.join(CAMINHOS.saida, `dados-${execucao}.json`);
  fs.writeFileSync(dados, JSON.stringify(produtos, null, 2));

  const { corpo, resposta } = ocultacoesDoArquivo(CAMINHOS.colecao);
  // Último estado de cada iteração (a collection emite um a cada requisição).
  const estado = new Map<number, Omit<Massa, 'fluxo' | 'falhas'>>();
  const falhas = new Map<number, string[]>();
  const anotarFalha = (iteracao: number, msg: string) =>
    falhas.set(iteracao, [...(falhas.get(iteracao) ?? []), msg]);

  await new Promise<void>((resolve, reject) => {
    newman
      .run({
        collection: CAMINHOS.colecao,
        environment: CAMINHOS.ambiente,
        envVar: [{ key: 'baseUrl', value: URLS.api }],
        iterationData: dados,
        folder: [...FLUXOS[fluxo]],
        reporters: ['cli', 'htmlextra'],
        reporter: {
          // O console da collection carrega a massa (com a senha): fica fora do terminal e do log do CI.
          cli: { noConsole: true },
          htmlextra: {
            export: relatorio,
            title: `Massa · ${fluxo} · ${execucao}`,
            browserTitle: `Massa ${fluxo}`,
            skipHeaders: HEADERS_OCULTOS,
            hideRequestBody: corpo,
            hideResponseBody: resposta,
          },
        },
        timeoutRequest: 30_000,
      })
      .on('console', (_err, ev: { messages: unknown[] }) => {
        const msg = typeof ev.messages[0] === 'string' ? ev.messages[0] : '';
        if (!msg.startsWith(PREFIXO)) return;
        const m = JSON.parse(msg.slice(PREFIXO.length)) as Omit<Massa, 'fluxo' | 'falhas'> & {
          iteracao: number;
        };
        const { iteracao, ...resto } = m;
        estado.set(iteracao, resto);
      })
      .on(
        'assertion',
        (err, ev: { assertion: string; item: { name: string }; cursor: { iteration: number } }) => {
          if (err) anotarFalha(ev.cursor.iteration, `${ev.item.name}: ${ev.assertion}`);
        },
      )
      .on('request', (err: Error | null, ev: { item: { name: string }; cursor: { iteration: number } }) => {
        if (err) anotarFalha(ev.cursor.iteration, `${ev.item.name}: ${err.message}`);
      })
      .on('done', (err: Error | null) => (err ? reject(err) : resolve()));
  });

  const massas: Massa[] = produtos.map((p, i) => {
    const e = estado.get(i);
    if (!e) return massaVazia(fluxo, p, ['nenhuma requisição concluída']);
    return { ...e, fluxo, falhas: falhas.get(i) ?? [] };
  });

  // Conferência do relatório: nenhuma senha nem token pode ter sobrado nele.
  const html = fs.readFileSync(relatorio, 'utf8');
  const vazados = segredosNoRelatorio(
    html,
    massas.map((m) => m.usuario.senha),
  );
  if (vazados.length) {
    fs.rmSync(relatorio);
    throw new Error(`relatório do Newman continha ${vazados.length} credencial(is) e foi apagado`);
  }
  return { massas, relatorio };
}

function massaVazia(fluxo: Fluxo, p: ProdutoCatalogo, falhas: string[]): Massa {
  return {
    fluxo,
    produtoCatalogo: p.id,
    usuario: { id: '', nome: '', email: '', senha: '' },
    produto: { id: '', nome: p.nome, preco: p.preco, descricao: p.descricao, estoque: p.estoque },
    quantidadeCompra: p.quantidadeCompra,
    falhas,
  };
}

if (import.meta.main) {
  const [fluxo = '', ...ids] = process.argv.slice(2);
  if (!ehFluxo(fluxo)) {
    console.error(`Uso: node api/run.ts <${Object.keys(FLUXOS).join('|')}> <ID...|--todos>`);
    process.exit(2);
  }
  const { executar, recusados } = selecionar(carregarCatalogo(), ids.includes('--todos') ? 'todos' : ids);
  for (const r of recusados) console.warn(`recusado ${r.id}: ${r.motivo}`);
  const { massas, relatorio } = await criarMassa(fluxo, executar);
  const arquivo = path.join(CAMINHOS.saida, 'massa-ultima.json');
  fs.writeFileSync(arquivo, JSON.stringify(massas, null, 2));
  console.log(`\nmassa: ${arquivo}\nrelatório: ${relatorio}`);
  process.exitCode = massas.some((m) => m.falhas.length) ? 1 : 0;
}

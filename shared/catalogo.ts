import fs from 'node:fs';
import { CAMINHOS } from './caminhos.ts';
import type { Fluxo, ProdutoCatalogo } from './tipos.ts';

/**
 * Cada fluxo é a sequência de pastas da collection executadas em ordem, como os "pedidos" de
 * um ciclo de vida: o cancelamento passa pela compra, assim como numa assinatura a retomada
 * passa pela suspensão. Fonte única: a collection não repete requisição entre fluxos.
 */
export const FLUXOS: Record<Fluxo, readonly string[]> = {
  aquisicao: ['AQUISICAO'],
  compra: ['AQUISICAO', 'COMPRA'],
  cancelamento: ['AQUISICAO', 'COMPRA', 'CANCELAMENTO'],
  conclusao: ['AQUISICAO', 'COMPRA', 'CONCLUSAO'],
};

export function ehFluxo(valor: string): valor is Fluxo {
  return Object.hasOwn(FLUXOS, valor);
}

export function carregarCatalogo(arquivo = CAMINHOS.catalogo): ProdutoCatalogo[] {
  return JSON.parse(fs.readFileSync(arquivo, 'utf8')) as ProdutoCatalogo[];
}

/** Problemas estruturais do catálogo. Vazio = catálogo válido (coberto por teste unitário). */
export function problemasDoCatalogo(produtos: ProdutoCatalogo[]): string[] {
  const problemas: string[] = [];
  const ids = new Set<string>();
  const inteiroPositivo = (n: number) => Number.isInteger(n) && n > 0;
  for (const p of produtos) {
    if (!/^[A-Z0-9_]+$/.test(p.id)) problemas.push(`${p.id}: id deve ser MAIUSCULO_COM_UNDERSCORE`);
    if (ids.has(p.id)) problemas.push(`${p.id}: id repetido`);
    ids.add(p.id);
    if (!p.nome?.trim()) problemas.push(`${p.id}: sem nome`);
    if (!p.descricao?.trim()) problemas.push(`${p.id}: sem descrição`);
    if (!inteiroPositivo(p.preco)) problemas.push(`${p.id}: preço deve ser inteiro positivo`);
    if (!inteiroPositivo(p.estoque)) problemas.push(`${p.id}: estoque deve ser inteiro positivo`);
    if (!inteiroPositivo(p.quantidadeCompra))
      problemas.push(`${p.id}: quantidadeCompra deve ser inteiro positivo`);
    if (p.quantidadeCompra > p.estoque) problemas.push(`${p.id}: quantidadeCompra maior que o estoque`);
  }
  return problemas;
}

export interface Selecao {
  executar: ProdutoCatalogo[];
  recusados: { id: string; motivo: string }[];
}

/**
 * Pré-checagem: decide o que roda ANTES de criar qualquer massa. Cenário desconhecido ou em
 * standby é recusado aqui, sem gastar chamada de API nem deixar lixo no ambiente.
 */
export function selecionar(produtos: ProdutoCatalogo[], pedidos: string[] | 'todos'): Selecao {
  const recusados: Selecao['recusados'] = [];
  const executar: ProdutoCatalogo[] = [];
  const alvo = pedidos === 'todos' ? produtos.map((p) => p.id) : pedidos;
  for (const id of alvo) {
    const p = produtos.find((x) => x.id === id.toUpperCase());
    if (!p) recusados.push({ id, motivo: 'não existe no catálogo' });
    else if (p.standby) recusados.push({ id: p.id, motivo: `standby: ${p.standby}` });
    else executar.push(p);
  }
  return { executar, recusados };
}

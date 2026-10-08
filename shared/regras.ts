import type { Conferencia, EstadoProcessamento, Fluxo } from './tipos.ts';

/** Estoque que a tela deve mostrar depois do fluxo. A regra de negócio, sem navegador. */
export function quantidadeEsperada(fluxo: Fluxo, estoque: number, quantidadeCompra: number): number {
  switch (fluxo) {
    case 'aquisicao':
    case 'cancelamento':
      return estoque;
    case 'compra':
    case 'conclusao':
      return estoque - quantidadeCompra;
  }
}

/** Depois do fluxo o usuário ainda tem carrinho aberto? */
export function carrinhoEsperado(fluxo: Fluxo): boolean {
  return fluxo === 'compra';
}

export interface Leitura {
  /** HTTP do GET /produtos/{id}. */
  statusProduto: number;
  quantidade?: number;
  carrinhosAbertos: number;
}

/**
 * Critério objetivo de "pronto" para a espera entre a massa e a validação:
 * - produto não encontrado (4xx) ou mais de um carrinho aberto → falhou (não adianta esperar);
 * - estoque e carrinho no estado esperado → pronto;
 * - qualquer outro estado → andamento (nova leitura no próximo intervalo).
 */
export function classificarProcessamento(
  leitura: Leitura,
  esperado: { quantidade: number; carrinho: boolean },
): EstadoProcessamento {
  if (leitura.statusProduto >= 400 || leitura.carrinhosAbertos > 1) return 'falhou';
  const estoqueOk = leitura.quantidade === esperado.quantidade;
  const carrinhoOk = leitura.carrinhosAbertos > 0 === esperado.carrinho;
  return estoqueOk && carrinhoOk ? 'pronto' : 'andamento';
}

/** Normaliza para comparar o que a tela mostra com o esperado: espaços, caixa e acentos. */
export function normalizar(valor: string | number): string {
  return String(valor)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Compara campo a campo. Divergência nunca interrompe: vira linha de conferência com ok=false. */
export function conferir(
  tela: string,
  esperado: Record<string, string | number>,
  obtido: Record<string, string | undefined>,
): Conferencia[] {
  return Object.entries(esperado).map(([campo, valor]) => {
    const lido = obtido[campo] ?? '(não encontrado)';
    return { tela, campo, esperado: String(valor), obtido: lido, ok: normalizar(valor) === normalizar(lido) };
  });
}

/** Fluxos da esteira. Cada um é a sequência de pastas da collection (ver FLUXOS em catalogo.ts). */
export type Fluxo = 'aquisicao' | 'compra' | 'cancelamento' | 'conclusao';

/** Uma linha do catálogo: o produto é dado, não código. Produto novo = linha nova. */
export interface ProdutoCatalogo {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  descricao: string;
  estoque: number;
  quantidadeCompra: number;
  /** Motivo do standby. Presente = a pré-checagem recusa o cenário antes de criar massa. */
  standby?: string;
}

/** A massa criada pela camada de API para um produto, consumida pela espera e pela validação. */
export interface Massa {
  fluxo: Fluxo;
  produtoCatalogo: string;
  usuario: { id: string; nome: string; email: string; senha: string };
  produto: { id: string; nome: string; preco: number; descricao: string; estoque: number };
  quantidadeCompra: number;
  /** Falhas de asserção do Newman nesta iteração. Vazio = massa íntegra. */
  falhas: string[];
}

/** Uma conferência de campo: esperado × obtido na tela. */
export interface Conferencia {
  tela: string;
  campo: string;
  esperado: string;
  obtido: string;
  ok: boolean;
}

export type EstadoProcessamento = 'pronto' | 'andamento' | 'falhou';

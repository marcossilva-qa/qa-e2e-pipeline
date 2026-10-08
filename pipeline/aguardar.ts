import { URLS } from '../shared/caminhos.ts';
import {
  carrinhoEsperado,
  classificarProcessamento,
  quantidadeEsperada,
  type Leitura,
} from '../shared/regras.ts';
import type { EstadoProcessamento, Massa } from '../shared/tipos.ts';

export interface OpcoesEspera {
  intervaloMs: number;
  maxLeituras: number;
}

export interface ResultadoEspera {
  estado: EstadoProcessamento | 'timeout';
  leituras: number;
  ultima?: Leitura;
}

async function ler(massa: Massa): Promise<Leitura> {
  const produto = await fetch(`${URLS.api}/produtos/${massa.produto.id}`);
  const corpo = (await produto.json()) as { quantidade?: number };
  const carrinhos = await fetch(`${URLS.api}/carrinhos?idUsuario=${massa.usuario.id}`);
  const { quantidade: abertos } = (await carrinhos.json()) as { quantidade: number };
  return { statusProduto: produto.status, quantidade: corpo.quantidade, carrinhosAbertos: abertos };
}

/**
 * Espera a massa chegar ao estado final antes de abrir o navegador: validar cedo demais gera
 * divergência falsa. Lê o estado pela API a cada intervalo e decide com classificarProcessamento
 * (regra pura, testada sem rede): pronto segue, falhou para na hora, andamento lê de novo.
 */
export async function aguardarProcessamento(massa: Massa, opcoes: OpcoesEspera): Promise<ResultadoEspera> {
  const esperado = {
    quantidade: quantidadeEsperada(massa.fluxo, massa.produto.estoque, massa.quantidadeCompra),
    carrinho: carrinhoEsperado(massa.fluxo),
  };
  let ultima: Leitura | undefined;
  for (let leituras = 1; leituras <= opcoes.maxLeituras; leituras++) {
    ultima = await ler(massa);
    const estado = classificarProcessamento(ultima, esperado);
    if (estado !== 'andamento') return { estado, leituras, ultima };
    await new Promise((r) => setTimeout(r, opcoes.intervaloMs));
  }
  return { estado: 'timeout', leituras: opcoes.maxLeituras, ultima };
}

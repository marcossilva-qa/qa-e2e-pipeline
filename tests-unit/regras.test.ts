import { expect, test } from '@playwright/test';
import {
  carrinhoEsperado,
  classificarProcessamento,
  conferir,
  normalizar,
  quantidadeEsperada,
} from '../shared/regras.ts';

test.describe('quantidadeEsperada', () => {
  test('aquisição e cancelamento mantêm o estoque', () => {
    expect(quantidadeEsperada('aquisicao', 10, 3)).toBe(10);
    expect(quantidadeEsperada('cancelamento', 10, 3)).toBe(10);
  });

  test('compra e conclusão baixam a quantidade comprada', () => {
    expect(quantidadeEsperada('compra', 10, 3)).toBe(7);
    expect(quantidadeEsperada('conclusao', 10, 3)).toBe(7);
  });
});

test('só a compra termina com carrinho aberto', () => {
  expect(carrinhoEsperado('compra')).toBe(true);
  for (const f of ['aquisicao', 'cancelamento', 'conclusao'] as const)
    expect(carrinhoEsperado(f)).toBe(false);
});

test.describe('classificarProcessamento', () => {
  const esperado = { quantidade: 7, carrinho: true };

  test('estoque e carrinho no estado esperado → pronto', () => {
    expect(
      classificarProcessamento({ statusProduto: 200, quantidade: 7, carrinhosAbertos: 1 }, esperado),
    ).toBe('pronto');
  });

  test('estoque ainda não baixou → andamento', () => {
    expect(
      classificarProcessamento({ statusProduto: 200, quantidade: 10, carrinhosAbertos: 0 }, esperado),
    ).toBe('andamento');
  });

  test('produto não encontrado → falhou, sem esperar mais', () => {
    expect(classificarProcessamento({ statusProduto: 400, carrinhosAbertos: 0 }, esperado)).toBe('falhou');
  });

  test('mais de um carrinho aberto → falhou', () => {
    expect(
      classificarProcessamento({ statusProduto: 200, quantidade: 7, carrinhosAbertos: 2 }, esperado),
    ).toBe('falhou');
  });

  test('carrinho aberto quando não deveria → andamento', () => {
    const semCarrinho = { quantidade: 10, carrinho: false };
    expect(
      classificarProcessamento({ statusProduto: 200, quantidade: 10, carrinhosAbertos: 1 }, semCarrinho),
    ).toBe('andamento');
  });
});

test.describe('conferir', () => {
  test('ignora caixa, acento e espaços, e compara número com texto da tela', () => {
    expect(normalizar('  Teclado   MECÂNICO ')).toBe('teclado mecanico');
    const [preco, nome] = conferir(
      'Produtos',
      { preco: 349, nome: 'Teclado Mecânico' },
      { preco: '349', nome: 'teclado mecanico' },
    );
    expect(preco?.ok).toBe(true);
    expect(nome?.ok).toBe(true);
  });

  test('divergência vira linha com ok=false, sem lançar erro', () => {
    const [c] = conferir('Produtos', { quantidade: 7 }, { quantidade: '10' });
    expect(c).toEqual({ tela: 'Produtos', campo: 'quantidade', esperado: '7', obtido: '10', ok: false });
  });

  test('campo ausente na tela é divergência explícita', () => {
    const [c] = conferir('Produtos', { descricao: 'x' }, {});
    expect(c?.obtido).toBe('(não encontrado)');
    expect(c?.ok).toBe(false);
  });
});

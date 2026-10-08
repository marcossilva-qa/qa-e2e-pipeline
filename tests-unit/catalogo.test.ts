import { expect, test } from '@playwright/test';
import { carregarCatalogo, FLUXOS, problemasDoCatalogo, selecionar } from '../shared/catalogo.ts';
import type { ProdutoCatalogo } from '../shared/tipos.ts';

const base: ProdutoCatalogo = {
  id: 'X',
  nome: 'X',
  categoria: 'c',
  preco: 10,
  descricao: 'd',
  estoque: 5,
  quantidadeCompra: 1,
};

test('o catálogo versionado é válido', () => {
  expect(problemasDoCatalogo(carregarCatalogo())).toEqual([]);
});

test('aponta id repetido, preço inválido e compra maior que o estoque', () => {
  const problemas = problemasDoCatalogo([
    base,
    { ...base },
    { ...base, id: 'Y', preco: 0, quantidadeCompra: 9 },
  ]);
  expect(problemas).toEqual([
    'X: id repetido',
    'Y: preço deve ser inteiro positivo',
    'Y: quantidadeCompra maior que o estoque',
  ]);
});

test.describe('pré-checagem', () => {
  const catalogo = [base, { ...base, id: 'PARADO', standby: 'aguardando correção' }];

  test('recusa cenário em standby e cenário inexistente antes de criar massa', () => {
    const { executar, recusados } = selecionar(catalogo, ['x', 'PARADO', 'NAO_EXISTE']);
    expect(executar.map((p) => p.id)).toEqual(['X']);
    expect(recusados).toEqual([
      { id: 'PARADO', motivo: 'standby: aguardando correção' },
      { id: 'NAO_EXISTE', motivo: 'não existe no catálogo' },
    ]);
  });

  test('--todos executa tudo que não está em standby', () => {
    expect(selecionar(catalogo, 'todos').executar.map((p) => p.id)).toEqual(['X']);
  });
});

test('todo fluxo começa pela aquisição', () => {
  for (const pastas of Object.values(FLUXOS)) expect(pastas[0]).toBe('AQUISICAO');
});

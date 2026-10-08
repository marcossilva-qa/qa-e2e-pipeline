import { expect, test } from '@playwright/test';
import { ocultacoesDoArquivo, segredosNoRelatorio } from '../api/ocultacao.ts';
import { CAMINHOS } from '../shared/caminhos.ts';
import type { Massa } from '../shared/tipos.ts';
import { relatorioHtml } from '../ui/evidencia/relatorio-html.ts';

test('esconde o corpo das requisições com senha e a resposta das que devolvem token', () => {
  expect(ocultacoesDoArquivo(CAMINHOS.colecao)).toEqual({
    corpo: ['Cadastrar usuário', 'Login'],
    resposta: ['Login'],
  });
});

test('acha credencial que vazou no relatório', () => {
  expect(segredosNoRelatorio('<td>Qa#abc123x9</td>', ['Qa#abc123x9', 'outra-senha'])).toEqual([
    'Qa#abc123x9',
  ]);
  expect(segredosNoRelatorio('<td>ok</td>', ['Qa#abc123x9'])).toEqual([]);
});

test('o relatório de validações nunca contém a senha da massa e escapa HTML', () => {
  const massa: Massa = {
    fluxo: 'compra',
    produtoCatalogo: 'X',
    usuario: { id: 'u', nome: 'QA', email: 'qa@x.dev', senha: 'Qa#segredo99' },
    produto: { id: 'p', nome: '<script>alert(1)</script>', preco: 1, descricao: 'd', estoque: 2 },
    quantidadeCompra: 1,
    falhas: [],
  };
  const html = relatorioHtml({ massa, execucao: 'e', capturas: [] });
  expect(html).not.toContain('Qa#segredo99');
  expect(html).not.toContain('<script>alert(1)</script>');
  expect(html).toContain('&lt;script&gt;');
});

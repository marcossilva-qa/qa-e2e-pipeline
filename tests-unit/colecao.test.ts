import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { CAMINHOS } from '../shared/caminhos.ts';
import { FLUXOS } from '../shared/catalogo.ts';

/*
 * Verificação estática da collection: pega erro de collection antes de qualquer chamada de API.
 */
interface Item {
  name: string;
  item?: Item[];
  request?: { url: { raw: string }; body?: { raw?: string } };
  event?: { listen: string; script: { exec: string[] } }[];
}

const colecao = JSON.parse(fs.readFileSync(CAMINHOS.colecao, 'utf8')) as { item: Item[] };
const requisicoes = colecao.item.flatMap((pasta) =>
  (pasta.item ?? []).map((r) => ({ pasta: pasta.name, ...r })),
);
const testes = (r: Item) =>
  (r.event ?? [])
    .filter((e) => e.listen === 'test')
    .flatMap((e) => e.script.exec)
    .join('\n');

test('toda pasta usada por um fluxo existe na collection', () => {
  const pastas = colecao.item.map((p) => p.name);
  for (const seq of Object.values(FLUXOS)) for (const p of seq) expect(pastas).toContain(p);
});

test('toda requisição confere o status HTTP', () => {
  const sem = requisicoes.filter((r) => !/to\.have\.status\(\d{3}\)/.test(testes(r))).map((r) => r.name);
  expect(sem).toEqual([]);
});

test('nenhuma URL fixa: tudo passa por {{baseUrl}}', () => {
  const fixas = requisicoes.filter((r) => !r.request?.url.raw.startsWith('{{baseUrl}}')).map((r) => r.name);
  expect(fixas).toEqual([]);
});

test('corpo das requisições é JSON válido depois de resolver as variáveis', () => {
  for (const r of requisicoes.filter((x) => x.request?.body?.raw)) {
    const resolvido = r.request!.body!.raw!.replace(/\{\{\w+\}\}/g, '1');
    expect(() => JSON.parse(resolvido) as unknown, r.name).not.toThrow();
  }
});

test('nenhuma credencial escrita na collection', () => {
  const texto = fs.readFileSync(CAMINHOS.colecao, 'utf8');
  expect(texto).not.toMatch(/Bearer [A-Za-z0-9._-]{20,}/);
  expect(texto).not.toMatch(/"password":\s*"(?!\{\{)/);
});

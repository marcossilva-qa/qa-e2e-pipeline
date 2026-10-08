import { expect, type Locator, type Page } from '@playwright/test';

/**
 * As listagens do admin são tabelas com centenas de linhas compartilhadas por todos que usam o
 * ambiente público. A linha da massa é encontrada pelo valor único dela (e-mail, nome com sufixo),
 * e as colunas pelo cabeçalho, não pela posição: coluna nova na tela não quebra a leitura.
 */
export class Tabela {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  linha(valorUnico: string): Locator {
    return this.page.locator('tbody tr').filter({
      has: this.page.getByRole('cell', { name: valorUnico, exact: true }),
    });
  }

  async ler(linha: Locator): Promise<Record<string, string>> {
    await expect(linha).toHaveCount(1);
    const cabecalhos = await this.page.locator('thead th').allInnerTexts();
    const celulas = await linha.locator('td').allInnerTexts();
    return Object.fromEntries(cabecalhos.map((c, i) => [c.trim(), (celulas[i] ?? '').trim()]));
  }

  /** Centraliza e destaca a linha para o print de evidência. */
  async destacar(linha: Locator): Promise<void> {
    await linha.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
      (el as HTMLElement).style.outline = '3px solid #e11d48';
      (el as HTMLElement).style.outlineOffset = '-3px';
    });
  }

  /** Todas as células de uma coluna, achada pelo cabeçalho: para mascarar no print (ex.: senha). */
  async coluna(cabecalho: string): Promise<Locator> {
    const cabecalhos = (await this.page.locator('thead th').allInnerTexts()).map((c) => c.trim());
    const indice = cabecalhos.indexOf(cabecalho);
    if (indice < 0) throw new Error(`coluna "${cabecalho}" não existe; colunas: ${cabecalhos.join(', ')}`);
    return this.page.locator(`tbody tr td:nth-child(${indice + 1})`);
  }
}

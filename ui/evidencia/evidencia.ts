import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { CAMINHOS } from '../../shared/caminhos.ts';
import type { Conferencia, Massa } from '../../shared/tipos.ts';
import { relatorioHtml } from './relatorio-html.ts';

export interface Captura {
  titulo: string;
  png: Buffer;
  conferencias: Conferencia[];
}

/**
 * Evidência de negócio de um cenário: um print por tela, com as conferências daquela tela.
 * Divergência de campo nunca interrompe a coleta: o fluxo vai até o fim, gera tudo, e o
 * resultado é decidido no último passo (ver divergencias()).
 */
export class Evidencia {
  private readonly capturas: Captura[] = [];
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly massa: Massa;
  private readonly execucao: string;

  constructor(page: Page, testInfo: TestInfo, massa: Massa, execucao: string) {
    this.page = page;
    this.testInfo = testInfo;
    this.massa = massa;
    this.execucao = execucao;
  }

  async capturar(titulo: string, conferencias: Conferencia[], mascaras: Locator[] = []): Promise<void> {
    const png = await this.page.screenshot({ mask: mascaras, maskColor: '#1f2937' });
    this.capturas.push({ titulo, png, conferencias });
    await this.testInfo.attach(titulo, { body: png, contentType: 'image/png' });
    for (const c of conferencias.filter((x) => !x.ok)) {
      this.testInfo.annotations.push({
        type: 'divergência',
        description: `${c.tela} · ${c.campo}: esperado "${c.esperado}", obtido "${c.obtido}"`,
      });
    }
  }

  divergencias(): Conferencia[] {
    return this.capturas.flatMap((c) => c.conferencias.filter((x) => !x.ok));
  }

  /** Grava o relatório de validações (HTML autocontido) e o anexa ao relatório do Playwright. */
  async gravar(): Promise<string> {
    const pasta = path.join(CAMINHOS.evidencias, this.execucao);
    fs.mkdirSync(pasta, { recursive: true });
    const arquivo = path.join(pasta, `${this.massa.fluxo}-${this.massa.produtoCatalogo}.html`);
    fs.writeFileSync(
      arquivo,
      relatorioHtml({ massa: this.massa, execucao: this.execucao, capturas: this.capturas }),
    );
    await this.testInfo.attach('relatorio-validacoes.html', { path: arquivo, contentType: 'text/html' });
    return arquivo;
  }
}

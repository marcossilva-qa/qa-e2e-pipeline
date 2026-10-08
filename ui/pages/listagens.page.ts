import { expect, type Locator, type Page } from '@playwright/test';
import { Tabela } from './tabela.ts';

export class ListaUsuariosPage {
  private readonly page: Page;
  private readonly tabela: Tabela;

  constructor(page: Page) {
    this.page = page;
    this.tabela = new Tabela(page);
  }

  async localizar(email: string): Promise<Locator> {
    await expect(this.page.getByRole('heading', { name: 'Lista dos usuários' })).toBeVisible();
    const linha = this.tabela.linha(email);
    await this.tabela.destacar(linha);
    return linha;
  }

  async lerCampos(linha: Locator): Promise<Record<string, string | undefined>> {
    const c = await this.tabela.ler(linha);
    return { nome: c['Nome'], email: c['Email'], administrador: c['Administrador'] };
  }

  /** A listagem mostra a senha em texto puro: ela nunca entra na evidência. */
  async mascaras(): Promise<Locator[]> {
    return [await this.tabela.coluna('Senha')];
  }
}

export class ListaProdutosPage {
  private readonly page: Page;
  private readonly tabela: Tabela;

  constructor(page: Page) {
    this.page = page;
    this.tabela = new Tabela(page);
  }

  async localizar(nome: string): Promise<Locator> {
    await expect(this.page.getByRole('heading', { name: 'Lista dos Produtos' })).toBeVisible();
    const linha = this.tabela.linha(nome);
    await this.tabela.destacar(linha);
    return linha;
  }

  async lerCampos(linha: Locator): Promise<Record<string, string | undefined>> {
    const c = await this.tabela.ler(linha);
    return { nome: c['Nome'], preco: c['Preço'], descricao: c['Descrição'], quantidade: c['Quantidade'] };
  }
}

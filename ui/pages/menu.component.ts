import { expect, type Page } from '@playwright/test';

/** Barra de navegação do administrador, presente em todas as telas depois do login. */
export class MenuComponent {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async listarUsuarios(): Promise<void> {
    await this.page.getByTestId('listar-usuarios').click();
    await this.page.waitForURL(/\/admin\/listarusuarios$/);
  }

  async listarProdutos(): Promise<void> {
    await this.page.getByTestId('listar-produtos').click();
    await this.page.waitForURL(/\/admin\/listarprodutos$/);
  }

  /** Logout confirmado pela volta à tela de login: sessão nunca fica aberta. */
  async sair(): Promise<void> {
    await this.page.getByTestId('logout').click();
    await this.page.waitForURL(/\/login$/);
    await expect(this.page.getByTestId('entrar')).toBeVisible();
  }
}

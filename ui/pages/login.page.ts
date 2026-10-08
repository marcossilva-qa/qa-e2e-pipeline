import { expect, type Page } from '@playwright/test';

export class LoginPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async abrir(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: 'Login' })).toBeVisible();
  }

  async entrar(email: string, senha: string): Promise<void> {
    await this.page.getByTestId('email').fill(email);
    await this.page.getByTestId('senha').fill(senha);
    await this.page.getByTestId('entrar').click();
    await this.page.waitForURL(/\/admin\/home$/);
  }
}

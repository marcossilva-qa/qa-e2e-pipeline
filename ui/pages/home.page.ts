import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly boasVindas: Locator;

  constructor(page: Page) {
    this.boasVindas = page.getByRole('heading', { level: 1 });
  }

  async lerCampos(): Promise<Record<string, string | undefined>> {
    const titulo = (await this.boasVindas.innerText()).trim();
    return { saudacao: titulo };
  }
}

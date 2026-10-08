import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page.ts';
import { MenuComponent } from '../pages/menu.component.ts';

interface Credenciais {
  email: string;
  senha: string;
}

/**
 * Ciclo de sessão de todo teste de interface: login com a massa, o teste, e logout SEMPRE,
 * mesmo com o teste falhando, confirmado pela volta à tela de login.
 */
export const test = base.extend<{ credenciais: Credenciais; menu: MenuComponent }>({
  credenciais: [{ email: '', senha: '' }, { option: true }],

  menu: async ({ page, credenciais }, use, testInfo) => {
    const login = new LoginPage(page);
    await login.abrir();
    // A senha é descartável: criada pela massa desta execução, para um usuário que só existe nela.
    await page.context().tracing.group('login');
    await login.entrar(credenciais.email, credenciais.senha);
    await page.context().tracing.groupEnd();
    const menu = new MenuComponent(page);
    try {
      await use(menu);
    } finally {
      if (!page.isClosed() && /\/admin\//.test(page.url())) await menu.sair();
      else
        testInfo.annotations.push({
          type: 'logout',
          description: 'sessão não estava aberta no fim do teste',
        });
    }
  },
});

export { expect } from '@playwright/test';

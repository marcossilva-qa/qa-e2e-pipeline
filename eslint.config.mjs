import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'reports/', 'test-results/', 'output/', 'evidencias/', 'execucoes/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['ui/**/*.ts', 'tests-unit/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // As conferências de negócio vivem nos validadores e no passo final, não no corpo do teste.
      'playwright/expect-expect': 'off',
      // Um teste por massa é gerado em laço, a partir do arquivo de massa da execução.
      'playwright/valid-title': 'off',
      'playwright/no-conditional-in-test': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);

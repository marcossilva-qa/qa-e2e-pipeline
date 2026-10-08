import { carregarCatalogo } from '../../shared/catalogo.ts';
import { conferir, quantidadeEsperada } from '../../shared/regras.ts';
import { Evidencia } from '../evidencia/evidencia.ts';
import { arquivoDeMassa, carregarMassas } from '../fixtures/massa.ts';
import { expect, test } from '../fixtures/sessao.ts';
import { HomePage } from '../pages/home.page.ts';
import { ListaProdutosPage, ListaUsuariosPage } from '../pages/listagens.page.ts';

/*
 * Um teste por massa criada. Os testes não executam operações de negócio: para uma massa cujo
 * fluxo já ocorreu (pela API), validam e evidenciam o rastro na interface, tela a tela.
 */
const massas = carregarMassas();
const catalogo = carregarCatalogo();
const execucao = process.env.E2E_EXECUCAO ?? 'avulsa';

test.describe('Validação na interface', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- sem massa não há o que validar; o motivo vai no relatório
  test.skip(massas.length === 0, `sem massa em ${arquivoDeMassa()}: rode "npm run e2e" ou "npm run massa"`);

  for (const massa of massas) {
    const categoria = catalogo.find((p) => p.id === massa.produtoCatalogo)?.categoria ?? 'sem-categoria';

    test.describe(`[${massa.produtoCatalogo}]`, () => {
      test.use({ credenciais: { email: massa.usuario.email, senha: massa.usuario.senha } });

      test(massa.fluxo, { tag: [`@${massa.fluxo}`, `@${categoria}`] }, async ({ page, menu }, testInfo) => {
        expect(massa.falhas, 'a massa precisa estar íntegra para ser validada').toEqual([]);
        const evidencia = new Evidencia(page, testInfo, massa, execucao);

        await test.step('Home do administrador', async () => {
          const home = new HomePage(page);
          await evidencia.capturar(
            'Home do administrador',
            conferir('Home', { saudacao: `Bem Vindo ${massa.usuario.nome}` }, await home.lerCampos()),
          );
        });

        await test.step('Usuário na listagem', async () => {
          await menu.listarUsuarios();
          const usuarios = new ListaUsuariosPage(page);
          const linha = await usuarios.localizar(massa.usuario.email);
          await evidencia.capturar(
            'Usuário na listagem',
            conferir(
              'Usuários',
              { nome: massa.usuario.nome, email: massa.usuario.email, administrador: 'true' },
              await usuarios.lerCampos(linha),
            ),
            await usuarios.mascaras(),
          );
        });

        await test.step('Produto e estoque na listagem', async () => {
          await menu.listarProdutos();
          const produtos = new ListaProdutosPage(page);
          const linha = await produtos.localizar(massa.produto.nome);
          await evidencia.capturar(
            'Produto e estoque na listagem',
            conferir(
              'Produtos',
              {
                nome: massa.produto.nome,
                preco: massa.produto.preco,
                descricao: massa.produto.descricao,
                quantidade: quantidadeEsperada(massa.fluxo, massa.produto.estoque, massa.quantidadeCompra),
              },
              await produtos.lerCampos(linha),
            ),
          );
        });

        await test.step('Resultado das validações de negócio', async () => {
          await evidencia.gravar();
          const divergencias = evidencia.divergencias().map((d) => `${d.tela} · ${d.campo}`);
          expect(divergencias, 'campos divergentes (detalhe no relatório de validações)').toEqual([]);
        });
      });
    });
  }
});

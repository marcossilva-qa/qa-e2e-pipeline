/*
 * O relatório do Newman vira evidência compartilhada, então não pode carregar credencial.
 * O que esconder é calculado da PRÓPRIA collection a cada execução: requisição nova que
 * mande a senha no corpo ou devolva token já nasce coberta, sem lista mantida à mão.
 * Depois do run, o HTML gerado é varrido atrás dos valores secretos (segredosNoRelatorio).
 */
import fs from 'node:fs';

/** Headers que nunca vão para o relatório. */
export const HEADERS_OCULTOS = ['Authorization', 'Cookie', 'Set-Cookie'];

/** Variáveis da collection cujo valor é credencial. */
const REF_SECRETA = /\{\{\s*(senha|token)\s*\}\}/;

interface ItemColecao {
  name: string;
  item?: ItemColecao[];
  request?: { body?: { raw?: string } };
  event?: { listen: string; script: { exec: string[] } }[];
}

export interface Ocultacao {
  /** Requisições cujo corpo leva credencial. */
  corpo: string[];
  /** Requisições cuja resposta traz o token de acesso. */
  resposta: string[];
}

export function ocultacoes(colecao: { item: ItemColecao[] }): Ocultacao {
  const corpo = new Set<string>();
  const resposta = new Set<string>();
  (function percorrer(itens: ItemColecao[]) {
    for (const it of itens) {
      if (it.item) {
        percorrer(it.item);
        continue;
      }
      if (REF_SECRETA.test(it.request?.body?.raw ?? '')) corpo.add(it.name);
      const testes = (it.event ?? []).filter((e) => e.listen === 'test').flatMap((e) => e.script.exec);
      if (testes.some((l) => /environment\.set\(\s*'token'/.test(l))) resposta.add(it.name);
    }
  })(colecao.item);
  return { corpo: [...corpo].sort(), resposta: [...resposta].sort() };
}

export function ocultacoesDoArquivo(arquivo: string): Ocultacao {
  return ocultacoes(JSON.parse(fs.readFileSync(arquivo, 'utf8')) as { item: ItemColecao[] });
}

/** Quais dos valores secretos aparecem no relatório. Vazio = relatório seguro para compartilhar. */
export function segredosNoRelatorio(html: string, segredos: string[]): string[] {
  return segredos.filter((s) => s.length >= 6 && html.includes(s));
}

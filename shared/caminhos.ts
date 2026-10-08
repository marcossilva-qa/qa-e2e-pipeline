import path from 'node:path';

/** Raiz do projeto, para que todo comando funcione de qualquer pasta. */
export const RAIZ = path.resolve(import.meta.dirname, '..');

export const CAMINHOS = {
  catalogo: path.join(RAIZ, 'api', 'catalogo', 'produtos.json'),
  colecao: path.join(RAIZ, 'api', 'colecao', 'loja.postman_collection.json'),
  ambiente: path.join(RAIZ, 'api', 'ambientes', 'serverest.postman_environment.json'),
  saida: path.join(RAIZ, 'output'),
  relatorios: path.join(RAIZ, 'reports'),
  evidencias: path.join(RAIZ, 'evidencias'),
  historico: path.join(RAIZ, 'execucoes', 'historico.jsonl'),
};

export const URLS = {
  api: process.env.API_URL ?? 'https://serverest.dev',
  front: process.env.FRONT_URL ?? 'https://front.serverest.dev',
};

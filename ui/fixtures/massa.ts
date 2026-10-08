import fs from 'node:fs';
import path from 'node:path';
import { CAMINHOS } from '../../shared/caminhos.ts';
import type { Massa } from '../../shared/tipos.ts';

/**
 * A validação não cria dados: lê a massa que a camada de API acabou de criar. O orquestrador
 * passa o arquivo em E2E_MASSA; sem ele, vale a última massa criada por `npm run massa`.
 */
export function arquivoDeMassa(): string {
  return process.env.E2E_MASSA ?? path.join(CAMINHOS.saida, 'massa-ultima.json');
}

export function carregarMassas(): Massa[] {
  const arquivo = arquivoDeMassa();
  if (!fs.existsSync(arquivo)) return [];
  return JSON.parse(fs.readFileSync(arquivo, 'utf8')) as Massa[];
}

import { apagarCofre, chaveDaConta, gravarCofre, lerCofre } from '@/sessao/escopo';

import { MAX_CONTATOS, type Contato } from './tipos';

// Uma chave por conta, JSON pequeno (até 10 nomes). Mesmo cofre dos locais e das rotinas (D-29, D-31).
const BASE = 'voltasegura.contatos';

function ehContato(v: unknown): v is Contato {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c.id === 'string' && typeof c.nome === 'string' && c.nome.trim().length > 0;
}

export async function lerContatos(conta: string): Promise<Contato[]> {
  try {
    const bruto = await lerCofre(chaveDaConta(BASE, conta));
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter(ehContato).slice(0, MAX_CONTATOS) : [];
  } catch {
    return [];
  }
}

export async function gravarContatos(conta: string, contatos: Contato[]): Promise<void> {
  const texto = JSON.stringify(contatos.slice(0, MAX_CONTATOS));
  await gravarCofre(chaveDaConta(BASE, conta), texto);
}

export async function apagarTodosContatos(conta: string): Promise<void> {
  try {
    await apagarCofre(chaveDaConta(BASE, conta));
  } catch {
    // sem log
  }
}

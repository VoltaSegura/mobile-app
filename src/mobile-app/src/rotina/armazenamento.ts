import { apagarCofre, chaveDaConta, gravarCofre, lerCofre } from '@/sessao/escopo';

import { ANTECEDENCIA_PADRAO, ANTECEDENCIAS, MAX_ROTINAS, MAX_ROTULO, normalizarHora, type PontoRotina, type Rotina } from './tipos';

// Armazenamento cifrado do aparelho (Keychain/Keystore), como os lugares salvos. Uma chave por conta, JSON pequeno (até 5 rotinas).
const BASE = 'voltasegura.rotinas';

function lerPonto(v: unknown): PontoRotina | null {
  if (typeof v !== 'object' || v === null) return null;
  const p = v as Record<string, unknown>;
  const ponto = p.ponto as Record<string, unknown> | undefined;
  if (typeof p.rotulo !== 'string' || typeof ponto !== 'object' || ponto === null) return null;
  if (typeof ponto.lat !== 'number' || typeof ponto.lon !== 'number') return null;
  return { ponto: { lat: ponto.lat, lon: ponto.lon }, rotulo: p.rotulo.trim().slice(0, MAX_ROTULO) };
}

function lerRotina(v: unknown): Rotina | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;
  const origem = lerPonto(r.origem);
  const destino = lerPonto(r.destino);
  const hora = typeof r.hora === 'string' ? normalizarHora(r.hora) : null;
  const dias = Array.isArray(r.dias) ? [...new Set(r.dias.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b) : [];
  if (typeof r.id !== 'string' || !origem || !destino || !hora || dias.length === 0) return null;
  const antecedencia = typeof r.antecedencia === 'number' && ANTECEDENCIAS.includes(r.antecedencia) ? r.antecedencia : ANTECEDENCIA_PADRAO;
  return { id: r.id, origem, destino, dias, hora, antecedencia, ativa: r.ativa === true };
}

export async function lerRotinas(conta: string): Promise<Rotina[]> {
  try {
    const bruto = await lerCofre(chaveDaConta(BASE, conta));
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.map(lerRotina).filter((r): r is Rotina => r !== null).slice(0, MAX_ROTINAS);
  } catch {
    return [];
  }
}

export async function gravarRotinas(conta: string, rotinas: Rotina[]): Promise<void> {
  const texto = JSON.stringify(rotinas.slice(0, MAX_ROTINAS));
  await gravarCofre(chaveDaConta(BASE, conta), texto);
}

export async function apagarTodasRotinas(conta: string): Promise<void> {
  try {
    await apagarCofre(chaveDaConta(BASE, conta));
  } catch {
    // sem log: coordenadas nunca vão para o console
  }
}

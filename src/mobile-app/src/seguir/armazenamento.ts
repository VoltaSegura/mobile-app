import { chaveDaConta, gravarCofre, lerCofre } from '@/sessao/escopo';

// Preferência local: a pessoa marcou "Entendi e não mostrar de novo" no aviso de Seguir rota (TL-18).
// Fica só no aparelho, sem coordenadas nem dados de viagem.
const BASE = 'voltasegura.seguir.introOculta';

export async function lerIntroOculta(conta: string): Promise<boolean> {
  try {
    const bruto = await lerCofre(chaveDaConta(BASE, conta));
    return bruto === 'sim';
  } catch {
    return false;
  }
}

export async function gravarIntroOculta(conta: string, oculta: boolean): Promise<void> {
  try {
    const valor = oculta ? 'sim' : 'nao';
    await gravarCofre(chaveDaConta(BASE, conta), valor);
  } catch {
    // sem log: a preferência é só conveniência; na falha o aviso volta a aparecer
  }
}

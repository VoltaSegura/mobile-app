import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useIdConta } from '@/sessao/SessaoContext';
import { apagarCofre, chaveDaConta, gravarCofre, lerCofre } from '@/sessao/escopo';

/**
 * Assinatura simulada do VoltaSegura+ (itens 5 e 12 do T25-B; D-36). Simulação: não há cobrança nem pagamento.
 * Guarda só o plano escolhido e a data de início do teste, no aparelho. Nenhum valor ou dado de pagamento.
 */
export type PlanoSimulado = 'mensal' | 'anual';

export type AssinaturaSimulada = {
  plano: PlanoSimulado;
  /** Data de início do teste, em ISO. */
  inicio: string;
};

const BASE = 'voltasegura.plus';
const PLANOS: readonly PlanoSimulado[] = ['mensal', 'anual'];

function ehAssinatura(v: unknown): v is AssinaturaSimulada {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return typeof a.plano === 'string' && PLANOS.includes(a.plano as PlanoSimulado) && typeof a.inicio === 'string' && !Number.isNaN(Date.parse(a.inicio));
}

export async function lerAssinatura(conta: string): Promise<AssinaturaSimulada | null> {
  try {
    const bruto = await lerCofre(chaveDaConta(BASE, conta));
    if (!bruto) return null;
    const dados: unknown = JSON.parse(bruto);
    return ehAssinatura(dados) ? dados : null;
  } catch {
    return null;
  }
}

export async function gravarAssinatura(conta: string, assinatura: AssinaturaSimulada | null): Promise<void> {
  if (assinatura === null) {
    await apagarCofre(chaveDaConta(BASE, conta));
    return;
  }
  await gravarCofre(chaveDaConta(BASE, conta), JSON.stringify(assinatura));
}

type Valor = {
  /** Há uma assinatura simulada ativa (teste iniciado e não cancelado). */
  assinante: boolean;
  plano: PlanoSimulado | null;
  /** Data de início do teste, ou null sem assinatura. */
  inicio: Date | null;
  carregado: boolean;
  /** Inicia o teste simulado do plano escolhido. */
  assinar: (plano: PlanoSimulado) => Promise<void>;
  /** Cancela a simulação: volta ao plano gratuito. */
  cancelar: () => Promise<void>;
};

const Contexto = createContext<Valor | null>(null);

export function AssinaturaProvider({ children }: { children: ReactNode }) {
  const conta = useIdConta();
  const [atual, setAtual] = useState<AssinaturaSimulada | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let ativo = true;
    void lerAssinatura(conta).then((lida) => { if (ativo) { setAtual(lida); setCarregado(true); } });
    return () => { ativo = false; };
  }, [conta]);

  const assinar = useCallback(async (plano: PlanoSimulado) => {
    const nova: AssinaturaSimulada = { plano, inicio: new Date().toISOString() };
    setAtual(nova);
    try {
      await gravarAssinatura(conta, nova);
    } catch {
      // Sem log: a simulação segue só nesta sessão do app.
    }
  }, [conta]);

  const cancelar = useCallback(async () => {
    setAtual(null);
    try {
      await gravarAssinatura(conta, null);
    } catch {
      // Sem log.
    }
  }, [conta]);

  const valor = useMemo<Valor>(() => ({
    assinante: atual !== null,
    plano: atual?.plano ?? null,
    inicio: atual ? new Date(atual.inicio) : null,
    carregado,
    assinar,
    cancelar,
  }), [atual, carregado, assinar, cancelar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Estado da assinatura simulada. Exige o `AssinaturaProvider` montado (no (app)/_layout.tsx). */
export function useAssinatura(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useAssinatura precisa estar dentro de AssinaturaProvider');
  return valor;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useIdConta } from '@/sessao/SessaoContext';
import { chaveDaConta, gravarCofre, lerCofre, SEM_CONTA } from '@/sessao/escopo';

/** Preferência de tema escolhida na aba Perfil (item 3 do T25-B). `sistema` segue o aparelho. */
export type ModoTema = 'sistema' | 'claro' | 'escuro';

const BASE = 'voltasegura.tema';
const MODOS: readonly ModoTema[] = ['sistema', 'claro', 'escuro'];

/** Sem conta (telas de entrada) vale a preferência do aparelho; com conta, a da conta (D-40). */
function chaveTema(conta: string): string {
  return conta === SEM_CONTA ? BASE : chaveDaConta(BASE, conta);
}

async function lerChave(chave: string): Promise<ModoTema | null> {
  try {
    const bruto = await lerCofre(chave);
    return MODOS.includes(bruto as ModoTema) ? (bruto as ModoTema) : null;
  } catch {
    return null;
  }
}

/** A conta que ainda não escolheu parte da preferência do aparelho. */
export async function lerModoTema(conta: string = SEM_CONTA): Promise<ModoTema> {
  const daConta = await lerChave(chaveTema(conta));
  if (daConta || conta === SEM_CONTA) return daConta ?? 'sistema';
  return (await lerChave(BASE)) ?? 'sistema';
}

export async function gravarModoTema(modo: ModoTema, conta: string = SEM_CONTA): Promise<void> {
  await gravarCofre(chaveTema(conta), modo);
}

type Valor = {
  modo: ModoTema;
  carregado: boolean;
  definirModo: (modo: ModoTema) => Promise<void>;
};

const Contexto = createContext<Valor | null>(null);

/**
 * Guarda a preferência de tema no aparelho. Sem este provider, `useTema` segue o sistema (padrão).
 * Deve ficar acima da navegação na raiz (app/_layout.tsx) e abaixo do `SessaoProvider`, para seguir a conta.
 */
export function ModoTemaProvider({ children }: { children: ReactNode }) {
  const conta = useIdConta();
  const [modo, setModo] = useState<ModoTema>('sistema');
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let ativo = true;
    void lerModoTema(conta).then((lido) => { if (ativo) { setModo(lido); setCarregado(true); } });
    return () => { ativo = false; };
  }, [conta]);

  const definirModo = useCallback(async (proximo: ModoTema) => {
    setModo(proximo);
    try {
      await gravarModoTema(proximo, conta);
    } catch {
      // Sem log: a escolha vale até o app fechar.
    }
  }, [conta]);

  const valor = useMemo(() => ({ modo, carregado, definirModo }), [modo, carregado, definirModo]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Modo preferido atual; `sistema` quando não há provider. Usado por `useTema`. */
export function useModoPreferido(): ModoTema {
  return useContext(Contexto)?.modo ?? 'sistema';
}

/** Modo e troca, para a tela de Perfil. Exige o provider montado. */
export function useModoTema(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useModoTema precisa estar dentro de ModoTemaProvider');
  return valor;
}

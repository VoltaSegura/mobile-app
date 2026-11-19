import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Escopo por conta (D-40): locais, rotinas, contatos, assinatura simulada, tema e preferências ficam só no
 * aparelho, mas separados por conta. Cada chave do cofre leva o identificador da conta no fim:
 * `voltasegura.locais.<id>`.
 *
 * O `id` é um hash do e-mail normalizado (nunca o e-mail): o nome da chave fica em claro no Keystore/Keychain,
 * e o SecureStore só aceita alfanuméricos, ".", "-" e "_".
 */

/** Identificador usado quando não há sessão (só testes e telas fora do `(app)`; nunca guarda dado pessoal). */
export const SEM_CONTA = 'sem-conta';

/** FNV-1a de 32 bits com duas sementes; 16 hexadecimais. Não é criptográfico: só separa as contas do aparelho. */
function fnv1a(texto: string, semente: number): string {
  let h = semente >>> 0;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Mesmo e-mail (ignorando espaços e maiúsculas) dá sempre o mesmo id. */
export function idArmazenamento(email: string): string {
  const normalizado = email.trim().toLowerCase();
  return fnv1a(normalizado, 0x811c9dc5) + fnv1a(normalizado, 0x9747b28c);
}

export function chaveDaConta(base: string, id: string): string {
  return `${base}.${id}`;
}

// ---- Cofre: SecureStore no celular; memória na web (a web serve apenas ao desenvolvimento) ----

const memoriaWeb = new Map<string, string>();

export async function lerCofre(chave: string): Promise<string | null> {
  if (Platform.OS === 'web') return memoriaWeb.get(chave) ?? null;
  return SecureStore.getItemAsync(chave);
}

export async function gravarCofre(chave: string, valor: string): Promise<void> {
  if (Platform.OS === 'web') { memoriaWeb.set(chave, valor); return; }
  await SecureStore.setItemAsync(chave, valor);
}

export async function apagarCofre(chave: string): Promise<void> {
  if (Platform.OS === 'web') { memoriaWeb.delete(chave); return; }
  await SecureStore.deleteItemAsync(chave);
}

/** Chaves globais de antes da separação por conta. Não pertencem a ninguém: são apagadas (sem migração). */
const CHAVES_GLOBAIS_ANTIGAS = [
  'voltasegura.locais',
  'voltasegura.rotinas',
  'voltasegura.contatos',
  'voltasegura.plus',
  'voltasegura.seguir.introOculta',
] as const;

export async function apagarChavesGlobaisAntigas(): Promise<void> {
  await Promise.all(CHAVES_GLOBAIS_ANTIGAS.map((chave) => apagarCofre(chave).catch(() => undefined)));
}

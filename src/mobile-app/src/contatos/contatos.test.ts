import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { chaveDaConta, SEM_CONTA } from '@/sessao/escopo';
import * as SecureStore from 'expo-secure-store';

import { gravarContatos, lerContatos, MAX_CONTATOS, normalizarNomeContato } from './index';

jest.mock('expo-secure-store', () => {
  let guardado: string | null = null;
  return {
    getItemAsync: jest.fn(async () => guardado),
    setItemAsync: jest.fn(async (_k: string, v: string) => { guardado = v; }),
    deleteItemAsync: jest.fn(async () => { guardado = null; }),
  };
});



describe('contatos (só nomes, no aparelho)', () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync(chaveDaConta('voltasegura.contatos', SEM_CONTA));
  });

  it('normaliza espaços e corta o nome', () => {
    expect(normalizarNomeContato('  Mãe   da  Ana ')).toBe('Mãe da Ana');
    expect(normalizarNomeContato('x'.repeat(50))).toHaveLength(30);
  });

  it('grava e lê os contatos', async () => {
    await gravarContatos(SEM_CONTA, [{ id: '1', nome: 'Mãe' }]);
    expect(await lerContatos(SEM_CONTA)).toEqual([{ id: '1', nome: 'Mãe' }]);
  });

  it('descarta registros corrompidos e nomes vazios sem quebrar', async () => {
    await SecureStore.setItemAsync(chaveDaConta('voltasegura.contatos', SEM_CONTA), JSON.stringify([{ id: 'a', nome: 'Ana' }, { id: 'b', nome: '  ' }, { nome: 'sem id' }, null]));
    expect(await lerContatos(SEM_CONTA)).toEqual([{ id: 'a', nome: 'Ana' }]);
  });

  it('retorna lista vazia quando o JSON está inválido', async () => {
    await SecureStore.setItemAsync(chaveDaConta('voltasegura.contatos', SEM_CONTA), '{não é json');
    expect(await lerContatos(SEM_CONTA)).toEqual([]);
  });

  it('não guarda mais que o limite', async () => {
    const muitos = Array.from({ length: MAX_CONTATOS + 3 }, (_, i) => ({ id: String(i), nome: `Pessoa ${i}` }));
    await gravarContatos(SEM_CONTA, muitos);
    expect(await lerContatos(SEM_CONTA)).toHaveLength(MAX_CONTATOS);
  });
});

import * as SecureStore from 'expo-secure-store';

import { gravarContatos, lerContatos } from '@/contatos/armazenamento';
import { gravarLocais, lerLocais } from '@/locais/armazenamento';
import { gravarRotinas, lerRotinas } from '@/rotina/armazenamento';

import { apagarChavesGlobaisAntigas, chaveDaConta, idArmazenamento, SEM_CONTA } from './escopo';

// Cofre com uma entrada por chave (os mocks de um valor só dos outros testes não enxergam o escopo).
jest.mock('expo-secure-store', () => {
  const cofre = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (chave: string) => cofre.get(chave) ?? null),
    setItemAsync: jest.fn(async (chave: string, valor: string) => { cofre.set(chave, valor); }),
    deleteItemAsync: jest.fn(async (chave: string) => { cofre.delete(chave); }),
  };
});

const ponto = { lat: -23.5, lon: -46.6 };
const local = { id: 'l1', nome: 'FIAP', tipo: 'estudo' as const, ponto };
const rotina = {
  id: 'r1', origem: { ponto, rotulo: 'Casa' }, destino: { ponto, rotulo: 'FIAP' },
  dias: [1, 2], hora: '07:30', antecedencia: 15, ativa: true,
};

describe('escopo por conta (D-40)', () => {
  it('o mesmo e-mail dá sempre o mesmo id, ignorando espaços e maiúsculas', () => {
    expect(idArmazenamento('  Ana@Exemplo.com ')).toBe(idArmazenamento('ana@exemplo.com'));
  });

  it('e-mails diferentes dão ids diferentes, e o id só tem caracteres aceitos pelo SecureStore', () => {
    const a = idArmazenamento('ldsimidu@gmail.com');
    const b = idArmazenamento('teste@gmail.com');
    const c = idArmazenamento('aaaaa@gmail.com');
    expect(new Set([a, b, c]).size).toBe(3);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(chaveDaConta('voltasegura.locais', a)).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it('o id não contém o e-mail', () => {
    expect(chaveDaConta('voltasegura.locais', idArmazenamento('ldsimidu@gmail.com'))).not.toMatch(/ldsimidu|gmail/);
  });

  it('locais, rotinas e contatos de uma conta não aparecem em outra', async () => {
    const a = idArmazenamento('a@exemplo.com');
    const b = idArmazenamento('b@exemplo.com');
    await gravarLocais(a, [local]);
    await gravarRotinas(a, [rotina]);
    await gravarContatos(a, [{ id: 'c1', nome: 'Mãe' }]);

    expect(await lerLocais(a)).toHaveLength(1);
    expect(await lerRotinas(a)).toHaveLength(1);
    expect(await lerContatos(a)).toHaveLength(1);

    expect(await lerLocais(b)).toEqual([]);
    expect(await lerRotinas(b)).toEqual([]);
    expect(await lerContatos(b)).toEqual([]);
    expect(await lerLocais(SEM_CONTA)).toEqual([]);
  });

  it('apaga as chaves globais antigas sem tocar nas chaves das contas', async () => {
    const conta = idArmazenamento('a@exemplo.com');
    await SecureStore.setItemAsync('voltasegura.locais', JSON.stringify([local]));
    await SecureStore.setItemAsync('voltasegura.rotinas', JSON.stringify([rotina]));
    await gravarLocais(conta, [local]);

    await apagarChavesGlobaisAntigas();

    expect(await SecureStore.getItemAsync('voltasegura.locais')).toBeNull();
    expect(await SecureStore.getItemAsync('voltasegura.rotinas')).toBeNull();
    expect(await lerLocais(conta)).toHaveLength(1);
  });
});

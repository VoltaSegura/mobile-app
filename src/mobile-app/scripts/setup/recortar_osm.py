"""Recorta o OSM do Sudeste para o retângulo do município de São Paulo (chamado pelo otp2.mjs).

Mesma lógica de scripts/otp2/preparar_dados.py no monorepo; copiada aqui porque o espelho de
entrega do app só recebe src/mobile-app/. Se mudar o recorte, mude nos dois.

Uso: python recortar_osm.py <sudeste-latest.osm.pbf> <sao-paulo.osm.pbf>
"""

from __future__ import annotations

import sys
import time

import osmium

# Retângulo que envolve o município de São Paulo (oeste, sul, leste, norte), com folga de ~1 km.
BBOX = (-46.84, -24.02, -46.35, -23.34)


# O recorte lê o arquivo uma vez (nós, depois vias, depois relações) e, ao gravar, lê de novo para
# completar as vias que cruzam a borda. O total não é conhecido antes; o progresso mostra quanto já foi
# lido e o tempo decorrido, para dar para ver que a etapa está andando.
AVISO_NOS = 10_000_000
AVISO_VIAS = 2_000_000


def mostrar(texto: str, inicio: float) -> None:
    print(f"       {texto} ({(time.perf_counter() - inicio) / 60:.1f} min)", flush=True)


class RecorteRetangulo:
    """Mantém nós dentro do retângulo, vias que tocam esses nós e relações com algum membro mantido."""

    def __init__(self, escritor: osmium.BackReferenceWriter, inicio: float):
        self.oeste, self.sul, self.leste, self.norte = BBOX
        self.escritor = escritor
        self.ids = osmium.IdTracker()
        self.inicio = inicio
        self.nos = self.vias = self.relacoes = 0
        self.nos_mantidos = self.vias_mantidas = 0

    def node(self, n):
        self.nos += 1
        if self.nos % AVISO_NOS == 0:
            mostrar(f"nós lidos: {self.nos // 1_000_000} milhões; em São Paulo: {self.nos_mantidos / 1e6:.1f} milhões", self.inicio)
        local = n.location
        if local.valid() and self.oeste <= local.lon <= self.leste and self.sul <= local.lat <= self.norte:
            self.escritor.add_node(n)
            self.ids.add_node(n.id)
            self.nos_mantidos += 1

    def way(self, w):
        if self.vias == 0:
            mostrar(f"nós concluídos ({self.nos / 1e6:.0f} milhões); lendo as vias", self.inicio)
        self.vias += 1
        if self.vias % AVISO_VIAS == 0:
            mostrar(f"vias lidas: {self.vias // 1_000_000} milhões; em São Paulo: {self.vias_mantidas / 1e6:.1f} milhões", self.inicio)
        if self.ids.contains_any_references(w):
            self.escritor.add_way(w)
            self.ids.add_way(w.id)
            self.vias_mantidas += 1

    def relation(self, r):
        if self.relacoes == 0:
            mostrar(f"vias concluídas ({self.vias / 1e6:.1f} milhões); lendo as relações (linhas, limites)", self.inicio)
        self.relacoes += 1
        if self.ids.contains_any_references(r):
            self.escritor.add_relation(r)


def main() -> int:
    # Acentos corretos mesmo quando a saída passa por um pipe no Windows (cp1252 por padrão).
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    origem, destino = sys.argv[1], sys.argv[2]
    inicio = time.perf_counter()
    mostrar("lendo o mapa: primeiro os nós, depois as vias e as relações", inicio)
    with osmium.BackReferenceWriter(destino, ref_src=origem, overwrite=True) as escritor:
        osmium.apply(origem, RecorteRetangulo(escritor, inicio))
        mostrar("leitura concluída; gravando o recorte e completando as vias que cruzam a borda (relê o arquivo, alguns minutos sem novas mensagens)", inicio)
    print(f"  [ok] recorte pronto em {(time.perf_counter() - inicio) / 60:.1f} min", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

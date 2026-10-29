# Builds config/emissoes/emissoes.json, the annual GHG emissions of the 1,095
# municipalities of public/data/vector/municipios.geojson (predominant biome
# Caatinga, IBGE 2024) from two inventories, summed by state and for the biome.
# Usage, from landing/:
#   python scripts/build-emissoes.py <seeg.csv> <climate_trace.csv>
#
# Inputs, kept outside the repository (179 MB and 42 MB), one row per municipality,
# year and the finest split each source gives:
#   SEEG collection 14, platform API, one query per municipal area x emission type
#   x gas: area_id,codigo_ibge,municipio,gas,tipo,categoria,ano,t_co2e,setor
#   Climate TRACE API v7 (data release 5.11.0), one query per GADM-2 municipality
#   x year: codigo_ibge,gadm,municipio,ano,setor,subsetor,familia_flu,t_co2e,meses
# Both use CO2e with AR6 GWP100 (SEEG gas 9; Climate TRACE co2e_100yr), so the
# two share the metric; their sectors and gross/net definitions still differ
# (see lib/emissoes/series.ts). Positive is emission, negative is removal.
#
# Every value is a municipality total: neither download gives anything finer
# than the municipality, so nothing here is split by area. A state is the sum of
# its Caatinga municipalities and the biome the sum of all 1,095; areas are the
# whole municipalities' official IBGE areas (2022 municipal grid), the base of
# the per-hectare figures.
#
# What is left out, and why:
#   - Climate TRACE 2026: January to July only, with the biomass balances still zero.
#   - Climate TRACE international aviation and shipping: national inventories
#     report bunker fuels apart from any municipality (SEEG keeps them in "NA").
#   - Climate TRACE oil-and-gas production and transport in Pintadas (BA): the
#     whole country's residual onshore production placed at a single point, about
#     8 Mt/yr, which would rank Pintadas second in the biome.
#   - Climate TRACE "removals": close to the biomass balances minus the gross
#     emissions (within about 34 kt per municipality from 2023), so it is not kept.
#
# The versions and query dates in FONTES describe the input files; the script
# checks the Climate TRACE version against the file name, so a new download
# fails until FONTES is updated.
import gzip, json, os, sys, urllib.request
import pandas as pd

LANDING = os.path.join(os.path.dirname(__file__), "..")
MUNICIPIOS = os.path.join(LANDING, "public", "data", "vector", "municipios.geojson")
OUT = os.path.join(LANDING, "config", "emissoes", "emissoes.json")
# Pinned to the 2022 grid: the unpinned endpoint serves the latest one, and
# 2019-2021 answer without areas.
IBGE_PERIODO = 2022
IBGE_AREAS = ("https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR/metadados"
              f"?intrarregiao=municipio&periodo={IBGE_PERIODO}")

SEEG_ANOS = list(range(1990, 2026))
CT_ANOS = list(range(2021, 2026))
SEEG_GAS = "GWP-AR6"
SEEG_SETOR = {
    "Agropecuária": "agropecuaria",
    "Energia": "energia",
    "Mudança de Uso da Terra e Floresta": "uso_da_terra",
    "Processos Industriais": "processos_industriais",
    "Resíduos": "residuos",
}
SEEG_TIPO = {"Emissão": "emissao", "Emissão (NCI)": "emissao_nci", "Remoção": "remocao"}
CT_FLU = "forestry-and-land-use"
CT_FAMILIAS = ["brutas", "saldos", "solo", "reservatorios"]
CT_INTERNACIONAL = {"international-aviation", "international-shipping"}
PINTADAS = "2924652"
CT_PINTADAS = {"oil-and-gas-production", "oil-and-gas-transport"}

FONTES = {
    "gwp": "AR6 GWP100",
    "unidade": "t CO2e",
    "seeg": {"colecao": "14.0", "consulta": "2026-10-25", "anos": [SEEG_ANOS[0], SEEG_ANOS[-1]]},
    "ct": {"versao": "5.11.0", "consulta": "2026-10-25", "anos": [CT_ANOS[0], CT_ANOS[-1]]},
    "areas": {"fonte": "IBGE, API de malhas v3, metadados", "periodo": IBGE_PERIODO},
}


def fail(message):
    sys.exit(f"build-emissoes: {message}")


def check_codes(found, codes, source):
    if found != codes:
        fail(f"{source} codes differ from municipios.geojson: missing {sorted(codes - found)[:5]}, "
             f"extra {sorted(found - codes)[:5]}")


def seeg_series(path, codes):
    s = pd.read_csv(path, encoding="utf-8-sig", dtype={"codigo_ibge": str},
                    usecols=["codigo_ibge", "gas", "tipo", "ano", "t_co2e", "setor"])
    s = s[(s.gas == SEEG_GAS) & s.ano.isin(SEEG_ANOS)]
    unknown = set(s.setor) - set(SEEG_SETOR) | set(s.tipo) - set(SEEG_TIPO)
    if unknown:
        fail(f"SEEG sector or type not mapped: {sorted(unknown)}")
    check_codes(set(s.codigo_ibge), codes, "SEEG")
    s = s.assign(setor=s.setor.map(SEEG_SETOR), tipo=s.tipo.map(SEEG_TIPO))
    return (s.groupby(["codigo_ibge", "setor", "tipo", "ano"]).t_co2e.sum()
            .unstack("ano").reindex(columns=SEEG_ANOS, fill_value=0).fillna(0).round().astype("int64"))


def ct_series(path, codes):
    c = pd.read_csv(path, encoding="utf-8-sig", dtype={"codigo_ibge": str},
                    usecols=["codigo_ibge", "ano", "setor", "subsetor", "familia_flu", "t_co2e", "meses"])
    c = c[c.ano.isin(CT_ANOS)]
    if (c.meses != 12).any():
        fail(f"Climate TRACE years with fewer than 12 months: {sorted(set(c.ano[c.meses != 12]))}")
    unknown = set(c.familia_flu[c.setor == CT_FLU].dropna()) - set(CT_FAMILIAS) - {"remocoes_residuo"}
    if unknown:
        fail(f"Climate TRACE land-use family not mapped: {sorted(unknown)}")
    # An exclusion that matches nothing means a renamed subsector, not a clean file.
    internacional = c.subsetor.isin(CT_INTERNACIONAL)
    pintadas = (c.codigo_ibge == PINTADAS) & c.subsetor.isin(CT_PINTADAS)
    for name, mask in (("international transport", internacional), ("Pintadas oil and gas", pintadas)):
        if not (c.t_co2e[mask] != 0).any():
            fail(f"exclusion of {name} matched no emission: check the subsector names")
    c = c[~internacional & ~pintadas]
    c = c[(c.setor != CT_FLU) | c.familia_flu.isin(CT_FAMILIAS)]
    check_codes(set(c.codigo_ibge), codes, "Climate TRACE")
    c = c.assign(chave=c.setor.where(c.setor != CT_FLU, CT_FLU + "/" + c.familia_flu.fillna("")))
    return (c.groupby(["codigo_ibge", "chave", "ano"]).t_co2e.sum()
            .unstack("ano").reindex(columns=CT_ANOS, fill_value=0).fillna(0).round().astype("int64"))


def official_areas_ha(codes):
    with urllib.request.urlopen(IBGE_AREAS, timeout=180) as response:
        body = response.read()
    # servicodados.ibge.gov.br answers gzip even to a request that did not ask for it.
    meta = json.loads(gzip.decompress(body) if body[:2] == b"\x1f\x8b" else body)
    areas = {m["id"]: round(float(m["area"]["dimensao"]) * 100) for m in meta
             if m["id"] in codes and m["area"]["unidade"]["id"] == "km2"}
    if set(areas) != codes:
        fail(f"IBGE areas missing for {sorted(codes - set(areas))[:5]}")
    return areas


def unit_entry(seeg, ct):
    """One unit (municipality, state or biome) from its slices of the two tables."""
    # The four land-use families are always present (types/emissoes.ts), zero when absent.
    entry = {"seeg": {}, "ct": {"setores": {}, "usoDaTerra": {f: [0] * len(CT_ANOS) for f in CT_FAMILIAS}}}
    for (setor, tipo), values in seeg.groupby(level=["setor", "tipo"]).sum().iterrows():
        if values.any():
            entry["seeg"].setdefault(setor, {})[tipo] = values.tolist()
    for chave, values in ct.groupby(level="chave").sum().iterrows():
        if chave.startswith(CT_FLU + "/"):
            entry["ct"]["usoDaTerra"][chave.split("/", 1)[1]] = values.tolist()
        elif values.any():
            entry["ct"]["setores"][chave] = values.tolist()
    return entry


def main():
    if len(sys.argv) != 3:
        fail("usage: python scripts/build-emissoes.py <seeg.csv> <climate_trace.csv>")
    versao = FONTES["ct"]["versao"].rsplit(".", 1)[0]
    if f"_v{versao}_" not in os.path.basename(sys.argv[2]):
        fail(f"the Climate TRACE file name does not carry version {versao}: update FONTES")
    with open(MUNICIPIOS, encoding="utf-8") as f:
        props = [feat["properties"] for feat in json.load(f)["features"]]
    uf = {str(p["code_muni"]): p["abbrev_state"] for p in props}
    nome = {str(p["code_muni"]): p["name_muni"] for p in props}
    codes = set(uf)

    seeg = seeg_series(sys.argv[1], codes)
    ct = ct_series(sys.argv[2], codes)
    area = official_areas_ha(codes)

    municipios = {}
    for code in sorted(codes):
        municipios[code] = {"nome": nome[code], "uf": uf[code], "areaHa": area[code],
                            **unit_entry(seeg.loc[[code]], ct.loc[[code]])}
    estados = {}
    for sigla in sorted(set(uf.values())):
        membros = sorted(c for c in codes if uf[c] == sigla)
        estados[sigla] = {"municipios": len(membros), "areaHa": sum(area[c] for c in membros),
                          **unit_entry(seeg.loc[membros], ct.loc[membros])}
    bioma = {"municipios": len(codes), "areaHa": sum(area.values()), **unit_entry(seeg, ct)}

    doc = {"fontes": FONTES, "bioma": bioma, "estados": estados, "municipios": municipios}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    i24 = SEEG_ANOS.index(2024)
    brutas = sum(t["emissao"][i24] for t in bioma["seeg"].values() if "emissao" in t)
    print(f"OK emissoes.json: {len(municipios)} municípios, {len(estados)} estados, "
          f"{os.path.getsize(OUT) // 1024} KB; SEEG brutas 2024 = {brutas / 1e6:.2f} Mt")


if __name__ == "__main__":
    main()

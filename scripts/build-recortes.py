# Downloads the territorial recortes (IBGE, FUNAI and INCRA via geobr), keeps
# those that belong to the Caatinga, clips them to the biome, simplifies them
# and writes GeoJSON into public/data/vector. Usage: python scripts/build-recortes.py
#
# A recorte belongs to the Caatinga when the biome is predominant in it:
#   municipios        IBGE's list of predominant biome per municipality (2024,
#                     on the 2022 municipal grid)
#   estados           the states holding at least one of those municipalities
#   terras_indigenas, more than half of their own area inside the biome
#   quilombolas
# Clipping every recorte that touched the biome used to let in crumbs of
# Cerrado and Atlantic Forest municipalities, and a sliver of Maranhão, wherever
# the state or municipal borders and the biome edge disagree by a few metres.
# What is kept is still clipped, so the map shows the area the analysis measures.
#
# Homonyms take an ordinal suffix in file order (lib/territorios/featureIds.ts),
# so features keep the order of the file being replaced and new ones go at the
# end, in source order: a regeneration only moves the ids it cannot avoid.
# `assentamentos` does not come from here (INSA file, see DOCUMENTACAO.md).
import io, os, json, re, unicodedata, urllib.request
import pandas as pd
import geopandas as gpd
import geobr

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "vector")
BIOMA = os.path.join(OUT, "limite_caatinga.geojson")
IBGE_BIOME_LIST = ("https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/biomas/"
                   "documentos/Bioma_Predominante_por_Municipio_2024.csv")
# South America Albers Equal Area, for the share of a territory inside the biome.
EQUAL_AREA = "ESRI:102033"

bioma = gpd.read_file(BIOMA).to_crs(4674)
bioma_geom = bioma.union_all() if hasattr(bioma, "union_all") else bioma.unary_union

with urllib.request.urlopen(IBGE_BIOME_LIST, timeout=120) as r:
    biome_list = pd.read_csv(io.BytesIO(r.read()), sep=";", encoding="utf-8-sig")
biome_list.columns = ["code_muni", "name_muni", "abbrev_state", "bioma"]
caatinga = biome_list[biome_list["bioma"] == "Caatinga"]
CAATINGA_MUNI = set(caatinga["code_muni"].astype(int))
CAATINGA_UF = set(caatinga["abbrev_state"])
CAATINGA_NAMES = dict(zip(caatinga["code_muni"].astype(int), caatinga["name_muni"]))


def mostly_inside(gdf):
    """Rows with more than half of their area inside the biome; prints the rest that touch it."""
    inside = gpd.clip(gdf, bioma_geom).to_crs(EQUAL_AREA).area
    whole = gdf.loc[inside.index].to_crs(EQUAL_AREA).area
    share = (inside / whole).reindex(gdf.index).fillna(0)
    for i in share[(share > 0) & (share <= 0.5)].index:
        print(f"   fora: {gdf.at[i, gdf.columns[0]]} ({share[i]:.0%} na Caatinga)")
    return gdf[share > 0.5]


def slug(value):
    """The id base of lib/mapa/format.ts: lowercase, no accents, hyphens."""
    plain = unicodedata.normalize("NFD", str(value)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", plain).strip("-")


def previous_order(path, gdf, label):
    """
    Position of each row in the file being replaced, so homonyms keep their id
    suffix. A row is matched first by label and state, the nearest one when the
    pair repeats; then, for what is left, by the label's slug alone, among old
    rows its geometry overlaps (a source can rename a state field, as INCRA's
    "SE" for what enrich-uf.py had as "SE/BA"). The rest goes to the end.
    """
    if not os.path.exists(path):
        return pd.Series(range(len(gdf)), index=gdf.index)
    old = gpd.read_file(path).to_crs(gdf.crs)
    old_c, new_c = old.geometry.representative_point(), gdf.geometry.representative_point()
    old_slug, new_slug = old[label].map(slug), gdf[label].map(slug)
    taken, rank = set(), {}

    def take(i, candidates):
        free = [j for j in candidates if j not in taken]
        if free:
            j = min(free, key=lambda j: old_c[j].distance(new_c[i]))
            taken.add(j)
            rank[i] = j

    for i in gdf.index:
        take(i, old[(old_slug == new_slug[i]) & (old["abbrev_state"] == gdf.at[i, "abbrev_state"])].index)
    for i in gdf.index:
        if i not in rank:
            take(i, [j for j in old[old_slug == new_slug[i]].index if old.geometry[j].intersects(gdf.geometry[i])])
    tail = iter(range(len(old), len(old) + len(gdf)))
    return pd.Series({i: rank[i] if i in rank else next(tail) for i in gdf.index})


def write(name, gdf, columns, tol):
    path = os.path.join(OUT, name + ".geojson")
    clipped = gpd.clip(gdf, bioma_geom, sort=True)
    clipped = clipped[~clipped.geometry.is_empty & clipped.geometry.notna()]
    clipped = clipped.loc[previous_order(path, clipped, columns[0]).sort_values().index]
    clipped = clipped[columns + ["geometry"]].to_crs(4326)
    clipped["geometry"] = clipped.geometry.simplify(tol, preserve_topology=True)
    clipped.to_file(path, driver="GeoJSON")
    # rewrites compactly with 5 decimals (about 1 m)
    d = json.load(open(path, encoding="utf-8"))
    def rnd(x): return [rnd(v) for v in x] if isinstance(x, list) else round(x, 5)
    for f in d["features"]:
        f["geometry"]["coordinates"] = rnd(f["geometry"]["coordinates"])
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"OK {name}: n={len(clipped)} {os.path.getsize(path) // 1024}KB")


def municipios():
    g = geobr.read_municipality(year=2022, show_progress=False)
    g["code_muni"] = g["code_muni"].astype(int)
    g = g[g["code_muni"].isin(CAATINGA_MUNI)].copy()
    # geobr capitalizes some names its own way ("Olho D'água"); IBGE's list has
    # the official spelling.
    g["name_muni"] = g["code_muni"].map(CAATINGA_NAMES)
    return g


def estados():
    g = geobr.read_state(year=2022, show_progress=False)
    return g[g["abbrev_state"].isin(CAATINGA_UF)]


def terras_indigenas():
    g = geobr.read_indigenous_land(year=2025, show_progress=False)
    g["code_indigenous_land"] = g["code_indigenous_land"].astype("Int64")
    return mostly_inside(g[["name_indigenous_land", "abbrev_state", "code_indigenous_land", "geometry"]])


def quilombolas():
    g = geobr.read_quilombola_land(date=202605, show_progress=False)
    g["code_quilombo"] = g["code_quilombo"].astype("Int64")
    return mostly_inside(g[["name_quilombo", "abbrev_state", "code_quilombo", "geometry"]])


jobs = [
    ("estados",          estados,          ["name_state", "abbrev_state"], 0.002),
    ("municipios",       municipios,       ["name_muni", "abbrev_state", "code_muni"], 0.004),
    ("terras_indigenas", terras_indigenas, ["name_indigenous_land", "abbrev_state", "code_indigenous_land"], 0.002),
    ("quilombolas",      quilombolas,      ["name_quilombo", "abbrev_state", "code_quilombo"], 0.002),
]

for name, load, columns, tol in jobs:
    print(f"baixando {name}...", flush=True)
    write(name, load(), columns, tol)

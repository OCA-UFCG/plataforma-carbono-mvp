# Downloads territorial cuts (IBGE/FUNAI/INCRA via geobr), clips them to the
# Caatinga biome, simplifies and writes GeoJSON into public/data/vector. Usage: python scripts/build-recortes.py
import os, json
import geopandas as gpd
import geobr

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "vector")
BIOMA = os.path.join(OUT, "limite_caatinga.geojson")
os.makedirs(OUT, exist_ok=True)

bioma = gpd.read_file(BIOMA).to_crs(4326)
bioma_geom = bioma.union_all() if hasattr(bioma, "union_all") else bioma.unary_union

def pick_label(gdf, candidates):
    for c in candidates:
        if c in gdf.columns:
            return c
    # fallback: first non-geometry object column
    for c in gdf.columns:
        if c != "geometry" and gdf[c].dtype == object:
            return c
    return None

def process(name, gdf, label_candidates, tol, extras=()):
    gdf = gdf.to_crs(4326)
    # polygonal clip to the biome
    clipped = gpd.clip(gdf, bioma_geom)
    clipped = clipped[~clipped.geometry.is_empty & clipped.geometry.notna()]
    label = pick_label(clipped, label_candidates)
    keep = [label] if label else []
    # Columns that identify a feature beyond its label. The label alone is not
    # unique -- 34 municipality names repeat inside the Caatinga clip -- so the
    # state disambiguates homonyms in the search, and the official code is a
    # stable feature id. Dropping them here is what made scripts/enrich-uf.py
    # necessary; keep them and a regeneration no longer loses the distinction.
    keep += [c for c in extras if c in clipped.columns and c != label]
    clipped = clipped[keep + ["geometry"]].copy()
    clipped["geometry"] = clipped.geometry.simplify(tol, preserve_topology=True)
    path = os.path.join(OUT, name + ".geojson")
    clipped.to_file(path, driver="GeoJSON")
    # reduces coordinate precision by rewriting it compactly
    d = json.load(open(path, encoding="utf-8"))
    def rnd(x): return [rnd(v) for v in x] if isinstance(x, list) else round(x, 5)
    for f in d["features"]:
        f["geometry"]["coordinates"] = rnd(f["geometry"]["coordinates"])
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    kb = os.path.getsize(path) // 1024
    print(f"OK {name}: n={len(clipped)} label={label} cols={keep} {kb}KB")
    return label

# The trailing tuple lists extra columns to preserve when the source has them.
jobs = [
    ("estados",          lambda: geobr.read_state(year=2020),            ["abbrev_state", "name_state"], 0.002, ()),
    ("terras_indigenas", lambda: geobr.read_indigenous_land(),           ["terrai_nom", "name", "terrai_nome"], 0.002, ("abbrev_state",)),
    ("quilombolas",      lambda: geobr.read_quilombola_land(year=2021),  ["nome", "name"], 0.002, ("abbrev_state",)),
    ("municipios",       lambda: geobr.read_municipality(year=2022),     ["name_muni", "NM_MUN"], 0.004, ("abbrev_state", "code_muni")),
]

labels = {}
for name, loader, cands, tol, extras in jobs:
    try:
        print(f"baixando {name}...", flush=True)
        gdf = loader()
        labels[name] = process(name, gdf, cands, tol, extras)
    except Exception as e:
        print(f"FALHA {name}: {str(e)[:160]}")

print("\nlabels:", labels)

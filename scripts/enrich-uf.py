# Writes the state abbreviation into the territorial cut GeoJSONs of
# public/data/vector, so that homonymous features can be told apart: inside the
# Caatinga clip 34 municipality names repeat (Bom Jesus three times), and 213
# settlement names do. Usage: python scripts/enrich-uf.py [--dry-run]
#
# The state is not in the files because scripts/build-recortes.py keeps only the
# label column. Rather than regenerating the vectors -- which would shift the
# ordinal suffixes the report uses as feature ids, and which anyway does not
# produce `assentamentos` -- this derives the state from the geometry already on
# disk: each feature votes with its own vertices against estados.geojson.
#
# For municipalities the vote is only a tie-breaker. The official IBGE list is
# the authority: a name it records in a single state takes that state outright,
# and a name it does not record at all aborts the run. A wrong state is worse
# than no state.
#
# Needs no service account and no geo library, only the standard library and
# network access to servicedados.ibge.gov.br.

import gzip
import json
import os
import sys
import unicodedata
import urllib.request
from collections import defaultdict

VECTOR_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "vector")
STATES_LAYER = "estados"
STATE_FIELD = "abbrev_state"
IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"

# Layers to enrich: the file, its label property as declared by
# config/mapa/layers.json, and whether the IBGE list arbitrates the answer.
TARGETS = [
    ("municipios", "name_muni", True),
    ("terras_indigenas", "name_indigenous_land", False),
    ("quilombolas", "name_quilombo", False),
    ("assentamentos", "nome_proje", False),
]

# Interior points sampled per feature, shared out across its parts by area.
# Enough resolution that a real border straddle separates from simplification
# noise, small enough that the whole run stays in seconds.
SAMPLE_CAP = 200

# Share of the vote a second state needs before a feature is called a straddler
# ("AL/SE"). Below it the votes are read as noise from the simplified border.
MIN_SHARE = 0.2

# Municipalities geobr and IBGE spell differently. Both spellings are official
# somewhere -- IBGE itself used "Acu" until 1948 and "Gracho Cardoso" appears in
# state law -- so this is a naming divergence, not an error in either source.
# Anything outside this table that IBGE does not recognise aborts the run.
IBGE_ALIASES = {
    "acu": "assu",                        # RN
    "gracho cardoso": "graccho cardoso",  # SE
}

# How far an outline fallback point is pulled towards the centre of its ring,
# to get it off the boundary it sits on.
INSET = 0.002


class Region:
    """A named area that can be asked whether it contains a point.

    Ray casting with the even-odd rule, which handles holes and multi-part
    geometries for free: every ring of every part goes into one edge set, and a
    point inside a hole simply collects an even number of crossings.

    The edges are bucketed into horizontal bands so a test only scans the
    handful of edges that can cross the ray, instead of all ~1.7k edges of a
    state boundary. Without it enriching the four layers takes minutes.
    """

    def __init__(self, name, geometry, bands=256):
        self.name = name
        edges = []
        for rings in iter_parts(geometry):
            for ring in rings:
                for i in range(len(ring) - 1):
                    x1, y1 = ring[i][0], ring[i][1]
                    x2, y2 = ring[i + 1][0], ring[i + 1][1]
                    if y1 != y2:  # a horizontal edge never crosses a horizontal ray
                        edges.append((x1, y1, x2, y2))
        if not edges:
            raise ValueError(f"region {name} has no usable edges")

        xs = [x for e in edges for x in (e[0], e[2])]
        ys = [y for e in edges for y in (e[1], e[3])]
        self.minx, self.maxx = min(xs), max(xs)
        self.miny, self.maxy = min(ys), max(ys)

        self._bands = max(1, min(bands, len(edges) // 4 or 1))
        self._span = (self.maxy - self.miny) or 1.0
        self._index = [[] for _ in range(self._bands)]
        for edge in edges:
            lo = self._band_of(min(edge[1], edge[3]))
            hi = self._band_of(max(edge[1], edge[3]))
            for b in range(lo, hi + 1):
                self._index[b].append(edge)

    def _band_of(self, y):
        b = int((y - self.miny) / self._span * self._bands)
        return max(0, min(self._bands - 1, b))

    def contains(self, x, y):
        if not (self.minx <= x <= self.maxx and self.miny <= y <= self.maxy):
            return False
        crossings = 0
        for x1, y1, x2, y2 in self._index[self._band_of(y)]:
            if (y1 > y) != (y2 > y):
                if x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                    crossings += 1
        return crossings % 2 == 1


def iter_parts(geometry):
    """Yield each part of a polygonal geometry as its list of rings."""
    kind = geometry.get("type")
    if kind == "Polygon":
        yield geometry["coordinates"]
    elif kind == "MultiPolygon":
        for part in geometry["coordinates"]:
            yield part
    elif kind == "GeometryCollection":
        for inner in geometry.get("geometries", []):
            yield from iter_parts(inner)


def _bbox(rings):
    xs = [p[0] for p in rings[0]]
    ys = [p[1] for p in rings[0]]
    return min(xs), min(ys), max(xs), max(ys)


def _grid_points(rings, cells):
    """Centres of a regular grid over one polygon part that fall inside it."""
    try:
        part = Region("part", {"type": "Polygon", "coordinates": rings})
    except ValueError:
        return []
    minx, miny, maxx, maxy = _bbox(rings)
    if maxx <= minx or maxy <= miny:
        return []
    side = max(2, round(cells ** 0.5))
    return [
        (x, y)
        for i in range(side)
        for j in range(side)
        for x in [minx + (i + 0.5) * (maxx - minx) / side]
        for y in [miny + (j + 0.5) * (maxy - miny) / side]
        if part.contains(x, y)
    ]


def _outline_points(parts, cap):
    """Fallback for a part with no area: its vertices, pulled slightly inward."""
    per_part = max(4, cap // len(parts))
    points = []
    for rings in parts:
        ring = rings[0]
        vertices = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
        if not vertices:
            continue
        cx = sum(v[0] for v in vertices) / len(vertices)
        cy = sum(v[1] for v in vertices) / len(vertices)
        step = max(1, len(vertices) // per_part)
        for v in vertices[::step][:per_part]:
            points.append((v[0] + (cx - v[0]) * INSET, v[1] + (cy - v[1]) * INSET))
    return points


def sample_points(geometry, cap=SAMPLE_CAP):
    """Interior points of a feature, which vote for the state that holds it.

    A grid over each part, so the tally measures area. The obvious alternative,
    the feature's own vertices, is what an earlier pass did and it was wrong:
    along a state border those vertices ARE the state outline, where a ray cast
    is a coin flip, and on a small settlement a handful of them outvoted the
    whole interior. Cells are shared out by bounding-box area so a speck of a
    second part cannot decide the state.

    Parts with no area at all -- slivers left by clipping -- keep the old
    outline sampling, since a grid finds nothing inside them.
    """
    parts = [rings for rings in iter_parts(geometry) if rings and rings[0]]
    if not parts:
        return []

    areas = []
    for rings in parts:
        minx, miny, maxx, maxy = _bbox(rings)
        areas.append(max(0.0, (maxx - minx) * (maxy - miny)))
    total = sum(areas)
    if total <= 0:
        return _outline_points(parts, cap)

    points = []
    for rings, area in zip(parts, areas):
        got = _grid_points(rings, cap * area / total) if area > 0 else []
        points.extend(got or _outline_points([rings], max(4, cap // len(parts))))
    return points


def count_votes(geometry, regions):
    """Tally, per state, how many of the feature's sampled points fall in it."""
    votes = defaultdict(int)
    for x, y in sample_points(geometry):
        for region in regions:
            if region.contains(x, y):
                votes[region.name] += 1
                break
    return dict(votes)


def pick_state(votes, allowed=None, min_share=MIN_SHARE):
    """The state a feature belongs to, or None when the vote decides nothing.

    With `allowed` the answer is always a single state out of that set, because
    a feature constrained by an official record (a municipality) belongs to
    exactly one. Without it a genuine border-straddler comes back as "AL/SE".
    """
    if allowed is not None:
        votes = {uf: n for uf, n in votes.items() if uf in allowed}
        if not votes:
            return None
        return min(votes, key=lambda uf: (-votes[uf], uf))

    if not votes:
        return None
    total = sum(votes.values())
    keep = [uf for uf, n in votes.items() if n / total >= min_share]
    keep.sort(key=lambda uf: (-votes[uf], uf))
    return "/".join(keep) or None


def normalize_name(value):
    """Fold a place name for comparison: case, accents and punctuation only.

    Deliberately conservative about letters -- Santa Terezinha (PE) and Santa
    Teresinha (PB) are different places, and folding z to s would merge them.
    """
    folded = unicodedata.normalize("NFD", value.lower())
    folded = "".join(c for c in folded if unicodedata.category(c) != "Mn")
    return " ".join("".join(c if c.isalnum() else " " for c in folded).split())


def resolve_municipality(name, votes, by_name):
    """The state of one municipality, IBGE arbitrating. Returns (uf, note).

    `note` carries a disagreement worth printing; it is not an error. Raises
    LookupError when the answer would have to be invented.
    """
    key = normalize_name(name)
    candidates = by_name.get(key) or by_name.get(IBGE_ALIASES.get(key, ""))
    if not candidates:
        raise LookupError(f'IBGE does not record a municipality named "{name}"')

    voted = pick_state(votes, allowed=candidates)
    if len(candidates) == 1:
        official = next(iter(candidates))
        if voted is None:
            return official, f'"{name}": no sampled point fell in {official} (votes: {votes or "none"})'
        return official, None

    if voted is None:
        raise LookupError(
            f'"{name}" is recorded in {sorted(candidates)} but its geometry '
            f"falls in {sorted(votes) or 'no state'}"
        )
    return voted, None


def uf_of_ibge_item(item):
    """The state of one entry of the IBGE municipality list.

    Municipalities created after the microregion division was retired carry a
    null `microrregiao` and only the newer immediate-region nesting.
    """
    for path in (
        ("microrregiao", "mesorregiao", "UF", "sigla"),
        ("regiao-imediata", "regiao-intermediaria", "UF", "sigla"),
    ):
        node = item
        for key in path:
            node = (node or {}).get(key)
        if node:
            return node
    raise LookupError(f'IBGE entry "{item.get("nome")}" names no state')


def load_ibge_states_by_name(url=IBGE_URL):
    """Normalized municipality name -> the set of states IBGE records it in."""
    request = urllib.request.Request(url, headers={"Accept-Encoding": "gzip"})
    with urllib.request.urlopen(request, timeout=120) as response:
        raw = response.read()
    if raw[:2] == b"\x1f\x8b":  # the API gzips regardless of what we ask for
        raw = gzip.decompress(raw)
    payload = json.loads(raw)
    by_name = defaultdict(set)
    for item in payload:
        by_name[normalize_name(item["nome"])].add(uf_of_ibge_item(item))
    return dict(by_name)


def read_geojson(name):
    with open(os.path.join(VECTOR_DIR, name + ".geojson"), encoding="utf-8") as f:
        return json.load(f)


def write_geojson(name, data):
    path = os.path.join(VECTOR_DIR, name + ".geojson")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path) // 1024


def main(argv):
    dry_run = "--dry-run" in argv

    states = read_geojson(STATES_LAYER)
    regions = [
        Region(f["properties"][STATE_FIELD], f["geometry"]) for f in states["features"]
    ]
    print(f"{len(regions)} states: {', '.join(sorted(r.name for r in regions))}\n")

    by_name = None
    problems = []

    for layer, label_field, official in TARGETS:
        data = read_geojson(layer)
        if official and by_name is None:
            print("fetching the IBGE municipality list...", flush=True)
            by_name = load_ibge_states_by_name()
            print(f"  {len(by_name)} distinct municipality names\n")

        notes, straddlers, missing = [], 0, 0
        for feature in data["features"]:
            properties = feature.setdefault("properties", {})
            votes = count_votes(feature["geometry"], regions)
            name = properties.get(label_field) or ""

            if official:
                try:
                    uf, note = resolve_municipality(name, votes, by_name)
                except LookupError as error:
                    problems.append(f"{layer}: {error}")
                    continue
                if note:
                    notes.append(note)
            else:
                uf = pick_state(votes)
                if uf is None:
                    missing += 1
                    problems.append(f'{layer}: no state contains "{name}"')
                    continue
                if "/" in uf:
                    straddlers += 1
                    notes.append(f'"{name}" straddles {uf} (votes: {votes})')

            properties[STATE_FIELD] = uf

        covered = sum(1 for f in data["features"] if STATE_FIELD in f["properties"])
        size = "dry-run" if dry_run else f"{write_geojson(layer, data)}KB"
        print(f"{layer}: {covered}/{len(data['features'])} with {STATE_FIELD}  {size}")
        if straddlers:
            print(f"  {straddlers} straddling a border")
        if missing:
            print(f"  {missing} with no state")
        for note in notes[:20]:
            print(f"  note: {note}")
        if len(notes) > 20:
            print(f"  ... and {len(notes) - 20} more notes")
        print()

    if problems:
        print(f"ABORT: {len(problems)} feature(s) could not be resolved:", file=sys.stderr)
        for problem in problems[:40]:
            print(f"  {problem}", file=sys.stderr)
        if len(problems) > 40:
            print(f"  ... and {len(problems) - 40} more", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

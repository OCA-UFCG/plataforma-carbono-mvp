# Unit tests for scripts/enrich-uf.py. Run: python tests/scripts/test_enrich_uf.py
import importlib.util
import os
import unittest

_SPEC = importlib.util.spec_from_file_location(
    "enrich_uf",
    os.path.join(os.path.dirname(__file__), "..", "..", "scripts", "enrich-uf.py"),
)
enrich = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(enrich)


def square(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]


class TestRegionContains(unittest.TestCase):
    # A 10x10 square with a 2x2 hole in the middle.
    HOLED = {
        "type": "Polygon",
        "coordinates": [square(0, 0, 10, 10), square(4, 4, 6, 6)],
    }

    def test_point_inside_the_outer_ring_is_contained(self):
        region = enrich.Region("XX", self.HOLED)
        self.assertTrue(region.contains(2.0, 2.0))

    def test_point_outside_the_outer_ring_is_not_contained(self):
        region = enrich.Region("XX", self.HOLED)
        self.assertFalse(region.contains(11.0, 2.0))

    def test_point_inside_a_hole_is_not_contained(self):
        region = enrich.Region("XX", self.HOLED)
        self.assertFalse(region.contains(5.0, 5.0))

    def test_point_in_the_second_part_of_a_multipolygon_is_contained(self):
        region = enrich.Region(
            "XX",
            {
                "type": "MultiPolygon",
                "coordinates": [[square(0, 0, 1, 1)], [square(50, 50, 60, 60)]],
            },
        )
        self.assertTrue(region.contains(55.0, 55.0))
        self.assertFalse(region.contains(25.0, 25.0))

    def test_the_band_index_agrees_with_a_plain_ray_cast_across_a_jagged_edge(self):
        # A comb: many edges crowded into a narrow y range, which is exactly
        # what the banded edge index is meant to skip over cheaply.
        ring = [[0.0, 0.0]]
        for i in range(40):
            ring += [[i * 0.25, 5.0 + (i % 2)], [(i + 1) * 0.25, 5.0 + (i % 2)]]
        ring += [[10.0, 0.0], [0.0, 0.0]]
        region = enrich.Region("XX", {"type": "Polygon", "coordinates": [ring]})
        self.assertTrue(region.contains(5.0, 1.0))
        self.assertFalse(region.contains(5.0, 9.0))


class TestSamplePoints(unittest.TestCase):
    HOLED = {
        "type": "Polygon",
        "coordinates": [square(0, 0, 10, 10), square(4, 4, 6, 6)],
    }

    def test_samples_the_interior_not_only_the_outline(self):
        # The vote has to measure area. Outline points on a border feature all
        # sit on the shared state line, where a ray cast is a coin flip, so a
        # sliver of simplification noise can outvote the whole interior.
        pts = enrich.sample_points(
            {"type": "Polygon", "coordinates": [square(0, 0, 10, 10)]}, cap=100
        )
        deep = [(x, y) for x, y in pts if 4 < x < 6 and 4 < y < 6]
        self.assertTrue(deep, "no sample reached the middle of the square")

    def test_never_samples_inside_a_hole(self):
        pts = enrich.sample_points(self.HOLED, cap=200)
        self.assertTrue(pts)
        for x, y in pts:
            self.assertFalse(4 < x < 6 and 4 < y < 6, f"({x}, {y}) is in the hole")

    def test_caps_the_number_of_sampled_points(self):
        ring = [[i * 0.01, 0.0] for i in range(500)] + [[0.0, 0.0]]
        pts = enrich.sample_points({"type": "Polygon", "coordinates": [ring]}, cap=20)
        self.assertLessEqual(len(pts), 20)
        self.assertGreater(len(pts), 0, "a zero-area sliver still has to vote")

    def test_samples_every_part_of_a_multipolygon(self):
        geom = {
            "type": "MultiPolygon",
            "coordinates": [[square(0, 0, 1, 1)], [square(50, 50, 51, 51)]],
        }
        pts = enrich.sample_points(geom, cap=100)
        self.assertTrue(any(x < 10 for x, _ in pts))
        self.assertTrue(any(x > 40 for x, _ in pts))

    def test_weights_a_part_by_its_size(self):
        # One part 100x larger in area than the other must dominate the tally,
        # or a speck of a second part could decide the state.
        geom = {
            "type": "MultiPolygon",
            "coordinates": [[square(0, 0, 10, 10)], [square(50, 50, 51, 51)]],
        }
        pts = enrich.sample_points(geom, cap=400)
        big = sum(1 for x, _ in pts if x < 20)
        small = len(pts) - big
        self.assertGreater(big, small * 4)

    def test_every_sample_lands_strictly_inside(self):
        pts = enrich.sample_points(
            {"type": "Polygon", "coordinates": [square(0, 0, 10, 10)]}, cap=100
        )
        for x, y in pts:
            self.assertTrue(0 < x < 10, f"x={x} on the boundary")
            self.assertTrue(0 < y < 10, f"y={y} on the boundary")


class TestPickState(unittest.TestCase):
    def test_returns_the_majority_state(self):
        self.assertEqual(enrich.pick_state({"PI": 180, "RN": 3}), "PI")

    def test_reports_both_states_when_a_feature_really_straddles_a_border(self):
        self.assertEqual(enrich.pick_state({"AL": 60, "SE": 40}), "AL/SE")

    def test_ignores_a_trickle_of_votes_from_boundary_noise(self):
        self.assertEqual(enrich.pick_state({"BA": 100, "PE": 5, "PI": 2}), "BA")

    def test_votes_break_the_tie_among_allowed_states_only(self):
        # A homonym: IBGE narrows it to three, the geometry picks one of them.
        votes = {"RN": 120, "PI": 4}
        self.assertEqual(enrich.pick_state(votes, allowed={"PI", "PB", "RN"}), "RN")

    def test_never_straddles_when_an_allowed_set_is_given(self):
        # Municipalities belong to exactly one state by definition.
        votes = {"AL": 60, "SE": 40}
        self.assertEqual(enrich.pick_state(votes, allowed={"AL", "SE"}), "AL")

    def test_returns_none_when_no_allowed_state_got_a_vote(self):
        self.assertIsNone(enrich.pick_state({"BA": 10}, allowed={"PE"}))

    def test_returns_none_without_votes(self):
        self.assertIsNone(enrich.pick_state({}))


class TestResolveMunicipality(unittest.TestCase):
    # Normalized name -> the states IBGE records it in.
    IBGE = {
        enrich.normalize_name("Campina Grande"): {"PB"},
        enrich.normalize_name("Bom Jesus"): {"PI", "RN", "PB"},
    }

    def test_a_unique_name_takes_the_state_from_ibge(self):
        uf, note = enrich.resolve_municipality("Campina Grande", {"PB": 90}, self.IBGE)
        self.assertEqual(uf, "PB")
        self.assertIsNone(note)

    def test_a_unique_name_still_takes_ibge_when_the_geometry_disagrees(self):
        # The official record outranks a vote skewed by a simplified border.
        uf, note = enrich.resolve_municipality("Campina Grande", {"RN": 90}, self.IBGE)
        self.assertEqual(uf, "PB")
        self.assertIsNotNone(note)

    def test_a_homonym_is_decided_by_the_geometry(self):
        uf, note = enrich.resolve_municipality(
            "Bom Jesus", {"PI": 150, "PB": 2}, self.IBGE
        )
        self.assertEqual(uf, "PI")
        self.assertIsNone(note)

    def test_follows_an_alias_when_the_official_spelling_differs(self):
        # geobr ships "Acu"; IBGE records the same place as "Assu".
        ibge = dict(self.IBGE, **{enrich.normalize_name("Assu"): {"RN"}})
        uf, _ = enrich.resolve_municipality("Açu", {"RN": 90}, ibge)
        self.assertEqual(uf, "RN")

    def test_a_name_ibge_does_not_know_is_an_error(self):
        with self.assertRaises(LookupError):
            enrich.resolve_municipality("Atlantida", {"PB": 10}, self.IBGE)

    def test_a_homonym_whose_geometry_names_no_candidate_is_an_error(self):
        with self.assertRaises(LookupError):
            enrich.resolve_municipality("Bom Jesus", {"BA": 10}, self.IBGE)


class TestUfOfIbgeItem(unittest.TestCase):
    def test_reads_the_state_through_the_microregion(self):
        item = {
            "nome": "Campina Grande",
            "microrregiao": {"mesorregiao": {"UF": {"sigla": "PB"}}},
        }
        self.assertEqual(enrich.uf_of_ibge_item(item), "PB")

    def test_falls_back_to_the_immediate_region(self):
        # A municipality created after the microregion division was retired
        # carries a null `microrregiao` and only the newer nesting.
        item = {
            "nome": "Boa Esperanca do Norte",
            "microrregiao": None,
            "regiao-imediata": {"regiao-intermediaria": {"UF": {"sigla": "MT"}}},
        }
        self.assertEqual(enrich.uf_of_ibge_item(item), "MT")

    def test_rejects_an_item_with_neither_nesting(self):
        with self.assertRaises(LookupError):
            enrich.uf_of_ibge_item({"nome": "Atlantida", "microrregiao": None})


class TestStateNamesByUf(unittest.TestCase):
    PAYLOAD = [
        {"id": 26, "sigla": "PE", "nome": "Pernambuco"},
        {"id": 31, "sigla": "MG", "nome": "Minas Gerais"},
    ]

    def test_maps_each_abbreviation_to_its_written_out_name(self):
        self.assertEqual(
            enrich.state_names_by_uf(self.PAYLOAD),
            {"PE": "Pernambuco", "MG": "Minas Gerais"},
        )

    def test_rejects_an_entry_missing_either_half(self):
        with self.assertRaises(LookupError):
            enrich.state_names_by_uf([{"id": 26, "sigla": "PE"}])


class TestNormalizeName(unittest.TestCase):
    def test_ignores_case_and_accents(self):
        self.assertEqual(
            enrich.normalize_name("Olho d'Água"), enrich.normalize_name("OLHO D'AGUA")
        )

    def test_ignores_punctuation_and_extra_spaces(self):
        self.assertEqual(
            enrich.normalize_name("Santa Cruz do Capibaribe"),
            enrich.normalize_name("  Santa-Cruz  do Capibaribe "),
        )

    def test_keeps_names_that_only_differ_by_a_letter_apart(self):
        # Santa Terezinha (PE) and Santa Teresinha (PB) are different places.
        self.assertNotEqual(
            enrich.normalize_name("Santa Terezinha"),
            enrich.normalize_name("Santa Teresinha"),
        )


if __name__ == "__main__":
    unittest.main()

import pytest

from app.compute.schraner import compute_pattern
from app.compute.validation import derive_H
from app.models import PatternRequest


def base_request(holes: int, crosses: int) -> PatternRequest:
    return PatternRequest(
        holes=holes,
        wheelType="rear",
        crosses=crosses,
        symmetry="symmetrical",
        invertHeads=False,
        startRimHole=1,
        valveReference="right_of_valve",
        startHubHoleDS=1,
        startHubHoleNDS=1,
    )


@pytest.mark.parametrize("holes", [20, 24, 28, 32, 36])
@pytest.mark.parametrize("crosses", [0, 3])
def test_rows_count_matches_holes(holes: int, crosses: int) -> None:
    h = derive_H(holes)
    max_cross = (h - 2) // 2
    if crosses > max_cross:
        pytest.skip("crosses exceeds max for hole count")
    req = base_request(holes, crosses)
    resp = compute_pattern(req)
    assert len(resp.rows) == holes


def test_invariants_for_32h() -> None:
    req = base_request(32, 3)
    resp = compute_pattern(req)
    h = derive_H(32)

    ds_rows = [row for row in resp.rows if row.side == "DS"]
    nds_rows = [row for row in resp.rows if row.side == "NDS"]

    assert len(ds_rows) == h
    assert len(nds_rows) == h

    ds_hub_holes = {row.hubHole for row in ds_rows}
    nds_hub_holes = {row.hubHole for row in nds_rows}
    assert ds_hub_holes == set(range(1, h + 1))
    assert nds_hub_holes == set(range(1, h + 1))

    ds_rim = {row.rimHole for row in ds_rows}
    nds_rim = {row.rimHole for row in nds_rows}
    assert len(ds_rim) == h
    assert len(nds_rim) == h - 1


def test_second_reference_hole_index_32h() -> None:
    req = base_request(32, 3)
    resp = compute_pattern(req)
    ref_rows = [
        row
        for row in resp.rows
        if row.side == "DS" and "Second reference" in row.notes
    ]
    assert len(ref_rows) == 1
    assert ref_rows[0].hubHole == 8


def test_rim_wraparound_k_16() -> None:
    req = base_request(32, 3)
    resp = compute_pattern(req)

    ds_k16 = [row for row in resp.rows if row.side == "DS" and row.k == 16]
    nds_k16 = [row for row in resp.rows if row.side == "NDS" and row.k == 16]

    assert ds_k16
    assert nds_k16
    assert {row.rimHole for row in ds_k16} == {31}
    assert {row.rimHole for row in nds_k16} == {32}


def test_valve_reference_pairing_32h() -> None:
    req = base_request(32, 3)
    resp = compute_pattern(req)

    ds_ref = [
        row
        for row in resp.rows
        if row.side == "DS" and "Reference at valve" in row.notes
    ]
    ds_second = [
        row
        for row in resp.rows
        if row.side == "DS" and "Second reference" in row.notes
    ]
    nds_ref = [
        row
        for row in resp.rows
        if row.side == "NDS" and "NDS start reference" in row.notes
    ]
    nds_second = [
        row
        for row in resp.rows
        if row.side == "NDS" and "Second reference" in row.notes
    ]

    assert len(resp.rows) == 32
    assert len(ds_ref) == 1
    assert len(ds_second) == 1
    assert len(nds_ref) == 1
    assert len(nds_second) == 1

    assert ds_ref[0].rimHole == 32
    assert ds_second[0].rimHole == 1
    assert nds_ref[0].rimHole == 1
    assert nds_second[0].rimHole == 32

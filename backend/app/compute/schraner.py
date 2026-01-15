from __future__ import annotations

from dataclasses import dataclass

from app.compute.validation import derive_H, validate_crosses
from app.models import PatternRequest, PatternResponse, PatternRow


@dataclass(frozen=True)
class _Context:
    req: PatternRequest
    n: int
    h: int
    effective_start_rim_hole: int


def _effective_start_rim_hole(req: PatternRequest) -> int:
    n = req.holes
    if req.valveReference == "right_of_valve":
        return ((req.startRimHole - 2) % n) + 1
    return req.startRimHole


def _rim_hole_for_k(ctx: _Context, side: str, k: int) -> int:
    if side == "DS":
        offset = 2 * (k - 1)
    else:
        offset = 1 + 2 * (k - 1)
    return ((ctx.effective_start_rim_hole - 1) + offset) % ctx.n + 1


def _physical_hub_hole(hub_hole_index: int, start_hub_hole: int, h: int) -> int:
    return ((hub_hole_index - 1) + (start_hub_hole - 1)) % h + 1


def _heads_for_set(req: PatternRequest, odd_even_set: str) -> str:
    odd_heads = "OUT"
    even_heads = "IN"
    if req.invertHeads:
        odd_heads, even_heads = even_heads, odd_heads
    return odd_heads if odd_even_set == "Odd" else even_heads


def _crosses_described(crosses: int) -> str:
    if crosses == 0:
        return "0x radial"
    return f"{crosses}x (over {crosses - 1}, under 1)"


def _odd_even_set(hub_hole_index: int) -> str:
    return "Odd" if hub_hole_index % 2 == 1 else "Even"


def _k_for_hub_hole(hub_hole_index: int, crosses: int, side: str, h: int) -> int:
    if hub_hole_index % 2 == 1:
        return hub_hole_index
    if side == "DS":
        return ((hub_hole_index - 1 - 2 * crosses) % h) + 1
    return ((hub_hole_index - 1 + 2 * crosses) % h) + 1


def compute_pattern(req: PatternRequest) -> PatternResponse:
    n = req.holes
    if n < 20 or n % 2 != 0:
        raise ValueError("holes must be even and >= 20")

    validate_crosses(n, req.crosses)

    h = derive_H(n)

    effective_start = _effective_start_rim_hole(req)
    ctx = _Context(req=req, n=n, h=h, effective_start_rim_hole=effective_start)

    crosses_desc = _crosses_described(req.crosses)
    asym_note = None
    if req.symmetry == "asymmetrical":
        asym_note = "Asymmetrical build selected (heads unchanged in v1)"

    def make_row(
        side: str,
        hub_hole_index: int,
        step: str,
        notes: str,
        order: int,
    ) -> PatternRow:
        odd_even = _odd_even_set(hub_hole_index)
        k = _k_for_hub_hole(hub_hole_index, req.crosses, side, h)
        rim_hole = _rim_hole_for_k(ctx, side, k)
        if side == "DS":
            physical = _physical_hub_hole(hub_hole_index, req.startHubHoleDS, h)
        else:
            physical = _physical_hub_hole(hub_hole_index, req.startHubHoleNDS, h)
        heads = _heads_for_set(req, odd_even)
        if asym_note:
            notes = f"{notes}. {asym_note}"
        spoke = f"{side}-{physical:02d}"
        return PatternRow(
            spoke=spoke,
            order=order,
            step=step,
            side=side,
            oddEvenSet=odd_even,
            k=k,
            hubHole=physical,
            heads=heads,
            rimHole=rim_hole,
            crossesDescribed=crosses_desc,
            notes=notes,
        )

    rows: list[PatternRow] = []
    order_counter = 1

    def add_rows(side: str, hub_indices: list[int], step: str, notes: str) -> None:
        nonlocal order_counter
        for idx in hub_indices:
            rows.append(make_row(side, idx, step, notes, order_counter))
            order_counter += 1

    # DS side
    rows.append(
        make_row(
            "DS",
            1,
            "R1",
            "Reference at valve (valve-left)",
            order_counter,
        )
    )
    order_counter += 1

    if req.crosses == 0:
        second_ref_idx = 2
    else:
        second_ref_idx = 2 * req.crosses + 2
    second_ref_idx = ((second_ref_idx - 1) % h) + 1
    rows.append(
        make_row(
            "DS",
            second_ref_idx,
            "R1",
            "Second reference at valve (valve-right)",
            order_counter,
        )
    )
    order_counter += 1

    odd_indices = list(range(1, h + 1, 2))
    even_indices = list(range(2, h + 1, 2))

    remaining_odd = [idx for idx in odd_indices if idx != 1]
    remaining_even = [idx for idx in even_indices if idx != second_ref_idx]

    add_rows("DS", remaining_odd, "R2", "Odd set fill")
    add_rows("DS", remaining_even, "R3", "Even set weave")

    # NDS side
    rows.append(
        make_row(
            "NDS",
            1,
            "L1",
            "NDS start reference (valve-right)",
            order_counter,
        )
    )
    order_counter += 1
    nds_second_ref_idx = second_ref_idx
    rows.append(
        make_row(
            "NDS",
            nds_second_ref_idx,
            "L1",
            "Second reference (valve-left)",
            order_counter,
        )
    )
    order_counter += 1
    nds_remaining_odd = [idx for idx in odd_indices if idx != 1]
    add_rows("NDS", nds_remaining_odd, "L3", "Odd set fill")
    remaining_nds_even = [idx for idx in even_indices if idx != nds_second_ref_idx]
    add_rows("NDS", remaining_nds_even, "L4", "Even set weave")

    rim_holes = [row.rimHole for row in rows]
    counts = {hole: rim_holes.count(hole) for hole in set(rim_holes)}
    missing = [hole for hole in range(1, n + 1) if hole not in counts]
    duplicates = {hole: count for hole, count in counts.items() if count > 1}
    if req.holes == 32:
        print("rimHole list:", rim_holes)
        print("distinct count:", len(counts))
        print("missing:", missing)
        print("duplicates:", duplicates)
        assert not missing and not duplicates

    derived = {
        "H": h,
        "spokesPerSide": h,
        "spokesPerSet": h // 2,
    }

    return PatternResponse(params=req, derived=derived, rows=rows)

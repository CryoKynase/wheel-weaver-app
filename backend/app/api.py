from fastapi import APIRouter

from app.compute.schraner import compute_pattern
from app.models import PatternRequest, PatternResponse

router = APIRouter(prefix="/api")


@router.post("/pattern/compute", response_model=PatternResponse)
def compute_pattern_endpoint(req: PatternRequest) -> PatternResponse:
    return compute_pattern(req)


@router.get("/readme")
def readme() -> dict:
    markdown = """# Wheel Lacing Pattern Guide

## Sides: DS vs NDS
- DS (drive side) is the drivetrain side on rear wheels.
- NDS (non-drive side) is the opposite flange.
- Front wheels: the rotor side is always NDS.

## Rim numbering
- Valve is at 12 o'clock.
- Hole #1 is the first hole clockwise from the valve.
- Rim holes are numbered clockwise 1..N.
- Wrap-around applies: hole N is adjacent to hole 1 at the valve.

## Hub numbering
- Each flange has H holes where H = N/2.
- Hub holes are numbered 1..H clockwise as you look directly at that flange.

## Parameters
- crosses: number of spoke crossings.
- symmetry: symmetrical vs asymmetrical build intent.
- invertHeads: swap default head-in/head-out assignments.
- valveReference: choose the hole just right or left of the valve as the
  first reference when interpreting startRimHole.
- startRimHole: first rim hole clockwise from the valve (1..N).
- startHubHoleDS/NDS: hub hole to treat as index 1 on each flange (1..H).

## Table columns
- spoke: identifier for the spoke on a side (DS-01..DS-H, NDS-01..NDS-H).
- order: install order in the Schraner sequence.
- step: Schraner step label (R1, R2, R3, L1, L3, L4).
- side: DS or NDS.
- oddEvenSet: odd or even hub-hole set.
- k: rim-slot index within the flange subset (1..H).
- hubHole: physical hub hole after startHubHole offset.
- heads: IN or OUT for head orientation.
- rimHole: physical rim hole number (1..N).
- crossesDescribed: human-readable crossing description.
- notes: extra guidance or special-case notes.

## Example (32H, 3x)
```text
holes: 32
crosses: 3
symmetry: symmetrical
startRimHole: 1
startHubHoleDS: 1
startHubHoleNDS: 1
```
"""
    return {"markdown": markdown}

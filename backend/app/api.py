from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.compute.schraner import compute_pattern
from app.db import get_session
from app.models import PatternRequest, PatternResponse
from app.presets import (
    Preset,
    PresetCreate,
    PresetDetail,
    PresetSummary,
    PresetUpdate,
    preset_to_detail,
)

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


@router.get("/presets", response_model=list[PresetSummary])
def list_presets(session: Session = Depends(get_session)) -> list[PresetSummary]:
    presets = session.exec(select(Preset).order_by(Preset.updatedAt.desc())).all()
    return [
        PresetSummary(
            id=preset.id,
            name=preset.name,
            holes=preset.holes,
            wheelType=preset.wheelType,
            crosses=preset.crosses,
            symmetry=preset.symmetry,
            updatedAt=preset.updatedAt,
        )
        for preset in presets
    ]


@router.post("/presets", response_model=PresetDetail)
def create_preset(
    payload: PresetCreate, session: Session = Depends(get_session)
) -> PresetDetail:
    params = payload.params
    preset = Preset(
        name=payload.name,
        holes=params.holes,
        wheelType=params.wheelType,
        crosses=params.crosses,
        symmetry=params.symmetry,
        invertHeads=params.invertHeads,
        startRimHole=params.startRimHole,
        valveReference=params.valveReference,
        startHubHoleDS=params.startHubHoleDS,
        startHubHoleNDS=params.startHubHoleNDS,
    )
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset_to_detail(preset)


@router.get("/presets/{preset_id}", response_model=PresetDetail)
def get_preset(
    preset_id: str, session: Session = Depends(get_session)
) -> PresetDetail:
    preset = session.get(Preset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return preset_to_detail(preset)


@router.put("/presets/{preset_id}", response_model=PresetDetail)
def update_preset(
    preset_id: str,
    payload: PresetUpdate,
    session: Session = Depends(get_session),
) -> PresetDetail:
    preset = session.get(Preset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    if payload.name is not None:
        preset.name = payload.name
    if payload.params is not None:
        params = payload.params
        preset.holes = params.holes
        preset.wheelType = params.wheelType
        preset.crosses = params.crosses
        preset.symmetry = params.symmetry
        preset.invertHeads = params.invertHeads
        preset.startRimHole = params.startRimHole
        preset.valveReference = params.valveReference
        preset.startHubHoleDS = params.startHubHoleDS
        preset.startHubHoleNDS = params.startHubHoleNDS
    preset.updatedAt = datetime.utcnow()
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset_to_detail(preset)


@router.delete("/presets/{preset_id}")
def delete_preset(
    preset_id: str, session: Session = Depends(get_session)
) -> dict:
    preset = session.get(Preset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    session.delete(preset)
    session.commit()
    return {"ok": True}

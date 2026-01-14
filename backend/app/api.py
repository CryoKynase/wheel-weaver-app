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
    markdown =     markdown = """# Wheel Weaver Guide
**Schraner Workshop Method — written for the bench (not for textbooks)**

This app generates a **step-by-step lacing table** (plus an optional diagram) for common wheel patterns using the Schraner workshop sequence:

**R1 → R2 → R3 → L1 → L3 → L4**

If you follow the **Order** column from top to bottom, you’ll always place the next spoke into the correct **hub hole**, the correct **rim hole**, with the correct **head orientation**.

---

## Quick start (do this at the bench)

1. Pick your **Holes** from the top bar (each hole count has its own page).
2. Choose **Wheel type** and **Crosses** (e.g. 32H rear 3x).
3. Turn on **Next step mode** (highly recommended).
4. Start at **R1** and place the **two reference spokes at the valve**.
5. Click **Next step** → **R2** and place the spokes listed (odd set fill).
6. Click **Next step** → **R3** and place the spokes listed (even set weave).
7. Flip the wheel and repeat for NDS (**L1 → L3 → L4**).
8. Use **Print view** (paper reference) or **Export CSV** (build record).

**Row-by-row rule:**  
**Hub hole → Heads IN/OUT → Rim hole → nipple on a few turns**

---

## The viewpoint (this prevents 90% of confusion)

Everything in the app is described as if you are:

> **Looking at the wheel from the DS (Drive Side) viewpoint.**

So when the Readme says **clockwise**, it means clockwise from the DS viewpoint.

---

## Glossary (plain English)

### DS / NDS
- **Rear wheel:**  
  - **DS** = cassette side  
  - **NDS** = opposite flange
- **Front wheel:**  
  - there’s no drivetrain, but this app still uses DS/NDS labels  
  - **rotor side is treated as NDS**

### Valve-right / Valve-left
- Valve is at **12 o’clock**
- **Valve-right** = **clockwise** from the valve (top-right)
- **Valve-left** = **counter-clockwise** from the valve (top-left)

### Heads OUT / Heads IN
- **OUT** = spoke head sits on the **outside** of the flange  
  (spoke goes outside → inside)
- **IN** = spoke head sits on the **inside** of the flange  
  (spoke goes inside → outside)

---

## Rim numbering (exactly how the app numbers holes)

- Valve is at **12 o’clock**
- Rim holes are numbered **clockwise** when viewed from the **DS**
- **Hole #1** is the first hole **clockwise** from the valve (top-right)
- **Hole #N** is immediately **counter-clockwise** from the valve (top-left)
- Wrap-around applies: **N sits next to 1** at the valve

**Practical tip (do this once and you’ll never doubt it):**
- Put a small piece of tape at the valve.
- The hole just to the right (clockwise) is **1**.
- The hole just to the left (counter-clockwise) is **N**.

---

## Hub numbering (exactly how the app numbers flange holes)

Let:
- **N** = total rim/hub holes (e.g. 32)
- **H** = holes per flange = **N/2** (e.g. 16)

Each flange is numbered:
- **1..H clockwise as you look directly at that flange**

If your hub has no reference mark, no problem:
- pick any physical hole as “1”
- use **Start hub hole (DS / NDS)** to rotate the pattern so the table matches what you did.

---

## What the Schraner steps mean (workshop interpretation)

Think of **Step** as a *block of work*.

### DS steps (do these first)
- **R1** — place the two **reference spokes at the valve** (this anchors everything)
- **R2** — DS **odd set fill**
- **R3** — DS **even set weave**

### NDS steps (after flipping)
- **L1** — NDS reference pair at the valve
- **L3 / L4** — remaining NDS fills/weaves in Schraner order

**You don’t need the theory to lace correctly.**  
Just follow the **Order** column row-by-row.

---

## Parameters (what each one changes)

### Holes
Now selected from the **top bar**. Each hole count is a dedicated Builder page.

### Wheel type
Rear vs Front.  
Front still uses DS/NDS labels (rotor side = NDS).

### Crosses
How many spokes each spoke crosses on its way to the rim:
- 0x radial, 1x, 2x, 3x, 4x …

The app blocks impossible combinations.

### Symmetry
- **Symmetrical**: most common (start here)
- **Asymmetrical**: patterns intentionally different by side (only use if you know why)

### Invert heads
Flips the heads IN/OUT convention.

### Start rim hole
Anchor for rim numbering (normally keep **1**).

### Valve reference
Whether the “start rim hole” is interpreted at the valve as:
- **Right of valve** (clockwise), or
- **Left of valve** (counter-clockwise)

### Start hub hole (DS / NDS)
Rotates the pattern around each flange to match your physical starting point.

### DS/NDS (table filter)
Filters the visible table rows by side. **All** shows both.

### Settings (table columns)
Use the **Settings** page in the top bar to hide or show columns like Order,
Step, Side, Odd/Even set, K, and Notes.

---

## Table columns (how to read each row)

- **Spoke**: identifier (DS-01..DS-H, NDS-01..NDS-H)
- **Order**: install order — follow top to bottom
- **Step**: which Schraner block you’re in (R1/R2/R3/L1/L3/L4)
- **Side**: DS or NDS
- **Odd/Even set**: which interleaved set you’re filling
- **k**: index within that set (“1st/2nd/3rd in this phase”)
- **Hub hole**: physical hub hole number (after Start hub hole offset)
- **Heads**: IN or OUT
- **Rim hole**: physical rim hole number (1..N)
- **Crosses described**: human-readable crossing description
- **Notes**: extra guidance (reference spokes, odd fill, weave, etc.)

**Bonus:** Hover a row to highlight that spoke in the diagram.

---

## Worked example (32H rear 3x)

A very common build:

- **Holes:** 32  
- **Crosses:** 3x  
- **Wheel:** Rear  
- **Symmetry:** Symmetrical  
- **Start rim hole:** 1  
- **Valve reference:** Right of valve  
- **Start hub hole DS/NDS:** 1

### What you should see in Step R1
The first two DS spokes should straddle the valve:

- One lands in **rim hole N (32)** = valve-left  
- One lands in **rim hole 1** = valve-right  

That’s correct and intentional: it anchors the rest of the lacing.

---

## Troubleshooting (most common issues)

- **“Spokes don’t want to drop into the rim holes naturally.”**  
  Usually you’re off by one at the valve, or started on a different hub hole.  
  Try adjusting **Start hub hole (DS)** by ±1 and see if it becomes “natural”.

- **“Valve area looks wrong / crowded.”**  
  Confirm the R1 pair straddles **N and 1** at the valve.

- **“Diagram looks busy.”**  
  Use **Next step mode** and/or select a single **Step** (R1 only, R2 only, etc).

- **“Front wheel: what is DS?”**  
  Treat the **rotor side as NDS** in this app.

---

## Safety + sanity notes

- During lacing, thread nipples only a few turns (no tension yet).
- Keep the DS viewpoint in mind when thinking “clockwise”.
- If anything feels forced, stop and re-check **R1** first.
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

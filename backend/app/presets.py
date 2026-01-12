from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel
from sqlmodel import Field, SQLModel

from app.models import PatternRequest


class Preset(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    holes: int
    wheelType: str
    crosses: int
    symmetry: str
    invertHeads: bool
    startRimHole: int
    valveReference: str
    startHubHoleDS: int
    startHubHoleNDS: int
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class PresetCreate(BaseModel):
    name: str
    params: PatternRequest


class PresetUpdate(BaseModel):
    name: Optional[str] = None
    params: Optional[PatternRequest] = None


class PresetSummary(BaseModel):
    id: str
    name: str
    holes: int
    wheelType: str
    crosses: int
    symmetry: str
    updatedAt: datetime


class PresetDetail(BaseModel):
    id: str
    name: str
    params: PatternRequest
    createdAt: datetime
    updatedAt: datetime


def preset_to_detail(preset: Preset) -> PresetDetail:
    params = PatternRequest(
        holes=preset.holes,
        wheelType=preset.wheelType,
        crosses=preset.crosses,
        symmetry=preset.symmetry,
        invertHeads=preset.invertHeads,
        startRimHole=preset.startRimHole,
        valveReference=preset.valveReference,
        startHubHoleDS=preset.startHubHoleDS,
        startHubHoleNDS=preset.startHubHoleNDS,
    )
    return PresetDetail(
        id=preset.id,
        name=preset.name,
        params=params,
        createdAt=preset.createdAt,
        updatedAt=preset.updatedAt,
    )

from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

from app.db import get_session
from app.main import app


def make_test_engine():
    return create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def test_presets_crud_flow() -> None:
    engine = make_test_engine()
    SQLModel.metadata.create_all(engine)

    def override_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    client = TestClient(app)

    payload = {
        "name": "My 32H 3x",
        "params": {
            "holes": 32,
            "wheelType": "rear",
            "crosses": 3,
            "symmetry": "symmetrical",
            "invertHeads": False,
            "startRimHole": 1,
            "valveReference": "right_of_valve",
            "startHubHoleDS": 1,
            "startHubHoleNDS": 1,
        },
    }

    create_resp = client.post("/api/presets", json=payload)
    assert create_resp.status_code == 200
    created = create_resp.json()
    preset_id = created["id"]
    assert created["name"] == payload["name"]
    assert created["params"]["holes"] == 32

    list_resp = client.get("/api/presets")
    assert list_resp.status_code == 200
    listing = list_resp.json()
    assert len(listing) == 1
    assert listing[0]["id"] == preset_id
    assert listing[0]["holes"] == 32

    get_resp = client.get(f"/api/presets/{preset_id}")
    assert get_resp.status_code == 200
    fetched = get_resp.json()
    assert fetched["id"] == preset_id
    assert fetched["params"]["crosses"] == 3
    assert isinstance(datetime.fromisoformat(fetched["createdAt"]), datetime)

    update_payload = {
        "name": "Updated 32H 2x",
        "params": {
            "holes": 32,
            "wheelType": "rear",
            "crosses": 2,
            "symmetry": "symmetrical",
            "invertHeads": False,
            "startRimHole": 1,
            "valveReference": "right_of_valve",
            "startHubHoleDS": 1,
            "startHubHoleNDS": 1,
        },
    }
    update_resp = client.put(f"/api/presets/{preset_id}", json=update_payload)
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["name"] == "Updated 32H 2x"
    assert updated["params"]["crosses"] == 2

    delete_resp = client.delete(f"/api/presets/{preset_id}")
    assert delete_resp.status_code == 200
    assert delete_resp.json() == {"ok": True}

    list_after = client.get("/api/presets")
    assert list_after.status_code == 200
    assert list_after.json() == []

    app.dependency_overrides.clear()

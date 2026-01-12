from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_pattern_compute() -> None:
    payload = {
        "holes": 32,
        "wheelType": "rear",
        "crosses": 3,
        "symmetry": "symmetrical",
        "invertHeads": False,
        "startRimHole": 1,
        "valveReference": "right_of_valve",
        "startHubHoleDS": 1,
        "startHubHoleNDS": 1,
    }
    response = client.post("/api/pattern/compute", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert len(body["rows"]) == payload["holes"]
    assert body["derived"]["H"] == payload["holes"] // 2


def test_readme() -> None:
    response = client.get("/api/readme")
    assert response.status_code == 200
    body = response.json()
    assert "markdown" in body
    assert "# Wheel Lacing Pattern Guide" in body["markdown"]

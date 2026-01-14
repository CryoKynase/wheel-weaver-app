import pytest

from app.compute.validation import common_crosses, derive_H, validate_crosses


def test_derive_h() -> None:
    assert derive_H(32) == 16


def test_validate_crosses_boundaries_32h() -> None:
    validate_crosses(32, 4)
    with pytest.raises(ValueError):
        validate_crosses(32, 5)


def test_validate_crosses_boundaries_36h() -> None:
    validate_crosses(36, 4)
    with pytest.raises(ValueError):
        validate_crosses(36, 5)


def test_validate_crosses_boundaries_24h() -> None:
    validate_crosses(24, 3)
    with pytest.raises(ValueError):
        validate_crosses(24, 4)


def test_validate_crosses_boundaries_20h() -> None:
    validate_crosses(20, 1)
    with pytest.raises(ValueError):
        validate_crosses(20, 2)


def test_validate_crosses_boundaries_28h() -> None:
    validate_crosses(28, 3)
    with pytest.raises(ValueError):
        validate_crosses(28, 4)


def test_common_crosses_32h() -> None:
    assert common_crosses(32) == [0, 1, 2, 3, 4]


def test_common_crosses_20h() -> None:
    assert common_crosses(20) == [0, 1, 2]

import math


def derive_H(holes: int) -> int:
    return holes // 2


def validate_crosses(holes: int, crosses: int) -> None:
    h = derive_H(holes)
    if holes == 20:
        max_crosses = 1
    elif holes in (24, 28):
        max_crosses = 3
    elif holes in (32, 36):
        max_crosses = 4
    else:
        max_crosses = math.floor((h - 2) / 2)
    if crosses < 0 or crosses > max_crosses:
        raise ValueError("crosses exceeds maximum for hole count")


def common_crosses(holes: int) -> list[int]:
    presets = {
        20: [0, 1, 2],
        24: [0, 1, 2, 3],
        28: [0, 1, 2, 3],
        32: [0, 1, 2, 3, 4],
        36: [0, 1, 2, 3, 4],
    }
    if holes in presets:
        return presets[holes]
    h = derive_H(holes)
    max_crosses = math.floor((h - 2) / 2)
    return list(range(0, max_crosses + 1))

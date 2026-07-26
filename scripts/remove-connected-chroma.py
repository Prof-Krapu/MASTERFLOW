#!/usr/bin/env python3
"""Supprime uniquement le chroma connecté aux bords du canvas."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def color_distance(left: tuple[int, int, int], right: tuple[int, int, int]) -> float:
    return sum((a - b) ** 2 for a, b in zip(left, right)) ** 0.5


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--threshold", default=95.0, type=float)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    corners = [
        pixels[0, 0][:3],
        pixels[width - 1, 0][:3],
        pixels[0, height - 1][:3],
        pixels[width - 1, height - 1][:3],
    ]
    key = tuple(round(sum(color[index] for color in corners) / 4) for index in range(3))

    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = (y * width) + x
        if visited[index]:
            return
        if color_distance(pixels[x, y][:3], key) > args.threshold:
            return
        visited[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output)
    transparent = sum(1 for value in image.getchannel("A").getdata() if value == 0)
    print(f"Wrote {args.output} | key={key} | transparent={transparent}/{width * height}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Normalise un visuel canon persona dans le gabarit vertical MasterFlow."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--width", default=829, type=int)
    parser.add_argument("--height", default=1500, type=int)
    parser.add_argument("--top", default=23, type=int)
    parser.add_argument("--bottom", default=24, type=int)
    parser.add_argument("--side", default=27, type=int)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit(f"Asset vide ou sans alpha exploitable : {args.input}")

    subject = image.crop(bbox)
    available_width = args.width - (2 * args.side)
    available_height = args.height - args.top - args.bottom
    scale = min(available_width / subject.width, available_height / subject.height)
    target_size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(target_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (args.width, args.height), (0, 0, 0, 0))
    x = round((args.width - target_size[0]) / 2)
    y = args.top + round((available_height - target_size[1]) / 2)
    canvas.alpha_composite(subject, (x, y))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.output)

    final_bbox = canvas.getchannel("A").getbbox()
    print(
        f"Wrote {args.output} | canvas={canvas.size} | bbox={final_bbox} "
        f"| subject={target_size} | offset=({x}, {y})"
    )


if __name__ == "__main__":
    main()

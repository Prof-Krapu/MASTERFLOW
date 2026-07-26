#!/usr/bin/env python3
"""Build a strict UI identity state pack from one canonical portrait.

This tool does not generate images. It normalizes generated expression variants,
keeps the canonical neutral portrait as the silhouette authority, and composites
only the expression area back onto that canonical base.

Default mode is intentionally strict: expression variants must already have a
real alpha channel. A fake checkerboard baked into an opaque image is rejected
before compositing because it will contaminate the final portrait.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, Iterable, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont


DEFAULT_ORDER = ("neutral", "fear", "disgust", "sad", "confident", "joy")
NOSE_ANCHOR_WINDOW = (230, 245, 410, 365)


def parse_state(value: str) -> Tuple[str, Path]:
    if "=" not in value:
        raise argparse.ArgumentTypeError("states must be passed as name=/path/to/image.png")
    name, raw_path = value.split("=", 1)
    name = name.strip()
    if not name:
        raise argparse.ArgumentTypeError("state name cannot be empty")
    path = Path(raw_path).expanduser()
    if not path.exists():
        raise argparse.ArgumentTypeError(f"state image does not exist: {path}")
    return name, path


def square_resize(path: Path, size: int) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    if width != height:
        side = min(width, height)
        left = (width - side) // 2
        top = (height - side) // 2
        image = image.crop((left, top, left + side, top + side))
    return image.resize((size, size), Image.Resampling.LANCZOS)


def assert_real_alpha(path: Path, image: Image.Image, allow_opaque: bool) -> None:
    alpha_min, alpha_max = image.getchannel("A").getextrema()
    if alpha_min < 255:
        return
    if allow_opaque:
        print(f"WARNING opaque variant allowed: {path}")
        return
    raise SystemExit(
        "Refusing opaque variant without real alpha: "
        f"{path}\n"
        "This usually means the checkerboard/background is baked into pixels. "
        "Clean/detour the source first, or rerun with --allow-opaque-variants "
        "only for a manually controlled source."
    )


def nose_anchor_center(image: Image.Image) -> Tuple[float, float, int] | None:
    """Return a stable nose-ish dark-pixel anchor in 640-based coordinates.

    This is not meant to understand the full face. It catches the main failure
    mode for ID packs: a variant generated from the same prompt but with the
    whole head shifted inside the frame.
    """

    rgba = image.convert("RGBA")
    width, height = rgba.size
    scale_x = width / 640
    scale_y = height / 640
    x0, y0, x1, y1 = (
        round(NOSE_ANCHOR_WINDOW[0] * scale_x),
        round(NOSE_ANCHOR_WINDOW[1] * scale_y),
        round(NOSE_ANCHOR_WINDOW[2] * scale_x),
        round(NOSE_ANCHOR_WINDOW[3] * scale_y),
    )
    points = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            red, green, blue, alpha = rgba.getpixel((x, y))
            if alpha > 0 and red < 55 and green < 55 and blue < 55:
                points.append((x, y))
    if not points:
        return None
    return (
        sum(x for x, _ in points) / len(points),
        sum(y for _, y in points) / len(points),
        len(points),
    )


def assert_anchor_alignment(
    name: str,
    source_path: Path,
    neutral: Image.Image,
    variant: Image.Image,
    max_drift: float,
    skip: bool,
) -> None:
    if skip:
        return
    neutral_anchor = nose_anchor_center(neutral)
    variant_anchor = nose_anchor_center(variant)
    if neutral_anchor is None or variant_anchor is None:
        raise SystemExit(
            f"Refusing {name}: could not detect stable nose anchor. "
            "Use a manually aligned alpha source or rerun with --skip-alignment-check."
        )
    dx = variant_anchor[0] - neutral_anchor[0]
    dy = variant_anchor[1] - neutral_anchor[1]
    if abs(dx) <= max_drift and abs(dy) <= max_drift:
        return
    raise SystemExit(
        f"Refusing {name}: face anchor drift is too high for an ID state pack.\n"
        f"Source: {source_path}\n"
        f"Drift: dx={dx:+.1f}px dy={dy:+.1f}px, allowed={max_drift:.1f}px.\n"
        "Regenerate or manually align this expression on the invariant neutral template."
    )


def expression_mask(size: int, label: str, mode: str) -> Image.Image:
    scale = size / 640

    def box(coords: Tuple[int, int, int, int]) -> Tuple[int, int, int, int]:
        return tuple(round(v * scale) for v in coords)  # type: ignore[return-value]

    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)

    if mode == "face":
        if label == "joy":
            draw.ellipse(box((78, 126, 562, 530)), fill=255)
            draw.rectangle(box((145, 168, 500, 465)), fill=255)
        elif label == "fear":
            draw.ellipse(box((92, 130, 548, 508)), fill=255)
            draw.rectangle(box((155, 165, 488, 452)), fill=255)
        else:
            draw.ellipse(box((96, 135, 544, 498)), fill=255)
            draw.rectangle(box((158, 168, 486, 438)), fill=255)
    else:
        # Default: expression-only. Keep the invariant portrait authority and
        # avoid pulling background/checkerboard pixels from generated variants.
        draw.rounded_rectangle(box((132, 185, 508, 320)), radius=round(44 * scale), fill=255)
        if label == "joy":
            draw.ellipse(box((152, 275, 488, 462)), fill=255)
            draw.rectangle(box((185, 260, 455, 430)), fill=255)
        elif label == "fear":
            draw.ellipse(box((206, 286, 434, 400)), fill=255)
            draw.rectangle(box((225, 270, 415, 375)), fill=255)
        elif label in {"sad", "disgust", "confident"}:
            draw.ellipse(box((185, 268, 455, 390)), fill=255)
            draw.rectangle(box((208, 254, 432, 360)), fill=255)
        else:
            draw.ellipse(box((205, 272, 435, 365)), fill=255)

    top_cut = Image.new("L", (size, size), 255)
    top_draw = ImageDraw.Draw(top_cut)
    top_draw.rectangle((0, 0, size, round(150 * scale)), fill=0)
    mask = Image.composite(mask, Image.new("L", (size, size), 0), top_cut)
    blur = 12 if mode == "face" else 6
    return mask.filter(ImageFilter.GaussianBlur(round(blur * scale)))


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def contact_sheet(paths: Dict[str, Path], order: Iterable[str], out_path: Path, size: int) -> None:
    labels = [label for label in order if label in paths]
    columns = 3
    tile_gap = round(size * 0.094)
    label_height = round(size * 0.188)
    width = columns * (size + tile_gap)
    rows = (len(labels) + columns - 1) // columns
    height = rows * (size + label_height)
    sheet = Image.new("RGBA", (width, height), (16, 16, 16, 255))
    draw = ImageDraw.Draw(sheet)
    font = load_font(round(size * 0.053), bold=True)
    small = load_font(round(size * 0.034), bold=False)

    for index, label in enumerate(labels):
        x = (index % columns) * (size + tile_gap) + round(tile_gap / 2)
        y = (index // columns) * (size + label_height) + round(tile_gap / 2)
        tile = Image.new("RGBA", (size, size), (28, 28, 28, 255))
        tile.alpha_composite(Image.open(paths[label]).convert("RGBA"))
        sheet.alpha_composite(tile, (x, y))
        draw.text((x + 16, y + size + 18), label, fill=(255, 255, 255, 255), font=font)
        draw.text(
            (x + 16, y + size + 60),
            "strict composite - actifs non remplaces",
            fill=(170, 170, 170, 255),
            font=small,
        )

    sheet.convert("RGB").save(out_path, quality=94)


def transition_gif(paths: Dict[str, Path], order: Iterable[str], out_path: Path, size: int) -> None:
    frames = []
    font = load_font(round(size * 0.047), bold=True)
    frame_size = round(size * 1.1875)
    offset = round(size * 0.094)

    for label in order:
        if label not in paths:
            continue
        frame = Image.new("RGBA", (frame_size, frame_size), (18, 18, 18, 255))
        image = Image.open(paths[label]).convert("RGBA")
        frame.alpha_composite(image, (offset, round(size * 0.0625)))
        draw = ImageDraw.Draw(frame)
        draw.text((offset, frame_size - round(size * 0.094)), label, fill=(255, 255, 255, 255), font=font)
        frames.append(frame.convert("P", palette=Image.Palette.ADAPTIVE))

    if frames:
        frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=700, loop=0, optimize=False)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="canonical neutral portrait")
    parser.add_argument("--out-dir", required=True, type=Path, help="output directory")
    parser.add_argument("--size", default=640, type=int, help="final square size")
    parser.add_argument(
        "--mask-mode",
        choices=("features", "face"),
        default="features",
        help="features keeps only eyes/mouth zones; face is the old wider mask",
    )
    parser.add_argument(
        "--allow-opaque-variants",
        action="store_true",
        help="allow generated variants without alpha; unsafe unless the source was manually cleaned",
    )
    parser.add_argument(
        "--max-anchor-drift",
        default=8.0,
        type=float,
        help="maximum allowed nose-anchor drift in final pixels",
    )
    parser.add_argument(
        "--skip-alignment-check",
        action="store_true",
        help="skip anchor drift validation; only for manually inspected sources",
    )
    parser.add_argument(
        "--state",
        action="append",
        type=parse_state,
        default=[],
        help="expression variant as name=/path/to/image.png; repeat for multiple states",
    )
    args = parser.parse_args()

    out_dir = args.out_dir.expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)

    neutral = square_resize(args.source.expanduser(), args.size)
    neutral_path = out_dir / f"neutral-preview-{args.size}.png"
    neutral.save(neutral_path)

    final_paths: Dict[str, Path] = {"neutral": neutral_path}
    for name, path in args.state:
        variant = square_resize(path, args.size)
        assert_real_alpha(path, variant, args.allow_opaque_variants)
        assert_anchor_alignment(
            name,
            path,
            neutral,
            variant,
            args.max_anchor_drift,
            args.skip_alignment_check,
        )
        preview_path = out_dir / f"{name}-preview-{args.size}.png"
        variant.save(preview_path)

        mask = expression_mask(args.size, name, args.mask_mode)
        composite = Image.composite(variant, neutral, mask)
        composite.putalpha(neutral.getchannel("A"))
        composite_path = out_dir / f"{name}-strict-composite-{args.size}.png"
        composite.save(composite_path)
        final_paths[name] = composite_path

    contact_sheet(final_paths, DEFAULT_ORDER, out_dir / "contact-sheet-strict-composite.jpg", args.size)
    transition_gif(final_paths, DEFAULT_ORDER, out_dir / "transition-check.gif", args.size)

    for label in DEFAULT_ORDER:
        if label not in final_paths:
            continue
        image = Image.open(final_paths[label]).convert("RGBA")
        print(f"{label:9} {image.size[0]}x{image.size[1]} {image.mode} bbox {image.getbbox()}")


if __name__ == "__main__":
    main()

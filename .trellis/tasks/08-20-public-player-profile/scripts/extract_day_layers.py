from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


TASK_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = Path(__file__).resolve().parents[4]
ASSETS_DIR = TASK_DIR / "assets"
SIZE = (2172, 272)


def load_rgb(path: Path) -> np.ndarray:
    image = Image.open(path).convert("RGB")
    if image.size != SIZE:
        raise ValueError(f"unexpected size for {path}: {image.size}")
    return np.asarray(image, dtype=np.uint8)


def load_mask(path: Path) -> np.ndarray:
    image = Image.open(path).convert("L")
    if image.size != SIZE:
        raise ValueError(f"unexpected size for {path}: {image.size}")
    return np.asarray(image, dtype=np.float32) / 255.0


def refine_mask(prior: np.ndarray, threshold: float, max_y: int | None = None) -> np.ndarray:
    alpha = np.where(prior >= threshold, 255, 0).astype(np.uint8)
    if max_y is not None:
        alpha[max_y:, :] = 0
    mask = Image.fromarray(alpha, mode="L")
    return np.asarray(mask.filter(ImageFilter.GaussianBlur(0.45)), dtype=np.uint8)


def expand_mask(alpha: np.ndarray, size: int) -> np.ndarray:
    return np.asarray(Image.fromarray(alpha, mode="L").filter(ImageFilter.MaxFilter(size)), dtype=np.uint8)


def save_layer(path: Path, rgb: np.ndarray, alpha: np.ndarray) -> None:
    rgba = np.dstack((rgb, alpha))
    Image.fromarray(rgba, mode="RGBA").save(path)


def alpha_composite(background: np.ndarray, *layers: tuple[np.ndarray, np.ndarray]) -> np.ndarray:
    output = background.astype(np.float32)
    for rgb, alpha in layers:
        weight = alpha.astype(np.float32)[..., None] / 255.0
        output = rgb.astype(np.float32) * weight + output * (1.0 - weight)
    return np.uint8(np.clip(output, 0, 255))


def main() -> None:
    source = load_rgb(REPO_DIR / "public/images/profile-banner/day-scene-8x1.png")
    sky = load_rgb(ASSETS_DIR / "day-sky-inpaint-8x1.png")
    city_prior = load_mask(ASSETS_DIR / "day-city-mask-coarse-8x1.png")
    foreground_prior = load_mask(ASSETS_DIR / "day-foreground-mask-coarse-8x1.png")

    city_alpha = expand_mask(refine_mask(city_prior, threshold=0.32, max_y=226), size=9)
    foreground_alpha = expand_mask(refine_mask(foreground_prior, threshold=0.24), size=13)

    if city_alpha.max() != 255 or foreground_alpha.max() != 255:
        raise RuntimeError("layer extraction produced no opaque pixels")

    city_path = ASSETS_DIR / "day-city-extracted-8x1.png"
    foreground_path = ASSETS_DIR / "day-foreground-extracted-8x1.png"
    sky_path = ASSETS_DIR / "day-sky-extracted-8x1.png"
    preview_path = ASSETS_DIR / "profile-banner-day-extracted-preview-8x1.png"
    city_mask_path = ASSETS_DIR / "day-city-mask-refined-8x1.png"
    foreground_mask_path = ASSETS_DIR / "day-foreground-mask-refined-8x1.png"

    removal_alpha = np.maximum(city_alpha, foreground_alpha).astype(np.float32)[..., None] / 255.0
    extracted_sky = np.uint8(
        np.clip(source.astype(np.float32) * (1.0 - removal_alpha) + sky.astype(np.float32) * removal_alpha, 0, 255)
    )

    Image.fromarray(extracted_sky, mode="RGB").save(sky_path)
    save_layer(city_path, source, city_alpha)
    save_layer(foreground_path, source, foreground_alpha)
    Image.fromarray(city_alpha, mode="L").save(city_mask_path)
    Image.fromarray(foreground_alpha, mode="L").save(foreground_mask_path)
    preview = alpha_composite(extracted_sky, (source, city_alpha), (source, foreground_alpha))
    mse = float(np.mean((preview.astype(np.float32) - source.astype(np.float32)) ** 2))
    psnr = float("inf") if mse == 0 else 10.0 * np.log10((255.0**2) / mse)
    if psnr < 40.0:
        raise RuntimeError(f"zero-offset reconstruction PSNR too low: {psnr:.2f} dB")
    Image.fromarray(preview, mode="RGB").save(preview_path)

    print(sky_path)
    print(city_path)
    print(foreground_path)
    print(preview_path)
    print(f"zero_offset_psnr={psnr:.2f}dB")


if __name__ == "__main__":
    main()

"""Tilt flat placeholder PNGs into 3D-stylized perspective frames with a soft shadow.

Usage: python3 -I tilt.py <in.png> <out.png> [direction]
direction: "right" (right edge recedes, default) or "left".
Pure Pillow, no numpy. Supersampled for clean edges.
"""
import sys
from PIL import Image, ImageFilter, ImageDraw


def solve(a, b):
    """Gaussian elimination for an 8x8 system."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        for r in range(c + 1, n):
            f = m[r][c] / m[c][c]
            for k in range(c, n + 1):
                m[r][k] -= f * m[c][k]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (m[i][n] - sum(m[i][j] * x[j] for j in range(i + 1, n))) / m[i][i]
    return x


def coeffs(dst, src):
    """PIL wants coefficients that map OUTPUT coords to INPUT coords."""
    a, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return solve(a, b)


def main():
    src_path, out_path = sys.argv[1], sys.argv[2]
    direction = sys.argv[3] if len(sys.argv) > 3 else "right"
    S = 2  # supersample
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    pad = 90 * S
    cw = w * S + 2 * pad
    ch = h * S + 2 * pad
    big = img.resize((w * S, h * S), Image.LANCZOS)

    # destination quad: far edge shorter, slightly lifted (tilted 3D look)
    rec = 0.17 * h * S      # how much the far edge shrinks (each end)
    lift = 0.05 * h * S     # far edge rises a little
    x0, x1 = pad, pad + w * S
    y0, y1 = pad, pad + h * S
    if direction == "right":
        dst = [(x0, y0), (x1, y0 + rec - lift), (x1, y1 - rec - lift), (x0, y1)]
    else:
        dst = [(x0, y0 + rec - lift), (x1, y0), (x1, y1), (x0, y1 - rec - lift)]
    src = [(0, 0), (w * S, 0), (w * S, h * S), (0, h * S)]
    co = coeffs(dst, src)
    frame = big.transform((cw, ch), Image.PERSPECTIVE, co, Image.BICUBIC)

    # soft shadow from the quad's silhouette
    mask = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(mask).polygon(dst, fill=255)
    shadow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    sh = mask.filter(ImageFilter.GaussianBlur(28 * S)).point(lambda v: int(v * 0.55))
    shadow.putalpha(sh)
    shadow = shadow.transform((cw, ch), Image.AFFINE, (1, 0, -14 * S, 0, 1, -30 * S))

    out = Image.alpha_composite(shadow, frame)
    out = out.resize((cw // S, ch // S), Image.LANCZOS)
    out.save(out_path)
    print(out_path, out.size)


main()

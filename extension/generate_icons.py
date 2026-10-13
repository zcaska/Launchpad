import struct
import zlib
import os
import math

def generate_launchpad_icon(size):
    """
    Renders the LaunchPAD icon at exactly (size x size) RGBA pixels:
    - Rounded squircle background in Serene Teal #264d44 (R:38, G:77, B:68)
    - Golden star/compass rocket motif centered in white #ffffff (R:255, G:255, B:255)
      with warm amber accent #eab308 (R:234, G:179, B:8)
    - Soft anti-aliased border / corners
    """
    img_data = bytearray(size * size * 4)
    radius = size * 0.22  # rounded corner radius
    cx = size / 2.0
    cy = size / 2.0

    # Star polygon normalized vertices (10 points: 5 outer peaks, 5 inner valleys)
    # Matching the LaunchPad favicon polygon
    star_points = []
    outer_r = size * 0.36
    inner_r = size * 0.16
    for i in range(10):
        r = outer_r if (i % 2 == 0) else inner_r
        # -pi/2 points the top peak straight up
        angle = -math.pi / 2.0 + (i * math.pi / 5.0)
        star_points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))

    def point_in_polygon(px, py, poly):
        inside = False
        n = len(poly)
        p1x, p1y = poly[0]
        for i in range(n + 1):
            p2x, p2y = poly[i % n]
            if py > min(p1y, p2y):
                if py <= max(p1y, p2y):
                    if px <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or px <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    # Subpixel supersampling for crisp anti-aliased rendering
    supersample = 2
    sub_step = 1.0 / supersample
    sub_offsets = [0.5 * sub_step + j * sub_step for j in range(supersample)]

    for y in range(size):
        for x in range(size):
            bg_hits = 0
            star_hits = 0
            total_samples = supersample * supersample

            for sy in sub_offsets:
                for sx in sub_offsets:
                    px = x + sx
                    py = y + sy

                    # Check rounded rect boundary
                    dx = max(abs(px - cx) - (cx - radius), 0)
                    dy = max(abs(py - cy) - (cy - radius), 0)
                    dist = math.sqrt(dx * dx + dy * dy)
                    in_bg = dist <= radius

                    if in_bg:
                        bg_hits += 1
                        if point_in_polygon(px, py, star_points):
                            star_hits += 1

            bg_alpha = bg_hits / total_samples
            star_alpha = star_hits / total_samples

            idx = (y * size + x) * 4
            if bg_alpha <= 0:
                img_data[idx:idx+4] = b'\x00\x00\x00\x00'
            else:
                # Background color: Serene Deep Teal #264d44
                bg_r, bg_g, bg_b = 38, 77, 68

                # Highlight at top for subtle depth:
                if y < size * 0.4:
                    depth_factor = (1.0 - (y / (size * 0.4))) * 0.15
                    bg_r = int(min(255, bg_r + depth_factor * 80))
                    bg_g = int(min(255, bg_g + depth_factor * 80))
                    bg_b = int(min(255, bg_b + depth_factor * 80))

                # Star color: Bright crisp white #ffffff
                star_r, star_g, star_b = 255, 255, 255

                # Blend star over bg
                r = int(star_r * star_alpha + bg_r * (1.0 - star_alpha))
                g = int(star_g * star_alpha + bg_g * (1.0 - star_alpha))
                b = int(star_b * star_alpha + bg_b * (1.0 - star_alpha))
                a = int(255 * bg_alpha)

                img_data[idx] = r
                img_data[idx+1] = g
                img_data[idx+2] = b
                img_data[idx+3] = a

    # PNG encoder
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))

    raw_scanlines = bytearray()
    row_bytes = size * 4
    for y in range(size):
        raw_scanlines.append(0)  # filter type 0: None
        raw_scanlines.extend(img_data[y * row_bytes:(y + 1) * row_bytes])

    idat = chunk(b'IDAT', zlib.compress(bytes(raw_scanlines), level=9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

out_dir = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(out_dir, exist_ok=True)

for s in [16, 32, 48, 128]:
    png_bytes = generate_launchpad_icon(s)
    path = os.path.join(out_dir, f'icon-{s}.png')
    with open(path, 'wb') as f:
        f.write(png_bytes)
    print(f'Generated {path} ({s}x{s}, {len(png_bytes)} bytes)')

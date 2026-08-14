import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = os.getcwd()
ASSET_DIR = os.path.join(ROOT, "assets")
FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"
REGULAR_FONT_PATH = r"C:\Windows\Fonts\msyh.ttc"


def get_font(size, bold=True):
    return ImageFont.truetype(FONT_PATH if bold else REGULAR_FONT_PATH, size)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def gradient_bg(size, top, bottom):
    width, height = size
    base = Image.new("RGB", (width, height), top)
    draw = ImageDraw.Draw(base)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(
            int(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3)
        )
        draw.line([(0, y), (width, y)], fill=color)
    return base


def add_noise(image, strength=12):
    image = image.convert("RGB")
    pixels = image.load()
    width, height = image.size
    step = max(1, int((width * height) / (strength * 100)))
    for offset in range(0, width * height, step):
        x = offset % width
        y = offset // width
        r, g, b = pixels[x, y]
        drift = random.randint(-18, 18)
        pixels[x, y] = (
            max(0, min(255, r + drift)),
            max(0, min(255, g + drift)),
            max(0, min(255, b + drift)),
        )
    return image


def save_cover(name, draw_fn):
    width, height = 640, 360
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    draw_fn(image, draw, width, height)
    image = add_noise(image, 8)
    path = os.path.join(ASSET_DIR, name)
    image.save(path, "PNG", optimize=True)
    print(path)


def draw_hero():
    hero = gradient_bg((1600, 900), (20, 25, 49), (54, 31, 87))
    draw = ImageDraw.Draw(hero)
    for _ in range(260):
        x = random.randint(0, 1599)
        y = random.randint(0, 899)
        radius = random.choice([1, 2, 3])
        color = random.choice([(110, 220, 255), (255, 184, 77), (235, 112, 255)])
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)

    for center_x, center_y, radius, color in [
        (1250, 170, 170, (58, 96, 166)),
        (1330, 660, 220, (41, 65, 132)),
        (260, 720, 230, (50, 83, 164)),
    ]:
        overlay = Image.new("RGBA", (1600, 900), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.ellipse(
            [
                center_x - radius,
                center_y - radius,
                center_x + radius,
                center_y + radius,
            ],
            fill=color + (190,),
        )
        hero = Image.alpha_composite(hero.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(hero)

    tiles = [
        (1030, 120, 120, 120, (57, 180, 255)),
        (1175, 300, 130, 130, (255, 133, 102)),
        (930, 520, 125, 125, (255, 197, 74)),
        (1080, 705, 145, 145, (90, 225, 205)),
    ]
    for x, y, tile_w, tile_h, color in tiles:
        rounded(draw, [x, y, x + tile_w, y + tile_h], 20, color)
        inner = tuple(max(0, min(255, channel + 20)) for channel in color)
        rounded(
            draw,
            [x + 14, y + 14, x + tile_w - 14, y + tile_h - 14],
            10,
            inner,
        )

    hero = hero.filter(ImageFilter.GaussianBlur(0.6))
    hero.save(os.path.join(ASSET_DIR, "hero.png"), "PNG", optimize=True)
    print("hero.png")


def cover_01(image, draw, width, height):
    background = gradient_bg((width, height), (17, 24, 58), (39, 56, 110))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    gems = [
        (40, 60, 34, (74, 222, 255)),
        (112, 190, 48, (255, 119, 178)),
        (212, 54, 40, (255, 213, 90)),
        (300, 130, 50, (85, 255, 217)),
        (430, 240, 42, (157, 132, 255)),
        (540, 80, 36, (255, 160, 96)),
    ]
    for x, y, radius, color in gems:
        for offset in range(4):
            delta = offset * 4
            draw.ellipse(
                [x - radius + delta, y - radius + delta, x + radius - delta, y + radius - delta],
                fill=color,
            )
        highlight = tuple(min(255, channel + 45) for channel in color)
        draw.ellipse(
            [x - radius // 2, y - radius // 2, x + radius // 2, y + radius // 2],
            fill=highlight,
        )


def cover_02(image, draw, width, height):
    background = gradient_bg((width, height), (17, 48, 55), (26, 105, 101))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 240, width, height], fill=(30, 125, 115))
    for x, block_w, block_h, color in [
        (0, 120, 110, (92, 225, 150)),
        (110, 90, 180, (78, 187, 120)),
        (205, 120, 250, (54, 150, 98)),
        (325, 100, 310, (235, 160, 70)),
        (420, 130, 350, (70, 190, 185)),
    ]:
        draw.rounded_rectangle([x, block_h - 40, x + block_w, block_h], radius=8, fill=color)
    draw.ellipse([500, 150, 545, 195], fill=(255, 244, 190))
    draw.rectangle([512, 195, 533, 225], fill=(255, 244, 190))


def cover_03(image, draw, width, height):
    background = gradient_bg((width, height), (56, 38, 78), (91, 58, 105))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    colors = [(255, 204, 102), (255, 141, 66), (255, 103, 92)]
    for row in range(3):
        for col in range(3):
            x = 95 + col * 155
            y = 40 + row * 105
            color = colors[(row + col) % 3]
            rounded(draw, [x, y, x + 120, y + 90], 16, color)
            number = str(2 ** (row * 3 + col + 1))
            size = 42 if len(number) == 1 else 34
            number_font = get_font(size)
            bbox = draw.textbbox((0, 0), number, font=number_font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            draw.text(
                (x + 60 - text_w / 2, y + 45 - text_h / 2 - 8),
                number,
                font=number_font,
                fill=(62, 38, 74),
            )


def cover_04(image, draw, width, height):
    background = gradient_bg((width, height), (23, 35, 59), (45, 70, 112))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    for x in range(0, width, 80):
        draw.line([(x, 0), (x, height)], fill=(80, 105, 140), width=2)
    for y in range(0, height, 80):
        draw.line([(0, y), (width, y)], fill=(80, 105, 140), width=2)
    for x, y, color in [
        (120, 130, (255, 190, 92)),
        (280, 110, (100, 220, 185)),
        (440, 190, (250, 120, 120)),
        (560, 70, (150, 180, 255)),
    ]:
        rounded(draw, [x, y, x + 60, y + 60], 10, color)
        draw.polygon(
            [(x + 30, y + 8), (x + 30, y + 42), (x + 8, y + 42)],
            fill=(25, 38, 64),
        )


def cover_05(image, draw, width, height):
    background = gradient_bg((width, height), (25, 51, 42), (39, 89, 62))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    for x in range(0, width, 40):
        draw.line([(x, 0), (x, height)], fill=(62, 105, 73), width=1)
    for y in range(0, height, 40):
        draw.line([(0, y), (width, y)], fill=(62, 105, 73), width=1)
    points = [
        (30, 250),
        (90, 130),
        (170, 150),
        (230, 220),
        (290, 70),
        (370, 90),
        (450, 170),
        (540, 230),
        (610, 190),
    ]
    draw.line(points, fill=(139, 255, 122), width=24, joint="curve")
    for point in points:
        draw.ellipse(
            [point[0] - 13, point[1] - 13, point[0] + 13, point[1] + 13],
            fill=(218, 255, 120),
        )


def cover_06(image, draw, width, height):
    background = gradient_bg((width, height), (70, 34, 58), (124, 60, 86))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    positions = [(95, 75), (285, 70), (475, 85), (120, 205), (320, 205), (520, 215)]
    for x, y in positions:
        rounded(
            draw,
            [x, y, x + 110, y + 130],
            16,
            (255, 205, 210),
            outline=(255, 245, 225),
            width=4,
        )
        draw.line([(x + 55, y + 20), (x + 55, y + 110)], fill=(220, 150, 160), width=4)


def cover_07(image, draw, width, height):
    background = gradient_bg((width, height), (28, 28, 60), (73, 51, 119))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    colors = [(255, 120, 120), (255, 180, 80), (105, 205, 255), (190, 150, 255)]
    for index, (x, y) in enumerate([(60, 120), (180, 80), (300, 135), (420, 70), (540, 120)]):
        color = colors[index % 4]
        rounded(draw, [x, y, x + 90, y + 125], 12, color)
        inner = tuple(min(255, channel + 30) for channel in color)
        rounded(draw, [x + 8, y + 8, x + 82, y + 117], 6, inner)


def cover_08(image, draw, width, height):
    background = gradient_bg((width, height), (41, 24, 70), (80, 44, 104))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    colors = [(255, 98, 132), (255, 188, 72), (85, 220, 255), (120, 255, 170)]
    for row in range(4):
        for col in range(7):
            x = 60 + col * 78
            y = 45 + row * 52
            color = colors[row % 4]
            rounded(draw, [x, y, x + 62, y + 34], 8, color)
    draw.rectangle([290, 280, 360, 310], fill=(255, 244, 190))
    draw.ellipse([300, 250, 340, 290], fill=(255, 244, 190))


def cover_09(image, draw, width, height):
    background = gradient_bg((width, height), (19, 54, 70), (41, 113, 112))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    colors = [(255, 205, 85), (255, 138, 82), (85, 235, 195), (130, 190, 255)]
    for index, (x, y) in enumerate([(55, 55), (190, 55), (325, 55), (460, 55)]):
        color = colors[index]
        for piece in range(3):
            offset = piece * 55
            draw.polygon(
                [
                    (x + offset, y),
                    (x + offset + 72, y),
                    (x + offset + 92, y + 20),
                    (x + offset + 72, y + 40),
                    (x + offset + 20, y + 40),
                    (x + offset, y + 20),
                ],
                fill=color,
            )


def cover_10(image, draw, width, height):
    background = gradient_bg((width, height), (48, 105, 150), (101, 177, 210))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    colors = [(255, 110, 170), (110, 235, 250), (255, 205, 80), (145, 255, 170)]
    for index in range(36):
        x = 45 + (index % 8) * 72
        y = 45 + (index // 8) * 82
        color = colors[index % 4]
        outline = tuple(min(255, channel + 35) for channel in color)
        draw.ellipse([x, y, x + 52, y + 52], fill=color, outline=outline, width=3)


def cover_11(image, draw, width, height):
    background = gradient_bg((width, height), (27, 60, 44), (60, 111, 66))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    fruits = [
        (60, 60, (255, 205, 92)),
        (180, 100, (250, 140, 80)),
        (300, 50, (255, 235, 120)),
        (420, 90, (255, 150, 150)),
        (540, 45, (150, 220, 140)),
    ]
    for index, (x, y, color) in enumerate(fruits):
        radius = 55 + index * 8
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)
        draw.polygon(
            [(x, y - radius + 15), (x - 12, y + 12), (x + 12, y + 12)],
            fill=(27, 60, 44),
        )


def cover_12(image, draw, width, height):
    background = gradient_bg((width, height), (21, 24, 59), (62, 47, 108))
    image.paste(background)
    draw = ImageDraw.Draw(image)
    for x in range(0, width, 80):
        draw.line([(x, 0), (x, height)], fill=(85, 80, 130), width=1)
    for y in range(0, height, 80):
        draw.line([(0, y), (width, y)], fill=(85, 80, 130), width=1)
    numbers = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
    ]
    for row in range(3):
        for col in range(9):
            x = 20 + col * 70 + 12
            y = 25 + row * 96 + 8
            value = numbers[row][col]
            if value:
                draw.text((x, y), str(value), font=get_font(52), fill=(255, 190, 255))


def main():
    os.makedirs(ASSET_DIR, exist_ok=True)
    draw_hero()
    cover_functions = [
        cover_01,
        cover_02,
        cover_03,
        cover_04,
        cover_05,
        cover_06,
        cover_07,
        cover_08,
        cover_09,
        cover_10,
        cover_11,
        cover_12,
    ]
    for index, function in enumerate(cover_functions, 1):
        save_cover(f"cover-{index:02d}.png", function)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

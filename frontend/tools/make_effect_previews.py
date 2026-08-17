import os

from PIL import Image, ImageDraw, ImageFont


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "effects-preview")
os.makedirs(OUT_DIR, exist_ok=True)

FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"
WIDTH, HEIGHT = 360, 360


def font(size):
    return ImageFont.truetype(FONT_PATH, size)


def make_image(name, label, draw_fn, color):
    image = Image.new("RGBA", (WIDTH, HEIGHT), (10, 12, 16, 255))
    draw = ImageDraw.Draw(image)
    draw_fn(draw, color)
    draw.text((18, 18), label, font=font(28), fill=(235, 238, 245, 255))
    path = os.path.join(OUT_DIR, f"{name}.png")
    image.save(path)
    return path


def slash(draw, color):
    draw.arc([40, 90, 330, 330], start=200, end=340, fill=color, width=16)
    draw.text((145, 150), "斩", font=font(78), fill=color)


def thrust(draw, color):
    draw.line([60, 180, 300, 180], fill=color, width=14)
    draw.polygon([(320, 180), (280, 156), (280, 204)], fill=color)
    draw.text((140, 136), "刺", font=font(78), fill=color)


def cavalry(draw, color):
    draw.ellipse([70, 70, 290, 290], outline=color, width=10)
    for i in range(8):
        angle = i * 45
        x = 180 + 95 * (1 if angle % 180 == 0 else 0)
        draw.text((150 + 30 * i, 180), "刀", font=font(26), fill=color)
    draw.text((140, 140), "斩", font=font(72), fill=color)


def arrow(draw, color):
    for y in range(100, 300, 50):
        draw.line([80, y, 300, y], fill=color, width=8)
        draw.polygon([(320, y), (285, y - 14), (285, y + 14)], fill=color)
    draw.text((135, 155), "箭", font=font(76), fill=color)


def hoe(draw, color):
    draw.line([150, 210, 260, 290], fill=color, width=16)
    draw.ellipse([260, 250, 330, 320], outline=color, width=12)
    draw.text((120, 100), "农", font=font(90), fill=color)


def arrow_rain(draw, color):
    for x in range(40, 340, 48):
        for y in range(60, 300, 44):
            draw.line([x, y + 30, x + 8, y], fill=color, width=5)
    draw.text((135, 140), "雨", font=font(76), fill=color)


def shockwave(draw, color):
    for radius in (80, 120, 160):
        draw.ellipse([180 - radius, 180 - radius, 180 + radius, 180 + radius], outline=color, width=10)
    draw.text((130, 140), "震", font=font(76), fill=color)


def charge(draw, color):
    draw.line([40, 220, 330, 220], fill=color, width=18)
    draw.text((40, 100), "冲", font=font(90), fill=color)
    for x in (130, 180, 230):
        draw.text((x, 120), "骑", font=font(34), fill=color)


def sweep(draw, color):
    draw.arc([20, 100, 340, 340], start=210, end=330, fill=color, width=22)
    draw.text((120, 150), "扫", font=font(80), fill=color)


def fragment_glow(draw, color):
    for radius in (70, 95, 120):
        draw.ellipse([180 - radius, 180 - radius, 180 + radius, 180 + radius], outline=color, width=8)
    draw.text((135, 140), "合", font=font(80), fill=color)


def heal(draw, color):
    draw.ellipse([100, 100, 260, 260], outline=color, width=12)
    draw.text((125, 135), "仁", font=font(80), fill=color)


def poisonshot(draw, color):
    for x in range(90, 320, 70):
        draw.line([x, 180, x + 40, 180], fill=color, width=10)
        draw.text((x - 8, 150), "毒", font=font(36), fill=color)


def heavy_stab(draw, color):
    for y in range(100, 260, 45):
        draw.line([180, y, 180, y + 60], fill=color, width=12)
    draw.text((135, 140), "枪", font=font(78), fill=color)


effects = [
    ("dao-sheng", "刀：斩击", slash, (239, 68, 68, 255)),
    ("qiang-ci", "枪：穿刺", thrust, (96, 165, 250, 255)),
    ("qi-xuan", "骑：圆形挥刀", cavalry, (248, 113, 113, 255)),
    ("gong-jian", "弓：箭矢", arrow, (34, 197, 94, 255)),
    ("nong-chu", "农：锄地", hoe, (163, 230, 53, 255)),
    ("zhaoyun-ci", "赵云：刺击", thrust, (56, 189, 248, 255)),
    ("huangzhong-yu", "黄忠：箭雨", arrow_rain, (251, 191, 36, 255)),
    ("guanyu-sao", "关羽：横扫", sweep, (239, 68, 68, 255)),
    ("zhangfei-zhen", "张飞：震波", shockwave, (168, 85, 247, 255)),
    ("liubei-ren", "刘备：仁德", heal, (245, 158, 11, 255)),
    ("huangzu-du", "黄祖：毒刺", poisonshot, (132, 204, 22, 255)),
    ("zhangbao-qiang", "张苞：重刺", heavy_stab, (34, 211, 238, 255)),
    ("guanping-sao", "关平：弧斩", sweep, (251, 113, 133, 255)),
    ("machao-chong", "马超：冲锋", charge, (96, 165, 250, 255)),
    ("fragment-he", "武将碎片：合成", fragment_glow, (147, 51, 234, 255)),
]

for name, label, draw_fn, color in effects:
    make_image(name, label, draw_fn, color)

rows = 3
cols = 5
sheet = Image.new("RGBA", (WIDTH * cols, HEIGHT * rows), (10, 12, 16, 255))
for index, (name, label, draw_fn, color) in enumerate(effects):
    path = os.path.join(OUT_DIR, f"{name}.png")
    image = Image.open(path)
    sheet.paste(image, ((index % cols) * WIDTH, (index // cols) * HEIGHT))
sheet.save(os.path.join(OUT_DIR, "effect-preview-all.png"))
print("done")

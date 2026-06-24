from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "outputs" / "logged-in-interface-overview-no-content.png"

W, H = 1600, 900
RED = "#E20015"
RED_DARK = "#B4000E"
BLUE = "#005691"
BG = "#F3F4F6"
WHITE = "#FFFFFF"
TEXT = "#1A1C1C"
MUTED = "#667085"
LINE = "#D7DADE"
SOFT = "#F7F8FA"
SOFT_BLUE = "#E8F2FB"
SOFT_RED = "#FFE9EA"
WARNING = "#D97706"
PLACEHOLDER = "#E5E7EB"
PLACEHOLDER_DARK = "#CBD0D6"


def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=0)
        except Exception:
            pass
    return ImageFont.load_default()


F9 = font(9)
F12 = font(12)
F14 = font(14)
F16 = font(16)
F18 = font(18)
F22 = font(22)
F28 = font(28)
F36 = font(36)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def line_placeholder(draw, x, y, w, h=10, fill=PLACEHOLDER_DARK, radius=5):
    rounded(draw, (x, y, x + w, y + h), radius, fill)


def card(draw, x, y, w, h, active=False):
    rounded(draw, (x, y, x + w, y + h), 8, WHITE, LINE)
    if active:
        draw.rectangle((x, y, x + 6, y + h), fill=RED)


def main():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Top brand stripe and header.
    draw.rectangle((0, 0, W, 8), fill=RED)
    draw.rectangle((0, 8, W, 74), fill=WHITE)
    draw.line((0, 74, W, 74), fill=LINE, width=1)

    # Simplified brand text mark with clear spacing.
    draw.text((42, 27), "BOSCH", fill=RED, font=F28)
    draw.line((154, 22, 154, 58), fill=LINE, width=1)
    draw.text((174, 22), "POWER TOOLS · HANGZHOU", fill=RED_DARK, font=F12)
    draw.text((174, 42), "设备管理前端界面", fill=TEXT, font=F16)

    # Search and utility area.
    rounded(draw, (800, 22, 1188, 58), 6, SOFT, LINE)
    line_placeholder(draw, 834, 35, 205, 9, "#B9C0C8")
    for cx in [1228, 1277, 1326]:
        rounded(draw, (cx, 25, cx + 30, 55), 15, WHITE, LINE)
        draw.ellipse((cx + 11, 36, cx + 19, 44), fill=MUTED)
    rounded(draw, (1385, 24, 1462, 54), 15, SOFT_RED)
    draw.text((1400, 32), "已登录", fill=RED_DARK, font=F12)
    line_placeholder(draw, 1485, 35, 62, 8, "#98A2B3")

    # Sidebar shell.
    rounded(draw, (26, 104, 276, 856), 8, WHITE, LINE)
    draw.text((58, 138), "BOSCH", fill=RED, font=F28)
    draw.text((58, 176), "设备管理系统", fill=MUTED, font=F14)
    draw.line((26, 220, 276, 220), fill=LINE)

    nav_y = 242
    nav_labels = [
        "数据提交",
        "生命周期",
        "趋势分析",
        "设备看板",
        "布局示意",
        "风险规则",
        "预测性维护",
        "账户权限",
        "审计日志",
    ]
    for i, label in enumerate(nav_labels):
        y = nav_y + i * 47
        if i == 0:
            draw.rectangle((26, y - 8, 31, y + 30), fill=BLUE)
            rounded(draw, (46, y - 10, 248, y + 34), 6, SOFT_BLUE)
            draw.text((82, y - 1), label, fill=BLUE, font=F16)
        else:
            draw.text((82, y - 1), label, fill="#475467", font=F16)
        draw.rectangle((58, y, 70, y + 12), fill="#667085")

    draw.line((26, 704, 276, 704), fill=LINE)
    draw.text((58, 742), "支持", fill="#475467", font=F16)

    # Main workspace.
    x0, x1 = 302, 1568
    y0 = 104
    rounded(draw, (x0, y0, x1, 232), 8, WHITE, LINE)
    draw.text((326, 128), "登录后界面概览", fill=TEXT, font=F28)
    rounded(draw, (1288, 144, 1408, 184), 5, WHITE, LINE)
    line_placeholder(draw, 1316, 158, 64, 8, "#98A2B3")
    rounded(draw, (1420, 144, 1532, 184), 5, BLUE)
    line_placeholder(draw, 1446, 158, 58, 8, WHITE)

    # Summary placeholder cards.
    card_w = 392
    for i, x in enumerate([302, 739, 1176]):
        card(draw, x, 252, card_w, 142, active=(i == 0))
        line_placeholder(draw, x + 28, 280, 98, 10, "#98A2B3")
        line_placeholder(draw, x + 28, 316, 76, 24, PLACEHOLDER_DARK, 10)
        line_placeholder(draw, x + 28, 358, 220, 10)
        draw.rectangle((x + 28, 376, x + card_w - 28, 382), fill=PLACEHOLDER)
        draw.rectangle((x + 28, 376, x + 230 + i * 25, 382), fill=BLUE if i == 0 else RED)

    # Main content panel with skeleton table/list.
    card(draw, 302, 420, 816, 436)
    line_placeholder(draw, 330, 452, 142, 13, TEXT)
    line_placeholder(draw, 330, 480, 255, 10, "#98A2B3")
    draw.line((330, 512, 1088, 512), fill=LINE)
    for i in range(5):
        y = 542 + i * 58
        line_placeholder(draw, 334, y, 30, 14, PLACEHOLDER_DARK)
        line_placeholder(draw, 392, y, 118, 12, "#98A2B3")
        line_placeholder(draw, 565, y, 178, 12, PLACEHOLDER)
        line_placeholder(draw, 803, y, 138, 12, PLACEHOLDER)
        line_placeholder(draw, 980, y, 74, 12, PLACEHOLDER_DARK)
        draw.line((330, y + 34, 1088, y + 34), fill="#ECEFF3")

    # Side panel placeholders.
    card(draw, 1146, 420, 422, 436)
    line_placeholder(draw, 1174, 452, 104, 13, TEXT)
    draw.line((1174, 492, 1538, 492), fill=LINE)
    for i in range(4):
        y = 522 + i * 76
        rounded(draw, (1174, y, 1538, y + 54), 6, SOFT, LINE)
        draw.rectangle((1174, y, 1180, y + 54), fill=RED if i < 2 else WARNING)
        line_placeholder(draw, 1202, y + 13, 120, 11, "#667085")
        line_placeholder(draw, 1202, y + 34, 230, 8, PLACEHOLDER)
        line_placeholder(draw, 1468, y + 18, 48, 10, PLACEHOLDER_DARK)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, quality=95)
    print(OUT)


if __name__ == "__main__":
    main()

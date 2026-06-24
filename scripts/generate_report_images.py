from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "outputs" / "ppt-images"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080
RED = "#E20015"
RED_DARK = "#A90011"
BLUE = "#005691"
CHARCOAL = "#1A1C1C"
MUTED = "#5E6673"
LINE = "#D6D9DE"
BG = "#F3F4F6"
WHITE = "#FFFFFF"
SOFT_RED = "#FFE9EA"
SOFT_BLUE = "#E8F2FB"
SOFT_GRAY = "#F8F8F8"
GREEN = "#15803D"
AMBER = "#D97706"

FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"


def font(size):
    return ImageFont.truetype(FONT_PATH, size)


def draw_text(draw, xy, text, size=28, fill=CHARCOAL, anchor=None, align="left", box_width=None, line_gap=8):
    f = font(size)
    x, y = xy
    if box_width:
        lines = []
        current = ""
        for ch in text:
            candidate = current + ch
            if draw.textbbox((0, 0), candidate, font=f)[2] <= box_width or not current:
                current = candidate
            else:
                lines.append(current)
                current = ch
        if current:
            lines.append(current)
        for line in lines:
            draw.text((x, y), line, font=f, fill=fill, anchor=anchor)
            y += size + line_gap
        return y
    draw.text((x, y), text, font=f, fill=fill, anchor=anchor, align=align)
    return y + size


def rounded(draw, box, radius=18, fill=WHITE, outline=LINE, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def rect(draw, box, fill, outline=None, width=1):
    draw.rectangle(box, fill=fill, outline=outline, width=width)


def header(draw, title, subtitle, page_label):
    rect(draw, (0, 0, W, 18), RED)
    draw_text(draw, (90, 58), page_label.upper(), 22, RED)
    draw_text(draw, (90, 102), title, 54, CHARCOAL)
    if subtitle:
        draw_text(draw, (92, 176), subtitle, 27, MUTED)
    draw_text(draw, (90, 1018), "Bosch Power Tools · 设计阶段初步汇报", 20, MUTED)


def arrow(draw, start, end, color=RED, width=5):
    draw.line([start, end], fill=color, width=width)
    ex, ey = end
    sx, sy = start
    if ex >= sx:
        pts = [(ex, ey), (ex - 18, ey - 11), (ex - 18, ey + 11)]
    else:
        pts = [(ex, ey), (ex + 18, ey - 11), (ex + 18, ey + 11)]
    draw.polygon(pts, fill=color)


def save(img, name):
    path = OUT / name
    img.save(path)
    return path


def stage_card(draw, x, y, w, h, num, title, body, accent):
    rounded(draw, (x, y, x + w, y + h), 22, WHITE, LINE, 2)
    rect(draw, (x, y, x + 10, y + h), accent)
    draw.ellipse((x + 34, y + 30, x + 96, y + 92), fill=accent)
    draw_text(draw, (x + 65, y + 46), num, 26, WHITE, anchor="ma")
    draw_text(draw, (x + 122, y + 34), title, 31, CHARCOAL)
    draw_text(draw, (x + 122, y + 86), body, 22, MUTED, box_width=w - 160, line_gap=6)


def image_learning_path():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    header(d, "从了解现场到形成初步设计", "用学习路径解释：不是直接画页面，而是先理解工厂、整理指标，再转成系统设计。", "Image 01")
    y = 300
    cards = [
        ("01", "了解工厂", "MXM / MXL&MXR / MXS / MXC / MXG，设备类型与生产区域", RED),
        ("02", "学习业务词", "S / Q / FPY / rework / scrap / POT / OEE", BLUE),
        ("03", "整理指标", "PowerBI 指标归类：OEE、MTTR、停机、员工绩效", AMBER),
        ("04", "抽象页面", "把指标转成筛选、总览、明细、班组对比、个人详情", GREEN),
    ]
    x0, gap, cw = 105, 36, 415
    for i, (num, title, body, color) in enumerate(cards):
        x = x0 + i * (cw + gap)
        stage_card(d, x, y, cw, 270, num, title, body, color)
        if i < len(cards) - 1:
            arrow(d, (x + cw + 8, y + 135), (x + cw + gap - 8, y + 135), RED, 4)
    rounded(d, (170, 700, 1750, 865), 24, WHITE, LINE, 2)
    draw_text(d, (220, 738), "汇报表达重点", 30, RED)
    draw_text(d, (220, 792), "目前是设计阶段进展：通过学习和整理，逐步形成界面结构和系统口径，不把当前原型当作最终系统结论。", 31, CHARCOAL, box_width=1460, line_gap=8)
    return save(img, "01_learning_path.png")


def image_metric_map():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    header(d, "PowerBI 指标整理图", "把现有指标先分组，后续页面设计再围绕这些组确定信息层级。", "Image 02")
    groups = [
        ("设备效率", ["OEE", "OEE loss", "T-loss", "O-loss", "C-loss", "Q-loss", "P-loss"], RED),
        ("维修可靠性", ["MTTR", "MTBF", "Reaction Time", "Repair Time"], BLUE),
        ("停机与维修", ["Downtime", "Downtime rate", "维修次数", "维修率", "维修单率"], AMBER),
        ("生产与排班", ["Output", "POT", "Andon waiting time"], GREEN),
        ("员工绩效", ["员工维修工时", "员工出勤小时", "员工接单数量", "员工维修效率"], RED_DARK),
    ]
    x_positions = [90, 460, 830, 1200, 1570]
    for x, (title, items, color) in zip(x_positions, groups):
        rounded(d, (x, 285, x + 280, 830), 24, WHITE, LINE, 2)
        rect(d, (x, 285, x + 280, 350), color)
        draw_text(d, (x + 140, 305), title, 28, WHITE, anchor="ma")
        y = 388
        for item in items:
            rounded(d, (x + 28, y, x + 252, y + 52), 12, SOFT_GRAY, LINE, 1)
            draw_text(d, (x + 44, y + 13), item, 22, CHARCOAL)
            y += 64
    draw_text(d, (90, 900), "整理价值：把分散指标变成可讨论的页面模块，为后续系统架构和员工绩效界面设计提供依据。", 30, CHARCOAL)
    return save(img, "02_powerbi_metric_map.png")


def image_design_translation():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    header(d, "从指标整理到页面设计", "核心工作是把“指标清单”转成“管理者可读的界面结构”。", "Image 03")
    left = (110, 315, 545, 790)
    mid = (742, 315, 1177, 790)
    right = (1374, 315, 1810, 790)
    panels = [
        (left, "输入资料", ["PowerBI 指标", "Excel 工时/接单/维修", "员工班组表"], RED),
        (mid, "整理与判断", ["指标分组", "单位与公式核对", "班组口径校正", "异常规则梳理"], BLUE),
        (right, "页面模块", ["筛选与总览", "数据质量", "月度明细", "班组对比", "员工详情"], GREEN),
    ]
    for box, title, items, color in panels:
        x1, y1, x2, y2 = box
        rounded(d, box, 26, WHITE, LINE, 2)
        draw_text(d, (x1 + 36, y1 + 32), title, 38, color)
        y = y1 + 115
        for item in items:
            d.ellipse((x1 + 40, y + 9, x1 + 56, y + 25), fill=color)
            draw_text(d, (x1 + 76, y), item, 29, CHARCOAL)
            y += 66
    arrow(d, (570, 552), (715, 552), RED, 6)
    arrow(d, (1202, 552), (1347, 552), RED, 6)
    rounded(d, (250, 870, 1670, 948), 18, SOFT_RED, RED, 2)
    draw_text(d, (960, 895), "设计阶段结论：先验证信息结构和业务口径，再进入真实数据接入和系统开发。", 29, RED_DARK, anchor="ma")
    return save(img, "03_metric_to_design.png")


def image_architecture():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    header(d, "初步系统架构设想", "当前是设计阶段架构，用来说明数据、口径、页面之间的关系。", "Image 04")
    layers = [
        ("数据来源层", ["PowerBI 指标", "员工绩效 Excel", "员工班组表", "后续设备/工单系统"], RED),
        ("数据整理与口径层", ["姓名与班组匹配", "时间单位核对", "维修效率公式", "异常数据规则"], BLUE),
        ("业务数据层", ["员工月度绩效", "班组对比", "设备指标", "数据质量记录"], AMBER),
        ("Web 展示层", ["总览", "数据质量", "月度明细", "Top 5", "班组对比", "个人详情"], GREEN),
    ]
    y = 280
    for idx, (title, items, color) in enumerate(layers):
        rounded(d, (190, y, 1730, y + 140), 22, WHITE, LINE, 2)
        rect(d, (190, y, 350, y + 140), color)
        draw_text(d, (270, y + 50), title, 28, WHITE, anchor="ma")
        item_w = 295 if idx != 3 else 230
        start_x = 395
        for i, item in enumerate(items):
            x = start_x + i * (item_w + 18)
            rounded(d, (x, y + 42, x + item_w, y + 98), 14, SOFT_GRAY, LINE, 1)
            draw_text(d, (x + item_w / 2, y + 56), item, 22, CHARCOAL, anchor="ma")
        if idx < len(layers) - 1:
            arrow(d, (960, y + 150), (960, y + 205), RED, 5)
        y += 205
    return save(img, "04_system_architecture.png")


def image_employee_ui_modules():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    header(d, "员工绩效界面初步设计图", "把员工绩效页面拆成可汇报的功能区域，方便说明当前设计进展。", "Image 05")
    # Browser frame
    rounded(d, (120, 260, 1800, 900), 24, WHITE, LINE, 3)
    rect(d, (120, 260, 1800, 330), CHARCOAL)
    draw_text(d, (160, 282), "员工绩效管理 · 原型界面结构", 24, WHITE)
    rect(d, (120, 330, 350, 900), "#F7F7F7", LINE)
    for i, nav in enumerate(["总览", "数据质量", "月度明细", "员工列表", "班组对比", "个人详情"]):
        y = 370 + i * 64
        fill = SOFT_RED if i == 0 else "#FFFFFF"
        rounded(d, (150, y, 320, y + 42), 10, fill, LINE, 1)
        draw_text(d, (174, y + 10), nav, 20, RED_DARK if i == 0 else CHARCOAL)
    # Main modules
    rounded(d, (390, 370, 1710, 448), 14, SOFT_BLUE, LINE, 1)
    draw_text(d, (420, 392), "筛选：年份 / 月份 / 班组 / 员工", 25, BLUE)
    card_y = 485
    for i, title in enumerate(["出勤小时", "接单数量", "维修工时", "平均维修效率"]):
        x = 390 + i * 330
        rounded(d, (x, card_y, x + 292, card_y + 105), 16, WHITE, LINE, 2)
        draw_text(d, (x + 24, card_y + 20), title, 22, MUTED)
        draw_text(d, (x + 24, card_y + 56), "核心指标", 28, CHARCOAL)
    rounded(d, (390, 635, 820, 815), 16, SOFT_RED, LINE, 2)
    draw_text(d, (420, 662), "数据质量", 28, RED_DARK)
    draw_text(d, (420, 715), "缺失 / 无法计算 / 异常口径", 23, CHARCOAL)
    rounded(d, (860, 635, 1288, 815), 16, WHITE, LINE, 2)
    draw_text(d, (890, 662), "班组对比", 28, BLUE)
    draw_text(d, (890, 715), "6 个班组 · 2 行 3 列", 23, CHARCOAL)
    rounded(d, (1328, 635, 1710, 815), 16, WHITE, LINE, 2)
    draw_text(d, (1358, 662), "员工详情", 28, GREEN)
    draw_text(d, (1358, 715), "趋势 / 排名 / 均值对比", 23, CHARCOAL)
    # Callouts
    draw_text(d, (390, 940), "汇报话术：当前页面重点验证“员工、班组、月份、异常口径”的信息组织方式。", 28, CHARCOAL)
    return save(img, "05_employee_ui_modules.png")


def main():
    paths = [
        image_learning_path(),
        image_metric_map(),
        image_design_translation(),
        image_architecture(),
        image_employee_ui_modules(),
    ]
    for path in paths:
        print(path)


if __name__ == "__main__":
    main()

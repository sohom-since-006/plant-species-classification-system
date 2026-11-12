import os
import math
from PIL import Image, ImageDraw, ImageFont

def generate_assets():
    public_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'web', 'public')
    os.makedirs(public_dir, exist_ok=True)

    # 1. Generate og-image.png (1200 x 630)
    w, h = 1200, 630
    img = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    # Draw dark botanical radial gradient spotlight
    for r in range(450, 0, -5):
        alpha = int(45 * (1 - r / 450))
        draw.ellipse([600 - r, 315 - r, 600 + r, 315 + r], fill=(16, 185, 129, alpha))
    for r in range(250, 0, -4):
        alpha = int(35 * (1 - r / 250))
        draw.ellipse([600 - r, 315 - r, 600 + r, 315 + r], fill=(45, 212, 191, alpha))

    # Draw border hairline
    draw.rectangle([20, 20, w - 21, h - 21], outline=(255, 255, 255, 30), width=1)

    # Draw badge background
    badge_x, badge_y, badge_w, badge_h = 600 - 65, 120, 130, 130
    for r in range(75, 0, -2):
        alpha = int(30 * (1 - r / 75))
        draw.ellipse([600 - r, 185 - r, 600 + r, 185 + r], fill=(110, 231, 168, alpha))
    draw.ellipse([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], outline=(110, 231, 168, 180), width=2)

    # Load system fonts if possible, or fallback
    try:
        font_serif = ImageFont.truetype("georgia.ttf", 52)
        font_p = ImageFont.truetype("georgia.ttf", 72)
        font_subtitle = ImageFont.truetype("arial.ttf", 20)
        font_tag = ImageFont.truetype("arial.ttf", 15)
    except:
        font_serif = ImageFont.load_default()
        font_p = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_tag = ImageFont.load_default()

    # Draw "P" emblem in badge
    draw.text((600, 182), "P", font=font_p, fill=(110, 231, 168, 255), anchor="mm")

    # Draw Tag
    tag_text = "OPEN SCIENCE & EDGE AI  •  ON-DEVICE VISION"
    draw.text((600, 305), tag_text, font=font_tag, fill=(110, 231, 168, 220), anchor="mm")

    # Draw Headline
    headline = "Plant Species Classification System"
    draw.text((600, 365), headline, font=font_serif, fill=(255, 255, 255, 255), anchor="mm")

    # Draw Subtitle
    sub = "PlantAI  •  Private On-Device Botanical Intelligence  •  112 Species  •  WASM / WebGPU"
    draw.text((600, 430), sub, font=font_subtitle, fill=(200, 210, 205, 210), anchor="mm")

    # Draw bottom glass pill
    pill_w, pill_h = 380, 46
    pill_x = 600 - pill_w // 2
    pill_y = 510
    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=23, fill=(255, 255, 255, 12), outline=(255, 255, 255, 40), width=1)
    draw.text((600, pill_y + 23), "100% Client-Side Privacy  •  Zero Cloud Uploads", font=font_tag, fill=(255, 255, 255, 220), anchor="mm")

    og_path = os.path.join(public_dir, 'og-image.png')
    img.save(og_path, 'PNG', optimize=True)
    print(f"Generated {og_path} ({os.path.getsize(og_path)} bytes)")

    # 2. Generate apple-touch-icon.png (180 x 180)
    touch_img = Image.new('RGBA', (180, 180), (5, 19, 11, 255))
    touch_draw = ImageDraw.Draw(touch_img)
    touch_draw.rounded_rectangle([4, 4, 175, 175], radius=42, fill=(8, 28, 16, 255), outline=(110, 231, 168, 160), width=2)
    for r in range(65, 0, -2):
        alpha = int(40 * (1 - r / 65))
        touch_draw.ellipse([90 - r, 90 - r, 90 + r, 90 + r], fill=(110, 231, 168, alpha))
    try:
        font_touch_p = ImageFont.truetype("georgia.ttf", 96)
    except:
        font_touch_p = ImageFont.load_default()
    touch_draw.text((90, 88), "P", font=font_touch_p, fill=(110, 231, 168, 255), anchor="mm")
    touch_path = os.path.join(public_dir, 'apple-touch-icon.png')
    touch_img.save(touch_path, 'PNG', optimize=True)
    print(f"Generated {touch_path}")

    # 3. Generate favicon-32x32.png
    fav32 = touch_img.resize((32, 32), Image.Resampling.LANCZOS)
    fav32_path = os.path.join(public_dir, 'favicon-32x32.png')
    fav32.save(fav32_path, 'PNG', optimize=True)
    print(f"Generated {fav32_path}")

    # 4. Generate favicon.ico
    fav_ico_path = os.path.join(public_dir, 'favicon.ico')
    fav16 = touch_img.resize((16, 16), Image.Resampling.LANCZOS)
    fav16.save(fav_ico_path, format='ICO', sizes=[(16, 16), (32, 32)])
    print(f"Generated {fav_ico_path}")

if __name__ == '__main__':
    generate_assets()

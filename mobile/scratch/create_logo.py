from PIL import Image, ImageDraw, ImageFont
import math

# Create a high-res RGBA image for the Dundu Brand Logo (width: 600, height: 180)
width, height = 600, 180
img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# 1. Draw Shopping Bag / Brand Mark Icon on the Left (size: 120x120, centered vertically at x=20, y=30)
icon_left = 20
icon_top = 30
icon_w, icon_h = 120, 120

# Draw main rounded bag body (Hot Pink / Magenta #ff007f)
bag_x1 = icon_left + 15
bag_y1 = icon_top + 35
bag_x2 = icon_left + 105
bag_y2 = icon_top + 115
draw.rounded_rectangle([bag_x1, bag_y1, bag_x2, bag_y2], radius=18, fill=(255, 0, 127, 255))

# Draw bag handle loops (top of bag)
handle_cx = icon_left + 60
handle_cy = icon_top + 35
draw.arc([handle_cx - 22, handle_cy - 25, handle_cx + 22, handle_cy + 15], start=180, end=360, fill=(255, 255, 255, 255), width=8)

# Draw inner bag accent star/sparkle in white
star_cx = icon_left + 60
star_cy = icon_top + 75
draw.ellipse([star_cx - 14, star_cy - 14, star_cx + 14, star_cy + 14], fill=(255, 255, 255, 255))
draw.rectangle([star_cx - 20, star_cy - 4, star_cx + 20, star_cy + 4], fill=(255, 0, 127, 255))
draw.rectangle([star_cx - 4, star_cy - 20, star_cx + 4, star_cy + 20], fill=(255, 0, 127, 255))

# 2. Draw "DUNDU" Text on the Right (Hot Pink #ff007f & White accents)
text_x = 165
text_y = 42

try:
    # Try loading a system bold font
    font = ImageFont.truetype("arialbd.ttf", 84)
except Exception:
    font = ImageFont.load_default()

# Draw text "DUNDU"
draw.text((text_x, text_y), "DUNDU", fill=(255, 0, 127, 255), font=font)

# Save as high-res PNG to mobile/assets/dundulogo.png
output_path = r"d:\PROJECTS\Dundu-Online\mobile\assets\dundulogo.png"
img.save(output_path, "PNG")
print("Successfully generated dundulogo.png at:", output_path)

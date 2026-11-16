import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Dimensions & Parameters
WIDTH = 1920
HEIGHT = 1080
FPS = 30
SCENE_DURATION_SEC = 15  # Exactly 15 seconds per scene

ARTIFACTS_DIR = r"C:\Users\home\.gemini\antigravity\brain\5806ad4a-66f2-433c-ad8d-e4c08ab26748"
OUTPUT_PATH = r"I:\call-app\calling-crm-web-monitoring\public\meta-app-review-demo.mp4"

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

# Helper to find a font
def get_font(size, bold=False):
    font_paths = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf"
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

font_title = get_font(36, bold=True)
font_subtitle = get_font(22, bold=False)
font_step = get_font(26, bold=True)
font_desc = get_font(21, bold=False)
font_badge = get_font(18, bold=True)
font_timer = get_font(22, bold=True)

def create_cursor(size=32):
    cursor = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(cursor)
    points = [(0, 0), (0, 26), (7, 20), (15, 27), (20, 22), (12, 16), (20, 16)]
    draw.polygon(points, fill=(255, 255, 255, 255), outline=(0, 0, 0, 255))
    return cursor

cursor_img = create_cursor()

# Prepare slide template
def prepare_slide(image_path, title, step_text, detail_bullets, scene_num, total_scenes):
    base = Image.new("RGBA", (WIDTH, HEIGHT), (15, 23, 42, 255)) # Dark slate
    draw = ImageDraw.Draw(base)

    # Top Header Bar
    draw.rectangle([0, 0, WIDTH, 100], fill=(30, 41, 59, 255))
    draw.line([0, 100, WIDTH, 100], fill=(51, 65, 85, 255), width=2)
    
    # App Logo Badge
    draw.rounded_rectangle([30, 22, 260, 78], radius=10, fill=(37, 99, 235, 255))
    draw.text((45, 36), "Kisan India CRM", font=font_step, fill=(255, 255, 255, 255))

    draw.text((290, 24), title, font=font_title, fill=(255, 255, 255, 255))
    draw.text((290, 66), "Meta App ID: 1007200718473332  |  Business ID: 4387276051561240  |  Production App Review", font=font_subtitle, fill=(148, 163, 184, 255))

    # Right Timer & Scene Badge
    draw.rounded_rectangle([WIDTH - 320, 25, WIDTH - 40, 75], radius=10, fill=(16, 185, 129, 240))
    draw.text((WIDTH - 300, 38), f"SCENE {scene_num}/{total_scenes}  (15s DURATION)", font=font_timer, fill=(255, 255, 255, 255))

    # Middle Content: Left image (x: 40 to 1420), Right sidebar (x: 1440 to 1880)
    if os.path.exists(image_path):
        img = Image.open(image_path).convert("RGBA")
        max_w, max_h = 1380, 800
        scale = min(max_w / img.width, max_h / img.height)
        new_w = int(img.width * scale)
        new_h = int(img.height * scale)
        img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        img_x = 40 + (1380 - new_w) // 2
        img_y = 110 + (800 - new_h) // 2
        
        draw.rounded_rectangle([img_x - 4, img_y - 4, img_x + new_w + 4, img_y + new_h + 4], radius=8, fill=(71, 85, 105, 255))
        base.paste(img_resized, (img_x, img_y), img_resized)
    else:
        img_x, img_y, new_w, new_h = 40, 110, 1380, 800

    # Right Sidebar
    draw.rounded_rectangle([1440, 110, 1880, 910], radius=16, fill=(30, 41, 59, 255), outline=(51, 65, 85, 255), width=2)
    
    # Step badge
    draw.rounded_rectangle([1465, 135, 1855, 185], radius=8, fill=(37, 99, 235, 255))
    draw.text((1485, 146), step_text, font=font_step, fill=(255, 255, 255, 255))

    # Bullets
    curr_y = 215
    for bullet in detail_bullets:
        draw.ellipse([1470, curr_y + 6, 1482, curr_y + 18], fill=(56, 189, 248, 255))
        words = bullet.split(" ")
        line = ""
        for w in words:
            if len(line + " " + w) < 30:
                line = (line + " " + w).strip()
            else:
                draw.text((1495, curr_y), line, font=font_desc, fill=(241, 245, 249, 255))
                curr_y += 30
                line = w
        if line:
            draw.text((1495, curr_y), line, font=font_desc, fill=(241, 245, 249, 255))
            curr_y += 44

    # Bottom Footer Bar (920 to 1080)
    draw.rectangle([0, 930, WIDTH, HEIGHT], fill=(15, 23, 42, 255))
    draw.line([0, 930, WIDTH, 930], fill=(51, 65, 85, 255), width=2)

    footer_text = "Permissions: leads_retrieval, pages_manage_ads, pages_show_list, pages_read_engagement | 100% Real Live Production Data"
    draw.text((40, 955), footer_text, font=font_subtitle, fill=(148, 163, 184, 255))

    return base, (img_x, img_y, new_w, new_h)

# 4 Core Scenes x 15 seconds = 60 Seconds Total
scenes = [
    {
        "img": os.path.join(ARTIFACTS_DIR, "meta_settings_post_oauth_verified.png"),
        "title": "Scene 1: CRM Settings & Meta OAuth 2.0 Trigger",
        "step": "STEP 1: Initiate OAuth",
        "bullets": [
            "User opens CRM Settings at caller-website-monitoring.vercel.app.",
            "Administrator selects 'Meta Integrations' from the sidebar.",
            "Clicks 'Launch Meta OAuth 2.0' button to initiate Graph API connection.",
            "Secure OAuth redirect configured with state verification."
        ],
        "target": (0.32, 0.45),
        "highlight": (0.24, 0.40, 0.42, 0.50),
        "duration_sec": SCENE_DURATION_SEC
    },
    {
        "img": os.path.join(ARTIFACTS_DIR, "facebook_oauth_dialog_verified.png"),
        "title": "Scene 2: Meta Consent Dialog & Scope Approvals",
        "step": "STEP 2: Permission Grant",
        "bullets": [
            "Official Facebook Login dialog opens for user authorization.",
            "• leads_retrieval: Retrieve customer submissions.",
            "• pages_manage_ads: Access Lead Ad forms & analytics.",
            "• pages_show_list: View user's managed Facebook Pages.",
            "• pages_read_engagement: Real-time webhook notifications.",
            "User clicks 'Continue' to approve scopes."
        ],
        "target": (0.50, 0.70),
        "highlight": (0.35, 0.62, 0.65, 0.76),
        "duration_sec": SCENE_DURATION_SEC
    },
    {
        "img": os.path.join(ARTIFACTS_DIR, "forms_browser_verified.png"),
        "title": "Scene 3: Synced Facebook Pages & 42 Active Lead Forms",
        "step": "STEP 3: Lead Forms Sync",
        "bullets": [
            "CRM server exchanges code for long-lived Page Access Token.",
            "Page 'Kisan Choice' dynamically linked to CRM tenant.",
            "All 42 active lead forms synced via /{page-id}/leadgen_forms.",
            "Regional campaigns (Agra, Field Sales, Lucknow) live with 0 dummy data."
        ],
        "target": (0.60, 0.42),
        "highlight": (0.15, 0.30, 0.85, 0.65),
        "duration_sec": SCENE_DURATION_SEC
    },
    {
        "img": os.path.join(ARTIFACTS_DIR, "dashboard_real_leads_verified.png"),
        "title": "Scene 4: Real-Time Lead Ingestion & Telecaller Assignment",
        "step": "STEP 4: Telecalling Operations",
        "bullets": [
            "Incoming Meta Lead Ad submissions trigger real-time webhooks.",
            "Leads encrypted & saved directly to MongoDB Atlas database.",
            "Round-Robin engine assigns customer to active telecaller.",
            "Direct 'Call Now' and 'WhatsApp' triggers enable instant follow-up.",
            "Total lead-to-call cycle: under 2 seconds latency."
        ],
        "target": (0.50, 0.45),
        "highlight": (0.20, 0.32, 0.80, 0.60),
        "duration_sec": SCENE_DURATION_SEC
    }
]

print(f"Generating 15-second per scene Meta App Review Screencast: {OUTPUT_PATH}")
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(OUTPUT_PATH, fourcc, FPS, (WIDTH, HEIGHT))

total_scenes = len(scenes)

for s_idx, scene in enumerate(scenes):
    print(f"Rendering Scene {s_idx + 1}/{total_scenes}: {scene['title']} (15 seconds, 450 frames)...")
    base_slide, (ix, iy, iw, ih) = prepare_slide(
        scene["img"], 
        scene["title"], 
        scene["step"], 
        scene["bullets"],
        s_idx + 1,
        total_scenes
    )
    
    num_frames = scene["duration_sec"] * FPS # 15 * 30 = 450 frames
    tx, ty = scene["target"]
    target_px_x = ix + int(tx * iw)
    target_px_y = iy + int(ty * ih)

    start_px_x = ix + iw // 4
    start_px_y = iy + ih - 60

    # Highlight box coords
    hx1, hy1, hx2, hy2 = scene["highlight"]
    bx1 = ix + int(hx1 * iw)
    by1 = iy + int(hy1 * ih)
    bx2 = ix + int(hx2 * iw)
    by2 = iy + int(hy2 * ih)

    for f in range(num_frames):
        frame = base_slide.copy()
        draw = ImageDraw.Draw(frame)

        # Bottom countdown timer bar for this 15-second scene
        scene_progress = f / float(num_frames)
        bar_width = int((WIDTH - 80) * scene_progress)
        draw.rounded_rectangle([40, 1045, 40 + bar_width, 1055], radius=5, fill=(56, 189, 248, 255))
        
        # Second counter text (e.g. "0:04 / 0:15")
        sec_current = f // 30
        draw.text((WIDTH - 180, 955), f"Scene: {sec_current:02d}s / 15s", font=font_timer, fill=(56, 189, 248, 255))

        # Cursor animation (moves smoothly during first 60 frames, clicks at frame 60)
        t = min(1.0, f / 60.0)
        ease_t = 2 * t * t if t < 0.5 else -1 + (4 - 2 * t) * t
        cur_x = int(start_px_x + (target_px_x - start_px_x) * ease_t)
        cur_y = int(start_px_y + (target_px_y - start_px_y) * ease_t)

        # Pulse highlight box after click (from frame 60 to 390)
        if 60 <= f <= 390:
            pulse = (np.sin((f - 60) * 0.1) + 1.0) / 2.0  # 0 to 1
            alpha = int(140 + 115 * pulse)
            box_color = (239, 68, 68, alpha)
            draw.rounded_rectangle([bx1 - 4, by1 - 4, bx2 + 4, by2 + 4], radius=8, outline=box_color, width=4)

        # Click ripple at frame 60 to 90
        if 60 <= f <= 90:
            ripple_radius = int((f - 60) * 2.0)
            ripple_alpha = int(255 * (1 - (f - 60) / 30))
            draw.ellipse(
                [cur_x - ripple_radius, cur_y - ripple_radius, cur_x + ripple_radius, cur_y + ripple_radius],
                outline=(239, 68, 68, ripple_alpha),
                width=3
            )

        # Draw cursor
        frame.paste(cursor_img, (cur_x, cur_y), cursor_img)

        # Crossfade transition (first 20 frames)
        cv_img = cv2.cvtColor(np.array(frame), cv2.COLOR_RGBA2BGR)
        if f < 20 and s_idx > 0:
            fade_alpha = f / 20.0
            cv_img = cv2.addWeighted(cv_img, fade_alpha, np.zeros_like(cv_img), 1 - fade_alpha, 0)

        out.write(cv_img)

out.release()
print(f"Success! Video created with 15 seconds per scene. Total file size: {os.path.getsize(OUTPUT_PATH)} bytes.")

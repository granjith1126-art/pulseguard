import asyncio
import os
import shutil
import subprocess
import json
from playwright.async_api import async_playwright

WORK_DIR = os.path.abspath('brag-output/work')
os.makedirs(WORK_DIR, exist_ok=True)

# Load verified scene durations
with open(os.path.join(WORK_DIR, 'scene_durations.json'), 'r') as f:
    SCENE_DURATIONS = json.load(f)

DEFAULT_DOCTOR = {
    "id": "DOC-001",
    "name": "Dr. Anil Kumar",
    "email": "doctor@pulseguard.com",
    "role": "DOCTOR",
    "title": "Chief Cardiologist",
    "doctorRegistrationId": "REG-2024-DOC981",
    "avatar": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
}

DEFAULT_PATIENT = {
    "id": "P-001",
    "name": "Ramesh Kumar",
    "email": "patient@pulseguard.com",
    "role": "PATIENT",
    "patientId": "P-001",
    "deviceId": "PG-001",
    "assignedDoctor": "Dr. Anil Kumar",
    "emergencyInfo": {
        "age": 58,
        "gender": "Male",
        "emergencyContactName": "Sunita Kumar",
        "emergencyContactNumber": "+91 98450 67890",
        "relationship": "Spouse (Wife)"
    },
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
}

async def smooth_mouse_move(page, start_x, start_y, end_x, end_y, steps=25, delay=0.02):
    for i in range(steps + 1):
        x = start_x + (end_x - start_x) * (i / steps)
        y = start_y + (end_y - start_y) * (i / steps)
        await page.mouse.move(x, y)
        await asyncio.sleep(delay)

async def record_scene_01(browser, duration):
    print(f"\n>>> Recording Scene 01 (Intro) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_01')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate("() => localStorage.removeItem('pulseguard_user')")
    await page.reload()
    await asyncio.sleep(2.0)

    # Move mouse smoothly over title and role cards
    await smooth_mouse_move(page, 960, 250, 960, 200)
    await asyncio.sleep(4.0)

    # Hover over doctor portal
    await smooth_mouse_move(page, 960, 200, 780, 520)
    await asyncio.sleep(6.0)

    # Hover over patient portal
    await smooth_mouse_move(page, 780, 520, 1140, 520)
    await asyncio.sleep(6.0)

    # Scroll slightly down then up
    await page.mouse.wheel(0, 150)
    await asyncio.sleep(4.0)
    await page.mouse.wheel(0, -150)
    await asyncio.sleep(4.0)

    # Hold till end of duration
    remaining = duration - 22.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def record_scene_02(browser, duration):
    print(f"\n>>> Recording Scene 02 (Auth) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_02')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate("() => localStorage.removeItem('pulseguard_user')")
    await page.reload()
    await asyncio.sleep(2.0)

    # Hover doctor card
    await smooth_mouse_move(page, 960, 400, 780, 520)
    await asyncio.sleep(3.0)

    # Hover patient card
    await smooth_mouse_move(page, 780, 520, 1140, 520)
    await asyncio.sleep(3.0)

    # Click Quick Enter as Patient
    patient_btn = page.locator("button:has-text('Quick Enter as Patient')")
    if await patient_btn.count() > 0:
        await patient_btn.click()
    else:
        # Fallback click
        await page.mouse.click(1140, 600)

    await asyncio.sleep(3.0)
    # Now in dashboard
    await smooth_mouse_move(page, 1140, 600, 960, 300)
    await asyncio.sleep(4.0)

    remaining = duration - 12.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def record_scene_03(browser, duration):
    print(f"\n>>> Recording Scene 03 (Vitals) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_03')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate(f"() => localStorage.setItem('pulseguard_user', JSON.stringify({json.dumps(DEFAULT_PATIENT)}))")
    await page.reload()
    await asyncio.sleep(3.0)

    # Top Navigation bar
    await smooth_mouse_move(page, 960, 100, 600, 140)
    await asyncio.sleep(4.0)

    # Hover Heart Rate Card
    await smooth_mouse_move(page, 600, 140, 520, 240)
    await asyncio.sleep(7.0)

    # Hover SpO2 Card
    await smooth_mouse_move(page, 520, 240, 850, 240)
    await asyncio.sleep(7.0)

    # Hover Temperature Card
    await smooth_mouse_move(page, 850, 240, 1180, 240)
    await asyncio.sleep(7.0)

    # Hover Device Status / Activity Card
    await smooth_mouse_move(page, 1180, 240, 1400, 240)
    await asyncio.sleep(8.0)

    remaining = duration - 33.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def record_scene_04(browser, duration):
    print(f"\n>>> Recording Scene 04 (PPG Waveform) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_04')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate(f"() => localStorage.setItem('pulseguard_user', JSON.stringify({json.dumps(DEFAULT_PATIENT)}))")
    await page.reload()
    await asyncio.sleep(3.0)

    # Scroll down to center the PPG canvas
    await page.mouse.wheel(0, 360)
    await asyncio.sleep(6.0)

    # Watch smooth waveform
    await smooth_mouse_move(page, 500, 400, 960, 420)
    await asyncio.sleep(6.0)

    # Change Time Window to 5 sec
    time_select = page.locator("select[aria-label='PPG Time Window']")
    if await time_select.count() > 0:
        await time_select.select_option("5")
        await asyncio.sleep(5.0)
        # Change to 20 sec
        await time_select.select_option("20")
        await asyncio.sleep(5.0)
        # Back to 10 sec
        await time_select.select_option("10")
        await asyncio.sleep(4.0)

    # Hover audio toggle
    audio_btn = page.locator("button[aria-label='Mute Pulse Audio'], button[aria-label='Unmute Pulse Audio']")
    if await audio_btn.count() > 0:
        await audio_btn.hover()
        await asyncio.sleep(4.0)

    # Hover transparency badge
    sim_badge = page.locator("text='SIMULATED PPG — NOT LIVE SENSOR DATA'")
    if await sim_badge.count() > 0:
        await sim_badge.hover()
        await asyncio.sleep(6.0)

    remaining = duration - 35.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def record_scene_05(browser, duration):
    print(f"\n>>> Recording Scene 05 (Historical Graphs) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_05')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate(f"() => localStorage.setItem('pulseguard_user', JSON.stringify({json.dumps(DEFAULT_PATIENT)}))")
    await page.reload()
    await asyncio.sleep(3.0)

    # Scroll down to Historical Trend Graphs
    await page.mouse.wheel(0, 850)
    await asyncio.sleep(4.0)

    # Move mouse across the 3 trend charts
    await smooth_mouse_move(page, 960, 500, 600, 600)
    await asyncio.sleep(3.0)
    await smooth_mouse_move(page, 600, 600, 960, 600)
    await asyncio.sleep(3.0)
    await smooth_mouse_move(page, 960, 600, 1300, 600)
    await asyncio.sleep(3.0)

    # Click to open Big Window modal on Heart Rate
    hr_card = page.locator("text='Heart Rate vs Time'").first
    if await hr_card.count() > 0:
        await hr_card.click()
        await asyncio.sleep(6.0)
        # Move mouse across the large modal
        await smooth_mouse_move(page, 700, 500, 1200, 500)
        await asyncio.sleep(4.0)
        # Close modal
        await page.keyboard.press("Escape")
        await asyncio.sleep(2.0)

    remaining = duration - 25.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def record_scene_06(browser, duration):
    print(f"\n>>> Recording Scene 06 (Emergency & Hospitals) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_06')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080},
        permissions=['geolocation'],
        geolocation={'latitude': 12.9716, 'longitude': 77.5946}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate(f"() => localStorage.setItem('pulseguard_user', JSON.stringify({json.dumps(DEFAULT_PATIENT)}))")
    await page.reload()
    await asyncio.sleep(3.0)

    # Scroll down to Emergency Hospitals Card
    await page.mouse.wheel(0, 1400)
    await asyncio.sleep(4.0)

    # Move mouse over hospital section
    await smooth_mouse_move(page, 960, 500, 700, 600)
    await asyncio.sleep(6.0)

    # Hover over emergency buttons
    call_btn = page.locator("button:has-text('Call 108'), button:has-text('Emergency Call')").first
    if await call_btn.count() > 0:
        await call_btn.hover()
        await asyncio.sleep(5.0)

    nav_btn = page.locator("button:has-text('Directions'), button:has-text('Navigate')").first
    if await nav_btn.count() > 0:
        await nav_btn.hover()
        await asyncio.sleep(5.0)

    remaining = duration - 20.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def record_scene_07(browser, duration):
    print(f"\n>>> Recording Scene 07 (Patient Profile) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_07')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate(f"() => localStorage.setItem('pulseguard_user', JSON.stringify({json.dumps(DEFAULT_PATIENT)}))")
    await page.reload()
    await asyncio.sleep(2.0)

    # Click Profile in sidebar
    profile_btn = page.locator("button:has-text('Profile')").first
    if await profile_btn.count() > 0:
        await profile_btn.click()
    await asyncio.sleep(3.0)

    # Move mouse over patient info & hardware MAC
    await smooth_mouse_move(page, 960, 200, 800, 300)
    await asyncio.sleep(4.0)

    # Click Edit Profile
    edit_btn = page.locator("button:has-text('Edit Profile')").first
    if await edit_btn.count() > 0:
        await edit_btn.click()
        await asyncio.sleep(3.0)

        # Type in contact number
        phone_input = page.locator("input[type='tel'], input[name='emergencyContactNumber']").first
        if await phone_input.count() > 0:
            await phone_input.click()
            await page.keyboard.press("End")
            await page.keyboard.press("Backspace")
            await page.keyboard.type("5")
            await asyncio.sleep(2.0)

        # Click Save Changes
        save_btn = page.locator("button:has-text('Save Changes')").first
        if await save_btn.count() > 0:
            await save_btn.click()
            await asyncio.sleep(4.0)

    remaining = duration - 18.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def record_scene_08(browser, duration):
    print(f"\n>>> Recording Scene 08 (Doctor Dashboard) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_08')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate(f"() => localStorage.setItem('pulseguard_user', JSON.stringify({json.dumps(DEFAULT_DOCTOR)}))")
    await page.reload()
    await asyncio.sleep(3.0)

    # Triage summary cards
    await smooth_mouse_move(page, 960, 150, 600, 180)
    await asyncio.sleep(4.0)
    await smooth_mouse_move(page, 600, 180, 850, 180)
    await asyncio.sleep(3.0)
    await smooth_mouse_move(page, 850, 180, 1100, 180)
    await asyncio.sleep(3.0)

    # Scroll down to Patient Roster
    await page.mouse.wheel(0, 300)
    await asyncio.sleep(4.0)

    # Filter tabs
    crit_tab = page.locator("button:has-text('Critical')").first
    if await crit_tab.count() > 0:
        await crit_tab.click()
        await asyncio.sleep(4.0)
        all_tab = page.locator("button:has-text('All Patients')").first
        if await all_tab.count() > 0:
            await all_tab.click()
            await asyncio.sleep(3.0)

    remaining = duration - 21.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def record_scene_09(browser, duration):
    print(f"\n>>> Recording Scene 09 (Clinical Detail & Conclusion) for {duration:.2f}s...")
    clip_dir = os.path.join(WORK_DIR, 'clip_09')
    shutil.rmtree(clip_dir, ignore_errors=True)
    os.makedirs(clip_dir, exist_ok=True)

    context = await browser.new_context(
        record_video_dir=clip_dir,
        record_video_size={'width': 1920, 'height': 1080},
        viewport={'width': 1920, 'height': 1080}
    )
    page = await context.new_page()
    await page.goto('http://localhost:5173')
    await page.evaluate(f"() => localStorage.setItem('pulseguard_user', JSON.stringify({json.dumps(DEFAULT_DOCTOR)}))")
    await page.reload()
    await asyncio.sleep(3.0)

    # Click on Patient Detail in sidebar or click on Ramesh Kumar
    patient_row = page.locator("text='Ramesh Kumar'").first
    if await patient_row.count() > 0:
        await patient_row.click()
    else:
        detail_nav = page.locator("button:has-text('Patient Detail'), button:has-text('Live Telemetry')").first
        if await detail_nav.count() > 0:
            await detail_nav.click()

    await asyncio.sleep(4.0)

    # Scroll through Clinical Console
    await page.mouse.wheel(0, 350)
    await asyncio.sleep(5.0)
    await smooth_mouse_move(page, 960, 450, 750, 450)
    await asyncio.sleep(5.0)

    # Scroll back to top for final hero view
    await page.mouse.wheel(0, -350)
    await asyncio.sleep(6.0)

    remaining = duration - 23.0
    if remaining > 0:
        await asyncio.sleep(remaining)

    await context.close()
    return clip_dir

async def main():
    print("==================================================")
    print("STARTING FULL AUTOMATED PLAYWRIGHT VIDEO RECORDING")
    print("==================================================")

    scenes_config = [
        ("scene_01", record_scene_01, SCENE_DURATIONS["scene_01_intro"]),
        ("scene_02", record_scene_02, SCENE_DURATIONS["scene_02_auth"]),
        ("scene_03", record_scene_03, SCENE_DURATIONS["scene_03_vitals"]),
        ("scene_04", record_scene_04, SCENE_DURATIONS["scene_04_ppg"]),
        ("scene_05", record_scene_05, SCENE_DURATIONS["scene_05_graphs"]),
        ("scene_06", record_scene_06, SCENE_DURATIONS["scene_06_emergency"]),
        ("scene_07", record_scene_07, SCENE_DURATIONS["scene_07_profile"]),
        ("scene_08", record_scene_08, SCENE_DURATIONS["scene_08_doctor"]),
        ("scene_09", record_scene_09, SCENE_DURATIONS["scene_09_conclusion"]),
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        clip_dirs = []

        for sid, rec_fn, dur in scenes_config:
            cd = await rec_fn(browser, dur)
            clip_dirs.append((sid, cd, dur))

        await browser.close()

    print("\n--- All 9 Scenes Recorded! Normalizing with FFmpeg ---")
    normalized_files = []
    for sid, cd, dur in clip_dirs:
        vids = [os.path.join(cd, f) for f in os.listdir(cd) if f.endswith('.webm')]
        if not vids:
            raise RuntimeError(f"No webm found for {sid} in {cd}")
        raw_webm = vids[0]
        norm_mp4 = os.path.join(WORK_DIR, f"{sid}_norm.mp4")
        print(f"Normalizing {sid} ({dur:.2f}s) -> {norm_mp4}")
        cmd = [
            'ffmpeg', '-y',
            '-i', raw_webm,
            '-t', f"{dur:.2f}",
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30',
            '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
            norm_mp4
        ]
        subprocess.run(cmd, check=True)
        normalized_files.append(norm_mp4)

    print("\nAll 9 scene videos normalized successfully!")

if __name__ == '__main__':
    asyncio.run(main())

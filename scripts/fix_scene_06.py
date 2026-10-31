import asyncio
import os
import shutil
import subprocess
import json
from playwright.async_api import async_playwright

WORK_DIR = os.path.abspath('brag-output/work')
clip_dir = os.path.join(WORK_DIR, 'clip_06')
shutil.rmtree(clip_dir, ignore_errors=True)
os.makedirs(clip_dir, exist_ok=True)

DEFAULT_PATIENT = {
    'id': 'P-001',
    'name': 'Ramesh Kumar',
    'email': 'patient@pulseguard.com',
    'role': 'PATIENT',
    'patientId': 'P-001',
    'deviceId': 'PG-001',
    'assignedDoctor': 'Dr. Anil Kumar',
    'emergencyInfo': {'age': 58, 'gender': 'Male', 'emergencyContactName': 'Sunita Kumar', 'emergencyContactNumber': '+91 98450 67890', 'relationship': 'Spouse (Wife)'},
    'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
}

async def record():
    target_dur = 18.84
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
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

        await page.mouse.wheel(0, 1400)
        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < target_dur:
            await page.mouse.move(700, 600)
            await asyncio.sleep(1.0)
            await page.mouse.move(960, 650)
            await asyncio.sleep(1.0)

        await context.close()
        await browser.close()

    vids = [os.path.join(clip_dir, f) for f in os.listdir(clip_dir) if f.endswith('.webm')]
    norm_mp4 = os.path.join(WORK_DIR, 'scene_06_norm.mp4')
    cmd = [
        'ffmpeg', '-y',
        '-i', vids[0],
        '-t', f'{target_dur:.2f}',
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30',
        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
        norm_mp4
    ]
    subprocess.run(cmd, check=True)
    print('Scene 06 re-recorded successfully!')

if __name__ == '__main__':
    asyncio.run(record())

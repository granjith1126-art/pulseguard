import os
import subprocess
import asyncio
from playwright.async_api import async_playwright

WORK_DIR = os.path.abspath('brag-output/work')
OUTPUT_DIR = os.path.abspath('brag-output')
os.makedirs(WORK_DIR, exist_ok=True)

# Scene timing data from our verified edge-tts generation:
# scene_01_intro: 24.67s
# scene_02_auth: 14.88s
# scene_03_vitals: 17.62s
# scene_04_ppg: 24.34s
# scene_05_graphs: 17.23s
# scene_06_emergency: 15.10s
# scene_07_profile: 15.22s
# scene_08_doctor: 16.22s
# scene_09_conclusion: 13.85s
# Total: 159.13s (2m 39s)

SCENE_DURATIONS = {
    'scene_01': 24.67,
    'scene_02': 14.88,
    'scene_03': 17.62,
    'scene_04': 24.34,
    'scene_05': 17.23,
    'scene_06': 15.10,
    'scene_07': 15.22,
    'scene_08': 16.22,
    'scene_09': 13.85,
}

def compile_master_audio():
    print("--- 1. Compiling Master Audio ---")
    list_path = os.path.join(WORK_DIR, 'voice_list.txt')
    with open(list_path, 'w', encoding='utf-8') as f:
        for i in range(1, 10):
            matched = [fn for fn in os.listdir(WORK_DIR) if fn.startswith(f'scene_0{i}') and fn.endswith('.mp3')][0]
            full_mp3_path = os.path.join(WORK_DIR, matched).replace('\\', '/')
            f.write(f"file '{full_mp3_path}'\n")

    voice_wav = os.path.join(WORK_DIR, 'voice_full.wav')
    cmd_concat = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list_path, '-c:a', 'pcm_s16le', voice_wav]
    subprocess.run(cmd_concat, check=True)

    # Get exact duration
    res = subprocess.run(['ffmpeg', '-i', voice_wav], stderr=subprocess.PIPE, text=True)
    dur = 0.0
    for line in res.stderr.split('\n'):
        if 'Duration:' in line:
            part = line.split('Duration:')[1].split(',')[0].strip()
            h, m, s = part.split(':')
            dur = float(h)*3600 + float(m)*60 + float(s)
            break
    print(f"Total Voice Duration: {dur:.2f}s ({int(dur//60)}m {int(dur%60)}s)")

    # Mix with music
    music_path = os.path.join(WORK_DIR, 'music.mp3')
    master_audio = os.path.join(WORK_DIR, 'master_audio.m4a')
    fade_start = max(0, dur - 3.5)
    cmd_mix = [
        'ffmpeg', '-y',
        '-i', voice_wav,
        '-stream_loop', '-1', '-i', music_path,
        '-filter_complex',
        f'[0:a]volume=1.25[v];[1:a]volume=0.10,afade=t=out:st={fade_start:.2f}:d=3.5[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[a]',
        '-map', '[a]',
        '-c:a', 'aac', '-b:a', '192k',
        '-t', f'{dur:.2f}',
        master_audio
    ]
    subprocess.run(cmd_mix, check=True)
    print("Master audio created successfully!")
    return dur

if __name__ == '__main__':
    compile_master_audio()

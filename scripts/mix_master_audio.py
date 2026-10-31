import os
import subprocess

WORK_DIR = os.path.abspath('brag-output/work')
list_path = os.path.join(WORK_DIR, 'voice_list.txt')

with open(list_path, 'w', encoding='utf-8') as f:
    for i in range(1, 10):
        matched = [fn for fn in os.listdir(WORK_DIR) if fn.startswith(f'scene_0{i}') and fn.endswith('.mp3')][0]
        full_mp3_path = os.path.join(WORK_DIR, matched).replace('\\', '/')
        f.write(f"file '{full_mp3_path}'\n")

voice_wav = os.path.join(WORK_DIR, 'voice_full.wav')
subprocess.run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list_path, '-c:a', 'pcm_s16le', voice_wav], check=True)

res = subprocess.run(['ffmpeg', '-i', voice_wav], stderr=subprocess.PIPE, text=True)
dur = 0.0
for line in res.stderr.split('\n'):
    if 'Duration:' in line:
        part = line.split('Duration:')[1].split(',')[0].strip()
        h, m, s = part.split(':')
        dur = float(h)*3600 + float(m)*60 + float(s)
        break
print(f"Total Voice Duration: {dur:.2f}s ({int(dur//60)}m {int(dur%60)}s)")

music_path = os.path.join(WORK_DIR, 'music.mp3')
master_audio = os.path.join(WORK_DIR, 'master_audio.m4a')
fade_start = max(0, dur - 4.0)

cmd_mix = [
    'ffmpeg', '-y',
    '-i', voice_wav,
    '-stream_loop', '-1', '-i', music_path,
    '-filter_complex',
    f'[0:a]volume=1.25[v];[1:a]volume=0.08,afade=t=out:st={fade_start:.2f}:d=4.0[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[a]',
    '-map', '[a]',
    '-c:a', 'aac', '-b:a', '192k',
    '-t', f'{dur:.2f}',
    master_audio
]
subprocess.run(cmd_mix, check=True)
print("Master audio mixed successfully to master_audio.m4a!")

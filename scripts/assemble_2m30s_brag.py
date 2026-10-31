import os
import subprocess
import shutil

WORK_DIR = os.path.abspath('brag-output/work')
BRAG_DIR = os.path.abspath('brag-output')
os.makedirs(WORK_DIR, exist_ok=True)
os.makedirs(BRAG_DIR, exist_ok=True)

def assemble():
    print("=== Assembling 2m 30s Final Brag Video ===")

    # 1. Video concat list
    concat_list_path = os.path.join(WORK_DIR, 'video_list.txt')
    with open(concat_list_path, 'w', encoding='utf-8') as f:
        for i in range(1, 10):
            norm_mp4 = os.path.join(WORK_DIR, f"scene_0{i}_norm.mp4").replace('\\', '/')
            if not os.path.exists(norm_mp4):
                raise FileNotFoundError(f"Missing {norm_mp4}")
            f.write(f"file '{norm_mp4}'\n")

    video_concat_raw = os.path.join(WORK_DIR, 'video_full_raw.mp4')
    cmd_concat = [
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0',
        '-i', concat_list_path,
        '-c', 'copy',
        video_concat_raw
    ]
    print("Concatenating 9 scene videos...")
    subprocess.run(cmd_concat, check=True)

    # Copy subtitle file into workspace root for clean path without colon parsing errors
    root_srt = os.path.abspath('temp_subs.srt')
    shutil.copy(os.path.join(WORK_DIR, 'master_subtitles.srt'), root_srt)

    master_audio = os.path.join(WORK_DIR, 'master_audio.m4a')
    final_output = os.path.join(BRAG_DIR, 'brag.mp4')

    # Subtitle styling per user's exact feedback:
    # 1. Placed right at the bottom: MarginV=12 (not high up between bottom and middle)
    # 2. Reduced font size: FontSize=12 (slightly smaller, clean, legible)
    # 3. Translucent dark box backdrop: BorderStyle=4, BackColour=&H80000000
    sub_filter = "subtitles=temp_subs.srt:force_style='FontSize=12,FontName=Segoe UI,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=4,MarginV=12,Outline=0'"

    print("Muxing video, master audio, and burning bottom-aligned subtitles...")
    cmd_final = [
        'ffmpeg', '-y',
        '-i', video_concat_raw,
        '-i', master_audio,
        '-filter_complex', f'[0:v]{sub_filter}[v]',
        '-map', '[v]',
        '-map', '1:a',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '19',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-movflags', '+faststart',
        final_output
    ]
    subprocess.run(cmd_final, check=True)
    print(f"Brag video created: {final_output}")

    if os.path.exists(root_srt):
        os.remove(root_srt)

    # Extract poster frame (brag.jpg)
    poster_jpg = os.path.join(BRAG_DIR, 'brag.jpg')
    print("Extracting poster frame brag.jpg...")
    cmd_poster = [
        'ffmpeg', '-y',
        '-ss', '00:00:03.000',
        '-i', final_output,
        '-vframes', '1',
        '-q:v', '2',
        poster_jpg
    ]
    subprocess.run(cmd_poster, check=True)
    print(f"Poster frame saved: {poster_jpg}")

if __name__ == '__main__':
    assemble()

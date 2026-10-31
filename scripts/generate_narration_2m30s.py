import asyncio
import os
import subprocess
import json
from datetime import timedelta
import edge_tts
from edge_tts.submaker import SubMaker

WORK_DIR = os.path.abspath('brag-output/work')
BRAG_DIR = os.path.abspath('brag-output')
os.makedirs(WORK_DIR, exist_ok=True)
os.makedirs(BRAG_DIR, exist_ok=True)

# 9 Scenes designed for exactly 2 minutes 30 seconds total duration (150 seconds)
# Uses simple everyday words, clear sentences, and natural unhurried speech.
SCENES = [
    {
        "id": "scene_01_intro",
        "title": "System Introduction & Sensors",
        "text": (
            "Welcome to PulseGuard, a simple and smart remote patient monitoring system. "
            "An ESP32 microcontroller connects to heart rate, oxygen, and temperature sensors on the patient. "
            "These vital signs are sent over Wi-Fi to ThingSpeak cloud, "
            "where our backend delivers them straight to your web browser in real time."
        )
    },
    {
        "id": "scene_02_auth",
        "title": "Login & Dual Portals",
        "text": (
            "PulseGuard has two simple portals: one for patients and one for doctors. "
            "With a single click, users can sign in to view their personal health or manage their hospital ward."
        )
    },
    {
        "id": "scene_03_vitals",
        "title": "Patient Portal: Live Vital Signs",
        "text": (
            "On the patient dashboard, clear cards show your current heart rate, blood oxygen level, and body temperature. "
            "The heart icon pulses with every beat, helping patients know their vitals are in a safe range. "
            "If the sensor is detached or stops sending data, the screen clearly warns that the device is offline."
        )
    },
    {
        "id": "scene_04_ppg",
        "title": "Patient Portal: Live Pulse Wave",
        "text": (
            "This is the live pulse graph, drawing each heartbeat as a smooth, natural wave across the screen. "
            "It helps you see the rhythm of your heart clearly. "
            "You can easily adjust the zoom level from five to thirty seconds, turn on sound beeps, "
            "and see clear labels confirming the wave status."
        )
    },
    {
        "id": "scene_05_graphs",
        "title": "Patient Portal: Past Trends & Big Window",
        "text": (
            "Below the live pulse, simple trend graphs track your health changes over time. "
            "This makes it easy to compare today readings with earlier hours. "
            "You can click any graph to open a big window to inspect your readings in detail."
        )
    },
    {
        "id": "scene_06_emergency",
        "title": "Patient Portal: Nearby Hospitals & Emergency",
        "text": (
            "If you ever need urgent help, PulseGuard automatically finds the nearest hospitals using your device location. "
            "It calculates the exact driving distance for you. "
            "You can tap once to call emergency services like 108, or open turn-by-turn driving directions on Google Maps."
        )
    },
    {
        "id": "scene_07_profile",
        "title": "Patient Portal: Profile & Edit Contacts",
        "text": (
            "In the profile section, patients can check their medical details and device settings. "
            "You can click Edit Profile to quickly update your phone number and emergency contacts, "
            "and save them with one tap."
        )
    },
    {
        "id": "scene_08_doctor",
        "title": "Doctor Portal: Patient Roster & Triage",
        "text": (
            "Switching to the doctor portal gives doctors a clean overview of all their patients in one place. "
            "Doctors can search patient names and check vital trends quickly. "
            "Color badges show right away who is stable, who has a warning, and who needs urgent attention."
        )
    },
    {
        "id": "scene_09_conclusion",
        "title": "Doctor Portal: Patient View & Wrap-Up",
        "text": (
            "Doctors can click any patient to see their live pulse wave and complete vital history in real time. "
            "PulseGuard makes remote patient monitoring simple, clear, and dependable for everyone."
        )
    }
]

def format_timestamp(td: timedelta) -> str:
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    millis = int(td.microseconds / 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"

async def main():
    print("=== Generating 2m 30s Master Audio & Subtitles ===")
    scene_durations = {}
    master_srt_entries = []
    current_time_offset = timedelta(seconds=0)
    srt_counter = 1

    for idx, scene in enumerate(SCENES, 1):
        scene_id = scene["id"]
        out_mp3 = os.path.join(WORK_DIR, f"{scene_id}.mp3")
        print(f"[{idx}/9] Generating {scene_id}...")

        # Calm, deliberate speed: rate='-4%'
        comm = edge_tts.Communicate(scene["text"], "en-US-ChristopherNeural", rate="-4%")
        submaker = SubMaker()

        with open(out_mp3, "wb") as f:
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
                    submaker.feed(chunk)

        # Scene cue duration
        dur = 0.0
        for cue in submaker.cues:
            if cue.end.total_seconds() > dur:
                dur = cue.end.total_seconds()

        scene_durations[scene_id] = dur
        print(f" -> Duration: {dur:.2f}s ({len(submaker.cues)} cues)")

        for cue in submaker.cues:
            start_ts = format_timestamp(cue.start + current_time_offset)
            end_ts = format_timestamp(cue.end + current_time_offset)
            text = cue.content.strip()
            master_srt_entries.append(f"{srt_counter}\n{start_ts} --> {end_ts}\n{text}\n")
            srt_counter += 1

        current_time_offset += timedelta(seconds=dur)

    total_duration = current_time_offset.total_seconds()
    print(f"\nTOTAL VOICE DURATION: {total_duration:.2f}s ({int(total_duration//60)}m {int(total_duration%60)}s)")

    # Save metadata & subtitles
    with open(os.path.join(WORK_DIR, "scene_durations.json"), "w") as f:
        json.dump(scene_durations, f, indent=2)

    master_srt_path = os.path.join(WORK_DIR, "master_subtitles.srt")
    with open(master_srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(master_srt_entries))

    with open(os.path.join(BRAG_DIR, "brag.srt"), "w", encoding="utf-8") as f:
        f.write("\n".join(master_srt_entries))

    # Concat voice
    list_path = os.path.join(WORK_DIR, 'voice_list.txt')
    with open(list_path, 'w', encoding='utf-8') as f:
        for i in range(1, 10):
            matched = [fn for fn in os.listdir(WORK_DIR) if fn.startswith(f'scene_0{i}') and fn.endswith('.mp3')][0]
            full_mp3_path = os.path.join(WORK_DIR, matched).replace('\\', '/')
            f.write(f"file '{full_mp3_path}'\n")

    voice_wav = os.path.join(WORK_DIR, 'voice_full.wav')
    subprocess.run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list_path, '-c:a', 'pcm_s16le', voice_wav], check=True)

    # Mix with background music (fade out 3.5s before end)
    music_path = os.path.join(WORK_DIR, 'music.mp3')
    master_audio = os.path.join(WORK_DIR, 'master_audio.m4a')
    fade_start = max(0, total_duration - 3.5)

    cmd_mix = [
        'ffmpeg', '-y',
        '-i', voice_wav,
        '-stream_loop', '-1', '-i', music_path,
        '-filter_complex',
        f'[0:a]volume=1.25[v];[1:a]volume=0.07,afade=t=out:st={fade_start:.2f}:d=3.5[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[a]',
        '-map', '[a]',
        '-c:a', 'aac', '-b:a', '192k',
        '-t', f'{total_duration:.2f}',
        master_audio
    ]
    subprocess.run(cmd_mix, check=True)
    print(f"Master audio created: {master_audio} ({total_duration:.2f}s)")

if __name__ == '__main__':
    asyncio.run(main())

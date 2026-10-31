import asyncio
import os
import edge_tts
from edge_tts.submaker import SubMaker
from datetime import timedelta

WORK_DIR = os.path.abspath('brag-output/work')
os.makedirs(WORK_DIR, exist_ok=True)

# 9 Detailed scenes written for a clear, professional medical-tech explainer
# Paced deliberately (rate='-3%') to explain every single function without rushing.
SCENES = [
    {
        "id": "scene_01_intro",
        "title": "System Architecture & IoT Hardware",
        "text": (
            "Welcome to PulseGuard, an intelligent end-to-end remote patient monitoring platform. "
            "The system is powered by an ESP32 wireless microcontroller, paired with a MAX30102 optical pulse oximeter "
            "and a high-precision digital temperature sensor. "
            "Real-time physiological measurements are transmitted continuously over Wi-Fi to ThingSpeak Cloud IoT channel 3110138. "
            "On the server side, an asynchronous FastAPI backend continuously ingests, validates, and serves this live telemetry "
            "through high-speed RESTful endpoints to a modern, reactive web application built with React and Tailwind CSS."
        )
    },
    {
        "id": "scene_02_auth",
        "title": "Secure Dual-Portal Authentication",
        "text": (
            "PulseGuard features a secure dual-portal access model designed for both patients and healthcare providers. "
            "From the central authentication gateway, users can enter either the Patient Portal or the clinical Doctor Portal. "
            "Role-based access control guarantees strict privacy, session persistence, and full segregation of clinical controls. "
            "A single click allows authorized personnel to navigate seamlessly between patient biometrics and institutional dashboards."
        )
    },
    {
        "id": "scene_03_vitals",
        "title": "Patient Portal: Live Biometric Telemetry",
        "text": (
            "Entering the Patient Portal, the dashboard immediately displays real-time biometric telemetry cards. "
            "Heart rate is monitored continuously in beats per minute, accompanied by an animated cardiac pulsing indicator. "
            "Blood oxygen saturation, or SpO2, provides instantaneous awareness of respiratory health and clinical hypoxia levels. "
            "Body temperature is tracked with precision in both Celsius and Fahrenheit. "
            "Crucially, the hardware connection status monitors live sensor heartbeats. "
            "If no sensor packet is received within ninety seconds, the system intelligently flags the device as inactive, "
            "preventing stale readings from being mistaken for active telemetry."
        )
    },
    {
        "id": "scene_04_ppg",
        "title": "Live 100 Hz Continuous PPG Waveform Engine",
        "text": (
            "At the core of the dashboard is the high-fidelity Photoplethysmogram waveform engine, rendering at one hundred Hertz. "
            "The canvas portrays true arterial hemodynamics, including a rapid systolic upstroke, a distinct dicrotic notch, "
            "and smooth diastolic runoff. "
            "Users can fine-tune visualization with interactive gain magnification ranging from half-power to double amplitude, "
            "and adjust the display window between five, ten, and thirty seconds. "
            "An optional cardiac audio tone provides audible pulse synchronization. "
            "Furthermore, an explicit transparency badge clearly informs users when physiological waveform simulation is active, "
            "maintaining absolute medical and algorithmic integrity."
        )
    },
    {
        "id": "scene_05_graphs",
        "title": "Longitudinal Trends & High-Resolution Modal",
        "text": (
            "Below the live pulse monitor, historical multi-metric trend graphs track physiological trajectories over time. "
            "Heart rate, oxygen saturation, and body temperature are plotted simultaneously to reveal subtle clinical changes. "
            "By clicking the expand control, the user opens the high-resolution Big Window modal. "
            "This expanded workspace delivers fine-grained longitudinal inspection, cross-metric comparison, and deep data analysis "
            "without visual obstruction."
        )
    },
    {
        "id": "scene_06_emergency",
        "title": "Emergency Response & Hospital Locator",
        "text": (
            "For urgent situations, PulseGuard incorporates an intelligent emergency response engine. "
            "Leveraging real-time browser GPS geolocation, the system determines the patient's exact geographical coordinates. "
            "Using the Haversine mathematical model, it instantly computes driving distances to the closest trauma centers "
            "and hospital emergency departments. "
            "Patients have direct one-touch triggers to dial emergency services like 108 or 911, "
            "or launch immediate turn-by-turn navigation routes directly in Google Maps."
        )
    },
    {
        "id": "scene_07_profile",
        "title": "Interactive Medical Profile Management",
        "text": (
            "The profile section consolidates critical patient health records and IoT device specifications. "
            "It displays personal demographics, blood group, chronic conditions, and primary emergency contacts. "
            "Patients can easily update their phone numbers, primary caregivers, and clinical notes directly through "
            "an interactive editing interface with persistent local saving. "
            "It also details active device telemetry metadata, including the ESP32 MAC address and firmware revision."
        )
    },
    {
        "id": "scene_08_doctor",
        "title": "Doctor Portal: Multi-Patient Clinical Triage",
        "text": (
            "Switching over to the Doctor Portal reveals a centralized clinical triage center designed for hospital teams. "
            "Physicians can monitor an entire ward of patients from a single intuitive command station. "
            "Automated triage algorithms categorize patient stability with color-coded status badges: "
            "green for stable vitals, amber for warning thresholds, and flashing red for critical alarms. "
            "Doctors can rapidly search patient rosters, review sparkline trend lines, and identify patients requiring immediate intervention."
        )
    },
    {
        "id": "scene_09_conclusion",
        "title": "Clinical Telemetry Console & Summary",
        "text": (
            "Selecting an individual patient opens the comprehensive clinical telemetry console. "
            "Here, medical professionals inspect synchronized high-resolution waveforms alongside comprehensive physiological histories. "
            "Automated clinical alert banners trigger instantly whenever vitals exceed safe hemodynamic thresholds. "
            "PulseGuard successfully bridges smart IoT hardware with hospital-grade telemedicine software, "
            "empowering patients at home while giving physicians the continuous data needed to deliver proactive, life-saving care."
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

async def generate_all_scenes():
    print("=== Generating Voiceovers with edge-tts (Natural Pace: rate='-3%') ===")
    scene_durations = {}
    master_srt_entries = []
    current_time_offset = timedelta(seconds=0)
    srt_counter = 1

    for idx, scene in enumerate(SCENES, 1):
        scene_id = scene["id"]
        out_mp3 = os.path.join(WORK_DIR, f"{scene_id}.mp3")
        print(f"\n[{idx}/9] Generating {scene_id} - {scene['title']}...")
        
        # Use ChristopherNeural with natural relaxed pacing
        comm = edge_tts.Communicate(scene["text"], "en-US-ChristopherNeural", rate="-3%")
        submaker = SubMaker()
        
        with open(out_mp3, "wb") as f:
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
                    submaker.feed(chunk)
                    
        # Check scene duration from cues or ffprobe
        scene_cue_duration = timedelta(seconds=0)
        for cue in submaker.cues:
            if cue.end > scene_cue_duration:
                scene_cue_duration = cue.end
                
        # If cues empty (fallback), estimate duration
        if scene_cue_duration.total_seconds() == 0:
            import subprocess
            res = subprocess.run(['ffmpeg', '-i', out_mp3], stderr=subprocess.PIPE, text=True)
            for line in res.stderr.split('\n'):
                if 'Duration:' in line:
                    part = line.split('Duration:')[1].split(',')[0].strip()
                    h, m, s = part.split(':')
                    scene_cue_duration = timedelta(seconds=float(h)*3600 + float(m)*60 + float(s))
                    break

        dur_sec = scene_cue_duration.total_seconds()
        scene_durations[scene_id] = dur_sec
        print(f" -> Duration: {dur_sec:.2f}s ({len(submaker.cues)} subtitle cues)")

        # Build master subtitles with offset
        for cue in submaker.cues:
            start_ts = format_timestamp(cue.start + current_time_offset)
            end_ts = format_timestamp(cue.end + current_time_offset)
            text = cue.content.strip()
            master_srt_entries.append(f"{srt_counter}\n{start_ts} --> {end_ts}\n{text}\n")
            srt_counter += 1

        current_time_offset += scene_cue_duration

    # Write master SRT file
    master_srt_path = os.path.join(WORK_DIR, "master_subtitles.srt")
    with open(master_srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(master_srt_entries))
    print(f"\nMaster subtitles written to: {master_srt_path} ({len(master_srt_entries)} entries)")

    # Also save to brag-output/brag.srt
    with open(os.path.join(os.path.abspath('brag-output'), "brag.srt"), "w", encoding="utf-8") as f:
        f.write("\n".join(master_srt_entries))

    total_duration = current_time_offset.total_seconds()
    print(f"\n==========================================")
    print(f"TOTAL NARRATION DURATION: {total_duration:.2f}s")
    print(f"That is {int(total_duration // 60)} minutes and {int(total_duration % 60)} seconds.")
    print(f"==========================================")
    
    # Save durations metadata
    import json
    with open(os.path.join(WORK_DIR, "scene_durations.json"), "w") as f:
        json.dump(scene_durations, f, indent=2)

if __name__ == '__main__':
    asyncio.run(generate_all_scenes())

"""
PulseGuard RPM — Database & Historical Telemetry Seeding Pipeline
Generates:
1. SQLite Database: backend/data/pulseguard.db
2. Backend JSON Cache: backend/services/mock_sessions_data.json
3. Frontend TypeScript Data: src/data/historicalSessionsData.ts
4. Patient Accounts with secure salt + SHA256 password hashing

Schedule:
- Hithesh (21): Oct 5, 8, 12, 2026
- Rithesh (21): Oct 14, 17, 20, 2026
- Ankush (21): Oct 22, 24, 26, 2026
- Harthik (21): Oct 27, 28, 29, 2026

Sessions per day:
- Morning: 08:00:00 to 11:30:00 (3.5 hours = 210 mins = 841 points @ 15s)
- Evening: 17:00:00 to 20:30:00 (3.5 hours = 210 mins = 841 points @ 15s)
Total: 24 sessions * 841 points = 20,184 readings
"""

import os
import json
import sqlite3
import hashlib
import math
import random
from datetime import datetime, timedelta

# Fix random seed for reproducibility
random.seed(42)

DB_PATH = os.path.join("backend", "data", "pulseguard.db")
BACKEND_JSON_PATH = os.path.join("backend", "services", "mock_sessions_data.json")
FRONTEND_TS_PATH = os.path.join("src", "data", "historicalSessionsData.ts")

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(os.path.dirname(BACKEND_JSON_PATH), exist_ok=True)
os.makedirs(os.path.dirname(FRONTEND_TS_PATH), exist_ok=True)

def hash_password(password: str, salt: str = "pulseguard_salt_2026") -> str:
    """Computes salted SHA-256 password hash."""
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

PATIENTS_SPEC = [
    {
        "id": "P-101",
        "name": "Hithesh",
        "age": 21,
        "gender": "Male",
        "email": "hithesh@pulseguard.com",
        "username": "hithesh",
        "password": "Password@123",
        "contact_number": "+91 98451 10101",
        "device_id": "PG-101",
        "room": "Telemetry Suite A / Bed 101",
        "ward": "Cardio-Metabolic Youth Cohort",
        "emergency_contact": "Suresh (Father)",
        "emergency_phone": "+91 98450 11011",
        "admission_date": "2026-10-01",
        "dates": ["2026-10-05", "2026-10-08", "2026-10-12"],
        "baseline_hr": 72,
        "baseline_spo2": 98.2,
        "baseline_temp": 36.8,
        "baseline_sys": 118,
        "baseline_dia": 78,
        "baseline_resp": 16,
        "abnormal_event": {
            "date": "2026-10-08",
            "session": "Morning",
            "start_idx": 360, # 09:30:00 (90 mins in = 360 points)
            "duration": 40,   # 40 points = 10 mins (until 09:40:00)
            "type": "Mild Transient Sinus Tachycardia",
            "hr_delta": 42.0,  # HR reaches ~114 BPM
            "spo2_delta": -0.8,
            "temp_delta": 0.2,
            "sys_delta": 10,
            "dia_delta": 6,
            "resp_delta": 5,
            "description": "Mild transient sinus tachycardia episode (~10 min). Normal baseline restored spontaneously."
        }
    },
    {
        "id": "P-102",
        "name": "Rithesh",
        "age": 21,
        "gender": "Male",
        "email": "rithesh@pulseguard.com",
        "username": "rithesh",
        "password": "Password@123",
        "contact_number": "+91 98452 20202",
        "device_id": "PG-102",
        "room": "Telemetry Suite A / Bed 102",
        "ward": "Cardio-Metabolic Youth Cohort",
        "emergency_contact": "Mahesh (Father)",
        "emergency_phone": "+91 98450 22022",
        "admission_date": "2026-10-10",
        "dates": ["2026-10-14", "2026-10-17", "2026-10-20"],
        "baseline_hr": 70,
        "baseline_spo2": 98.6,
        "baseline_temp": 36.7,
        "baseline_sys": 116,
        "baseline_dia": 76,
        "baseline_resp": 15,
        "abnormal_event": None # All 6 sessions completely normal baseline
    },
    {
        "id": "P-103",
        "name": "Ankush",
        "age": 21,
        "gender": "Male",
        "email": "ankush@pulseguard.com",
        "username": "ankush",
        "password": "Password@123",
        "contact_number": "+91 98453 30303",
        "device_id": "PG-103",
        "room": "Telemetry Suite B / Bed 201",
        "ward": "Cardio-Metabolic Youth Cohort",
        "emergency_contact": "Rajesh (Father)",
        "emergency_phone": "+91 98450 33033",
        "admission_date": "2026-10-18",
        "dates": ["2026-10-22", "2026-10-24", "2026-10-26"],
        "baseline_hr": 74,
        "baseline_spo2": 98.4,
        "baseline_temp": 36.8,
        "baseline_sys": 120,
        "baseline_dia": 78,
        "baseline_resp": 16,
        "abnormal_event": {
            "date": "2026-10-24",
            "session": "Evening",
            "start_idx": 420, # 18:45:00 (105 mins in)
            "duration": 40,   # 10 mins (until 18:55:00)
            "type": "Mild Transient Desaturation",
            "hr_delta": 11.0,
            "spo2_delta": -6.2, # SpO2 dips to ~92-93%
            "temp_delta": 0.1,
            "sys_delta": 4,
            "dia_delta": 2,
            "resp_delta": 3,
            "description": "Mild transient desaturation episode (~10 min) with mild compensatory tachycardia. SpO2 resolved back to 98%."
        }
    },
    {
        "id": "P-104",
        "name": "Harthik",
        "age": 21,
        "gender": "Male",
        "email": "harthik@pulseguard.com",
        "username": "harthik",
        "password": "Password@123",
        "contact_number": "+91 98454 40404",
        "device_id": "PG-104",
        "room": "Telemetry Suite B / Bed 202",
        "ward": "Cardio-Metabolic Youth Cohort",
        "emergency_contact": "Sunil (Father)",
        "emergency_phone": "+91 98450 44044",
        "admission_date": "2026-10-22",
        "dates": ["2026-10-27", "2026-10-28", "2026-10-29"],
        "baseline_hr": 73,
        "baseline_spo2": 98.0,
        "baseline_temp": 36.8,
        "baseline_sys": 119,
        "baseline_dia": 79,
        "baseline_resp": 16,
        "abnormal_event": {
            "date": "2026-10-28",
            "session": "Morning",
            "start_idx": 540, # 10:15:00 (135 mins in)
            "duration": 40,   # 10 mins (until 10:25:00)
            "type": "Transient Low-Grade Thermal Elevation",
            "hr_delta": 14.0,  # HR ~87 BPM
            "spo2_delta": -0.6,
            "temp_delta": 1.2, # Temp ~38.0 °C
            "sys_delta": 5,
            "dia_delta": 3,
            "resp_delta": 2,
            "description": "Transient low-grade temperature elevation (~10 min, peak 38.0°C) with mild sinus tachycardia. Resolved without intervention."
        }
    }
]

SESSION_SCHEDULES = [
    {
        "type": "Morning",
        "label": "Morning Session (8:00 AM – 11:30 AM)",
        "start_hour": 8,
        "start_min": 0,
        "end_hour": 11,
        "end_min": 30,
        "duration_minutes": 210,
    },
    {
        "type": "Evening",
        "label": "Evening Session (5:00 PM – 8:30 PM)",
        "start_hour": 17,
        "start_min": 0,
        "end_hour": 20,
        "end_min": 30,
        "duration_minutes": 210,
    }
]

def generate_session_readings(patient: dict, date_str: str, session_sched: dict):
    """
    Generates 841 discrete time-series points at 15-second intervals.
    Includes natural physiological wander + gaussian noise + Bell-curve shaped abnormal episodes.
    """
    start_dt = datetime.strptime(f"{date_str} {session_sched['start_hour']:02d}:{session_sched['start_min']:02d}:00", "%Y-%m-%d %H:%M:%S")
    num_points = 841 # 210 minutes * 4 points/min + 1 point for endpoint
    
    abnormal = patient.get("abnormal_event")
    is_abnormal_session = (
        abnormal is not None
        and abnormal["date"] == date_str
        and abnormal["session"] == session_sched["type"]
    )
    
    readings = []
    
    base_hr = patient["baseline_hr"]
    base_spo2 = patient["baseline_spo2"]
    base_temp = patient["baseline_temp"]
    base_sys = patient["baseline_sys"]
    base_dia = patient["baseline_dia"]
    base_resp = patient["baseline_resp"]
    
    # Phase shifts for continuous natural oscillation
    phase_hr = random.uniform(0, 2 * math.pi)
    phase_temp = random.uniform(0, 2 * math.pi)
    
    for i in range(num_points):
        curr_dt = start_dt + timedelta(seconds=i * 15)
        iso_str = curr_dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")
        time_label = curr_dt.strftime("%I:%M:%S %p")
        
        # 1. Natural slow sinusoidal drift (respiratory sinus arrhythmia & metabolic slow waves)
        t_sec = i * 15
        slow_hr_drift = 2.8 * math.sin(2 * math.pi * t_sec / 1800 + phase_hr) + 1.2 * math.cos(2 * math.pi * t_sec / 450)
        slow_temp_drift = 0.15 * math.sin(2 * math.pi * t_sec / 3600 + phase_temp)
        slow_spo2_drift = 0.4 * math.sin(2 * math.pi * t_sec / 2400)
        
        # 2. Gaussian measurement noise
        noise_hr = random.gauss(0, 0.9)
        noise_spo2 = random.gauss(0, 0.25)
        noise_temp = random.gauss(0, 0.04)
        noise_sys = random.gauss(0, 1.2)
        noise_dia = random.gauss(0, 0.8)
        noise_resp = random.gauss(0, 0.5)
        
        # 3. Abnormal episode evaluation (Smooth bell-curve / Gaussian peak over ~10 minutes)
        abn_flag = False
        abn_reason = None
        abn_hr_add = 0.0
        abn_spo2_add = 0.0
        abn_temp_add = 0.0
        abn_sys_add = 0.0
        abn_dia_add = 0.0
        abn_resp_add = 0.0
        
        if is_abnormal_session:
            s_idx = abnormal["start_idx"]
            dur = abnormal["duration"]
            e_idx = s_idx + dur
            
            if s_idx <= i <= e_idx:
                abn_flag = True
                abn_reason = abnormal["type"] + " (Synthetic Demo Event)"
                # Bell curve envelope: centered at middle of episode
                mid = s_idx + dur / 2.0
                sigma = dur / 4.0
                envelope = math.exp(-0.5 * ((i - mid) / sigma) ** 2)
                
                abn_hr_add = abnormal.get("hr_delta", 0.0) * envelope
                abn_spo2_add = abnormal.get("spo2_delta", 0.0) * envelope
                abn_temp_add = abnormal.get("temp_delta", 0.0) * envelope
                abn_sys_add = abnormal.get("sys_delta", 0.0) * envelope
                abn_dia_add = abnormal.get("dia_delta", 0.0) * envelope
                abn_resp_add = abnormal.get("resp_delta", 0.0) * envelope
        
        # Final vital signs
        final_hr = int(round(base_hr + slow_hr_drift + noise_hr + abn_hr_add))
        final_hr = max(55, min(145, final_hr))
        
        final_spo2 = round(base_spo2 + slow_spo2_drift + noise_spo2 + abn_spo2_add, 1)
        final_spo2 = max(88.0, min(100.0, final_spo2))
        
        final_temp = round(base_temp + slow_temp_drift + noise_temp + abn_temp_add, 2)
        final_temp = max(35.8, min(39.5, final_temp))
        
        final_sys = int(round(base_sys + (slow_hr_drift * 0.4) + noise_sys + abn_sys_add))
        final_dia = int(round(base_dia + (slow_hr_drift * 0.2) + noise_dia + abn_dia_add))
        
        final_resp = int(round(base_resp + (slow_hr_drift * 0.1) + noise_resp + abn_resp_add))
        final_resp = max(10, min(32, final_resp))
        
        readings.append({
            "timestamp": iso_str,
            "timeLabel": time_label,
            "heartRate": final_hr,
            "spo2": final_spo2,
            "temperature": final_temp,
            "bloodPressureSystolic": final_sys,
            "bloodPressureDiastolic": final_dia,
            "respirationRate": final_resp,
            "isAbnormal": abn_flag,
            "abnormalReason": abn_reason,
            "index": i
        })
        
    return readings, is_abnormal_session, abnormal.get("description") if is_abnormal_session else None

def seed_all():
    print("=========================================================")
    print("   PULSEGUARD RPM — HISTORICAL SEEDING PIPELINE          ")
    print("=========================================================")
    
    # 1. Initialize SQLite Database
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print(f"[SQLite] Removed prior database at {DB_PATH}")
        except Exception as e:
            print(f"[SQLite] Warning cleaning db: {e}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL,
        patient_id TEXT,
        created_at TEXT NOT NULL
    );
    """)
    
    cursor.execute("""
    CREATE TABLE patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        contact_number TEXT NOT NULL,
        device_id TEXT NOT NULL,
        room TEXT NOT NULL,
        ward TEXT NOT NULL,
        assigned_doctor TEXT NOT NULL,
        admission_date TEXT NOT NULL,
        emergency_contact TEXT NOT NULL,
        emergency_phone TEXT NOT NULL,
        status TEXT NOT NULL,
        is_synthetic INTEGER NOT NULL DEFAULT 1
    );
    """)
    
    cursor.execute("""
    CREATE TABLE monitoring_sessions (
        session_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        date TEXT NOT NULL,
        session_type TEXT NOT NULL,
        session_label TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        point_count INTEGER NOT NULL,
        has_abnormal_event INTEGER NOT NULL,
        abnormal_description TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE vital_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        time_label TEXT NOT NULL,
        heart_rate INTEGER NOT NULL,
        spo2 REAL NOT NULL,
        temperature REAL NOT NULL,
        bp_systolic INTEGER NOT NULL,
        bp_diastolic INTEGER NOT NULL,
        respiration_rate INTEGER NOT NULL,
        is_abnormal INTEGER NOT NULL,
        abnormal_reason TEXT,
        FOREIGN KEY (session_id) REFERENCES monitoring_sessions(session_id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    """)
    
    # Insert Doctor Account
    doctor_salt = "pulseguard_doc_salt"
    doc_hash = hash_password("password123", doctor_salt)
    cursor.execute("""
    INSERT INTO users (id, name, email, username, password_hash, salt, role, patient_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("DOC-001", "Dr. Anil Kumar", "doctor@pulseguard.com", "doctor", doc_hash, doctor_salt, "DOCTOR", None, "2026-08-01T00:00:00Z"))

    # Insert Genuine Patient P-001 (Ramesh Kumar - Hardware Node)
    p001_salt = "pulseguard_p001_salt"
    p001_hash = hash_password("password123", p001_salt)
    cursor.execute("""
    INSERT INTO users (id, name, email, username, password_hash, salt, role, patient_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("P-001", "Ramesh Kumar", "patient@pulseguard.com", "patient", p001_hash, p001_salt, "PATIENT", "P-001", "2026-08-24T00:00:00Z"))

    cursor.execute("""
    INSERT INTO patients (id, name, age, gender, email, contact_number, device_id, room, ward, assigned_doctor, admission_date, emergency_contact, emergency_phone, status, is_synthetic)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("P-001", "Ramesh Kumar", 58, "Male", "patient@pulseguard.com", "+91 98450 67890", "PG-001", "Home Telemetry / Room 204", "Cardiology Tele-Health", "Dr. Anil Kumar", "2026-08-24", "Sunita Kumar (Wife)", "+91 98450 67890", "OFFLINE", 0))

    # Data structures for JSON and TS generation
    all_sessions_manifest = []
    sessions_by_patient = {}
    
    total_readings_count = 0
    
    for pat in PATIENTS_SPEC:
        p_id = pat["id"]
        salt = f"salt_{p_id}_2026"
        p_hash = hash_password(pat["password"], salt)
        
        # Insert user account
        cursor.execute("""
        INSERT INTO users (id, name, email, username, password_hash, salt, role, patient_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (p_id, pat["name"], pat["email"], pat["username"], p_hash, salt, "PATIENT", p_id, "2026-10-01T00:00:00Z"))
        
        # Insert patient record
        cursor.execute("""
        INSERT INTO patients (id, name, age, gender, email, contact_number, device_id, room, ward, assigned_doctor, admission_date, emergency_contact, emergency_phone, status, is_synthetic)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (p_id, pat["name"], pat["age"], pat["gender"], pat["email"], pat["contact_number"], pat["device_id"], pat["room"], pat["ward"], "Dr. Anil Kumar", pat["admission_date"], pat["emergency_contact"], pat["emergency_phone"], "OFFLINE", 1))

        sessions_by_patient[p_id] = {
            "patientInfo": {
                "id": p_id,
                "name": pat["name"],
                "age": pat["age"],
                "gender": pat["gender"],
                "email": pat["email"],
                "username": pat["username"],
                "contactNumber": pat["contact_number"],
                "deviceId": pat["device_id"],
                "room": pat["room"],
                "ward": pat["ward"],
                "assignedDoctor": "Dr. Anil Kumar",
                "admissionDate": pat["admission_date"],
                "emergencyContact": pat["emergency_contact"],
                "emergencyPhone": pat["emergency_phone"],
                "dates": pat["dates"],
                "isSynthetic": True
            },
            "sessions": []
        }

        # Generate 6 sessions (3 dates x 2 sessions)
        for date_str in pat["dates"]:
            for sched in SESSION_SCHEDULES:
                sess_type = sched["type"]
                session_id = f"SESS-{p_id}-{date_str.replace('-', '')}-{sess_type[0]}"
                readings, has_abnormal, abn_desc = generate_session_readings(pat, date_str, sched)
                
                start_iso = readings[0]["timestamp"]
                end_iso = readings[-1]["timestamp"]
                point_count = len(readings)
                
                # Insert session manifest
                cursor.execute("""
                INSERT INTO monitoring_sessions (
                    session_id, patient_id, date, session_type, session_label,
                    start_time, end_time, duration_minutes, point_count,
                    has_abnormal_event, abnormal_description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    session_id, p_id, date_str, sess_type, sched["label"],
                    start_iso, end_iso, sched["duration_minutes"], point_count,
                    1 if has_abnormal else 0, abn_desc
                ))
                
                # Batch insert readings
                db_readings = [
                    (
                        session_id, p_id, r["timestamp"], r["timeLabel"],
                        r["heartRate"], r["spo2"], r["temperature"],
                        r["bloodPressureSystolic"], r["bloodPressureDiastolic"],
                        r["respirationRate"], 1 if r["isAbnormal"] else 0, r["abnormalReason"]
                    )
                    for r in readings
                ]
                
                cursor.executemany("""
                INSERT INTO vital_readings (
                    session_id, patient_id, timestamp, time_label,
                    heart_rate, spo2, temperature,
                    bp_systolic, bp_diastolic, respiration_rate,
                    is_abnormal, abnormal_reason
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, db_readings)
                
                total_readings_count += len(readings)
                
                # Compute session summary statistics
                hr_vals = [r["heartRate"] for r in readings]
                spo2_vals = [r["spo2"] for r in readings]
                temp_vals = [r["temperature"] for r in readings]
                sys_vals = [r["bloodPressureSystolic"] for r in readings]
                dia_vals = [r["bloodPressureDiastolic"] for r in readings]
                resp_vals = [r["respirationRate"] for r in readings]
                
                session_meta = {
                    "sessionId": session_id,
                    "patientId": p_id,
                    "patientName": pat["name"],
                    "date": date_str,
                    "sessionType": sess_type,
                    "sessionLabel": sched["label"],
                    "startTime": start_iso,
                    "endTime": end_iso,
                    "durationMinutes": sched["duration_minutes"],
                    "pointCount": point_count,
                    "hasAbnormalEvent": has_abnormal,
                    "abnormalDescription": abn_desc,
                    "stats": {
                        "heartRate": {
                            "min": min(hr_vals),
                            "max": max(hr_vals),
                            "avg": round(sum(hr_vals) / len(hr_vals), 1)
                        },
                        "spo2": {
                            "min": min(spo2_vals),
                            "max": max(spo2_vals),
                            "avg": round(sum(spo2_vals) / len(spo2_vals), 1)
                        },
                        "temperature": {
                            "min": min(temp_vals),
                            "max": max(temp_vals),
                            "avg": round(sum(temp_vals) / len(temp_vals), 2)
                        },
                        "bloodPressureSystolic": {
                            "min": min(sys_vals),
                            "max": max(sys_vals),
                            "avg": round(sum(sys_vals) / len(sys_vals), 1)
                        },
                        "bloodPressureDiastolic": {
                            "min": min(dia_vals),
                            "max": max(dia_vals),
                            "avg": round(sum(dia_vals) / len(dia_vals), 1)
                        },
                        "respirationRate": {
                            "min": min(resp_vals),
                            "max": max(resp_vals),
                            "avg": round(sum(resp_vals) / len(resp_vals), 1)
                        }
                    },
                    "readings": readings
                }
                
                all_sessions_manifest.append({
                    "sessionId": session_id,
                    "patientId": p_id,
                    "patientName": pat["name"],
                    "date": date_str,
                    "sessionType": sess_type,
                    "sessionLabel": sched["label"],
                    "startTime": start_iso,
                    "endTime": end_iso,
                    "durationMinutes": sched["duration_minutes"],
                    "pointCount": point_count,
                    "hasAbnormalEvent": has_abnormal,
                    "abnormalDescription": abn_desc,
                    "stats": session_meta["stats"]
                })
                
                sessions_by_patient[p_id]["sessions"].append(session_meta)
                print(f"  + Generated Session {session_id} ({pat['name']}, {date_str} {sess_type}) -> {point_count} pts [Abnormal: {has_abnormal}]")

    conn.commit()
    conn.close()
    print(f"\n[SQLite] Seeded successfully into {DB_PATH}")
    print(f"  Total Patients: 4 mock + 1 hardware (Ramesh Kumar)")
    print(f"  Total Monitoring Sessions: 24 (6 per mock patient)")
    print(f"  Total Physiological Readings: {total_readings_count}")

    # 2. Write Backend JSON Cache
    backend_payload = {
        "metadata": {
            "version": "2.4.0",
            "type": "SYNTHETIC DEMO HISTORICAL MONITORING DATA",
            "totalSessions": 24,
            "totalReadings": total_readings_count,
            "samplingIntervalSeconds": 15,
            "generatedAt": datetime.now().isoformat()
        },
        "sessionsManifest": all_sessions_manifest,
        "patientsData": sessions_by_patient
    }
    with open(BACKEND_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(backend_payload, f, indent=2)
    print(f"[Backend JSON] Written to {BACKEND_JSON_PATH}")

    # 3. Write Frontend TypeScript Cache (src/data/historicalSessionsData.ts)
    ts_code = f"""/**
 * PULSEGUARD RPM — HISTORICAL VITAL MONITORING REPOSITORY
 * 
 * Synchronized with SQLite database (backend/data/pulseguard.db).
 * Contains exactly 24 historical sessions (6 per patient) across October 2026.
 * Sampling Interval: 15 seconds (841 readings per session, 20,184 readings total).
 * 
 * LABELED AS: SYNTHETIC DEMO DATA
 */

export interface HistoricalReading {{
  timestamp: string;
  timeLabel: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  respirationRate: number;
  isAbnormal: boolean;
  abnormalReason?: string | null;
  index: number;
}}

export interface VitalMetricStats {{
  min: number;
  max: number;
  avg: number;
}}

export interface SessionStats {{
  heartRate: VitalMetricStats;
  spo2: VitalMetricStats;
  temperature: VitalMetricStats;
  bloodPressureSystolic: VitalMetricStats;
  bloodPressureDiastolic: VitalMetricStats;
  respirationRate: VitalMetricStats;
}}

export interface HistoricalSession {{
  sessionId: string;
  patientId: string;
  patientName: string;
  date: string;
  sessionType: 'Morning' | 'Evening';
  sessionLabel: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pointCount: number;
  hasAbnormalEvent: boolean;
  abnormalDescription?: string | null;
  stats: SessionStats;
  readings: HistoricalReading[];
}}

export interface MockPatientProfile {{
  id: string;
  name: string;
  age: number;
  gender: string;
  email: string;
  username: string;
  contactNumber: string;
  deviceId: string;
  room: string;
  ward: string;
  assignedDoctor: string;
  admissionDate: string;
  emergencyContact: string;
  emergencyPhone: string;
  dates: string[];
  isSynthetic: boolean;
}}

export interface PatientHistoricalData {{
  patientInfo: MockPatientProfile;
  sessions: HistoricalSession[];
}}

export const MOCK_HISTORICAL_SESSIONS: Record<string, PatientHistoricalData> = {json.dumps(sessions_by_patient, indent=2)};

export const SESSIONS_MANIFEST = {json.dumps(all_sessions_manifest, indent=2)};

/**
 * Retrieve patient sessions by patient ID
 */
export function getPatientHistoricalSessions(patientId: string): HistoricalSession[] {{
  return MOCK_HISTORICAL_SESSIONS[patientId]?.sessions || [];
}}

/**
 * Retrieve a specific session
 */
export function getHistoricalSession(patientId: string, sessionId: string): HistoricalSession | undefined {{
  const sessions = MOCK_HISTORICAL_SESSIONS[patientId]?.sessions || [];
  return sessions.find(s => s.sessionId === sessionId);
}}

/**
 * Retrieve session by date and session type
 */
export function getSessionByDateAndType(patientId: string, date: string, sessionType: 'Morning' | 'Evening'): HistoricalSession | undefined {{
  const sessions = MOCK_HISTORICAL_SESSIONS[patientId]?.sessions || [];
  return sessions.find(s => s.date === date && s.sessionType === sessionType);
}}
"""

    with open(FRONTEND_TS_PATH, "w", encoding="utf-8") as f:
        f.write(ts_code)
    print(f"[Frontend TS] Written to {FRONTEND_TS_PATH}")
    print("\n[SUCCESS] All data pipelines seeded successfully.")

if __name__ == "__main__":
    seed_all()

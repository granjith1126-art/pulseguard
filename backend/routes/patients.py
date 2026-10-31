import os
import json
import sqlite3
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from .auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["patients"])

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "pulseguard.db")
MOCK_JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "services", "mock_sessions_data.json")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def load_mock_json():
    if os.path.exists(MOCK_JSON_PATH):
        with open(MOCK_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

@router.get("")
async def list_patients(user: dict = Depends(get_current_user)):
    """
    List all patients.
    - DOCTOR role: Returns all registered and mock patients.
    - PATIENT role: Privacy restriction: returns only their own patient record.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    if user.get("role") == "DOCTOR":
        cursor.execute("SELECT * FROM patients ORDER BY id ASC")
        rows = cursor.fetchall()
        patients = [dict(r) for r in rows]
    else:
        # Patient privacy restriction: Patient can only view themselves
        pat_id = user.get("patient_id") or user.get("id")
        cursor.execute("SELECT * FROM patients WHERE id = ?", (pat_id,))
        rows = cursor.fetchall()
        patients = [dict(r) for r in rows]
        
    conn.close()
    return {"patients": patients, "count": len(patients)}

@router.get("/{patient_id}")
async def get_patient(patient_id: str, user: dict = Depends(get_current_user)):
    """
    Get patient profile by ID.
    Enforces privacy: patients can only access their own record.
    """
    if user.get("role") != "DOCTOR":
        user_pat_id = user.get("patient_id") or user.get("id")
        if user_pat_id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied: Patient privacy restriction. You can only view your own records.")
            
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")
        
    return dict(row)

@router.get("/{patient_id}/sessions")
async def get_patient_sessions(patient_id: str, user: dict = Depends(get_current_user)):
    """
    Get all historical monitoring sessions for a patient.
    Enforces privacy: patients can only access their own records.
    """
    if user.get("role") != "DOCTOR":
        user_pat_id = user.get("patient_id") or user.get("id")
        if user_pat_id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied: Patient privacy restriction.")
            
    # Quick lookup from mock JSON if available
    mock_data = load_mock_json()
    if mock_data and patient_id in mock_data.get("patientsData", {}):
        pat_entry = mock_data["patientsData"][patient_id]
        # Return sessions without the heavy readings array for fast listing
        session_list = [
            {
                "sessionId": s["sessionId"],
                "patientId": s["patientId"],
                "patientName": s["patientName"],
                "date": s["date"],
                "sessionType": s["sessionType"],
                "sessionLabel": s["sessionLabel"],
                "startTime": s["startTime"],
                "endTime": s["endTime"],
                "durationMinutes": s["durationMinutes"],
                "pointCount": s["pointCount"],
                "hasAbnormalEvent": s["hasAbnormalEvent"],
                "abnormalDescription": s["abnormalDescription"],
                "stats": s["stats"]
            }
            for s in pat_entry.get("sessions", [])
        ]
        return {
            "patientId": patient_id,
            "patientInfo": pat_entry.get("patientInfo"),
            "sessions": session_list,
            "count": len(session_list)
        }
        
    # SQLite fallback
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM monitoring_sessions
        WHERE patient_id = ?
        ORDER BY date ASC, session_type DESC
    """, (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    
    sessions = [dict(r) for r in rows]
    return {"patientId": patient_id, "sessions": sessions, "count": len(sessions)}

@router.get("/{patient_id}/sessions/{session_id}")
async def get_session_details(patient_id: str, session_id: str, user: dict = Depends(get_current_user)):
    """
    Get complete time-series physiological readings for a specific session.
    Enforces privacy: patients can only access their own records.
    """
    if user.get("role") != "DOCTOR":
        user_pat_id = user.get("patient_id") or user.get("id")
        if user_pat_id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied: Patient privacy restriction.")
            
    mock_data = load_mock_json()
    if mock_data and patient_id in mock_data.get("patientsData", {}):
        sessions = mock_data["patientsData"][patient_id].get("sessions", [])
        for s in sessions:
            if s["sessionId"] == session_id:
                return s
                
    # SQLite fallback
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM monitoring_sessions WHERE session_id = ?", (session_id,))
    sess_row = cursor.fetchone()
    if not sess_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found.")
        
    cursor.execute("""
        SELECT timestamp, time_label, heart_rate, spo2, temperature,
               bp_systolic, bp_diastolic, respiration_rate, is_abnormal, abnormal_reason
        FROM vital_readings
        WHERE session_id = ?
        ORDER BY id ASC
    """, (session_id,))
    readings = [dict(r) for r in cursor.fetchall()]
    conn.close()
    
    sess_dict = dict(sess_row)
    sess_dict["readings"] = readings
    return sess_dict

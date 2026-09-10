import urllib.request
import json

def test_live_server():
    print("Testing live FastAPI + React server on http://127.0.0.1:8000 ...")

    # 0. Reset to pristine sample database
    reset_req = urllib.request.Request("http://127.0.0.1:8000/api/appointments/reset-seed", data=b"{}", headers={"Content-Type": "application/json"})
    urllib.request.urlopen(reset_req)

    # 1. Frontend SPA HTML
    with urllib.request.urlopen("http://127.0.0.1:8000/") as resp:
        content = resp.read().decode('utf-8')
        assert resp.status == 200
        assert "<title>TeamSync | Appointment Board</title>" in content
        print("[OK] Frontend SPA HTML served successfully (200 OK)")

    # 2. Get Seeded Appointments
    with urllib.request.urlopen("http://127.0.0.1:8000/api/appointments") as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert resp.status == 200
        assert len(data) >= 7
        print(f"[OK] Retrieved {len(data)} seeded appointments via SQL API")
        for appt in data[:3]:
            print(f"   [{appt['status'].upper()}] {appt['title']} ({appt['date']} {appt['start_time']} - {appt['end_time']})")

    # 3. Create appointment with overlap test
    # Find existing appt with 11:00-12:00
    target_appt = next(a for a in data if a["start_time"] == "11:00" and a["end_time"] == "12:00" and a["status"] == "scheduled")
    today = target_appt['date']
    conflict_payload = {
        "title": "Colliding Review",
        "attendee": "Test Candidate",
        "category": "Team Sync",
        "date": today,
        "start_time": "11:30",
        "end_time": "12:30"
    }

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/appointments",
        data=json.dumps(conflict_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )

    try:
        urllib.request.urlopen(req)
        assert False, "Should have failed with 409 Conflict!"
    except urllib.error.HTTPError as e:
        assert e.code == 409
        err_msg = json.loads(e.read().decode('utf-8'))['detail']
        assert "Time slot conflict" in err_msg
        print(f"[OK] Overlap detection blocked collision with 409 Conflict: '{err_msg}'")

    # 4. Create valid appointment
    valid_payload = {
        "title": "Non-Colliding Standup",
        "attendee": "Test Intern",
        "category": "Team Sync",
        "date": today,
        "start_time": "17:30",
        "end_time": "18:00"
    }
    req_valid = urllib.request.Request(
        "http://127.0.0.1:8000/api/appointments",
        data=json.dumps(valid_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_valid) as resp:
        new_appt = json.loads(resp.read().decode('utf-8'))
        assert resp.status == 201
        new_id = new_appt['id']
        print(f"[OK] Created new appointment successfully: ID {new_id} ({new_appt['title']})")

    # 5. Complete appointment
    patch_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/appointments/{new_id}/status",
        data=json.dumps({"status": "completed"}).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="PATCH"
    )
    with urllib.request.urlopen(patch_req) as resp:
        completed_appt = json.loads(resp.read().decode('utf-8'))
        assert completed_appt['status'] == "completed"
        print(f"[OK] Marked appointment {new_id} as completed")

    # 6. Cancel appointment
    cancel_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/appointments/{new_id}/status",
        data=json.dumps({"status": "cancelled"}).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="PATCH"
    )
    with urllib.request.urlopen(cancel_req) as resp:
        cancelled_appt = json.loads(resp.read().decode('utf-8'))
        assert cancelled_appt['status'] == "cancelled"
        print(f"[OK] Cancelled appointment {new_id} (remains visible, time slot liberated)")

    # 7. Re-book liberated slot
    rebook_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/appointments",
        data=json.dumps({
            "title": "Rebooking Liberated Slot",
            "attendee": "Replacement Attendee",
            "category": "General",
            "date": today,
            "start_time": "17:30",
            "end_time": "18:00"
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(rebook_req) as resp:
        assert resp.status == 201
        print("[OK] Successfully rebooked slot that was previously cancelled")

    print("\nALL END-TO-END VERIFICATION CHECKS PASSED!")

if __name__ == "__main__":
    test_live_server()

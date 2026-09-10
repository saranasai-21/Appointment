import os
import unittest
from fastapi.testclient import TestClient

# Use temporary test database
os.environ["DB_FILE"] = "test_appointments.db"

from backend.main import app
from backend.database import reset_database

class TestAppointmentBoardAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        # Reset DB before each test for predictable state
        reset_database()

    def test_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

    def test_get_seeded_appointments(self):
        res = self.client.get("/api/appointments")
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertGreater(len(items), 0)
        # Check that appointments contain required fields
        first = items[0]
        self.assertIn("title", first)
        self.assertIn("status", first)
        self.assertIn("date", first)
        self.assertIn("start_time", first)
        self.assertIn("end_time", first)

    def test_filter_by_status(self):
        res = self.client.get("/api/appointments?status=completed")
        self.assertEqual(res.status_code, 200)
        items = res.json()
        for item in items:
            self.assertEqual(item["status"], "completed")

    def test_create_valid_appointment(self):
        payload = {
            "title": "Code Review Session",
            "description": "Review PR #42 with backend engineer",
            "attendee": "Taylor Morgan",
            "category": "Code Review",
            "date": "2026-09-15",
            "start_time": "14:00",
            "end_time": "15:00"
        }
        res = self.client.post("/api/appointments", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["title"], payload["title"])
        self.assertEqual(data["status"], "scheduled")
        self.assertIn("id", data)

    def test_reject_end_time_before_or_equal_start_time(self):
        # End time before start time
        payload1 = {
            "title": "Invalid Timing",
            "attendee": "Tester",
            "date": "2026-09-15",
            "start_time": "15:00",
            "end_time": "14:00"
        }
        res1 = self.client.post("/api/appointments", json=payload1)
        self.assertEqual(res1.status_code, 422)

        # Equal start and end time (duration 0)
        payload2 = {
            "title": "Zero Duration",
            "attendee": "Tester",
            "date": "2026-09-15",
            "start_time": "14:00",
            "end_time": "14:00"
        }
        res2 = self.client.post("/api/appointments", json=payload2)
        self.assertEqual(res2.status_code, 422)

    def test_prevent_overlapping_time_slot(self):
        # Base appointment: 10:00 - 11:00 on 2026-09-20
        base = {
            "title": "Base Appointment",
            "attendee": "Team",
            "category": "Team Sync",
            "date": "2026-09-20",
            "start_time": "10:00",
            "end_time": "11:00"
        }
        res = self.client.post("/api/appointments", json=base)
        self.assertEqual(res.status_code, 201)

        # 1. Exact overlap: 10:00 - 11:00 -> 409
        res_exact = self.client.post("/api/appointments", json={
            "title": "Exact Collision",
            "attendee": "User B",
            "date": "2026-09-20",
            "start_time": "10:00",
            "end_time": "11:00"
        })
        self.assertEqual(res_exact.status_code, 409)
        self.assertIn("Time slot conflict", res_exact.json()["detail"])

        # 2. Starts before, ends during: 09:30 - 10:30 -> 409
        res_overlap_front = self.client.post("/api/appointments", json={
            "title": "Front Collision",
            "attendee": "User C",
            "date": "2026-09-20",
            "start_time": "09:30",
            "end_time": "10:30"
        })
        self.assertEqual(res_overlap_front.status_code, 409)

        # 3. Starts during, ends after: 10:30 - 11:30 -> 409
        res_overlap_back = self.client.post("/api/appointments", json={
            "title": "Back Collision",
            "attendee": "User D",
            "date": "2026-09-20",
            "start_time": "10:30",
            "end_time": "11:30"
        })
        self.assertEqual(res_overlap_back.status_code, 409)

        # 4. Completely contained inside: 10:15 - 10:45 -> 409
        res_contained = self.client.post("/api/appointments", json={
            "title": "Contained Collision",
            "attendee": "User E",
            "date": "2026-09-20",
            "start_time": "10:15",
            "end_time": "10:45"
        })
        self.assertEqual(res_contained.status_code, 409)

        # 5. Back-to-back appointment: 09:00 - 10:00 -> SUCCEEDS (201)
        res_back_to_back_pre = self.client.post("/api/appointments", json={
            "title": "Back to Back Preceding",
            "attendee": "User F",
            "date": "2026-09-20",
            "start_time": "09:00",
            "end_time": "10:00"
        })
        self.assertEqual(res_back_to_back_pre.status_code, 201)

        # 6. Back-to-back appointment: 11:00 - 12:00 -> SUCCEEDS (201)
        res_back_to_back_post = self.client.post("/api/appointments", json={
            "title": "Back to Back Following",
            "attendee": "User G",
            "date": "2026-09-20",
            "start_time": "11:00",
            "end_time": "12:00"
        })
        self.assertEqual(res_back_to_back_post.status_code, 201)

    def test_edit_appointment_without_self_collision(self):
        # Create an appointment
        res = self.client.post("/api/appointments", json={
            "title": "Original Title",
            "attendee": "Alice",
            "date": "2026-09-21",
            "start_time": "13:00",
            "end_time": "14:00"
        })
        appt_id = res.json()["id"]

        # Edit its title while keeping same time slot - should succeed!
        edit_res = self.client.put(f"/api/appointments/{appt_id}", json={
            "title": "Updated Title",
            "attendee": "Alice",
            "date": "2026-09-21",
            "start_time": "13:00",
            "end_time": "14:00"
        })
        self.assertEqual(edit_res.status_code, 200)
        self.assertEqual(edit_res.json()["title"], "Updated Title")

    def test_status_transitions_and_slot_liberation_on_cancellation(self):
        # 1. Create appointment: 15:00 - 16:00
        res = self.client.post("/api/appointments", json={
            "title": "Meeting to be cancelled",
            "attendee": "Bob",
            "date": "2026-09-22",
            "start_time": "15:00",
            "end_time": "16:00"
        })
        appt_id = res.json()["id"]

        # 2. Mark as completed
        comp_res = self.client.patch(f"/api/appointments/{appt_id}/status", json={"status": "completed"})
        self.assertEqual(comp_res.status_code, 200)
        self.assertEqual(comp_res.json()["status"], "completed")

        # 3. Mark as cancelled
        cancel_res = self.client.patch(f"/api/appointments/{appt_id}/status", json={"status": "cancelled"})
        self.assertEqual(cancel_res.status_code, 200)
        self.assertEqual(cancel_res.json()["status"], "cancelled")

        # 4. Verify cancelled appointment remains visible in GET list
        list_res = self.client.get("/api/appointments?status=cancelled")
        cancelled_ids = [a["id"] for a in list_res.json()]
        self.assertIn(appt_id, cancelled_ids)

        # 5. Verify a NEW appointment CAN now book this liberated slot
        new_res = self.client.post("/api/appointments", json={
            "title": "New Booking into Liberated Slot",
            "attendee": "Charlie",
            "date": "2026-09-22",
            "start_time": "15:00",
            "end_time": "16:00"
        })
        self.assertEqual(new_res.status_code, 201)

if __name__ == "__main__":
    unittest.main()

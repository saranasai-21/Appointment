from datetime import date, time
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator

class AppointmentBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150, description="Title of the appointment")
    description: Optional[str] = Field(None, max_length=1000, description="Detailed description or agenda")
    attendee: str = Field(..., min_length=2, max_length=100, description="Name of the team member or client")
    category: Optional[str] = Field("Team Sync", max_length=50, description="Category / type of meeting")
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Appointment date in YYYY-MM-DD format")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Start time in HH:MM (24-hour) format")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="End time in HH:MM (24-hour) format")

    @field_validator("title", "attendee")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or only whitespace")
        return cleaned

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        parts = v.split(":")
        hour, minute = int(parts[0]), int(parts[1])
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError(f"Invalid time format: {v}. Hours must be 00-23 and minutes 00-59.")
        return f"{hour:02d}:{minute:02d}"

    @field_validator("date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        parts = v.split("-")
        year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
        try:
            date(year, month, day)
        except ValueError as e:
            raise ValueError(f"Invalid calendar date: {v}. {e}")
        return v

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValueError(
                    f"End time ({self.end_time}) must be strictly after start time ({self.start_time})."
                )
        return self

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(AppointmentBase):
    status: Optional[Literal["scheduled", "completed", "cancelled"]] = None

class AppointmentStatusUpdate(BaseModel):
    status: Literal["scheduled", "completed", "cancelled"] = Field(..., description="Target appointment status")

class AppointmentResponse(AppointmentBase):
    id: int
    status: Literal["scheduled", "completed", "cancelled"]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class ConflictCheckResult(BaseModel):
    has_conflict: bool
    conflict_appointment: Optional[dict] = None
    message: Optional[str] = None

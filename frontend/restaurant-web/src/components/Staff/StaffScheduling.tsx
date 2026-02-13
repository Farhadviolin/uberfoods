import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRestaurantStaff } from "../../hooks/useStaff";
import { useToast } from "../../contexts/ToastContext";
import "./Staff.css";

interface Shift {
  id?: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  notes?: string;
}

export function StaffScheduling() {
  const { restaurantId } = useAuth();
  const { data: staff = [], isLoading } = useRestaurantStaff(restaurantId);
  const { showToast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [_editingShift, _setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState<Shift>({
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    breakDuration: 30,
  });

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(selectedWeek);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !shiftForm.staffId) {
      showToast("Bitte wählen Sie einen Mitarbeiter", "error");
      return;
    }

    try {
      const response = await fetch(`/api/staff/shifts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("restaurant_token")}`,
        },
        body: JSON.stringify(shiftForm),
      });

      if (response.ok) {
        showToast("Schicht erstellt!", "success");
        setShowShiftForm(false);
        setShiftForm({
          staffId: "",
          date: new Date().toISOString().split("T")[0],
          startTime: "09:00",
          endTime: "17:00",
          breakDuration: 30,
        });
      } else {
        showToast("Fehler beim Erstellen der Schicht", "error");
      }
    } catch (error) {
      showToast("Fehler beim Erstellen der Schicht", "error");
    }
  };

  const calculateHours = (start: string, end: string, breakMin?: number) => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const totalMinutes = endTotal - startTotal - (breakMin || 0);
    return (totalMinutes / 60).toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div>Lädt Schichtplanung...</div>
      </div>
    );
  }

  return (
    <div className="staff-scheduling">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "var(--fb-font-size-2xl)",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Schichtplanung
        </h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => {
              const prev = new Date(selectedWeek);
              prev.setDate(prev.getDate() - 7);
              setSelectedWeek(prev);
            }}
            className="fb-button-secondary"
          >
            ← Vorherige Woche
          </button>
          <button
            onClick={() => setSelectedWeek(new Date())}
            className="fb-button-secondary"
          >
            Diese Woche
          </button>
          <button
            onClick={() => {
              const next = new Date(selectedWeek);
              next.setDate(next.getDate() + 7);
              setSelectedWeek(next);
            }}
            className="fb-button-secondary"
          >
            Nächste Woche →
          </button>
          <button onClick={() => setShowShiftForm(true)} className="fb-button">
            + Neue Schicht
          </button>
        </div>
      </div>

      {showShiftForm && (
        <form onSubmit={handleCreateShift} className="staff-form">
          <h2 style={{ marginBottom: "20px" }}>Neue Schicht erstellen</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Mitarbeiter *</label>
              <select
                value={shiftForm.staffId}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, staffId: e.target.value })
                }
                className="fb-input"
                required
              >
                <option value="">Bitte wählen</option>
                {staff
                  .filter((s) => s.isActive)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Datum *</label>
              <input
                type="date"
                value={shiftForm.date}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, date: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Startzeit *</label>
              <input
                type="time"
                value={shiftForm.startTime}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, startTime: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Endzeit *</label>
              <input
                type="time"
                value={shiftForm.endTime}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, endTime: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Pausendauer (Minuten)</label>
              <input
                type="number"
                value={shiftForm.breakDuration || 30}
                onChange={(e) =>
                  setShiftForm({
                    ...shiftForm,
                    breakDuration: parseInt(e.target.value) || 0,
                  })
                }
                className="fb-input"
                min="0"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="submit" className="fb-button">
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => {
                setShowShiftForm(false);
                _setEditingShift(null);
              }}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="schedule-grid">
        <div className="schedule-header">
          <div className="schedule-cell header">Mitarbeiter</div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="schedule-cell header">
              <div>{day.toLocaleDateString("de-DE", { weekday: "short" })}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {day.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
        {staff
          .filter((s) => s.isActive)
          .map((member) => (
            <div key={member.id} className="schedule-row">
              <div className="schedule-cell staff-name">
                <div style={{ fontWeight: 600 }}>{member.name}</div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {member.role}
                </div>
              </div>
              {weekDays.map((day) => {
                const dayShifts = shifts.filter(
                  (s) =>
                    s.staffId === member.id &&
                    s.date === day.toISOString().split("T")[0],
                );
                return (
                  <div key={day.toISOString()} className="schedule-cell">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="shift-block"
                        style={{
                          backgroundColor: "#EEF2FF",
                          padding: "8px",
                          borderRadius: "6px",
                          marginBottom: "4px",
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>
                          {shift.startTime} - {shift.endTime}
                        </div>
                        <div style={{ fontSize: "11px", color: "#666" }}>
                          {calculateHours(
                            shift.startTime,
                            shift.endTime,
                            shift.breakDuration,
                          )}{" "}
                          Std.
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}

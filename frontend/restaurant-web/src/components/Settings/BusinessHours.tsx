import "./BusinessHours.css";

interface BusinessHoursProps {
  businessHours: {
    [key: string]: { open: string; close: string; isClosed: boolean };
  };
  setBusinessHours: (hours: any) => void;
  holidays: string[];
  newHoliday: string;
  setNewHoliday: (date: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onAddHoliday: () => void;
  onRemoveHoliday: (date: string) => void;
  saving: boolean;
}

export function BusinessHours({
  businessHours,
  setBusinessHours,
  holidays,
  newHoliday,
  setNewHoliday,
  onSave,
  onCancel,
  onAddHoliday,
  onRemoveHoliday,
  saving,
}: BusinessHoursProps) {
  const dayNames: { [key: string]: string } = {
    monday: "Montag",
    tuesday: "Dienstag",
    wednesday: "Mittwoch",
    thursday: "Donnerstag",
    friday: "Freitag",
    saturday: "Samstag",
    sunday: "Sonntag",
  };

  return (
    <div>
      <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
        {Object.entries(businessHours).map(([day, hours]) => (
          <div key={day} className="business-hours-day">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <label
                style={{
                  fontWeight: 600,
                  fontSize: "var(--fb-font-size-base)",
                }}
              >
                {dayNames[day]}
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "var(--fb-font-size-sm)",
                }}
              >
                <input
                  type="checkbox"
                  checked={!hours.isClosed}
                  onChange={(e) =>
                    setBusinessHours({
                      ...businessHours,
                      [day]: {
                        ...businessHours[day],
                        isClosed: !e.target.checked,
                      },
                    })
                  }
                />
                Geöffnet
              </label>
            </div>
            {!hours.isClosed && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Öffnet
                  </label>
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) =>
                      setBusinessHours({
                        ...businessHours,
                        [day]: { ...businessHours[day], open: e.target.value },
                      })
                    }
                    className="fb-input"
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Schließt
                  </label>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) =>
                      setBusinessHours({
                        ...businessHours,
                        [day]: { ...businessHours[day], close: e.target.value },
                      })
                    }
                    className="fb-input"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "24px",
          paddingTop: "24px",
          borderTop: "1px solid var(--fb-border-primary)",
        }}
      >
        <h3
          style={{
            marginBottom: "16px",
            fontSize: "var(--fb-font-size-base)",
            fontWeight: 600,
          }}
        >
          Feiertage / Schließtage
        </h3>
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="date"
            value={newHoliday}
            onChange={(e) => setNewHoliday(e.target.value)}
            className="fb-input"
            style={{ width: "auto" }}
          />
          <button
            onClick={onAddHoliday}
            disabled={!newHoliday}
            className="fb-button"
          >
            Hinzufügen
          </button>
        </div>
        {holidays.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {holidays.map((date) => (
              <div
                key={date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  backgroundColor: "var(--fb-bg-secondary)",
                  borderRadius: "var(--fb-radius-base)",
                }}
              >
                <span style={{ fontSize: "var(--fb-font-size-sm)" }}>
                  {new Date(date).toLocaleDateString("de-DE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <button
                  onClick={() => onRemoveHoliday(date)}
                  className="fb-button-secondary"
                  style={{
                    padding: "4px 8px",
                    fontSize: "var(--fb-font-size-xs)",
                    color: "var(--fb-error)",
                  }}
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              color: "var(--fb-text-secondary)",
              fontSize: "var(--fb-font-size-sm)",
              fontStyle: "italic",
            }}
          >
            Keine Feiertage eingetragen
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={onSave} disabled={saving} className="fb-button">
          {saving ? "Wird gespeichert..." : "Speichern"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="fb-button-secondary"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

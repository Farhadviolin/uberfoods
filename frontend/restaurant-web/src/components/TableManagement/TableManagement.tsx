import { useState, FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import {
  useTables,
  useReservations,
  useCreateTable,
  useCreateReservation,
  useUpdateTableStatus,
  TableStatus,
  RestaurantTable,
} from "../../hooks/useTables";
import { Skeleton, SkeletonCard, SkeletonList } from "../common/Skeleton";
import "./TableManagement.css";

export function TableManagement() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [showTableForm, setShowTableForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null,
  );
  const [tableForm, setTableForm] = useState({
    number: 0,
    capacity: 4,
    shape: "SQUARE" as "SQUARE" | "ROUND" | "RECTANGLE",
    location: { x: 0, y: 0 },
  });
  const [reservationForm, setReservationForm] = useState({
    customerName: "",
    customerPhone: "",
    partySize: 2,
    reservationTime: "",
    tableId: "",
  });
  const { data: tables = [], isLoading: tablesLoading } =
    useTables(restaurantId);
  const { data: reservations = [], isLoading: reservationsLoading } =
    useReservations(restaurantId);
  const createTable = useCreateTable();
  const createReservation = useCreateReservation();
  const updateTableStatus = useUpdateTableStatus();
  const loading = tablesLoading || reservationsLoading;

  // Retry-Logik für Mutations
  const retryCreateTable = useRetry(
    async (data: any) => {
      return await createTable.mutateAsync(data);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryCreateReservation = useRetry(
    async (data: any) => {
      return await createReservation.mutateAsync(data);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryUpdateStatus = useRetry(
    async ({ id, status }: { id: string; status: TableStatus }) => {
      return await updateTableStatus.mutateAsync({ id, status });
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const handleCreateTable = async (e: FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      await retryCreateTable.execute({
        ...tableForm,
        restaurantId,
      });
      showToast("Tisch wurde erstellt!", "success");
      setShowTableForm(false);
      setTableForm({
        number: 0,
        capacity: 4,
        shape: "SQUARE",
        location: { x: 0, y: 0 },
      });
    } catch (error: unknown) {
      let errorMessage = "Fehler beim Erstellen des Tisches";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(errorMessage, "error");
    }
  };

  const handleCreateReservation = async (e: FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      await retryCreateReservation.execute({
        ...reservationForm,
        restaurantId,
      });
      showToast("Reservierung wurde erstellt!", "success");
      setShowReservationForm(false);
      setReservationForm({
        customerName: "",
        customerPhone: "",
        partySize: 2,
        reservationTime: "",
        tableId: "",
      });
    } catch (error: unknown) {
      let errorMessage = "Fehler beim Erstellen der Reservierung";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(errorMessage, "error");
    }
  };

  const handleTableStatusChange = async (
    tableId: string,
    status: TableStatus,
  ) => {
    try {
      await retryUpdateStatus.execute({ id: tableId, status });
      showToast("Tisch-Status wurde aktualisiert", "success");
    } catch (error: unknown) {
      showToast("Fehler beim Aktualisieren", "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "#10B981";
      case "OCCUPIED":
        return "#EF4444";
      case "RESERVED":
        return "#F59E0B";
      case "CLEANING":
        return "#6B7280";
      default:
        return "#E4E6EB";
    }
  };

  if (loading) {
    return (
      <div className="table-management">
        <div className="table-header">
          <Skeleton variant="text" width="200px" height={32} />
          <div className="table-actions">
            <Skeleton variant="rectangular" width="130px" height={40} />
            <Skeleton variant="rectangular" width="140px" height={40} />
          </div>
        </div>
        <div style={{ marginTop: "32px" }}>
          <div style={{ marginBottom: "20px" }}>
            <Skeleton
              variant="text"
              width="150px"
              height={24}
            />
          </div>
          <div className="tables-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        </div>
        <div style={{ marginTop: "32px" }}>
          <div style={{ marginBottom: "20px" }}>
            <Skeleton
              variant="text"
              width="200px"
              height={24}
            />
          </div>
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="table-management">
      <div className="table-header">
        <h1>Tischverwaltung</h1>
        <div className="table-actions">
          <button onClick={() => setShowTableForm(true)} className="fb-button">
            + Neuer Tisch
          </button>
          <button
            onClick={() => setShowReservationForm(true)}
            className="fb-button-secondary"
          >
            + Reservierung
          </button>
        </div>
      </div>

      {showTableForm && (
        <form onSubmit={handleCreateTable} className="table-form">
          <h2>Neuen Tisch erstellen</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Tischnummer *</label>
              <input
                type="number"
                value={tableForm.number}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    number: parseInt(e.target.value) || 0,
                  })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Kapazität *</label>
              <input
                type="number"
                value={tableForm.capacity}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    capacity: parseInt(e.target.value) || 4,
                  })
                }
                className="fb-input"
                required
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Form</label>
              <select
                value={tableForm.shape}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    shape: e.target.value as "SQUARE" | "ROUND" | "RECTANGLE",
                  })
                }
                className="fb-input"
              >
                <option value="SQUARE">Quadratisch</option>
                <option value="ROUND">Rund</option>
                <option value="RECTANGLE">Rechteckig</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="fb-button">
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => setShowTableForm(false)}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {showReservationForm && (
        <form onSubmit={handleCreateReservation} className="table-form">
          <h2>Neue Reservierung</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Kundenname *</label>
              <input
                type="text"
                value={reservationForm.customerName}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    customerName: e.target.value,
                  })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Telefon *</label>
              <input
                type="tel"
                value={reservationForm.customerPhone}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    customerPhone: e.target.value,
                  })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Personenanzahl *</label>
              <input
                type="number"
                value={reservationForm.partySize}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    partySize: parseInt(e.target.value) || 2,
                  })
                }
                className="fb-input"
                required
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Zeit *</label>
              <input
                type="datetime-local"
                value={reservationForm.reservationTime}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    reservationTime: e.target.value,
                  })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Tisch</label>
              <select
                value={reservationForm.tableId}
                onChange={(e) =>
                  setReservationForm({
                    ...reservationForm,
                    tableId: e.target.value,
                  })
                }
                className="fb-input"
              >
                <option value="">Automatisch zuweisen</option>
                {tables
                  .filter((t) => t.status === "AVAILABLE")
                  .map((table) => (
                    <option key={table.id} value={table.id}>
                      Tisch {table.number} ({table.capacity} Personen)
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="fb-button">
              Reservieren
            </button>
            <button
              type="button"
              onClick={() => setShowReservationForm(false)}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="tables-section">
        <h2>Tische ({tables.length})</h2>
        <div className="tables-grid">
          {tables.map((table) => (
            <div
              key={table.id}
              className="table-card"
              style={{
                borderColor: getStatusColor(table.status),
                borderWidth: 2,
              }}
            >
              <div className="table-header-row">
                <h3>Tisch {table.number}</h3>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: getStatusColor(table.status) + "20",
                  }}
                >
                  <span style={{ color: getStatusColor(table.status) }}>
                    {table.status}
                  </span>
                </span>
              </div>
              <div className="table-details">
                <div>Kapazität: {table.capacity} Personen</div>
                <div>Form: {table.shape}</div>
              </div>
              <div className="table-actions-row">
                <select
                  value={table.status}
                  onChange={(e) =>
                    handleTableStatusChange(
                      table.id,
                      e.target.value as TableStatus,
                    )
                  }
                  className="status-select"
                  style={{ borderColor: getStatusColor(table.status) }}
                >
                  <option value="AVAILABLE">Verfügbar</option>
                  <option value="OCCUPIED">Besetzt</option>
                  <option value="RESERVED">Reserviert</option>
                  <option value="CLEANING">Reinigung</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="reservations-section">
        <h2>Reservierungen ({reservations.length})</h2>
        <div className="reservations-list">
          {reservations.length === 0 ? (
            <div className="empty-state">Keine Reservierungen</div>
          ) : (
            reservations.map((reservation) => (
              <div key={reservation.id} className="reservation-card">
                <div className="reservation-info">
                  <div>
                    <strong>{reservation.customerName}</strong>
                    <div>{reservation.customerPhone}</div>
                  </div>
                  <div>
                    <div>
                      {new Date(reservation.reservationTime).toLocaleString(
                        "de-DE",
                      )}
                    </div>
                    <div>{reservation.partySize} Personen</div>
                  </div>
                </div>
                <div className="reservation-status">
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor:
                        reservation.status === "CONFIRMED"
                          ? "#10B98120"
                          : reservation.status === "SEATED"
                            ? "#4338CA20"
                            : "#6B728020",
                    }}
                  >
                    {reservation.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

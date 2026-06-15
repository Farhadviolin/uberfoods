import { useState, useEffect, useCallback } from "react";
import {
  Order,
  useOrderNotes,
  useAddOrderNote,
  useUpdateOrderNote,
  useDeleteOrderNote,
  useOrderTimeline,
  useOrderCustomer,
  usePaymentInfo,
  useTipInfo,
  useCallCustomer,
  useSendSMSToCustomer,
  useReportDelay,
  useCancelOrderRestaurant,
  useRefundStatus,
} from "../../hooks/useOrders";
import {
  formatCurrency,
  formatDateTime,
  formatOrderStatus,
} from "../../utils/formatters";
import { DriverTrackingMap } from "../DriverTracking/DriverTrackingMap";
import { useRestaurant } from "../../hooks/useRestaurant";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useQueryClient } from "@tanstack/react-query";
import { handleApiError } from "../../utils/errorUtils";
import "./OrderDetails.css";

interface OrderDetailsProps {
  order: Order;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}

export function OrderDetails({
  order,
  onClose,
  onStatusChange,
}: OrderDetailsProps) {
  const { restaurantId } = useAuth();
  const queryClient = useQueryClient();
  const { data: restaurant } = useRestaurant();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "overview" | "notes" | "timeline" | "customer" | "payment"
  >("overview");
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showDelayDialog, setShowDelayDialog] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [delayReason, setDelayReason] = useState("");
  const [, setDriverStatus] = useState<string | null>(null);

  // Hooks for new features
  const { data: notes = [] } = useOrderNotes(order.id);
  const { data: timeline = [] } = useOrderTimeline(order.id);
  const { data: customerInfo } = useOrderCustomer(order.id);
  const { data: paymentInfo } = usePaymentInfo(order.id);
  const { data: tipInfo } = useTipInfo(order.id);
  const { data: refundStatus } = useRefundStatus(order.id);

  const addNote = useAddOrderNote();
  const updateNote = useUpdateOrderNote();
  const deleteNote = useDeleteOrderNote();
  const callCustomer = useCallCustomer();
  const sendSMS = useSendSMSToCustomer();
  const reportDelay = useReportDelay();
  const cancelOrder = useCancelOrderRestaurant();

  // WebSocket Handlers für Driver-Updates
  const handleDriverLocationUpdate = useCallback(
    (update: {
      driverId: string;
      lat: number;
      lng: number;
      timestamp: string;
      orderId?: string;
    }) => {
      if (update.orderId === order.id && order.driver?.id === update.driverId) {
        // Driver Location wurde aktualisiert - UI wird automatisch über DriverTrackingMap aktualisiert
        queryClient.invalidateQueries({
          queryKey: ["driver-location", update.driverId, order.id],
        });
      }
    },
    [order.id, order.driver?.id, queryClient],
  );

  const handleDriverStatusUpdate = useCallback(
    (update: {
      driverId: string;
      status: string;
      orderId?: string;
      timestamp: string;
    }) => {
      if (update.orderId === order.id && order.driver?.id === update.driverId) {
        setDriverStatus(update.status);
        showToast(`Fahrer Status: ${update.status}`, "info");
      }
    },
    [order.id, order.driver?.id, showToast],
  );

  const handleDriverOrderEvent = useCallback(
    (event: {
      orderId: string;
      event: string;
      driverId?: string;
      timestamp: string;
    }) => {
      if (event.orderId === order.id) {
        switch (event.event) {
          case "ORDER_PICKED_UP":
            showToast("Fahrer hat die Bestellung abgeholt", "success");
            queryClient.invalidateQueries({
              queryKey: ["orders", restaurantId],
            });
            onStatusChange("OUT_FOR_DELIVERY");
            break;
          case "DRIVER_ARRIVED":
            showToast("Fahrer ist am Restaurant angekommen", "info");
            break;
          default:
            break;
        }
      }
    },
    [order.id, showToast, queryClient, restaurantId, onStatusChange],
  );

  // WebSocket Connection
  const { isConnected: wsConnected } = useWebSocket({
    restaurantId,
    onDriverLocationUpdate: handleDriverLocationUpdate,
    onOrderUpdate: (updatedOrder: Order) => {
      if (updatedOrder.id === order.id) {
        queryClient.invalidateQueries({ queryKey: ["orders", restaurantId] });
        queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      }
    },
  });

  // Listen for driver status updates
  useEffect(() => {
    if (!wsConnected || !order.driver?.id) return;

    // Join order room for driver updates
    const socket = (window as any).__restaurantSocket;
    if (socket) {
      socket.emit("join-room", `order_${order.id}`);

      socket.on("driver-status-update", handleDriverStatusUpdate);
      socket.on("driver-order-event", handleDriverOrderEvent);

      return () => {
        socket.off("driver-status-update", handleDriverStatusUpdate);
        socket.off("driver-order-event", handleDriverOrderEvent);
      };
    }
  }, [
    wsConnected,
    order.id,
    order.driver?.id,
    handleDriverStatusUpdate,
    handleDriverOrderEvent,
  ]);

  const displayStatus = order.status || "PENDING";
  const statusOptions = [
    { value: "CONFIRMED", label: "Bestätigt" },
    { value: "PREPARING", label: "In Zubereitung" },
    { value: "READY_FOR_PICKUP", label: "Bereit zur Abholung" },
    { value: "READY", label: "Fertig" },
    { value: "CANCELLED", label: "Storniert" },
  ];

  // Fallback Locations (können später aus Order/Address geholt werden)
  const restaurantLocation = restaurant?.location || {
    lat: 48.2082,
    lng: 16.3738,
  }; // Wien Default
  const customerLocation = (order as any).customerLocation || {
    lat: 48.21,
    lng: 16.38,
  }; // Nähe Restaurant

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote.mutateAsync({ orderId: order.id, note: newNote });
      setNewNote("");
      showToast("Notiz hinzugefügt", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editNoteText.trim()) return;
    try {
      await updateNote.mutateAsync({
        orderId: order.id,
        noteId,
        note: editNoteText,
      });
      setEditingNoteId(null);
      setEditNoteText("");
      showToast("Notiz aktualisiert", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Notiz wirklich löschen?")) return;
    try {
      await deleteNote.mutateAsync({ orderId: order.id, noteId });
      showToast("Notiz gelöscht", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleCallCustomer = async () => {
    try {
      await callCustomer.mutateAsync({ orderId: order.id });
      showToast("Anruf wird initiiert...", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleSendSMS = async () => {
    const message = prompt("SMS-Nachricht eingeben:");
    if (!message) return;
    try {
      await sendSMS.mutateAsync({ orderId: order.id, message });
      showToast("SMS gesendet", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleReportDelay = async () => {
    if (!delayMinutes || delayMinutes < 1) {
      showToast("Bitte geben Sie eine gültige Verzögerung ein", "error");
      return;
    }
    try {
      await reportDelay.mutateAsync({
        orderId: order.id,
        minutes: delayMinutes,
        reason: delayReason || undefined,
      });
      setShowDelayDialog(false);
      setDelayMinutes(15);
      setDelayReason("");
      showToast("Verzögerung gemeldet", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      showToast("Bitte geben Sie einen Stornierungsgrund ein", "error");
      return;
    }
    try {
      await cancelOrder.mutateAsync({
        orderId: order.id,
        reason: cancelReason,
      });
      setShowCancelDialog(false);
      setCancelReason("");
      showToast("Bestellung storniert", "success");
      onClose();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      showToast(appError.message, "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "900px", maxHeight: "90vh", overflow: "auto" }}
      >
        <div className="modal-header">
          <h2>Bestellung #{order.id.slice(0, 8)}</h2>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--fb-border)",
            marginBottom: "16px",
          }}
        >
          {["overview", "notes", "timeline", "customer", "payment"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{
                  padding: "12px 20px",
                  border: "none",
                  background: "none",
                  borderBottom:
                    activeTab === tab
                      ? "2px solid var(--fb-primary)"
                      : "2px solid transparent",
                  color:
                    activeTab === tab
                      ? "var(--fb-primary)"
                      : "var(--fb-text-secondary)",
                  fontWeight: activeTab === tab ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tab === "overview"
                  ? "Übersicht"
                  : tab === "notes"
                    ? "Notizen"
                    : tab === "timeline"
                      ? "Zeitverlauf"
                      : tab === "customer"
                        ? "Kunde"
                        : "Zahlung"}
              </button>
            ),
          )}
        </div>

        <div className="modal-body">
          {activeTab === "overview" && (
            <>
              <div className="order-details-section">
                <h3>Status</h3>
                <div
                  className="order-status-badge order-status"
                  data-testid="order-status"
                  style={{
                    display: "inline-flex",
                    marginBottom: "12px",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    backgroundColor: "var(--fb-success)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "var(--fb-font-size-sm)",
                  }}
                >
                  {formatOrderStatus(displayStatus)} ({displayStatus})
                </div>
                <select
                  value={displayStatus}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="fb-input"
                  style={{ width: "100%", marginBottom: "16px" }}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="order-details-section">
                <h3>Kunde</h3>
                <div className="info-row">
                  <span className="info-label">Name:</span>
                  <span>{order.customer.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">E-Mail:</span>
                  <span>{order.customer.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Telefon:</span>
                  <span>{order.customer.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Adresse:</span>
                  <span>{order.address}</span>
                </div>
              </div>

              <div className="order-details-section">
                <h3>Gerichte</h3>
                <div className="order-items-list">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="order-item-row">
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.dish.name}</div>
                        <div
                          style={{
                            fontSize: "var(--fb-font-size-sm)",
                            color: "var(--fb-text-secondary)",
                          }}
                        >
                          {item.quantity}x
                        </div>
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "var(--fb-font-size-lg)",
                    }}
                  >
                    Gesamt: {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              {order.notes && (
                <div className="order-details-section">
                  <h3>Notizen</h3>
                  <p style={{ color: "var(--fb-text-secondary)" }}>
                    {order.notes}
                  </p>
                </div>
              )}

              {order.driver && (
                <>
                  <div className="order-details-section">
                    <h3>Fahrer</h3>
                    <div className="info-row">
                      <span className="info-label">Name:</span>
                      <span>{order.driver.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Telefon:</span>
                      <span>{order.driver.phone}</span>
                    </div>
                  </div>

                  {/* Fahrer-Tracking nur anzeigen wenn Bestellung unterwegs ist */}
                  {(order.status === "OUT_FOR_DELIVERY" ||
                    order.status === "READY") && (
                    <div className="order-details-section">
                      <h3>Fahrer-Tracking</h3>
                      <DriverTrackingMap
                        driverId={order.driver.id}
                        orderId={order.id}
                        restaurantLocation={restaurantLocation}
                        customerLocation={customerLocation}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="order-details-section">
                <h3>Zeitstempel</h3>
                <div className="info-row">
                  <span className="info-label">Erstellt:</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Aktualisiert:</span>
                  <span>{formatDateTime(order.updatedAt)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="order-details-section"
                style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
              >
                <button
                  onClick={handleCallCustomer}
                  className="fb-button"
                  style={{ flex: "1", minWidth: "120px" }}
                >
                  📞 Anrufen
                </button>
                <button
                  onClick={handleSendSMS}
                  className="fb-button"
                  style={{ flex: "1", minWidth: "120px" }}
                >
                  💬 SMS
                </button>
                <button
                  onClick={() => setShowDelayDialog(true)}
                  className="fb-button-secondary"
                  style={{ flex: "1", minWidth: "120px" }}
                >
                  ⏱️ Verzögerung
                </button>
                {order.status !== "CANCELLED" && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    className="fb-button"
                    style={{
                      flex: "1",
                      minWidth: "120px",
                      backgroundColor: "var(--fb-error)",
                    }}
                  >
                    ❌ Stornieren
                  </button>
                )}
              </div>
            </>
          )}

          {activeTab === "notes" && (
            <div className="order-details-section">
              <h3>Notizen</h3>
              <div
                style={{ marginBottom: "16px", display: "flex", gap: "8px" }}
              >
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddNote()}
                  placeholder="Neue Notiz hinzufügen..."
                  className="fb-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleAddNote}
                  className="fb-button"
                  disabled={!newNote.trim() || addNote.isPending}
                >
                  Hinzufügen
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: "12px",
                      backgroundColor: "var(--fb-bg-secondary)",
                      borderRadius: "var(--fb-radius-base)",
                    }}
                  >
                    {editingNoteId === note.id ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <input
                          type="text"
                          value={editNoteText}
                          onChange={(e) => setEditNoteText(e.target.value)}
                          className="fb-input"
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleUpdateNote(note.id)}
                            className="fb-button"
                            style={{ flex: 1 }}
                          >
                            Speichern
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditNoteText("");
                            }}
                            className="fb-button-secondary"
                            style={{ flex: 1 }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: "8px" }}>{note.note}</div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "var(--fb-font-size-sm)",
                            color: "var(--fb-text-secondary)",
                          }}
                        >
                          <span>
                            {formatDateTime(note.createdAt)} • {note.authorRole}
                          </span>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditNoteText(note.note);
                              }}
                              className="fb-button-secondary"
                              style={{
                                padding: "4px 8px",
                                fontSize: "var(--fb-font-size-sm)",
                              }}
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="fb-button-secondary"
                              style={{
                                padding: "4px 8px",
                                fontSize: "var(--fb-font-size-sm)",
                                backgroundColor: "var(--fb-error)",
                              }}
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {notes.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--fb-text-secondary)",
                    }}
                  >
                    Noch keine Notizen
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="order-details-section">
              <h3>Zeitverlauf</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {timeline.map((event, idx) => (
                  <div
                    key={event.id || idx}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "12px",
                      backgroundColor: "var(--fb-bg-secondary)",
                      borderRadius: "var(--fb-radius-base)",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "var(--fb-primary)",
                        marginTop: "6px",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                        {formatOrderStatus(event.status)}
                      </div>
                      {event.description && (
                        <div
                          style={{
                            fontSize: "var(--fb-font-size-sm)",
                            color: "var(--fb-text-secondary)",
                            marginBottom: "4px",
                          }}
                        >
                          {event.description}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "var(--fb-font-size-sm)",
                          color: "var(--fb-text-secondary)",
                        }}
                      >
                        {formatDateTime(event.timestamp)}
                        {event.userRole && ` • ${event.userRole}`}
                      </div>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--fb-text-secondary)",
                    }}
                  >
                    Noch keine Ereignisse
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "customer" && (
            <div className="order-details-section">
              <h3>Kundeninformationen</h3>
              {customerInfo ? (
                <>
                  <div className="info-row">
                    <span className="info-label">Name:</span>
                    <span>{customerInfo.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">E-Mail:</span>
                    <span>{customerInfo.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Telefon:</span>
                    <span>{customerInfo.phone}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Adresse:</span>
                    <span>{customerInfo.address}</span>
                  </div>
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      backgroundColor: "var(--fb-bg-secondary)",
                      borderRadius: "var(--fb-radius-base)",
                    }}
                  >
                    <h4 style={{ marginBottom: "8px" }}>Bestellhistorie</h4>
                    <div className="info-row">
                      <span className="info-label">Gesamtbestellungen:</span>
                      <span>{customerInfo.orderHistory.totalOrders}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Gesamtausgaben:</span>
                      <span>
                        {formatCurrency(customerInfo.orderHistory.totalSpent)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Letzte Bestellung:</span>
                      <span>
                        {customerInfo.orderHistory.lastOrderDate
                          ? formatDateTime(
                              customerInfo.orderHistory.lastOrderDate,
                            )
                          : "Keine"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: "var(--fb-text-secondary)",
                  }}
                >
                  Kundeninformationen werden geladen...
                </div>
              )}
            </div>
          )}

          {activeTab === "payment" && (
            <div className="order-details-section">
              <h3>Zahlungsinformationen</h3>
              {paymentInfo ? (
                <>
                  <div className="info-row">
                    <span className="info-label">Gesamtbetrag:</span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "var(--fb-font-size-lg)",
                      }}
                    >
                      {formatCurrency(paymentInfo.totalAmount)}
                    </span>
                  </div>
                  {paymentInfo.payment && (
                    <>
                      <div className="info-row">
                        <span className="info-label">Zahlungsmethode:</span>
                        <span>{paymentInfo.payment.method}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Status:</span>
                        <span>{paymentInfo.payment.status}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Betrag:</span>
                        <span>
                          {formatCurrency(paymentInfo.payment.amount)}
                        </span>
                      </div>
                      {paymentInfo.payment.transactionId && (
                        <div className="info-row">
                          <span className="info-label">Transaktions-ID:</span>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "var(--fb-font-size-sm)",
                            }}
                          >
                            {paymentInfo.payment.transactionId}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {tipInfo && tipInfo.hasTip && (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "12px",
                        backgroundColor: "var(--fb-bg-secondary)",
                        borderRadius: "var(--fb-radius-base)",
                      }}
                    >
                      <div className="info-row">
                        <span className="info-label">Trinkgeld:</span>
                        <span style={{ fontWeight: 600 }}>
                          {formatCurrency(tipInfo.tipAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                  {refundStatus && (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "12px",
                        backgroundColor:
                          refundStatus.status === "completed"
                            ? "var(--fb-success)"
                            : "var(--fb-warning)",
                        borderRadius: "var(--fb-radius-base)",
                        color: "white",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                        Rückerstattung: {refundStatus.status}
                      </div>
                      <div style={{ fontSize: "var(--fb-font-size-sm)" }}>
                        Betrag: {formatCurrency(refundStatus.amount)}
                      </div>
                      {refundStatus.reason && (
                        <div
                          style={{
                            fontSize: "var(--fb-font-size-sm)",
                            marginTop: "4px",
                          }}
                        >
                          Grund: {refundStatus.reason}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: "var(--fb-text-secondary)",
                  }}
                >
                  Zahlungsinformationen werden geladen...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="fb-button-secondary">
            Schließen
          </button>
        </div>

        {/* Cancel Order Dialog */}
        {showCancelDialog && (
          <div
            className="modal-overlay"
            style={{ zIndex: 1001 }}
            onClick={() => setShowCancelDialog(false)}
          >
            <div
              className="modal-content"
              style={{ maxWidth: "500px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Bestellung stornieren</h2>
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="modal-close"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: "16px" }}>
                  Bitte geben Sie den Grund für die Stornierung ein:
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Stornierungsgrund..."
                  className="fb-input"
                  style={{
                    width: "100%",
                    minHeight: "100px",
                    marginBottom: "16px",
                  }}
                />
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="fb-button-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="fb-button"
                  style={{ backgroundColor: "var(--fb-error)" }}
                  disabled={!cancelReason.trim() || cancelOrder.isPending}
                >
                  Stornieren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delay Dialog */}
        {showDelayDialog && (
          <div
            className="modal-overlay"
            style={{ zIndex: 1001 }}
            onClick={() => setShowDelayDialog(false)}
          >
            <div
              className="modal-content"
              style={{ maxWidth: "500px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Verzögerung melden</h2>
                <button
                  onClick={() => setShowDelayDialog(false)}
                  className="modal-close"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    Verzögerung (Minuten)
                  </label>
                  <input
                    type="number"
                    value={delayMinutes}
                    onChange={(e) =>
                      setDelayMinutes(parseInt(e.target.value) || 0)
                    }
                    min="1"
                    max="300"
                    className="fb-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    Grund (optional)
                  </label>
                  <textarea
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    placeholder="Grund für die Verzögerung..."
                    className="fb-input"
                    style={{ width: "100%", minHeight: "80px" }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => setShowDelayDialog(false)}
                  className="fb-button-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleReportDelay}
                  className="fb-button"
                  disabled={
                    !delayMinutes || delayMinutes < 1 || reportDelay.isPending
                  }
                >
                  Melden
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

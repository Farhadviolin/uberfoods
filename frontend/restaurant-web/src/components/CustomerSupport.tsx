import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "../contexts/ToastContext";
import { extractErrorMessage } from "../utils/errorUtils";
import { Button } from "../design-system/Button";
import { LoadingSpinner } from "../design-system/Spinner";

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolution?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

export const CustomerSupport = React.memo(function CustomerSupport() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"tickets" | "faq" | "create">(
    "tickets",
  );
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "medium" as const,
  });

  // Load support tickets
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/support/tickets");
      if (!response.ok) throw new Error("Failed to load tickets");
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load FAQs
  const loadFAQs = useCallback(async () => {
    try {
      const response = await fetch("/api/support/faqs");
      if (!response.ok) throw new Error("Failed to load FAQs");
      const data = await response.json();
      setFaqs(data);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    }
  }, [showToast]);

  // Create new ticket
  const createTicket = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTicket.title.trim() || !newTicket.description.trim()) {
        showToast("Bitte füllen Sie alle erforderlichen Felder aus", "error");
        return;
      }

      try {
        const response = await fetch("/api/support/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTicket),
        });
        if (!response.ok) throw new Error("Failed to create ticket");
        showToast("Support-Ticket erfolgreich erstellt", "success");
        setNewTicket({
          title: "",
          description: "",
          category: "general",
          priority: "medium",
        });
        setActiveTab("tickets");
        loadTickets();
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
      }
    },
    [newTicket, showToast, loadTickets],
  );

  // Update ticket status
  const updateTicketStatus = useCallback(
    async (ticketId: string, status: string) => {
      try {
        const response = await fetch(
          `/api/support/tickets/${ticketId}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        if (!response.ok) throw new Error("Failed to update ticket");
        showToast("Ticket-Status aktualisiert", "success");
        loadTickets();
      } catch (error) {
        showToast(extractErrorMessage(error), "error");
      }
    },
    [showToast, loadTickets],
  );

  useEffect(() => {
    if (activeTab === "tickets") {
      loadTickets();
    } else if (activeTab === "faq") {
      loadFAQs();
    }
  }, [activeTab, loadTickets, loadFAQs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "#ffc107";
      case "in_progress":
        return "#17a2b8";
      case "resolved":
        return "#28a745";
      case "closed":
        return "#6c757d";
      default:
        return "#6c757d";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#dc3545";
      case "high":
        return "#fd7e14";
      case "medium":
        return "#ffc107";
      case "low":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  return (
    <div className="customer-support">
      <div className="support-header">
        <h2>🎧 Customer Support</h2>
        <div className="support-controls">
          <div className="support-tabs">
            <button
              className={`tab ${activeTab === "tickets" ? "active" : ""}`}
              onClick={() => setActiveTab("tickets")}
            >
              Support-Tickets (
              {tickets.filter((t) => t.status !== "closed").length})
            </button>
            <button
              className={`tab ${activeTab === "faq" ? "active" : ""}`}
              onClick={() => setActiveTab("faq")}
            >
              FAQ
            </button>
            <button
              className={`tab ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              Neues Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Tickets Tab */}
      {activeTab === "tickets" && (
        <div className="tickets-section">
          {loading && <LoadingSpinner />}
          <div className="tickets-list">
            {tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎫</div>
                <h4>Keine Support-Tickets</h4>
                <p>Alle Kundenanfragen wurden bearbeitet.</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="ticket-card">
                  <div className="ticket-header">
                    <div className="ticket-info">
                      <h4>{ticket.title}</h4>
                      <div className="ticket-meta">
                        <span className="customer">{ticket.customerName}</span>
                        <span className="email">{ticket.customerEmail}</span>
                        <span className="date">
                          {new Date(ticket.createdAt).toLocaleDateString(
                            "de-DE",
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="ticket-status">
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(ticket.status),
                        }}
                      >
                        {ticket.status.toUpperCase()}
                      </span>
                      <span
                        className="priority-badge"
                        style={{
                          backgroundColor: getPriorityColor(ticket.priority),
                        }}
                      >
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ticket-description">
                    {ticket.description.length > 100
                      ? `${ticket.description.substring(0, 100)}...`
                      : ticket.description}
                  </div>
                  <div className="ticket-actions">
                    <Button
                      size="sm"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      Details anzeigen
                    </Button>
                    {ticket.status === "open" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          updateTicketStatus(ticket.id, "in_progress")
                        }
                      >
                        In Bearbeitung nehmen
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === "faq" && (
        <div className="faq-section">
          <div className="faqs-list">
            {faqs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">❓</div>
                <h4>Keine FAQs verfügbar</h4>
                <p>FAQs werden bald hinzugefügt.</p>
              </div>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} className="faq-item">
                  <div className="faq-question">
                    <strong>{faq.question}</strong>
                    <span className="faq-category">{faq.category}</span>
                  </div>
                  <div className="faq-answer">{faq.answer}</div>
                  <div className="faq-feedback">
                    <span>
                      Hilfreich: {faq.helpful} | Nicht hilfreich:{" "}
                      {faq.notHelpful}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Ticket Tab */}
      {activeTab === "create" && (
        <div className="create-ticket-section">
          <form className="ticket-form" onSubmit={createTicket}>
            <h3>Neues Support-Ticket erstellen</h3>

            <div className="form-group">
              <label htmlFor="ticket-title">Betreff *</label>
              <input
                id="ticket-title"
                type="text"
                value={newTicket.title}
                onChange={(e) =>
                  setNewTicket((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Kurze Beschreibung des Problems"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ticket-category">Kategorie</label>
              <select
                id="ticket-category"
                value={newTicket.category}
                onChange={(e) =>
                  setNewTicket((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
              >
                <option value="general">Allgemein</option>
                <option value="technical">Technisch</option>
                <option value="billing">Abrechnung</option>
                <option value="delivery">Lieferung</option>
                <option value="food">Essen</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ticket-priority">Priorität</label>
              <select
                id="ticket-priority"
                value={newTicket.priority}
                onChange={(e) =>
                  setNewTicket((prev) => ({
                    ...prev,
                    priority: e.target.value as any,
                  }))
                }
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="urgent">Dringend</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ticket-description">Beschreibung *</label>
              <textarea
                id="ticket-description"
                value={newTicket.description}
                onChange={(e) =>
                  setNewTicket((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Detaillierte Beschreibung des Problems oder der Anfrage"
                rows={6}
                required
              />
            </div>

            <div className="form-actions">
              <Button type="submit" variant="primary">
                Ticket erstellen
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveTab("tickets")}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div
            className="modal-content ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{selectedTicket.title}</h3>
              <button
                className="close-button"
                onClick={() => setSelectedTicket(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="ticket-details">
                <div className="ticket-meta">
                  <div>
                    <strong>Kunde:</strong> {selectedTicket.customerName}
                  </div>
                  <div>
                    <strong>E-Mail:</strong> {selectedTicket.customerEmail}
                  </div>
                  <div>
                    <strong>Kategorie:</strong> {selectedTicket.category}
                  </div>
                  <div>
                    <strong>Priorität:</strong>
                    <span
                      style={{
                        color: getPriorityColor(selectedTicket.priority),
                      }}
                    >
                      {selectedTicket.priority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <span
                      style={{ color: getStatusColor(selectedTicket.status) }}
                    >
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <strong>Erstellt:</strong>{" "}
                    {new Date(selectedTicket.createdAt).toLocaleString("de-DE")}
                  </div>
                  {selectedTicket.updatedAt !== selectedTicket.createdAt && (
                    <div>
                      <strong>Aktualisiert:</strong>{" "}
                      {new Date(selectedTicket.updatedAt).toLocaleString(
                        "de-DE",
                      )}
                    </div>
                  )}
                </div>
                <div className="ticket-description-full">
                  <h4>Beschreibung</h4>
                  <p>{selectedTicket.description}</p>
                </div>
                {selectedTicket.resolution && (
                  <div className="ticket-resolution">
                    <h4>Lösung</h4>
                    <p>{selectedTicket.resolution}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedTicket.status === "open" && (
                <Button
                  onClick={() =>
                    updateTicketStatus(selectedTicket.id, "in_progress")
                  }
                >
                  In Bearbeitung nehmen
                </Button>
              )}
              {selectedTicket.status === "in_progress" && (
                <Button
                  onClick={() =>
                    updateTicketStatus(selectedTicket.id, "resolved")
                  }
                >
                  Als gelöst markieren
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setSelectedTicket(null)}
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

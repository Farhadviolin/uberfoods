import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import api from "../../utils/api";
import {
  logError,
  handleApiError,
  getErrorMessage,
} from "../../utils/errorUtils";
import { Skeleton, SkeletonCard, SkeletonList } from "../common/Skeleton";
import "./CampaignManager.css";

interface Campaign {
  id: string;
  name: string;
  type: "EMAIL" | "SMS" | "PUSH";
  status: "DRAFT" | "SCHEDULED" | "SENT" | "CANCELLED";
  targetAudience: string;
  scheduledAt?: string;
  sentAt?: string;
  recipients: number;
  openRate?: number;
  clickRate?: number;
}

export function CampaignManager() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Retry-Logik für Mutations
  const retryFetchCampaigns = useRetry(
    async () => {
      const response = await api.get(
        `/marketing/campaigns?restaurantId=${restaurantId}`,
      );
      return response.data || [];
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retryCreateCampaign = useRetry(
    async (data: any) => {
      return await api.post("/marketing/campaigns", data);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );

  const retrySendCampaign = useRetry(
    async (campaignId: string) => {
      return await api.post(`/marketing/campaigns/${campaignId}/send`);
    },
    { maxRetries: 3, retryDelay: 2000, exponentialBackoff: true },
  );

  const retryCancelCampaign = useRetry(
    async (campaignId: string) => {
      return await api.post(`/marketing/campaigns/${campaignId}/cancel`);
    },
    { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
  );
  const [formData, setFormData] = useState({
    name: "",
    type: "EMAIL" as "EMAIL" | "SMS" | "PUSH",
    subject: "",
    message: "",
    targetAudience: "all",
    scheduledAt: "",
  });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await retryFetchCampaigns.execute();
      setCampaigns(data);
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "CampaignManager.fetchCampaigns");
      showToast(getErrorMessage(appError), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      fetchCampaigns();
    }
  }, [restaurantId, fetchCampaigns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      await retryCreateCampaign.execute({
        ...formData,
        restaurantId,
      });
      showToast("Kampagne wurde erstellt!", "success");
      setShowForm(false);
      setFormData({
        name: "",
        type: "EMAIL",
        subject: "",
        message: "",
        targetAudience: "all",
        scheduledAt: "",
      });
      fetchCampaigns();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "CampaignManager.handleSubmit");
      showToast(getErrorMessage(appError), "error");
    }
  };

  const handleSendNow = async (campaignId: string) => {
    try {
      await retrySendCampaign.execute(campaignId);
      showToast("Kampagne wurde gesendet!", "success");
      fetchCampaigns();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "CampaignManager.handleSendNow");
      showToast(getErrorMessage(appError), "error");
    }
  };

  const handleCancel = async (campaignId: string) => {
    if (!confirm("Möchten Sie diese Kampagne wirklich stornieren?")) return;

    try {
      await retryCancelCampaign.execute(campaignId);
      showToast("Kampagne wurde storniert", "success");
      fetchCampaigns();
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "CampaignManager.handleCancel");
      showToast(getErrorMessage(appError), "error");
    }
  };

  if (loading) {
    return (
      <div className="campaign-manager">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Skeleton variant="text" width="200px" height={32} />
          <Skeleton variant="rectangular" width="150px" height={40} />
        </div>
        <SkeletonList count={5} />
      </div>
    );
  }

  return (
    <div className="campaign-manager">
      <div className="campaign-header">
        <h1>Marketing-Kampagnen</h1>
        <button onClick={() => setShowForm(true)} className="fb-button">
          + Neue Kampagne
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="campaign-form">
          <h2>Neue Kampagne erstellen</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="fb-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Typ *</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "EMAIL" | "SMS" | "PUSH",
                  })
                }
                className="fb-input"
                required
              >
                <option value="EMAIL">E-Mail</option>
                <option value="SMS">SMS</option>
                <option value="PUSH">Push-Benachrichtigung</option>
              </select>
            </div>
            {formData.type === "EMAIL" && (
              <div className="form-group">
                <label>Betreff *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="fb-input"
                  required
                />
              </div>
            )}
            <div className="form-group full-width">
              <label>Nachricht *</label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="fb-input"
                rows={6}
                required
              />
            </div>
            <div className="form-group">
              <label>Zielgruppe</label>
              <select
                value={formData.targetAudience}
                onChange={(e) =>
                  setFormData({ ...formData, targetAudience: e.target.value })
                }
                className="fb-input"
              >
                <option value="all">Alle Kunden</option>
                <option value="active">Aktive Kunden (letzte 30 Tage)</option>
                <option value="inactive">Inaktive Kunden</option>
                <option value="vip">VIP-Kunden</option>
              </select>
            </div>
            <div className="form-group">
              <label>Geplant für (optional)</label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledAt: e.target.value })
                }
                className="fb-input"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="fb-button">
              Kampagne erstellen
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="fb-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="campaigns-list">
        {campaigns.length === 0 ? (
          <div className="empty-state">
            <p>Noch keine Kampagnen erstellt</p>
            <button onClick={() => setShowForm(true)} className="fb-button">
              Erste Kampagne erstellen
            </button>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div key={campaign.id} className="campaign-card">
              <div className="campaign-info">
                <div className="campaign-header-row">
                  <h3>{campaign.name}</h3>
                  <span
                    className={`status-badge ${campaign.status.toLowerCase()}`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <div className="campaign-details">
                  <span>Typ: {campaign.type}</span>
                  <span>Zielgruppe: {campaign.targetAudience}</span>
                  <span>Empfänger: {campaign.recipients}</span>
                  {campaign.openRate !== undefined && (
                    <span>Öffnungsrate: {campaign.openRate}%</span>
                  )}
                  {campaign.clickRate !== undefined && (
                    <span>Klickrate: {campaign.clickRate}%</span>
                  )}
                </div>
                {campaign.scheduledAt && (
                  <div className="campaign-scheduled">
                    Geplant für:{" "}
                    {new Date(campaign.scheduledAt).toLocaleString("de-DE")}
                  </div>
                )}
                {campaign.sentAt && (
                  <div className="campaign-sent">
                    Gesendet:{" "}
                    {new Date(campaign.sentAt).toLocaleString("de-DE")}
                  </div>
                )}
              </div>
              <div className="campaign-actions">
                {campaign.status === "SCHEDULED" && (
                  <>
                    <button
                      onClick={() => handleSendNow(campaign.id)}
                      className="fb-button-secondary"
                    >
                      Jetzt senden
                    </button>
                    <button
                      onClick={() => handleCancel(campaign.id)}
                      className="fb-button-secondary"
                      style={{ color: "#EF4444" }}
                    >
                      Stornieren
                    </button>
                  </>
                )}
                {campaign.status === "DRAFT" && (
                  <button
                    onClick={() => handleSendNow(campaign.id)}
                    className="fb-button"
                  >
                    Senden
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

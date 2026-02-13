import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { ConfirmationDialog } from './ConfirmationDialog';
import { usePermissions } from '../hooks/usePermissions';
import { extractErrorMessage } from '../utils/errorHandler';
import { devError } from '../utils/errorLogger';
import './DriverDocumentsManagement.css';

interface Document {
  id: string;
  type: 'license' | 'insurance' | 'id' | 'other';
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  expiresAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

interface DocumentStatus {
  hasValidLicense: boolean;
  hasValidInsurance: boolean;
  expiredDocuments: string[];
  pendingDocuments: number;
}

interface Driver {
  id: string;
  name: string;
  email: string;
}

interface DriverDocumentsManagementProps {
  driver: Driver;
  onClose: () => void;
}

export function DriverDocumentsManagement({ driver, onClose }: DriverDocumentsManagementProps) {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const canApprove = hasPermission('driver:update') || hasPermission('driver:*');
  const canReject = hasPermission('driver:update') || hasPermission('driver:*');
  const canView = hasPermission('driver:read') || hasPermission('driver:*');

  useEffect(() => {
    if (driver && canView) {
      fetchDocuments();
      fetchStatus();
    }
  }, [driver, canView]);

  const fetchDocuments = useCallback(async () => {
    if (!driver) return;

    try {
      setLoading(true);
      const response = await api.get(`/drivers/${driver.id}/documents`);
      setDocuments(response.data.documents || response.data || []);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [driver, showToast]);

  const fetchStatus = useCallback(async () => {
    if (!driver) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/documents/status`);
      setStatus(response.data);
    } catch (err: unknown) {
      devError('Fehler beim Laden des Status:', err);
    }
  }, [driver]);

  const handleApproveDocument = async (documentId: string) => {
    if (!canApprove) {
      showToast('Keine Berechtigung zum Genehmigen von Dokumenten', 'error');
      return;
    }

    try {
      await api.post(`/drivers/${driver.id}/documents/${documentId}/approve`);
      showToast('Dokument erfolgreich genehmigt', 'success');
      fetchDocuments();
      fetchStatus();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleRejectDocument = async () => {
    if (!selectedDocument || !canReject) {
      return;
    }

    if (!rejectionReason.trim()) {
      showToast('Bitte geben Sie einen Ablehnungsgrund an', 'error');
      return;
    }

    try {
      await api.post(`/drivers/${driver.id}/documents/${selectedDocument.id}/reject`, {
        reason: rejectionReason,
      });
      showToast('Dokument erfolgreich abgelehnt', 'success');
      setShowRejectDialog(false);
      setSelectedDocument(null);
      setRejectionReason('');
      fetchDocuments();
      fetchStatus();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleBulkApprove = async (documentIds: string[]) => {
    if (!canApprove) {
      showToast('Keine Berechtigung zum Genehmigen von Dokumenten', 'error');
      return;
    }

    try {
      await Promise.all(
        documentIds.map(id => api.post(`/drivers/${driver.id}/documents/${id}/approve`))
      );
      showToast(`${documentIds.length} Dokumente erfolgreich genehmigt`, 'success');
      fetchDocuments();
      fetchStatus();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string; bgColor: string }> = {
      pending: { text: 'Ausstehend', color: '#856404', bgColor: '#fff3cd' },
      approved: { text: 'Genehmigt', color: '#155724', bgColor: '#d4edda' },
      rejected: { text: 'Abgelehnt', color: '#721c24', bgColor: '#f8d7da' },
      expired: { text: 'Abgelaufen', color: '#721c24', bgColor: '#f8d7da' },
    };
    return badges[status] || { text: status, color: '#6c757d', bgColor: '#e9ecef' };
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      license: 'Führerschein',
      insurance: 'Versicherung',
      id: 'Ausweis',
      other: 'Sonstiges',
    };
    return labels[type] || type;
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const pendingDocuments = documents.filter(d => d.status === 'pending');
  const expiredDocuments = documents.filter(d => isExpired(d.expiresAt));

  if (!canView) {
    return (
      <div className="driver-documents-no-permission">
        <p>Keine Berechtigung zum Anzeigen von Dokumenten</p>
      </div>
    );
  }

  return (
    <div className="driver-documents-management">
      <div className="driver-documents-header">
        <h2>📄 Dokumenten-Verwaltung: {driver.name}</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      {status && (
        <div className="documents-status-overview">
          <div className={`status-item ${status.hasValidLicense ? 'valid' : 'invalid'}`}>
            <span>Führerschein:</span>
            <strong>{status.hasValidLicense ? '✅ Gültig' : '❌ Fehlt/Abgelaufen'}</strong>
          </div>
          <div className={`status-item ${status.hasValidInsurance ? 'valid' : 'invalid'}`}>
            <span>Versicherung:</span>
            <strong>{status.hasValidInsurance ? '✅ Gültig' : '❌ Fehlt/Abgelaufen'}</strong>
          </div>
          <div className="status-item">
            <span>Ausstehend:</span>
            <strong>{status.pendingDocuments || 0}</strong>
          </div>
          <div className="status-item">
            <span>Abgelaufen:</span>
            <strong>{status.expiredDocuments?.length || 0}</strong>
          </div>
        </div>
      )}

      {pendingDocuments.length > 0 && canApprove && (
        <div className="bulk-actions">
          <button
            className="bulk-approve-button"
            onClick={() => handleBulkApprove(pendingDocuments.map(d => d.id))}
          >
            ✅ Alle ausstehenden genehmigen ({pendingDocuments.length})
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Dokumente werden geladen..." />
      ) : (
        <div className="documents-list">
          {documents.length === 0 ? (
            <div className="empty-state">
              <p>Keine Dokumente gefunden</p>
            </div>
          ) : (
            <table className="documents-table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Dateiname</th>
                  <th>Hochgeladen</th>
                  <th>Abgelaufen</th>
                  <th>Status</th>
                  <th>Verifiziert von</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const badge = getStatusBadge(doc.status);
                  const expired = isExpired(doc.expiresAt);
                  return (
                    <tr key={doc.id} className={expired ? 'expired' : ''}>
                      <td>
                        <span className="document-type-badge">{getDocumentTypeLabel(doc.type)}</span>
                      </td>
                      <td>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="document-link">
                          {doc.fileName}
                        </a>
                      </td>
                      <td>{new Date(doc.uploadedAt).toLocaleDateString('de-DE')}</td>
                      <td>
                        {doc.expiresAt ? (
                          <span className={expired ? 'expired-date' : ''}>
                            {new Date(doc.expiresAt).toLocaleDateString('de-DE')}
                          </span>
                        ) : (
                          <span className="no-expiry">Kein Ablaufdatum</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ color: badge.color, backgroundColor: badge.bgColor }}
                        >
                          {badge.text}
                        </span>
                      </td>
                      <td>
                        {doc.verifiedBy ? (
                          <span>
                            {doc.verifiedBy}
                            <br />
                            <small>{doc.verifiedAt ? new Date(doc.verifiedAt).toLocaleDateString('de-DE') : ''}</small>
                          </span>
                        ) : (
                          <span className="not-verified">-</span>
                        )}
                      </td>
                      <td>
                        <div className="document-actions">
                          {doc.status === 'pending' && canApprove && (
                            <button
                              className="approve-button"
                              onClick={() => handleApproveDocument(doc.id)}
                            >
                              ✅ Genehmigen
                            </button>
                          )}
                          {doc.status === 'pending' && canReject && (
                            <button
                              className="reject-button"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowRejectDialog(true);
                              }}
                            >
                              ❌ Ablehnen
                            </button>
                          )}
                          {doc.status === 'rejected' && doc.rejectionReason && (
                            <span className="rejection-reason" title={doc.rejectionReason}>
                              📝 {doc.rejectionReason}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmationDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        title="Dokument ablehnen"
        message={
          <div>
            <p>Möchten Sie dieses Dokument wirklich ablehnen?</p>
            <textarea
              placeholder="Ablehnungsgrund eingeben..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              style={{ width: '100%', marginTop: '10px', padding: '8px' }}
            />
          </div>
        }
        variant="danger"
        onConfirm={handleRejectDocument}
        onCancel={() => {
          setShowRejectDialog(false);
          setSelectedDocument(null);
          setRejectionReason('');
        }}
      />
    </div>
  );
}


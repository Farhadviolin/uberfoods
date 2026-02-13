import { useState, useEffect, useRef } from 'react';
import { DriverService } from '../services/driverService';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Documents.css';

interface Document {
  id: string;
  type: 'license' | 'insurance' | 'id' | 'other';
  fileName: string;
  uploadedAt: string;
  expiresAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

interface DocumentStatus {
  hasValidLicense: boolean;
  hasValidInsurance: boolean;
  expiredDocuments: string[];
}

export function Documents() {
  const { driver } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<'license' | 'insurance' | 'id' | 'other'>('license');

  useEffect(() => {
    if (driver) {
      fetchDocuments();
      fetchStatus();
    }
  }, [driver]);

  const fetchDocuments = async () => {
    if (!driver) return;

    try {
      setLoading(true);
      const result = await DriverService.getDocuments(driver.id);
      setDocuments(result.data.documents || result.data || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Dokumente:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    if (!driver) return;

    try {
      const result = await DriverService.getDocumentsStatus(driver.id);
      setStatus(result.data);
    } catch (err: any) {
      console.error('Fehler beim Laden des Status:', err);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !driver) return;

    // Validiere Dateityp
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Ungültiger Dateityp. Erlaubt: JPEG, PNG, PDF');
      return;
    }

    // Validiere Dateigröße (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Datei zu groß. Maximum: 5MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedType);

      const response = await api.post(`/drivers/${driver.id}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDocuments((prev) => [...prev, response.data]);
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Hochladen der Datei');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!driver || !confirm('Möchten Sie dieses Dokument wirklich löschen?')) return;

    try {
      await DriverService.deleteDocument(driver.id, documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Löschen');
    }
  };

  const handleViewDocument = async (documentId: string) => {
    if (!driver) return;
    try {
      const result = await DriverService.getDocument(driver.id, documentId);
      // Öffne Dokument in neuem Tab oder zeige Download
      if (result.data.url) {
        window.open(result.data.url, '_blank');
      }
    } catch (err: any) {
      setError('Fehler beim Öffnen des Dokuments');
    }
  };

  const handleValidateDocument = async (documentId: string) => {
    if (!driver) return;
    try {
      await DriverService.validateDocument(driver.id, documentId, {});
      await fetchDocuments();
      await fetchStatus();
      alert('Dokument zur Validierung eingereicht');
    } catch (err: any) {
      setError('Fehler bei der Validierung');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      license: 'Führerschein',
      insurance: 'Versicherung',
      id: 'Ausweis',
      other: 'Sonstiges',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      pending: { text: 'Ausstehend', color: '#ffc107' },
      approved: { text: 'Genehmigt', color: '#28a745' },
      rejected: { text: 'Abgelehnt', color: '#dc3545' },
      expired: { text: 'Abgelaufen', color: '#6c757d' },
    };
    return badges[status] || { text: status, color: '#6c757d' };
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h2>📄 Dokumenten-Verwaltung</h2>
        {status && (
          <div className="documents-status">
            <div className={`status-item ${status.hasValidLicense ? 'valid' : 'invalid'}`}>
              <span>Führerschein:</span>
              <strong>{status.hasValidLicense ? '✅ Gültig' : '❌ Fehlt/Abgelaufen'}</strong>
            </div>
            <div className={`status-item ${status.hasValidInsurance ? 'valid' : 'invalid'}`}>
              <span>Versicherung:</span>
              <strong>{status.hasValidInsurance ? '✅ Gültig' : '❌ Fehlt/Abgelaufen'}</strong>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="documents-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="documents-upload">
        <div className="upload-controls">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="type-select"
          >
            <option value="license">Führerschein</option>
            <option value="insurance">Versicherung</option>
            <option value="id">Ausweis</option>
            <option value="other">Sonstiges</option>
          </select>
          <button onClick={handleFileSelect} className="upload-button" disabled={uploading}>
            {uploading ? '⏳ Hochladen...' : '📤 Dokument hochladen'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      {loading && (
        <div className="documents-loading">
          <div>📄 Lade Dokumente...</div>
        </div>
      )}

      {documents.length === 0 && !loading && (
        <div className="documents-empty">
          <div>📄</div>
          <p>Noch keine Dokumente hochgeladen</p>
        </div>
      )}

      <div className="documents-list">
        {documents.map((doc) => {
          const statusBadge = getStatusBadge(doc.status);
          return (
            <div key={doc.id} className="document-item">
              <div className="document-info">
                <div className="document-icon">
                  {doc.type === 'license' && '🚗'}
                  {doc.type === 'insurance' && '🛡️'}
                  {doc.type === 'id' && '🆔'}
                  {doc.type === 'other' && '📄'}
                </div>
                <div className="document-details">
                  <h4>{getTypeLabel(doc.type)}</h4>
                  <p className="document-name">{doc.fileName}</p>
                  <p className="document-date">
                    Hochgeladen: {new Date(doc.uploadedAt).toLocaleDateString('de-DE')}
                  </p>
                  {doc.expiresAt && (
                    <p className="document-expiry">
                      Ablaufdatum: {new Date(doc.expiresAt).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
              </div>
              <div className="document-actions">
                <div
                  className="status-badge"
                  style={{ backgroundColor: statusBadge.color }}
                >
                  {statusBadge.text}
                </div>
                <div className="action-buttons">
                  {doc.status === 'pending' && (
                    <button
                      onClick={() => handleValidateDocument(doc.id)}
                      className="validate-button"
                      title="Zur Validierung einreichen"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => handleViewDocument(doc.id)}
                    className="view-button"
                    title="Ansehen"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="delete-button"
                    title="Löschen"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


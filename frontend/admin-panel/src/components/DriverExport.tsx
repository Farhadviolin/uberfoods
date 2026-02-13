import { useState } from 'react';
import api from '../utils/api';
import { sanitizeFilename, sanitizeUrl } from '../utils/security';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { extractErrorMessage } from '../utils/errorHandler';
import './DriverExport.css';

interface DriverExportProps {
  driverIds: string[];
  onClose: () => void;
}

export function DriverExport({ driverIds, onClose }: DriverExportProps) {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [exportType, setExportType] = useState<'basic' | 'detailed' | 'full'>('basic');
  const [includeData, setIncludeData] = useState({
    profile: true,
    earnings: true,
    orders: false,
    performance: false,
    documents: false,
  });
  const [exporting, setExporting] = useState(false);

  const canExport = hasPermission('driver:read') || hasPermission('driver:*');

  const handleExport = async () => {
    if (!canExport) {
      showToast('Keine Berechtigung zum Exportieren', 'error');
      return;
    }

    setExporting(true);
    try {
      // Validate driverIds to prevent injection
      const safeDriverIds = Array.isArray(driverIds) 
        ? driverIds.filter(id => /^[A-Za-z0-9_-]{1,64}$/.test(id))
        : [];
      if (safeDriverIds.length === 0) {
        showToast('Keine gültigen Fahrer-IDs gefunden', 'error');
        setExporting(false);
        return;
      }
      const response = await api.post('/admin/drivers/export', {
        driverIds: safeDriverIds,
        format: exportFormat,
        type: exportType,
        includeData,
      }, {
        responseType: 'blob',
      });

      if (!(response.data instanceof Blob)) {
        throw new Error('Ungültige Datei-Antwort');
      }
      const contentType = response.headers?.['content-type'] || '';
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (!allowedTypes.some((t) => contentType.includes(t))) {
        throw new Error('Unerwarteter Inhaltstyp für Export');
      }
      // Create download link
      const blobUrl = window.URL.createObjectURL(response.data);
      if (!/^blob:/i.test(blobUrl)) {
        throw new Error('Unsichere Blob-URL erzeugt');
      }
      // Validate exportFormat to prevent injection
      const safeFormat = ['pdf', 'excel', 'csv'].includes(exportFormat) ? exportFormat : 'csv';
      const extension = safeFormat === 'pdf' ? 'pdf' : safeFormat === 'excel' ? 'xlsx' : 'csv';
      const link = document.createElement('a');
      link.href = blobUrl;
      // Create safe filename with only alphanumeric characters and date
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const baseName = `drivers-export-${dateStr}`;
      const downloadName = sanitizeFilename(
        `${baseName}.${extension}`,
        `drivers-export.${extension}`
      );
      // Additional validation: ensure filename only contains safe characters
      const finalName = downloadName.replace(/[^a-zA-Z0-9._-]/g, '');
      // Use sanitizeFilename again for extra safety
      const ultraSafeName = sanitizeFilename(finalName, `drivers-export.${extension}`);
      link.setAttribute('download', ultraSafeName);
      link.rel = 'noopener noreferrer';
      link.referrerPolicy = 'no-referrer';
      link.target = '_blank';
      // Kein Einfügen in den DOM nötig, nur virtueller Klick
      link.click();
      window.URL.revokeObjectURL(blobUrl);

      showToast('Export erfolgreich erstellt', 'success');
      onClose();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  if (!canExport) {
    return (
      <div className="driver-export-no-permission">
        <p>Keine Berechtigung zum Exportieren</p>
      </div>
    );
  }

  return (
    <div className="driver-export">
      <div className="export-header">
        <h2>📥 Export: {driverIds.length} Fahrer</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      <div className="export-options">
        <div className="option-group">
          <label>Format:</label>
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)}>
            <option value="csv">CSV</option>
            <option value="excel">Excel (XLSX)</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        <div className="option-group">
          <label>Typ:</label>
          <select value={exportType} onChange={(e) => setExportType(e.target.value as any)}>
            <option value="basic">Basis</option>
            <option value="detailed">Detailliert</option>
            <option value="full">Vollständig</option>
          </select>
        </div>
      </div>

      <div className="include-data-section">
        <h3>Daten einschließen:</h3>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={includeData.profile}
              onChange={(e) => setIncludeData({ ...includeData, profile: e.target.checked })}
            />
            Profil-Daten
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeData.earnings}
              onChange={(e) => setIncludeData({ ...includeData, earnings: e.target.checked })}
            />
            Verdienste
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeData.orders}
              onChange={(e) => setIncludeData({ ...includeData, orders: e.target.checked })}
            />
            Bestellungen
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeData.performance}
              onChange={(e) => setIncludeData({ ...includeData, performance: e.target.checked })}
            />
            Performance-Metriken
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeData.documents}
              onChange={(e) => setIncludeData({ ...includeData, documents: e.target.checked })}
            />
            Dokumenten-Status
          </label>
        </div>
      </div>

      <div className="export-actions">
        <button
          className="export-button"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? '⏳ Exportiere...' : '📥 Exportieren'}
        </button>
        <button className="cancel-button" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}


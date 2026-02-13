import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { devError } from '../utils/errorLogger';
import { extractErrorMessage } from '../utils/errorHandler';
import './AuditLog.css';

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ entity: '', limit: '50' });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/audit`, { params: filter });
      setLogs(response.data || []);
    } catch (error: unknown) {
      devError('Error fetching audit logs:', error);
      setError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '#28a745';
      case 'UPDATE':
        return '#17a2b8';
      case 'DELETE':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return <div className="loading">Lädt Audit-Logs...</div>;
  }

  return (
    <div className="audit-log">
      <div className="audit-log-header">
        <h2>Audit Log</h2>
        <div className="audit-log-filters">
          <select
            value={filter.entity}
            onChange={(e) => setFilter({ ...filter, entity: e.target.value })}
          >
            <option value="">Alle Entitäten</option>
            <option value="RESTAURANT">Restaurants</option>
            <option value="DISH">Gerichte</option>
            <option value="ORDER">Bestellungen</option>
            <option value="CUSTOMER">Kunden</option>
            <option value="DRIVER">Fahrer</option>
          </select>
          <select
            value={filter.limit}
            onChange={(e) => setFilter({ ...filter, limit: e.target.value })}
          >
            <option value="50">50 Einträge</option>
            <option value="100">100 Einträge</option>
            <option value="200">200 Einträge</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error" style={{ margin: '20px', padding: '16px', background: '#fee', borderRadius: '8px' }}>
          <strong>Fehler:</strong> {error}
          <button
            onClick={() => fetchLogs()}
            style={{
              marginLeft: '16px',
              padding: '8px 16px',
              background: '#1877F2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      <div className="audit-log-table">
        <table>
          <thead>
            <tr>
              <th>Zeitpunkt</th>
              <th>Aktion</th>
              <th>Entität</th>
              <th>ID</th>
              <th>Benutzer</th>
              <th>IP-Adresse</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !error && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  Keine Audit-Logs gefunden
                </td>
              </tr>
            )}
            {logs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString('de-DE')}</td>
                <td>
                  <span
                    className="action-badge"
                    style={{ backgroundColor: getActionColor(log.action) }}
                  >
                    {log.action}
                  </span>
                </td>
                <td>{log.entity}</td>
                <td className="entity-id">{log.entityId.slice(-8)}</td>
                <td>{log.userId}</td>
                <td>{log.ipAddress || '-'}</td>
                <td>
                  {log.changes && (
                    <button
                      className="small secondary"
                      onClick={() => {
                        alert(JSON.stringify(log.changes, null, 2));
                      }}
                    >
                      Anzeigen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


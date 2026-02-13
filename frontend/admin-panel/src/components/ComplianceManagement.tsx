import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { extractErrorMessage } from '../utils/errorHandler';
import { ConfirmationDialog } from './ConfirmationDialog';
import { logger } from '../utils/logger';
import './ComplianceManagement.css';

interface GDPRRequest {
  id: string;
  driverId: string;
  type: 'DATA_DELETION' | 'DATA_PORTABILITY' | 'DATA_RECTIFICATION' | 'ACCESS_REQUEST';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  reason?: string;
  createdAt: string;
  completedAt?: string;
}

interface Contract {
  id: string;
  driverId: string;
  subscriptionId: string;
  contractNumber: string;
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'EXPIRED';
  signedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

type TabType = 'gdpr' | 'contracts' | 'audit';

export function ComplianceManagement() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('gdpr');
  const [loading, setLoading] = useState(false);

  // GDPR State
  const [gdprRequests, setGdprRequests] = useState<GDPRRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<GDPRRequest | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  // Contracts State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTierId, setSelectedTierId] = useState('');

  useEffect(() => {
    loadInitialData();
  }, [activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'gdpr') {
        await loadGDPRRequests();
      } else if (activeTab === 'contracts') {
        await loadContracts();
      }
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadGDPRRequests = async () => {
    try {
      const res = await api.get('/admin/compliance/gdpr/requests');
      setGdprRequests(res.data);
    } catch (error) {
      logger.error('Failed to load GDPR requests:', error);
    }
  };

  const loadContracts = async () => {
    try {
      // Load contracts for all drivers (you might want to add pagination)
      const drivers = ['driver1', 'driver2', 'driver3']; // This should come from an API
      const allContracts: Contract[] = [];

      for (const driverId of drivers) {
        try {
          const res = await api.get(`/admin/subscriptions/contracts/driver/${driverId}`);
          allContracts.push(...res.data);
        } catch (error) {
          // Driver might not have contracts
        }
      }

      setContracts(allContracts);
    } catch (error) {
      logger.error('Failed to load contracts:', error);
    }
  };

  const handleGDPRAction = async (driverId: string, action: string) => {
    try {
      let endpoint = '';
      let body = {};

      switch (action) {
        case 'delete':
          endpoint = `/admin/compliance/gdpr/data-deletion/${driverId}`;
          body = { reason: 'Admin initiated data deletion' };
          break;
        case 'portability':
          endpoint = `/admin/compliance/gdpr/data-portability/${driverId}`;
          break;
        case 'rectification': {
          const corrections = prompt('Enter corrections as JSON:');
          if (!corrections) return;
          endpoint = `/admin/compliance/gdpr/data-rectification/${driverId}`;
          body = JSON.parse(corrections);
          break;
        }
        case 'access':
          endpoint = `/admin/compliance/gdpr/access-request/${driverId}`;
          break;
        default:
          return;
      }

      await api.post(endpoint, body);
      showToast(`GDPR ${action} request submitted successfully`, 'success');
      await loadGDPRRequests();
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleContractAction = async (action: string, contractId?: string) => {
    try {
      if (action === 'generate' && selectedDriverId && selectedTierId) {
        const res = await api.post('/admin/subscriptions/contracts/generate', {
          driverId: selectedDriverId,
          tierId: selectedTierId
        });
        showToast(`Contract generated: ${res.data.contractNumber}`, 'success');
        await loadContracts();
      } else if (action === 'send' && contractId) {
        await api.post(`/admin/subscriptions/contracts/${contractId}/send`);
        showToast('Contract sent for signature', 'success');
        await loadContracts();
      } else if (action === 'sign' && contractId) {
        const signature = prompt('Enter signature data:');
        if (!signature) return;
        await api.post(`/admin/subscriptions/contracts/${contractId}/sign`, {
          signature,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent
        });
        showToast('Contract signed successfully', 'success');
        await loadContracts();
      }
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const updateGDPRStatus = async (requestId: string, status: string) => {
    try {
      await api.put(`/admin/compliance/gdpr/requests/${requestId}/status`, { status });
      showToast('GDPR request status updated', 'success');
      await loadGDPRRequests();
      setShowStatusDialog(false);
      setSelectedRequest(null);
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#28a745';
      case 'IN_PROGRESS': return '#ffc107';
      case 'PENDING': return '#17a2b8';
      case 'REJECTED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'DATA_DELETION': return 'Datenlöschung';
      case 'DATA_PORTABILITY': return 'Datenportabilität';
      case 'DATA_RECTIFICATION': return 'Datenberichtigung';
      case 'ACCESS_REQUEST': return 'Zugangsanfrage';
      default: return type;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Compliance-Daten werden geladen..." />;
  }

  return (
    <div className="compliance-management">
      <div className="compliance-header">
        <h2>🔒 Compliance Management</h2>
        <div className="compliance-tabs">
          <button
            className={activeTab === 'gdpr' ? 'active' : ''}
            onClick={() => setActiveTab('gdpr')}
          >
            DSGVO Anfragen
          </button>
          <button
            className={activeTab === 'contracts' ? 'active' : ''}
            onClick={() => setActiveTab('contracts')}
          >
            Verträge
          </button>
          <button
            className={activeTab === 'audit' ? 'active' : ''}
            onClick={() => setActiveTab('audit')}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {activeTab === 'gdpr' && (
        <GDPRTab
          gdprRequests={gdprRequests}
          onAction={handleGDPRAction}
          onRefresh={loadGDPRRequests}
          onStatusUpdate={(request) => {
            setSelectedRequest(request);
            setShowStatusDialog(true);
          }}
          getStatusColor={getStatusColor}
          getRequestTypeLabel={getRequestTypeLabel}
        />
      )}

      {activeTab === 'contracts' && (
        <ContractsTab
          contracts={contracts}
          onAction={handleContractAction}
          onRefresh={loadContracts}
          selectedDriverId={selectedDriverId}
          selectedTierId={selectedTierId}
          onDriverChange={setSelectedDriverId}
          onTierChange={setSelectedTierId}
          getStatusColor={getStatusColor}
        />
      )}

      {activeTab === 'audit' && (
        <AuditTab />
      )}

      {/* Status Update Dialog */}
      {selectedRequest && (
        <ConfirmationDialog
          isOpen={showStatusDialog}
          onClose={() => {
            setShowStatusDialog(false);
            setSelectedRequest(null);
          }}
          title="GDPR Status aktualisieren"
          message={`Status der ${getRequestTypeLabel(selectedRequest.type)} Anfrage ändern?`}
          confirmText="Aktualisieren"
          onConfirm={() => {
            const newStatus = prompt('Neuer Status (PENDING, IN_PROGRESS, COMPLETED, REJECTED):', selectedRequest.status);
            if (newStatus) {
              updateGDPRStatus(selectedRequest.id, newStatus);
            }
          }}
          onCancel={() => {
            setShowStatusDialog(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

// GDPR Tab Component
function GDPRTab({ gdprRequests, onAction, onRefresh, onStatusUpdate, getStatusColor, getRequestTypeLabel }: any) {
  return (
    <div className="gdpr-tab">
      <div className="tab-header">
        <h3>DSGVO Anfragen Management</h3>
        <button onClick={onRefresh} className="btn-refresh">Aktualisieren</button>
      </div>

      <div className="gdpr-stats">
        <div className="stat-card">
          <h4>Ausstehend</h4>
          <p>{gdprRequests.filter((r: GDPRRequest) => r.status === 'PENDING').length}</p>
        </div>
        <div className="stat-card">
          <h4>In Bearbeitung</h4>
          <p>{gdprRequests.filter((r: GDPRRequest) => r.status === 'IN_PROGRESS').length}</p>
        </div>
        <div className="stat-card">
          <h4>Abgeschlossen</h4>
          <p>{gdprRequests.filter((r: GDPRRequest) => r.status === 'COMPLETED').length}</p>
        </div>
      </div>

      <div className="quick-actions">
        <input
          type="text"
          placeholder="Driver ID"
          id="driverId"
          className="driver-input"
        />
        <button
          onClick={() => {
            const driverId = (document.getElementById('driverId') as HTMLInputElement)?.value;
            if (driverId) onAction(driverId, 'delete');
          }}
          className="btn-danger"
        >
          Datenlöschung
        </button>
        <button
          onClick={() => {
            const driverId = (document.getElementById('driverId') as HTMLInputElement)?.value;
            if (driverId) onAction(driverId, 'portability');
          }}
          className="btn-primary"
        >
          Datenportabilität
        </button>
        <button
          onClick={() => {
            const driverId = (document.getElementById('driverId') as HTMLInputElement)?.value;
            if (driverId) onAction(driverId, 'access');
          }}
          className="btn-secondary"
        >
          Zugangsanfrage
        </button>
      </div>

      <div className="gdpr-table-container">
        <table className="gdpr-table">
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Typ</th>
              <th>Status</th>
              <th>Erstellt</th>
              <th>Abgeschlossen</th>
              <th>Grund</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {gdprRequests.map((request: GDPRRequest) => (
              <tr key={request.id}>
                <td>{request.driverId.slice(-8)}</td>
                <td>{getRequestTypeLabel(request.type)}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ background: getStatusColor(request.status) }}
                  >
                    {request.status}
                  </span>
                </td>
                <td>{new Date(request.createdAt).toLocaleDateString('de-DE')}</td>
                <td>{request.completedAt ? new Date(request.completedAt).toLocaleDateString('de-DE') : '-'}</td>
                <td title={request.reason}>{request.reason ? (request.reason.length > 30 ? `${request.reason.slice(0, 30)}...` : request.reason) : '-'}</td>
                <td>
                  <button
                    onClick={() => onStatusUpdate(request)}
                    className="btn-small"
                  >
                    Status ändern
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Contracts Tab Component
function ContractsTab({
  contracts,
  onAction,
  onRefresh,
  selectedDriverId,
  selectedTierId,
  onDriverChange,
  onTierChange,
  getStatusColor
}: any) {
  return (
    <div className="contracts-tab">
      <div className="tab-header">
        <h3>Vertragsmanagement</h3>
        <button onClick={onRefresh} className="btn-refresh">Aktualisieren</button>
      </div>

      <div className="contract-generator">
        <h4>Neuen Vertrag generieren</h4>
        <div className="generator-form">
          <input
            type="text"
            placeholder="Driver ID"
            value={selectedDriverId}
            onChange={(e) => onDriverChange(e.target.value)}
          />
          <select value={selectedTierId} onChange={(e) => onTierChange(e.target.value)}>
            <option value="">Tier auswählen</option>
            <option value="BASIC">Basic</option>
            <option value="PRO">Pro</option>
            <option value="FULLTIME">Vollzeit</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
          <button
            onClick={() => onAction('generate')}
            disabled={!selectedDriverId || !selectedTierId}
            className="btn-primary"
          >
            Vertrag generieren
          </button>
        </div>
      </div>

      <div className="contracts-table-container">
        <table className="contracts-table">
          <thead>
            <tr>
              <th>Vertragsnummer</th>
              <th>Driver ID</th>
              <th>Status</th>
              <th>Erstellt</th>
              <th>Unterzeichnet</th>
              <th>Läuft ab</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract: Contract) => (
              <tr key={contract.id}>
                <td>{contract.contractNumber}</td>
                <td>{contract.driverId.slice(-8)}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ background: getStatusColor(contract.status) }}
                  >
                    {contract.status}
                  </span>
                </td>
                <td>{new Date(contract.createdAt).toLocaleDateString('de-DE')}</td>
                <td>{contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('de-DE') : '-'}</td>
                <td>{contract.expiresAt ? new Date(contract.expiresAt).toLocaleDateString('de-DE') : '-'}</td>
                <td>
                  <div className="contract-actions">
                    {contract.status === 'DRAFT' && (
                      <button
                        onClick={() => onAction('send', contract.id)}
                        className="btn-small btn-primary"
                      >
                        Senden
                      </button>
                    )}
                    {contract.status === 'SENT' && (
                      <button
                        onClick={() => onAction('sign', contract.id)}
                        className="btn-small btn-success"
                      >
                        Unterzeichnen
                      </button>
                    )}
                    <button className="btn-small btn-secondary">
                      Download
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Audit Tab Component (Placeholder)
function AuditTab() {
  return (
    <div className="audit-tab">
      <h3>Audit Trail</h3>
      <p>Audit-Trail Funktionalität wird noch implementiert...</p>
    </div>
  );
}

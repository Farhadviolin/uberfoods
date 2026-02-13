import { useState, useEffect, useCallback, lazy, Suspense, useMemo, memo } from 'react';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { devError } from '../utils/errorLogger';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { SkeletonTable } from '../design-system/Skeleton';
import { ConfirmationDialog } from './ConfirmationDialog';
import { DriverMap } from './DriverMap';
import { VirtualizedDataTable } from './VirtualizedTable';
import { DriverDocumentsManagement } from './DriverDocumentsManagement';
import { DriverPasswordReset } from './DriverPasswordReset';
import { DriverChat } from './DriverChat';
import { BulkExportButton } from './BulkExportButton';
// Simplified imports for reduced admin panel
import { usePermissions } from '../hooks/usePermissions';
import { openDriverProfile, openDriverOrder } from '../utils/navigation';
import './DriversManagement.css';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  location: { lat: number; lng: number } | null;
}

interface Order {
  id: string;
  status: string;
  driver: {
    id: string;
    name: string;
  } | null;
}

function DriversManagementInner() {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriverForDocuments, setSelectedDriverForDocuments] = useState<Driver | null>(null);
  const [selectedDriverForProfile, setSelectedDriverForProfile] = useState<string | null>(null);
  const [selectedDriverForPasswordReset, setSelectedDriverForPasswordReset] = useState<{ id: string; email: string } | null>(null);
  const [selectedDriverForChat, setSelectedDriverForChat] = useState<{ id: string; name: string } | null>(null);
  const [selectedDriverForActivityLogs, setSelectedDriverForActivityLogs] = useState<{ id: string; name: string } | null>(null);
  const [selectedDriverForActivity, setSelectedDriverForActivity] = useState<{ id: string; name: string } | null>(null);
  const [selectedDriverForEarnings, setSelectedDriverForEarnings] = useState<{ id: string; name: string } | null>(null);
  const [selectedDriverForEmergency, setSelectedDriverForEmergency] = useState<{ id: string; name: string } | null>(null);
  const [selectedDriverForSubscription, setSelectedDriverForSubscription] = useState<{ id: string; name: string } | null>(null);
  const [selectedDriverForNotification, setSelectedDriverForNotification] = useState<{ id: string; name: string } | null>(null);
  const [selectedDriverForSchedule, setSelectedDriverForSchedule] = useState<{ id: string; name: string } | null>(null);
  const [selectedDriverForAnalytics, setSelectedDriverForAnalytics] = useState<{ id: string; name: string } | null>(null);
  const [showPerformanceComparison, setShowPerformanceComparison] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [bulkSubscriptionTier, setBulkSubscriptionTier] = useState<'PRO' | 'FULLTIME' | 'ENTERPRISE'>('PRO');
  const [bulkSubscriptionAction, setBulkSubscriptionAction] = useState<'upgrade' | 'cancel' | 'reactivate'>('upgrade');
  
  const [driverForm, setDriverForm] = useState({
    name: '',
    email: '',
    phone: '',
    isActive: true,
  });
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/drivers');
      const driversData = Array.isArray(response.data) ? response.data : [];
      
      // Enrich drivers with performance data if available
      try {
        const performanceResponse = await api.get('/drivers/advanced/performance').catch(() => ({ data: [] }));
        const performanceData = performanceResponse.data || [];
        
        const enrichedDrivers = driversData.map((driver: Driver) => {
          const perf = performanceData.find((p: any) => p.driverId === driver.id);
          return {
            ...driver,
            rating: perf?.currentRating || (driver as any).rating || 0,
            avgDeliveryTime: perf?.averageDeliveryTime,
            onTimeRate: perf?.onTimeDeliveryRate,
            totalDeliveries: perf?.todayDeliveries || (driver as any).totalDeliveries || 0,
          };
        });
        
        setDrivers(enrichedDrivers);
      } catch {
        // Fallback to basic driver data if performance endpoint fails
        setDrivers(driversData);
      }
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/orders');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      // Error wird bereits durch errorHandler behandelt
      devError('Error fetching orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    fetchOrders();
  }, [fetchDrivers, fetchOrders]);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('driver:create')) {
      showToast('Keine Berechtigung zum Erstellen von Fahrern', 'error');
      return;
    }
    try {
      setError(null);
      const response = await api.post('/drivers', driverForm);
      
      if (response.data.temporaryPassword) {
        const credentialsMessage = `Fahrer erfolgreich erstellt!\n\n⚠️ WICHTIG: Die Zugangsdaten wurden automatisch per E-Mail an ${driverForm.email} gesendet.\n\nFalls die E-Mail nicht ankommt, hier die Zugangsdaten:\n\nE-Mail: ${driverForm.email}\nPasswort: ${response.data.temporaryPassword}\n\nBitte geben Sie diese Daten dem Fahrer weiter, falls die E-Mail nicht ankommt.`;
        alert(credentialsMessage);
      } else {
        showToast(`Fahrer erfolgreich erstellt! Zugangsdaten wurden per E-Mail an ${driverForm.email} gesendet.`, 'success');
      }
      setDriverForm({ name: '', email: '', phone: '', isActive: true });
      fetchDrivers();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    try {
      setError(null);
      // Validate driver ID to prevent injection
      const safeDriverId = /^[A-Za-z0-9_-]{1,64}$/.test(editingDriver.id) ? editingDriver.id : '';
      if (!safeDriverId) {
        showToast('Ungültige Fahrer-ID', 'error');
        return;
      }
      await api.put(`/drivers/${safeDriverId}`, driverForm);
      showToast('Fahrer erfolgreich aktualisiert!', 'success');
      setEditingDriver(null);
      setDriverForm({ name: '', email: '', phone: '', isActive: true });
      fetchDrivers();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!hasPermission('driver:delete')) {
      showToast('Keine Berechtigung zum Löschen von Fahrern', 'error');
      return;
    }
    setConfirmationDialog({
      isOpen: true,
      title: 'Fahrer löschen',
      message: 'Möchten Sie diesen Fahrer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Validate driver ID to prevent injection
          const safeId = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : '';
          if (!safeId) {
            showToast('Ungültige Fahrer-ID', 'error');
            setConfirmationDialog({ ...confirmationDialog, isOpen: false });
            return;
          }
          await api.delete(`/drivers/${safeId}`);
          showToast('Fahrer erfolgreich gelöscht!', 'success');
          fetchDrivers();
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        } catch (err) {
          setError('Fehler beim Löschen des Fahrers');
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        }
      },
    });
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverForm({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      isActive: driver.isActive,
    });
  };

  const handleToggleDriverStatus = async (driverId: string, isActive: boolean) => {
    if (!hasPermission('driver:update')) {
      showToast('Keine Berechtigung zum Ändern des Fahrer-Status', 'error');
      return;
    }
    try {
      // Validate driver ID to prevent injection
      const safeDriverId = /^[A-Za-z0-9_-]{1,64}$/.test(driverId) ? driverId : '';
      if (!safeDriverId) {
        showToast('Ungültige Fahrer-ID', 'error');
        return;
      }
      await api.patch(`/drivers/${safeDriverId}/toggle-status`);
      showToast(`Fahrer erfolgreich ${isActive ? 'deaktiviert' : 'aktiviert'}!`, 'success');
      fetchDrivers();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleBulkSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (items: Driver[]) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'inactive') => {
    if (selectedItems.size === 0) {
      showToast('Bitte wählen Sie mindestens einen Fahrer aus', 'error');
      return;
    }
    if (!hasPermission('driver:update')) {
      showToast('Keine Berechtigung zum Aktualisieren von Fahrern', 'error');
      return;
    }

    try {
      const driverIds = Array.from(selectedItems);
      await api.post('/admin/drivers/bulk-status-update', {
        driverIds,
        status: status === 'active' ? 'ONLINE' : 'OFFLINE',
      });
      showToast(`${driverIds.length} Fahrer erfolgreich ${status === 'active' ? 'aktiviert' : 'deaktiviert'}`, 'success');
      setSelectedItems(new Set());
      fetchDrivers();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleBulkEmail = async () => {
    if (selectedItems.size === 0) {
      showToast('Bitte wählen Sie mindestens einen Fahrer aus', 'error');
      return;
    }
    if (!hasPermission('driver:update')) {
      showToast('Keine Berechtigung zum Senden von E-Mails', 'error');
      return;
    }

    const subject = prompt('E-Mail-Betreff:');
    if (!subject) return;

    const message = prompt('E-Mail-Nachricht:');
    if (!message) return;

    try {
      const driverIds = Array.from(selectedItems);
      await api.post('/admin/drivers/bulk-email', {
        driverIds,
        subject,
        message,
      });
      showToast(`E-Mail an ${driverIds.length} Fahrer gesendet`, 'success');
      setSelectedItems(new Set());
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleBulkSubscription = async () => {
    if (selectedItems.size === 0) {
      showToast('Bitte wählen Sie mindestens einen Fahrer aus', 'error');
      return;
    }
    if (!hasPermission('subscription:update')) {
      showToast('Keine Berechtigung zum Ändern von Subscriptions', 'error');
      return;
    }

    try {
      const safeIds = Array.from(selectedItems).filter(id => /^[A-Za-z0-9_-]{1,64}$/.test(id));
      if (safeIds.length === 0) {
        showToast('Keine gültigen Fahrer-IDs gefunden', 'error');
        return;
      }

      if (bulkSubscriptionAction === 'upgrade') {
        await Promise.all(
          safeIds.map(id =>
            api.post(`/admin/users/subscriptions/${id}/upgrade`, {
              tier: bulkSubscriptionTier,
            })
          )
        );
        showToast(`${safeIds.length} Subscription(s) erfolgreich auf ${bulkSubscriptionTier} geupgraded!`, 'success');
      } else if (bulkSubscriptionAction === 'cancel') {
        await Promise.all(safeIds.map(id => api.post(`/admin/users/subscriptions/${id}/cancel`)));
        showToast(`${safeIds.length} Subscription(s) erfolgreich gekündigt!`, 'success');
      } else if (bulkSubscriptionAction === 'reactivate') {
        await Promise.all(safeIds.map(id => api.post(`/admin/users/subscriptions/${id}/reactivate`)));
        showToast(`${safeIds.length} Subscription(s) erfolgreich reaktiviert!`, 'success');
      }

      setSelectedItems(new Set());
      setBulkMode(false);
      fetchDrivers();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleBulkDeleteDrivers = async () => {
    if (selectedItems.size === 0) return;
    if (!hasPermission('driver:delete')) {
      showToast('Keine Berechtigung zum Löschen von Fahrern', 'error');
      return;
    }
    
    setConfirmationDialog({
      isOpen: true,
      title: 'Fahrer löschen',
      message: `Möchten Sie wirklich ${selectedItems.size} Fahrer löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Validate all driver IDs to prevent injection
          const safeIds = Array.from(selectedItems).filter(id => /^[A-Za-z0-9_-]{1,64}$/.test(id));
          if (safeIds.length === 0) {
            showToast('Keine gültigen Fahrer-IDs gefunden', 'error');
            setConfirmationDialog({ ...confirmationDialog, isOpen: false });
            return;
          }
          await Promise.all(safeIds.map(id => api.delete(`/drivers/${id}`)));
          showToast(`${selectedItems.size} Fahrer erfolgreich gelöscht!`, 'success');
          setSelectedItems(new Set());
          setBulkMode(false);
          fetchDrivers();
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        } catch (err) {
          setError('Fehler beim Löschen der Fahrer');
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        }
      },
    });
  };

  // Spalten-Definition für VirtualizedDataTable
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      width: '200px',
      render: (driver: Driver) => (
        <span 
          style={{ cursor: 'pointer', color: '#1877F2', textDecoration: 'underline', fontWeight: 600 }}
          onClick={() => setSelectedDriverForProfile(driver.id)}
          title="Profil-Details anzeigen"
        >
          {driver.name}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'E-Mail',
      width: '250px',
    },
    {
      key: 'phone',
      label: 'Telefon',
      width: '150px',
    },
    {
      key: 'rating',
      label: 'Bewertung',
      width: '120px',
      render: (driver: Driver) => {
        const rating = (driver as any).rating || 0;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⭐ {rating > 0 ? rating.toFixed(1) : 'N/A'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (driver: Driver) => (
        <span
          style={{
            background: driver.isActive ? '#28a745' : '#dc3545',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {driver.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      ),
    },
    {
      key: 'orders',
      label: 'Aktive Bestellungen',
      width: '150px',
      render: (driver: Driver) => {
        const driverOrders = (orders || []).filter(o => o && o.driver?.id === driver.id && !['DELIVERED', 'CANCELLED'].includes(o.status));
        return (
          <span style={{ background: '#1877F2', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
            {driverOrders.length}
          </span>
        );
      },
    },
    {
      key: 'performance',
      label: 'Performance',
      width: '150px',
      render: (driver: Driver) => {
        const avgDeliveryTime = (driver as any).avgDeliveryTime;
        const onTimeRate = (driver as any).onTimeRate;
        if (!avgDeliveryTime && !onTimeRate) return <span style={{ color: '#65676b' }}>N/A</span>;
        return (
          <div style={{ fontSize: '12px' }}>
            {avgDeliveryTime && <div>⏱️ {avgDeliveryTime.toFixed(1)} Min</div>}
            {onTimeRate && <div>✅ {onTimeRate.toFixed(0)}%</div>}
          </div>
        );
      },
    },
    {
      key: 'location',
      label: 'Standort',
      width: '200px',
      render: (driver: Driver) => 
        driver.location ? (
          <span style={{ fontSize: '13px', color: '#65676B' }}>
            {driver.location.lat.toFixed(4)}, {driver.location.lng.toFixed(4)}
          </span>
        ) : (
          <span style={{ color: '#65676B' }}>Nicht verfügbar</span>
        ),
    },
  ], [orders]);

  return (
    <div className="drivers-management">
      {error && <div className="error-message">{error}</div>}
      
      {hasPermission('driver:create') && (
        <div className="form-container" style={{ marginBottom: '20px' }}>
          <h2>{editingDriver ? 'Fahrer bearbeiten' : 'Neuen Fahrer erstellen'}</h2>
          <form onSubmit={editingDriver ? handleUpdateDriver : handleCreateDriver}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              required
              value={driverForm.name}
              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>E-Mail *</label>
            <input
              type="email"
              required
              value={driverForm.email}
              onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Telefon *</label>
            <input
              type="tel"
              required
              value={driverForm.phone}
              onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={driverForm.isActive}
                onChange={(e) => setDriverForm({ ...driverForm, isActive: e.target.checked })}
              />
              {' '}Aktiv
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit">
              {editingDriver ? 'Aktualisieren' : 'Erstellen'}
            </button>
            {editingDriver && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEditingDriver(null);
                  setDriverForm({ name: '', email: '', phone: '', isActive: true });
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
            <input
              type="text"
              placeholder="🔍 Fahrer suchen (Name, E-Mail)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                flex: 1,
                maxWidth: '400px',
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white',
              }}
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
            <select
              value={ratingFilter || ''}
              onChange={(e) => setRatingFilter(e.target.value ? parseFloat(e.target.value) : null)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white',
              }}
            >
              <option value="">Alle Bewertungen</option>
              <option value="4.5">4.5+ ⭐</option>
              <option value="4.0">4.0+ ⭐</option>
              <option value="3.5">3.5+ ⭐</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {hasPermission('driver:read') && (
              <>
                <button
                  onClick={() => setShowPerformanceComparison(true)}
                  style={{ padding: '8px 16px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  🏆 Performance Vergleich
                </button>
                <button
                  onClick={() => setShowExportDialog(true)}
                  style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  📥 Erweitert Exportieren
                </button>
                <button
                  onClick={() => {
                    if (selectedItems.size === 1) {
                      const first = Array.from(selectedItems)[0];
                      const driver = drivers.find(d => d.id === first);
                      if (driver) setSelectedDriverForActivity({ id: driver.id, name: driver.name });
                    } else {
                      alert('Bitte genau einen Fahrer für Activity auswählen.');
                    }
                  }}
                  style={{ padding: '8px 16px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  🛰 Activity
                </button>
                <BulkExportButton
                  data={drivers as unknown as Record<string, unknown>[]}
                  filename="fahrer"
                  title="Fahrer Übersicht"
                  showCount={true}
                  variant="secondary"
                />
              </>
            )}
            <button
              onClick={() => setBulkMode(!bulkMode)}
              style={{ padding: '8px 16px', background: bulkMode ? '#6c757d' : '#1877F2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              {bulkMode ? '✖ Bulk-Modus beenden' : '✓ Bulk-Modus'}
            </button>
          </div>
        </div>
      </div>
      {bulkMode && selectedItems.size > 0 && (
        <div className="bulk-actions-bar">
          <span style={{ fontWeight: 600 }}>{selectedItems.size} ausgewählt</span>
          <div className="bulk-actions-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {hasPermission('driver:update') && (
              <>
                <button
                  onClick={() => handleBulkStatusUpdate('active')}
                  style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  ✅ Aktivieren
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('inactive')}
                  style={{ padding: '8px 16px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  ❌ Deaktivieren
                </button>
                <button
                  onClick={handleBulkEmail}
                  style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  📧 E-Mail senden
                </button>
                <button
                  onClick={() => setSelectedDriverForNotification(null)}
                  style={{ padding: '8px 16px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  📢 Notification senden ({selectedItems.size})
                </button>
              </>
            )}
            {hasPermission('subscription:update') && (
              <>
                <select
                  value={bulkSubscriptionAction}
                  onChange={(e) => setBulkSubscriptionAction(e.target.value as any)}
                  style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', fontSize: '14px' }}
                >
                  <option value="upgrade">Upgrade</option>
                  <option value="cancel">Kündigen</option>
                  <option value="reactivate">Reaktivieren</option>
                </select>
                {bulkSubscriptionAction === 'upgrade' && (
                  <select
                    value={bulkSubscriptionTier}
                    onChange={(e) => setBulkSubscriptionTier(e.target.value as any)}
                    style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', fontSize: '14px' }}
                  >
                    <option value="PRO">PRO</option>
                    <option value="FULLTIME">FULLTIME</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                )}
                <button
                  onClick={handleBulkSubscription}
                  style={{ padding: '8px 16px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  💳 Subscription {bulkSubscriptionAction === 'upgrade' ? 'Upgrade' : bulkSubscriptionAction === 'cancel' ? 'Kündigen' : 'Reaktivieren'}
                </button>
              </>
            )}
            {hasPermission('driver:delete') && (
              <button
                onClick={handleBulkDeleteDrivers}
                style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                🗑 Löschen
              </button>
            )}
            <button
              onClick={() => setSelectedItems(new Set())}
              style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              Auswahl aufheben
            </button>
          </div>
        </div>
      )}
          {loading ? (
            <SkeletonTable rows={10} columns={6} />
          ) : (
            <VirtualizedDataTable
              items={useMemo(() => {
                let filtered = drivers || [];
                
                // Apply search filter
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase();
                  filtered = filtered.filter(driver =>
                    driver.name.toLowerCase().includes(query) ||
                    driver.email.toLowerCase().includes(query) ||
                    driver.phone?.toLowerCase().includes(query)
                  );
                }
                
                // Apply status filter
                if (statusFilter !== 'all') {
                  filtered = filtered.filter(driver =>
                    statusFilter === 'active' ? driver.isActive : !driver.isActive
                  );
                }
                
                // Apply rating filter
                if (ratingFilter !== null) {
                  filtered = filtered.filter(driver =>
                    (driver as any).rating >= ratingFilter
                  );
                }
                
                return filtered;
              }, [drivers, searchQuery, statusFilter, ratingFilter])}
              columns={columns}
          height={600}
          rowHeight={70}
          bulkMode={bulkMode}
          selectedItems={selectedItems}
          onBulkSelect={handleBulkSelect}
          onSelectAll={() => handleSelectAll(drivers)}
          renderRowActions={(driver) => (
            <div className="actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {hasPermission('driver:read') && (
                <>
                  <button 
                    className="small secondary" 
                    onClick={() => setSelectedDriverForProfile(driver.id)}
                    title="Profil-Details anzeigen"
                  >
                    👤 Profil
                  </button>
                  <button 
                    className="small secondary" 
                    onClick={() => setSelectedDriverForDocuments(driver)}
                    title="Dokumente verwalten"
                  >
                    📄 Dokumente
                  </button>
                </>
              )}
              {hasPermission('driver:update') && (
                <>
                  <button 
                    className="small secondary" 
                    onClick={() => setSelectedDriverForChat({ id: driver.id, name: driver.name })}
                    title="Chat mit Fahrer"
                  >
                    💬 Chat
                  </button>
                  <button 
                    className="small secondary" 
                    onClick={() => setSelectedDriverForActivityLogs({ id: driver.id, name: driver.name })}
                    title="Aktivitäts-Logs anzeigen"
                  >
                    📋 Logs
                  </button>
                  <button 
                    className="small secondary" 
                    onClick={() => setSelectedDriverForEarnings({ id: driver.id, name: driver.name })}
                    title="Verdienste verwalten"
                  >
                    💰 Verdienste
                  </button>
                  <button 
                    className="small secondary" 
                    onClick={() => setSelectedDriverForEmergency({ id: driver.id, name: driver.name })}
                    title="Emergency Intelligence"
                  >
                    🛡️ Emergency
                  </button>
                  {hasPermission('subscription:read') && (
                    <button 
                      className="small secondary" 
                      onClick={() => setSelectedDriverForSubscription({ id: driver.id, name: driver.name })}
                      title="Subscription verwalten"
                    >
                      💳 Subscription
                    </button>
                  )}
                  {hasPermission('driver:update') && (
                    <>
                      <button 
                        className="small secondary" 
                        onClick={() => setSelectedDriverForNotification({ id: driver.id, name: driver.name })}
                        title="Notification senden"
                      >
                        📢 Notification
                      </button>
                      <button 
                        className="small secondary" 
                        onClick={() => setSelectedDriverForSchedule({ id: driver.id, name: driver.name })}
                        title="Schichtverwaltung"
                      >
                        📅 Schichten
                      </button>
                    </>
                  )}
                  {hasPermission('driver:read') && (
                    <button 
                      className="small secondary" 
                      onClick={() => setSelectedDriverForAnalytics({ id: driver.id, name: driver.name })}
                      title="Analytics & Statistiken"
                    >
                      📊 Analytics
                    </button>
                  )}
                  <button 
                    className="small secondary" 
                    onClick={() => setSelectedDriverForPasswordReset({ id: driver.id, email: driver.email })}
                    title="Passwort zurücksetzen"
                  >
                    🔐 Passwort
                  </button>
                </>
              )}
              {hasPermission('driver:update') && (
                <>
                  <button className="small secondary" onClick={() => handleEditDriver(driver)}>
                    Bearbeiten
                  </button>
                  <button
                    className="small secondary"
                    onClick={() => handleToggleDriverStatus(driver.id, driver.isActive)}
                  >
                    {driver.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                </>
              )}
              {hasPermission('driver:delete') && (
                <button className="small danger" onClick={() => handleDeleteDriver(driver.id)}>
                  Löschen
                </button>
              )}
            </div>
          )}
          emptyMessage="Keine Fahrer gefunden"
        />
      )}

      {(drivers || []).length === 0 && !loading && (
        <div className="empty-state">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <p>Keine Fahrer gefunden</p>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>Fahrer-Standorte</h3>
        <Suspense fallback={<LoadingSpinner text="Karte wird geladen..." />}>
          <DriverMap drivers={drivers} />
        </Suspense>
      </div>

      {selectedDriverForDocuments && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForDocuments(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <DriverDocumentsManagement
              driver={selectedDriverForDocuments}
              onClose={() => setSelectedDriverForDocuments(null)}
            />
          </div>
        </div>
      )}

      {selectedDriverForProfile && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Fahrer Profil Details</h3>
              <p>Fahrer ID: {selectedDriverForProfile}</p>
              <button onClick={() => setSelectedDriverForProfile(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {selectedDriverForPasswordReset && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForPasswordReset(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <DriverPasswordReset
              driverId={selectedDriverForPasswordReset.id}
              driverEmail={selectedDriverForPasswordReset.email}
              onClose={() => setSelectedDriverForPasswordReset(null)}
            />
          </div>
        </div>
      )}

      {selectedDriverForChat && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForChat(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <DriverChat
              driverId={selectedDriverForChat.id}
              driverName={selectedDriverForChat.name}
              onClose={() => setSelectedDriverForChat(null)}
            />
          </div>
        </div>
      )}

      {selectedDriverForActivityLogs && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForActivityLogs(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Fahrer Aktivitätsprotokolle</h3>
              <p>Fahrer: {selectedDriverForActivityLogs.name} (ID: {selectedDriverForActivityLogs.id})</p>
              <button onClick={() => setSelectedDriverForActivityLogs(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {selectedDriverForActivity && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForActivity(null)}>
          <div className="modal-content" style={{ width: '95%', maxWidth: '1300px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Activity für {selectedDriverForActivity.name}</h3>
              <button className="close" onClick={() => setSelectedDriverForActivity(null)}>×</button>
            </div>
            <div className="placeholder-component">
              <h3>Fahrer Aktivitäts-Tab</h3>
              <p>Fahrer ID: {selectedDriverForActivity.id}</p>
            </div>
          </div>
        </div>
      )}

      {selectedDriverForEarnings && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForEarnings(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Fahrer Einnahmen Management</h3>
              <p>Fahrer: {selectedDriverForEarnings.name} (ID: {selectedDriverForEarnings.id})</p>
              <button onClick={() => setSelectedDriverForEarnings(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {selectedDriverForEmergency && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForEmergency(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Notfall Dashboard</h3>
              <p>Fahrer: {selectedDriverForEmergency.name} (ID: {selectedDriverForEmergency.id})</p>
              <button onClick={() => setSelectedDriverForEmergency(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {selectedDriverForSubscription && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForSubscription(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Abonnement Schnellverwaltung</h3>
              <p>Fahrer: {selectedDriverForSubscription.name} (ID: {selectedDriverForSubscription.id})</p>
              <button onClick={() => setSelectedDriverForSubscription(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {selectedDriverForNotification && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForNotification(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Benachrichtigung Sender</h3>
              <p>Fahrer: {selectedDriverForNotification.name} (ID: {selectedDriverForNotification.id})</p>
              <button onClick={() => setSelectedDriverForNotification(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {selectedDriverForSchedule && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForSchedule(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Zeitplan Manager</h3>
              <p>Fahrer: {selectedDriverForSchedule.name} (ID: {selectedDriverForSchedule.id})</p>
              <button onClick={() => setSelectedDriverForSchedule(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {selectedDriverForAnalytics && (
        <div className="modal-overlay" onClick={() => setSelectedDriverForAnalytics(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Analytics Dashboard</h3>
              <p>Fahrer: {selectedDriverForAnalytics.name} (ID: {selectedDriverForAnalytics.id})</p>
              <button onClick={() => setSelectedDriverForAnalytics(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {showPerformanceComparison && (
        <div className="modal-overlay" onClick={() => setShowPerformanceComparison(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Leistungsvergleich</h3>
              <p>Ausgewählte Fahrer: {bulkMode && selectedItems.size > 0 ? selectedItems.size : 0}</p>
              <button onClick={() => setShowPerformanceComparison(false)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {showExportDialog && (
        <div className="modal-overlay" onClick={() => setShowExportDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="placeholder-component">
              <h3>Fahrer Export</h3>
              <p>Fahrer zum Exportieren: {selectedItems.size > 0 ? selectedItems.size : drivers.length}</p>
              <button onClick={() => setShowExportDialog(false)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        variant={confirmationDialog.variant || 'info'}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}
      />
    </div>
  );
}

export const DriversManagement = memo(DriversManagementInner);


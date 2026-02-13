import React, { useState, useCallback, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import { useDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver } from '../hooks/useDrivers';
import './DriversManagement.css';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  location: { lat: number; lng: number } | null;
}

interface CreateDriverData {
  name: string;
  email: string;
  phone: string;
  isActive?: boolean;
}

export const DriversManagement = React.memo(function DriversManagement() {
  const { showToast } = useToast();

  // API Hooks für echte Daten
  const { data: drivers = [], isLoading: loading, error } = useDrivers();
  const createDriverMutation = useCreateDriver();
  const updateDriverMutation = useUpdateDriver();
  const deleteDriverMutation = useDeleteDriver();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [newDriverData, setNewDriverData] = useState<CreateDriverData>({
    name: '',
    email: '',
    phone: '',
    isActive: true,
  });
  const [editDriverData, setEditDriverData] = useState<Partial<Driver>>({
    name: '',
    email: '',
    phone: '',
    isActive: true,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  // Echte API-Daten werden automatisch durch useDrivers geladen

  // Filtered drivers based on search and status
  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          driver.phone.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'active' && driver.isActive) ||
                          (statusFilter === 'inactive' && !driver.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchTerm, statusFilter]);

  const toggleDriverStatus = useCallback(async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    try {
      await updateDriverMutation.mutateAsync({
        id: driverId,
        data: { isActive: !driver.isActive }
      });
      showToast('Fahrer-Status aktualisiert', 'success');
    } catch (error) {
      showToast('Fehler beim Aktualisieren des Fahrer-Status', 'error');
    }
  }, [drivers, updateDriverMutation, showToast]);

  const handleDeleteDriver = useCallback((driverId: string, driverName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Fahrer löschen',
      message: `Sind Sie sicher, dass Sie den Fahrer "${driverName}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
      action: async () => {
        try {
          await deleteDriverMutation.mutateAsync(driverId);
          showToast('Fahrer erfolgreich gelöscht', 'success');
        } catch (error) {
          showToast('Fehler beim Löschen des Fahrers', 'error');
        }
        setConfirmDialog({ isOpen: false, title: '', message: '', action: () => {} });
      },
    });
  }, [deleteDriverMutation, showToast]);

  const handleAddDriver = useCallback(async () => {
    if (!newDriverData.name || !newDriverData.email || !newDriverData.phone) {
      showToast('Bitte füllen Sie alle erforderlichen Felder aus', 'error');
      return;
    }

    try {
      await createDriverMutation.mutateAsync(newDriverData);
      showToast('Fahrer erfolgreich hinzugefügt', 'success');
      setShowAddModal(false);
      setNewDriverData({ name: '', email: '', phone: '', isActive: true });
    } catch (error) {
      showToast('Fehler beim Hinzufügen des Fahrers', 'error');
    }
  }, [newDriverData, createDriverMutation, showToast]);

  const handleEditDriver = useCallback((driver: Driver) => {
    setEditingDriver(driver);
    setEditDriverData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      isActive: driver.isActive,
    });
    setShowEditModal(true);
  }, []);

  const handleUpdateDriver = useCallback(async () => {
    if (!editingDriver || !editDriverData.name || !editDriverData.email || !editDriverData.phone) {
      showToast('Bitte füllen Sie alle erforderlichen Felder aus', 'error');
      return;
    }

    try {
      await updateDriverMutation.mutateAsync({
        id: editingDriver.id,
        data: editDriverData
      });
      showToast('Fahrer erfolgreich aktualisiert', 'success');
      setShowEditModal(false);
      setEditingDriver(null);
      setEditDriverData({ name: '', email: '', phone: '', isActive: true });
    } catch (error) {
      showToast('Fehler beim Aktualisieren des Fahrers', 'error');
    }
  }, [editingDriver, editDriverData, updateDriverMutation, showToast]);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog({ isOpen: false, title: '', message: '', action: () => {} });
  }, []);

  if (loading) {
    return <LoadingSpinner text="Fahrer werden geladen..." />;
  }

  if (error) {
    return (
      <div className="drivers-management">
        <div className="page-header-section">
          <div className="header-content">
            <h1 className="typography-h2 page-title">Fahrer verwalten</h1>
            <p className="typography-body page-description">
              Fehler beim Laden der Fahrer-Daten.
            </p>
          </div>
        </div>
        <div className="error-state">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <h3>Verbindungsfehler</h3>
            <p>Die Fahrer-Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</p>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="drivers-management">
      {/* Header Section */}
      <div className="page-header-section">
        <div className="header-content">
          <h1 className="typography-h2 page-title">Fahrer verwalten</h1>
          <p className="typography-body page-description">
            Verwalten Sie alle Fahrer in Ihrem System. Sie können Fahrer aktivieren/deaktivieren,
            deren Details bearbeiten oder neue Fahrer hinzufügen.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <span className="btn-icon">➕</span>
            Fahrer hinzufügen
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail oder Telefon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Alle ({drivers.length})
          </button>
          <button
            className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Aktiv ({drivers.filter(d => d.isActive).length})
          </button>
          <button
            className={`filter-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inaktiv ({drivers.filter(d => !d.isActive).length})
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-container">
        <table className="drivers-table">
          <thead>
            <tr>
              <th className="col-name">Name</th>
              <th className="col-email">E-Mail</th>
              <th className="col-phone">Telefon</th>
              <th className="col-status">Status</th>
              <th className="col-actions">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  <div className="empty-state-content">
                    <span className="empty-icon">🚗</span>
                    <h3>Keine Fahrer gefunden</h3>
                    <p>
                      {drivers.length === 0
                        ? 'Es wurden noch keine Fahrer hinzugefügt.'
                        : 'Versuchen Sie, Ihre Suchkriterien zu ändern.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredDrivers.map(driver => (
                <tr key={driver.id}>
                  <td className="col-name">
                    <div className="driver-name-cell">
                      <div className="driver-avatar">
                        {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="driver-info">
                        <div className="driver-name">{driver.name}</div>
                        <div className="driver-location">
                          {driver.location ? '📍 Online' : '📍 Offline'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="col-email">{driver.email}</td>
                  <td className="col-phone">{driver.phone}</td>
                  <td className="col-status">
                    <span className={`status-badge ${driver.isActive ? 'active' : 'inactive'}`}>
                      {driver.isActive ? '🟢 Aktiv' : '🔴 Inaktiv'}
                    </span>
                  </td>
                  <td className="col-actions">
                    <div className="actions-dropdown">
                      <button className="actions-btn">⋯</button>
                      <div className="actions-menu">
                        <button
                          className="action-item"
                          onClick={() => showToast('Details werden geöffnet...', 'info')}
                        >
                          👁️ Details
                        </button>
                        <button
                          className="action-item"
                          onClick={() => handleEditDriver(driver)}
                        >
                          ✏️ Bearbeiten
                        </button>
                        <button
                          className="action-item"
                          onClick={() => toggleDriverStatus(driver.id)}
                        >
                          {driver.isActive ? '🚫 Deaktivieren' : '✅ Aktivieren'}
                        </button>
                        <hr className="action-divider" />
                        <button
                          className="action-item danger"
                          onClick={() => handleDeleteDriver(driver.id, driver.name)}
                        >
                          🗑️ Löschen
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay">
          <div className="confirm-dialog">
            <h3 className="dialog-title">{confirmDialog.title}</h3>
            <p className="dialog-message">{confirmDialog.message}</p>
            <div className="dialog-actions">
              <button
                className="btn-secondary"
                onClick={closeConfirmDialog}
              >
                Abbrechen
              </button>
              <button
                className="btn-danger"
                onClick={confirmDialog.action}
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="add-driver-modal">
            <h3>Neuen Fahrer hinzufügen</h3>
            <div className="form-group">
              <label htmlFor="driver-name">Name *</label>
              <input
                id="driver-name"
                type="text"
                value={newDriverData.name}
                onChange={(e) => setNewDriverData((prev: CreateDriverData) => ({ ...prev, name: e.target.value }))}
                placeholder="Vollständiger Name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="driver-email">E-Mail *</label>
              <input
                id="driver-email"
                type="email"
                value={newDriverData.email}
                onChange={(e) => setNewDriverData((prev: CreateDriverData) => ({ ...prev, email: e.target.value }))}
                placeholder="E-Mail-Adresse"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="driver-phone">Telefon *</label>
              <input
                id="driver-phone"
                type="tel"
                value={newDriverData.phone}
                onChange={(e) => setNewDriverData((prev: CreateDriverData) => ({ ...prev, phone: e.target.value }))}
                placeholder="+43 XXX XXX XXX"
                required
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newDriverData.isActive}
                  onChange={(e) => setNewDriverData((prev: CreateDriverData) => ({ ...prev, isActive: e.target.checked }))}
                />
                Fahrer aktiv
              </label>
            </div>
            <div className="dialog-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewDriverData({ name: '', email: '', phone: '', isActive: true });
                }}
              >
                Abbrechen
              </button>
              <button
                className="btn-primary"
                onClick={handleAddDriver}
                disabled={createDriverMutation.isPending}
              >
                {createDriverMutation.isPending ? 'Wird hinzugefügt...' : 'Fahrer hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditModal && editingDriver && (
        <div className="modal-overlay">
          <div className="add-driver-modal">
            <h3>Fahrer bearbeiten</h3>
            <div className="form-group">
              <label htmlFor="edit-driver-name">Name *</label>
              <input
                id="edit-driver-name"
                type="text"
                value={editDriverData.name || ''}
                onChange={(e) => setEditDriverData((prev: Partial<Driver>) => ({ ...prev, name: e.target.value }))}
                placeholder="Vollständiger Name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-driver-email">E-Mail *</label>
              <input
                id="edit-driver-email"
                type="email"
                value={editDriverData.email || ''}
                onChange={(e) => setEditDriverData((prev: Partial<Driver>) => ({ ...prev, email: e.target.value }))}
                placeholder="E-Mail-Adresse"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-driver-phone">Telefon *</label>
              <input
                id="edit-driver-phone"
                type="tel"
                value={editDriverData.phone || ''}
                onChange={(e) => setEditDriverData((prev: Partial<Driver>) => ({ ...prev, phone: e.target.value }))}
                placeholder="+43 XXX XXX XXX"
                required
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editDriverData.isActive || false}
                  onChange={(e) => setEditDriverData((prev: Partial<Driver>) => ({ ...prev, isActive: e.target.checked }))}
                />
                Fahrer aktiv
              </label>
            </div>
            <div className="dialog-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDriver(null);
                  setEditDriverData({ name: '', email: '', phone: '', isActive: true });
                }}
              >
                Abbrechen
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdateDriver}
                disabled={updateDriverMutation.isPending}
              >
                {updateDriverMutation.isPending ? 'Wird aktualisiert...' : 'Fahrer aktualisieren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

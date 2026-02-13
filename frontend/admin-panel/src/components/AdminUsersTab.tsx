import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';
import { useDebounce } from '../hooks/useDebounce';
import { VirtualizedDataTable } from './VirtualizedTable';
import { LoadingSpinner } from './LoadingSpinner';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function AdminUsersTabInner() {
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce für bessere Performance
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Form State
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
    isActive: true,
  });

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/users');
      const data = extractData(response.data);
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Fehler beim Laden der Admins';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateAdmin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await api.post('/admin/users', adminForm);
      showToast('Admin erfolgreich erstellt!', 'success');
      resetForm();
      fetchAdmins();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Fehler beim Erstellen des Admins';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  }, [adminForm, showToast, fetchAdmins]);

  const handleUpdateAdmin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      setError(null);
      const payload: any = { ...adminForm };
      // Entferne Passwort wenn leer
      if (!payload.password) {
        delete payload.password;
      }
      await api.put(`/admin/users/${editingAdmin.id}`, payload);
      showToast('Admin erfolgreich aktualisiert!', 'success');
      resetForm();
      fetchAdmins();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Fehler beim Aktualisieren des Admins';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  }, [editingAdmin, adminForm, showToast, fetchAdmins]);

  const handleDeleteAdmin = useCallback(async (id: string) => {
    if (!confirm('Möchten Sie diesen Admin wirklich löschen?')) return;

    try {
      await api.delete(`/admin/users/${id}`);
      showToast('Admin erfolgreich gelöscht!', 'success');
      fetchAdmins();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Löschen des Admins', 'error');
    }
  }, [showToast, fetchAdmins]);

  const handleToggleStatus = useCallback(async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}/toggle-status`);
      showToast('Admin-Status erfolgreich aktualisiert!', 'success');
      fetchAdmins();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Ändern des Status', 'error');
    }
  }, [showToast, fetchAdmins]);

  const handleEditAdmin = useCallback((admin: Admin) => {
    setEditingAdmin(admin);
    setAdminForm({
      name: admin.name,
      email: admin.email,
      password: '', // Passwort nicht anzeigen
      role: admin.role,
      isActive: admin.isActive,
    });
  }, []);

  const resetForm = useCallback(() => {
    setEditingAdmin(null);
    setAdminForm({
      name: '',
      email: '',
      password: '',
      role: 'ADMIN',
      isActive: true,
    });
  }, []);

  const filteredAdmins = useMemo(() => 
    admins.filter(admin => {
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        return (
          admin.name.toLowerCase().includes(query) ||
          admin.email.toLowerCase().includes(query) ||
          admin.role.toLowerCase().includes(query)
        );
      }
      return true;
    }), [admins, debouncedSearchQuery]
  );

  const handleBulkSelect = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredAdmins.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAdmins.map(a => a.id)));
    }
  }, [filteredAdmins, selectedItems]);

  // Spalten-Definition für VirtualizedDataTable
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      width: '200px',
    },
    {
      key: 'email',
      label: 'E-Mail',
      width: '250px',
    },
    {
      key: 'role',
      label: 'Rolle',
      width: '150px',
      render: (admin: Admin) => (
        <span
          style={{
            background: admin.role === 'SUPER_ADMIN' ? '#6610f2' : '#1877F2',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (admin: Admin) => (
        <span
          style={{
            background: admin.isActive ? '#28a745' : '#dc3545',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {admin.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Erstellt',
      width: '120px',
      render: (admin: Admin) => (
        <span style={{ fontSize: '13px' }}>
          {format(new Date(admin.createdAt), 'dd.MM.yyyy')}
        </span>
      ),
    },
  ], []);

  return (
    <div>
      {loading && admins.length === 0 ? (
        <LoadingSpinner text="Admins werden geladen..." />
      ) : (
        <>
          {/* Form */}
          <div className="form-container">
            <h2>{editingAdmin ? 'Admin bearbeiten' : 'Neuen Admin erstellen'}</h2>
            <form onSubmit={editingAdmin ? handleUpdateAdmin : handleCreateAdmin}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  required
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>E-Mail *</label>
                <input
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{editingAdmin ? 'Neues Passwort (leer lassen um nicht zu ändern)' : 'Passwort *'}</label>
                <input
                  type="password"
                  required={!editingAdmin}
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Rolle *</label>
                <select
                  value={adminForm.role}
                  onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as 'ADMIN' | 'SUPER_ADMIN' })}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={adminForm.isActive}
                    onChange={(e) => setAdminForm({ ...adminForm, isActive: e.target.checked })}
                  />
                  {' '}Aktiv
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit">
                  {editingAdmin ? 'Aktualisieren' : 'Erstellen'}
                </button>
                {editingAdmin && (
                  <button type="button" className="secondary" onClick={resetForm}>
                    Abbrechen
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Search & Filters */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <input
              type="text"
              placeholder="Nach Name oder E-Mail suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', width: '300px', minWidth: '200px' }}
            />
            <button
              onClick={() => setBulkMode(!bulkMode)}
              style={{ padding: '8px 16px', background: bulkMode ? '#6c757d' : '#1877F2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              {bulkMode ? '✖ Bulk-Modus beenden' : '✓ Bulk-Modus'}
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <LoadingSpinner text="Admins werden geladen..." />
          ) : (
            <VirtualizedDataTable
              items={filteredAdmins}
              columns={columns}
              height={600}
              rowHeight={70}
              bulkMode={bulkMode}
              selectedItems={selectedItems}
              onBulkSelect={handleBulkSelect}
              onSelectAll={handleSelectAll}
              renderRowActions={(admin) => (
                <div className="actions" style={{ display: 'flex', gap: '8px' }}>
                  <button className="small secondary" onClick={() => handleEditAdmin(admin)}>
                    Bearbeiten
                  </button>
                  <button
                    className="small secondary"
                    onClick={() => handleToggleStatus(admin.id)}
                  >
                    {admin.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button className="small danger" onClick={() => handleDeleteAdmin(admin.id)}>
                    Löschen
                  </button>
                </div>
              )}
              emptyMessage="Keine Admins gefunden"
            />
          )}
        </>
      )}
    </div>
  );
}

export const AdminUsersTab = memo(AdminUsersTabInner);


import { useState, memo } from 'react';
import { useRBACData } from '../hooks/useRBACData';
import { usePermissions } from '../hooks/usePermissions';
import { Skeleton, SkeletonCard } from '../design-system/Skeleton';
import { Button } from '../design-system/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import './RBACManagement.css';

function RBACManagementInner() {
  const { showToast } = useToast();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'permissions' | 'users' | 'sessions' | '2fa'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const {
    roles,
    permissions,
    users,
    sessions,
    twoFactorStatus,
    isLoading,
    error,
    refetch,
  } = useRBACData();

  const handleCreateRole = async () => {
    try {
      await api.post('/rbac/roles', roleForm);
      showToast('Rolle erfolgreich erstellt!', 'success');
      setShowRoleForm(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Erstellen der Rolle', 'error');
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleEnable2FA = async (userId: string) => {
    try {
      await api.post(`/rbac/users/${userId}/enable-2fa`);
      showToast('2FA erfolgreich aktiviert!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Aktivieren von 2FA', 'error');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/rbac/sessions/${sessionId}`);
      showToast('Session erfolgreich beendet!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Beenden der Session', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="rbac-management">
        <div className="rbac-header">
          <Skeleton height="32px" width="300px" />
        </div>
        <div className="rbac-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Fehler beim Laden der RBAC-Daten</h3>
        <p>{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
        <Button onClick={() => refetch()} variant="primary">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="rbac-management">
      <div className="rbac-header">
        <h2>RBAC-Verwaltung</h2>
        <div className="rbac-controls">
          {hasPermission('rbac:create') && (
            <Button variant="primary" onClick={() => setShowRoleForm(true)}>
              Neue Rolle erstellen
            </Button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="rbac-sub-tabs">
        <button
          className={`sub-tab ${activeSubTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('roles')}
        >
          👥 Rollen
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('permissions')}
        >
          🔐 Berechtigungen
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('users')}
        >
          👤 Benutzer
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('sessions')}
        >
          🔑 Sessions
        </button>
        <button
          className={`sub-tab ${activeSubTab === '2fa' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('2fa')}
        >
          🔒 2FA
        </button>
      </div>

      {/* Role Form Modal */}
      {showRoleForm && (
        <div className="modal-overlay" onClick={() => setShowRoleForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Neue Rolle erstellen</h3>
            <div className="form-group">
              <label>Rollenname *</label>
              <input
                type="text"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="z.B. Manager, Editor, Viewer"
              />
            </div>
            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Beschreibung der Rolle..."
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Berechtigungen</label>
              <div className="permissions-grid">
                {permissions && permissions.map((permission: { id: string; name: string; description: string; category: string }) => (
                  <label key={permission.id} className="permission-checkbox">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.includes(permission.id)}
                      onChange={() => handleTogglePermission(permission.id)}
                    />
                    <div className="permission-info">
                      <strong>{permission.name}</strong>
                      <span className="permission-category">{permission.category}</span>
                      <span className="permission-desc">{permission.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <Button variant="primary" onClick={handleCreateRole}>
                Erstellen
              </Button>
              <Button variant="secondary" onClick={() => setShowRoleForm(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeSubTab === 'roles' && (
        <div className="rbac-roles">
          <div className="roles-grid">
            {roles && roles.map((role: {
              id: string;
              name: string;
              description: string;
              permissionCount: number;
              userCount: number;
              createdAt: string;
            }) => (
              <div
                key={role.id}
                className={`role-card ${selectedRole === role.id ? 'selected' : ''}`}
                onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
              >
                <div className="role-header">
                  <h3>{role.name}</h3>
                  <span className="role-badge">{role.permissionCount} Berechtigungen</span>
                </div>
                <p className="role-description">{role.description || 'Keine Beschreibung'}</p>
                <div className="role-stats">
                  <span>{role.userCount} Benutzer</span>
                  <span>Erstellt: {new Date(role.createdAt).toLocaleDateString('de-DE')}</span>
                </div>
                {selectedRole === role.id && (
                  <div className="role-actions">
                    {hasPermission('rbac:update') && (
                      <Button variant="secondary" size="sm">Bearbeiten</Button>
                    )}
                    {hasPermission('rbac:delete') && (
                      <Button variant="danger" size="sm">Löschen</Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeSubTab === 'permissions' && (
        <div className="rbac-permissions">
          <div className="permissions-table-section">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>Berechtigung</th>
                  <th>Kategorie</th>
                  <th>Beschreibung</th>
                  <th>Verwendet in</th>
                </tr>
              </thead>
              <tbody>
                {permissions && permissions.length > 0 ? (
                  permissions.map((permission: {
                    id: string;
                    name: string;
                    description: string;
                    category: string;
                    roleCount: number;
                  }) => (
                    <tr key={permission.id}>
                      <td><strong>{permission.name}</strong></td>
                      <td><span className="category-badge">{permission.category}</span></td>
                      <td>{permission.description}</td>
                      <td>{permission.roleCount || 0} Rollen</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                      Keine Berechtigungen gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeSubTab === 'users' && (
        <div className="rbac-users">
          <div className="users-table-section">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>Benutzer</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>2FA</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users && users.length > 0 ? (
                  users.map((user: {
                    id: string;
                    name: string;
                    email: string;
                    role: string;
                    isActive: boolean;
                    has2FA: boolean;
                    lastLogin: string;
                  }) => (
                    <tr key={user.id}>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.email}</td>
                      <td><span className="role-badge-small">{user.role}</span></td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td>
                        {user.has2FA ? (
                          <span className="status-badge active">✓ Aktiv</span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEnable2FA(user.id)}
                          >
                            Aktivieren
                          </Button>
                        )}
                      </td>
                      <td>
                        <div className="actions">
                          {hasPermission('rbac:update') && (
                            <Button variant="secondary" size="sm">Bearbeiten</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      Keine Benutzer gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeSubTab === 'sessions' && (
        <div className="rbac-sessions">
          <div className="sessions-table-section">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>Benutzer</th>
                  <th>IP-Adresse</th>
                  <th>Gerät</th>
                  <th>Gestartet</th>
                  <th>Letzte Aktivität</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {sessions && sessions.length > 0 ? (
                  sessions.map((session: {
                    id: string;
                    userName: string;
                    ipAddress: string;
                    device: string;
                    startedAt: string;
                    lastActivity: string;
                  }) => (
                    <tr key={session.id}>
                      <td><strong>{session.userName}</strong></td>
                      <td>{session.ipAddress}</td>
                      <td>{session.device}</td>
                      <td>{new Date(session.startedAt).toLocaleString('de-DE')}</td>
                      <td>{new Date(session.lastActivity).toLocaleString('de-DE')}</td>
                      <td>
                        {hasPermission('rbac:delete') && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRevokeSession(session.id)}
                          >
                            Beenden
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      Keine aktiven Sessions gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2FA Tab */}
      {activeSubTab === '2fa' && twoFactorStatus && (
        <div className="rbac-2fa">
          <div className="2fa-metrics">
            <div className="metric-card">
              <h3>2FA aktiviert</h3>
              <div className="metric-value">
                {twoFactorStatus.enabledCount || 0}
              </div>
              <div className="metric-subtitle">von {twoFactorStatus.totalUsers || 0} Benutzern</div>
            </div>
            <div className="metric-card">
              <h3>Aktivierungsrate</h3>
              <div className="metric-value">
                {twoFactorStatus.enabledCount && twoFactorStatus.totalUsers
                  ? ((twoFactorStatus.enabledCount / twoFactorStatus.totalUsers) * 100).toFixed(1)
                  : '0.0'}%
              </div>
              <div className="metric-subtitle">Aktivierungsrate</div>
            </div>
          </div>
          <div className="2fa-info">
            <h3>Zwei-Faktor-Authentifizierung</h3>
            <p>
              Die Zwei-Faktor-Authentifizierung (2FA) erhöht die Sicherheit, indem sie eine zusätzliche
              Authentifizierungsebene erfordert. Benutzer müssen neben ihrem Passwort auch einen Code
              von ihrem mobilen Gerät eingeben.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export const RBACManagement = memo(RBACManagementInner);


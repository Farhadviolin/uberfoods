import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { logError } from '../utils/errorReporting';
import './FavoritesCollections.css';

interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  items: Array<{
    id: string;
    type: 'restaurant' | 'dish';
    name: string;
    imageUrl?: string;
  }>;
  createdAt: string;
}

export function FavoritesCollections() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });

  const fetchCollections = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await api.get('/customers/me/collections');
      setCollections(response.data || []);
    } catch (error: unknown) {
      logError(error, { component: 'FavoritesCollections', action: 'fetchCollections' });
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, showToast]);

  useEffect(() => {
    if (user?.id) {
      fetchCollections();
    }
  }, [user?.id, fetchCollections]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      await api.post('/customers/me/collections', formData);
      showToast('Sammlung wurde erstellt!', 'success');
      setShowForm(false);
      setFormData({ name: '', description: '', isPublic: false });
      fetchCollections();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm('Möchten Sie diese Sammlung wirklich löschen?')) return;

    try {
      await api.delete(`/customers/me/collections/${collectionId}`);
      showToast('Sammlung wurde gelöscht', 'success');
      fetchCollections();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleShareCollection = async (collectionId: string) => {
    try {
      const response = await api.post(`/customers/me/collections/${collectionId}/share`);
      if (response.data.shareUrl) {
        await navigator.clipboard.writeText(response.data.shareUrl);
        showToast('Link wurde in die Zwischenablage kopiert!', 'success');
      }
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  if (loading) {
    return (
      <div className="collections-loading">
        <div>Lade Sammlungen...</div>
      </div>
    );
  }

  return (
    <div className="favorites-collections">
      <div className="collections-header">
        <h1>Meine Sammlungen</h1>
        <button onClick={() => setShowForm(true)} className="create-button">
          + Neue Sammlung
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateCollection} className="collection-form">
          <h2>Neue Sammlung erstellen</h2>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              required
              placeholder="z.B. Meine Lieblings-Pizzen"
            />
          </div>
          <div className="form-group">
            <label>Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="form-input"
              rows={3}
              placeholder="Optionale Beschreibung..."
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData({ ...formData, isPublic: e.target.checked })
                }
              />
              Öffentlich (von anderen sichtbar)
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-button">
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="cancel-button"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="collections-grid">
        {collections.length === 0 ? (
          <div className="empty-state">
            <p>Noch keine Sammlungen erstellt</p>
            <button onClick={() => setShowForm(true)} className="create-button">
              Erste Sammlung erstellen
            </button>
          </div>
        ) : (
          collections.map((collection) => (
            <div key={collection.id} className="collection-card">
              <div className="collection-header">
                <div>
                  <h3>{collection.name}</h3>
                  {collection.description && (
                    <p className="collection-description">{collection.description}</p>
                  )}
                </div>
                {collection.isPublic && (
                  <span className="public-badge">🌐 Öffentlich</span>
                )}
              </div>
              <div className="collection-items">
                <div className="items-count">
                  {collection.items.length} {collection.items.length === 1 ? 'Element' : 'Elemente'}
                </div>
                {collection.items.length > 0 && (
                  <div className="items-preview">
                    {collection.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="item-preview">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="item-image"
                          />
                        ) : (
                          <div className="item-placeholder">
                            {item.type === 'restaurant' ? '🍕' : '🍽️'}
                          </div>
                        )}
                      </div>
                    ))}
                    {collection.items.length > 3 && (
                      <div className="item-more">+{collection.items.length - 3}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="collection-footer">
                <div className="collection-date">
                  Erstellt: {new Date(collection.createdAt).toLocaleDateString('de-DE')}
                </div>
                <div className="collection-actions">
                  <button
                    onClick={() => handleShareCollection(collection.id)}
                    className="action-button share"
                    title="Teilen"
                  >
                    📤
                  </button>
                  <button
                    onClick={() => handleDeleteCollection(collection.id)}
                    className="action-button delete"
                    title="Löschen"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

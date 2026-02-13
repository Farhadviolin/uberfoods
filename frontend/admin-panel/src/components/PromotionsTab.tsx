import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { format } from 'date-fns';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDebounce } from '../hooks/useDebounce';
import { VirtualizedDataTable } from './VirtualizedTable';
import { LoadingSpinner } from './LoadingSpinner';
import { exportPromotionsToCSV, exportPromotionsToPDF, exportPromotionsToExcel } from '../utils/export';
import { devError } from '../utils/errorLogger';
import { extractErrorMessage } from '../utils/errorHandler';

interface Promotion {
  id: string;
  name: string;
  description?: string;
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  code?: string;
  startDate: string;
  endDate: string;
  restaurantId?: string;
  restaurant?: {
    id: string;
    name: string;
  };
  minOrderAmount?: number;
  maxUses?: number;
  currentUses?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Restaurant {
  id: string;
  name: string;
}

export function PromotionsTab() {
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce für bessere Performance
  const [filterActive, setFilterActive] = useState<string>('all'); // all, active, expired, upcoming
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Form State
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [promotionForm, setPromotionForm] = useState({
    name: '',
    description: '',
    discount: 10,
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    code: '',
    startDate: '',
    endDate: '',
    restaurantId: '',
    minOrderAmount: '',
    maxUses: '',
    isActive: true,
  });

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/promotions');
      const promotionsData = response.data?.data || response.data || [];
      setPromotions(Array.isArray(promotionsData) ? promotionsData.map(p => ({
        ...p,
        currentUses: p.currentUses ?? 0,
        maxUses: p.maxUses ?? null,
      })) : []);
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchRestaurants = useCallback(async () => {
    try {
      const response = await api.get('/admin/restaurants');
      // Stelle sicher, dass restaurants immer ein Array ist
      const restaurantData = response.data;
      if (Array.isArray(restaurantData)) {
        setRestaurants(restaurantData);
      } else if (restaurantData && Array.isArray(restaurantData.data)) {
        setRestaurants(restaurantData.data);
      } else {
        setRestaurants([]);
      }
    } catch (err: unknown) {
      // Error wird bereits durch API-Interceptor behandelt
      devError('Fehler beim Laden der Restaurants:', err);
      setRestaurants([]); // Fallback zu leerem Array
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
    fetchRestaurants();
  }, [fetchPromotions, fetchRestaurants]);

  // WebSocket Integration using centralized hook
  useWebSocket({
    onPromotionCreated: (promotion: Promotion) => {
      setPromotions(prev => {
        if (!Array.isArray(prev)) return [promotion];
        if (prev.some(p => p.id === promotion.id)) return prev;
        return [{
          ...promotion,
          currentUses: promotion.currentUses ?? 0,
          maxUses: promotion.maxUses ?? null,
        }, ...prev];
      });
      showToast('Neue Promotion erstellt', 'info');
    },
    onPromotionUpdated: (promotion: Promotion) => {
      setPromotions(prev => {
        if (!Array.isArray(prev)) return [promotion];
        const index = prev.findIndex(p => p.id === promotion.id);
        if (index === -1) return prev;
        const newPromotions = [...prev];
        newPromotions[index] = {
          ...promotion,
          currentUses: promotion.currentUses ?? 0,
          maxUses: promotion.maxUses ?? null,
        };
        return newPromotions;
      });
      showToast('Promotion aktualisiert', 'info');
    },
    onPromotionDeleted: (data: { id: string }) => {
      setPromotions(prev => prev.filter(p => p.id !== data.id));
      showToast('Promotion gelöscht', 'info');
    },
  });

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const payload: Record<string, unknown> = {
        ...promotionForm,
        discount: parseFloat(promotionForm.discount.toString()),
        restaurantId: promotionForm.restaurantId || undefined,
        minOrderAmount: promotionForm.minOrderAmount ? parseFloat(promotionForm.minOrderAmount) : undefined,
        maxUses: promotionForm.maxUses ? parseInt(promotionForm.maxUses) : undefined,
        code: promotionForm.code || undefined,
      };

      await api.post('/admin/promotions', payload);
      showToast('Promotion erfolgreich erstellt!', 'success');
      resetForm();
      fetchPromotions();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleUpdatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromotion) return;

    try {
      setError(null);
      const payload: Record<string, unknown> = {
        ...promotionForm,
        discount: parseFloat(promotionForm.discount.toString()),
        restaurantId: promotionForm.restaurantId || undefined,
        minOrderAmount: promotionForm.minOrderAmount ? parseFloat(promotionForm.minOrderAmount) : undefined,
        maxUses: promotionForm.maxUses ? parseInt(promotionForm.maxUses) : undefined,
        code: promotionForm.code || undefined,
      };

      await api.put(`/admin/promotions/${editingPromotion.id}`, payload);
      showToast('Promotion erfolgreich aktualisiert!', 'success');
      resetForm();
      fetchPromotions();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('Möchten Sie diese Promotion wirklich löschen?')) return;

    try {
      await api.delete(`/admin/promotions/${id}`);
      showToast('Promotion erfolgreich gelöscht!', 'success');
      fetchPromotions();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.patch(`/promotions/${id}/toggle-status`);
      showToast('Promotion-Status erfolgreich aktualisiert!', 'success');
      fetchPromotions();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setPromotionForm({
      name: promotion.name,
      description: promotion.description || '',
      discount: promotion.discount,
      discountType: promotion.discountType,
      code: promotion.code || '',
      startDate: format(new Date(promotion.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(promotion.endDate), 'yyyy-MM-dd'),
      restaurantId: promotion.restaurantId || '',
      minOrderAmount: promotion.minOrderAmount?.toString() || '',
      maxUses: promotion.maxUses?.toString() || '',
      isActive: promotion.isActive,
    });
  };

  const resetForm = () => {
    setEditingPromotion(null);
    setPromotionForm({
      name: '',
      description: '',
      discount: 10,
      discountType: 'PERCENTAGE',
      code: '',
      startDate: '',
      endDate: '',
      restaurantId: '',
      minOrderAmount: '',
      maxUses: '',
      isActive: true,
    });
  };

  const handleBulkSelect = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredPromotions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredPromotions.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Möchten Sie wirklich ${selectedItems.size} Promotion(s) löschen?`)) return;

    try {
      await Promise.all(Array.from(selectedItems).map(id => api.delete(`/promotions/${id}`)));
      showToast(`${selectedItems.size} Promotion(s) erfolgreich gelöscht!`, 'success');
      setSelectedItems(new Set());
      setBulkMode(false);
      fetchPromotions();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const getPromotionStatus = (promotion: Promotion): 'active' | 'expired' | 'upcoming' => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);

    if (!promotion.isActive) return 'expired';
    if (startDate > now) return 'upcoming';
    if (endDate < now) return 'expired';
    return 'active';
  };

  const filteredPromotions = useMemo(() => 
    promotions.filter(p => {
      // Search Filter
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        if (
          !p.name.toLowerCase().includes(query) &&
          !p.code?.toLowerCase().includes(query) &&
          !p.description?.toLowerCase().includes(query) &&
          !p.restaurant?.name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status Filter
      if (filterActive !== 'all') {
        const status = getPromotionStatus(p);
        if (filterActive === 'active' && status !== 'active') return false;
        if (filterActive === 'expired' && status !== 'expired') return false;
        if (filterActive === 'upcoming' && status !== 'upcoming') return false;
      }

      return true;
    }), [promotions, debouncedSearchQuery, filterActive]
  );

  // Spalten-Definition für VirtualizedDataTable
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      width: '200px',
    },
    {
      key: 'code',
      label: 'Code',
      width: '120px',
      render: (promotion: Promotion) => (
        <code style={{ background: '#F0F2F5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
          {promotion.code || 'N/A'}
        </code>
      ),
    },
    {
      key: 'discount',
      label: 'Rabatt',
      width: '120px',
      render: (promotion: Promotion) => 
        promotion.discountType === 'PERCENTAGE' 
          ? `${Number(promotion.discount) || 0}%`
          : `${Number(promotion.discount).toFixed(2)} €`,
    },
    {
      key: 'restaurant',
      label: 'Restaurant',
      width: '200px',
      render: (promotion: Promotion) => promotion.restaurant?.name || 'Global',
    },
    {
      key: 'dates',
      label: 'Zeitraum',
      width: '200px',
      render: (promotion: Promotion) => {
        const startDate = promotion.startDate ? new Date(promotion.startDate) : null;
        const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

        const formatDate = (date: Date | null) => {
          if (!date || isNaN(date.getTime())) return '—';
          return format(date, 'dd.MM.yyyy');
        };

        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (promotion: Promotion) => {
        const status = getPromotionStatus(promotion);
        const colors = {
          active: '#28a745',
          expired: '#dc3545',
          upcoming: '#ffc107',
        };
        const labels = {
          active: 'Aktiv',
          expired: 'Abgelaufen',
          upcoming: 'Bevorstehend',
        };
        return (
          <span
            style={{
              background: colors[status],
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {labels[status]}
          </span>
        );
      },
    },
    {
      key: 'uses',
      label: 'Verwendungen',
      width: '120px',
      render: (promotion: Promotion) => {
        const currentUses = promotion.currentUses ?? 0;
        const maxUses = promotion.maxUses;

        if (maxUses && maxUses > 0) {
          return `${currentUses} / ${maxUses}`;
        }

        return currentUses.toString();
      },
    },
  ], []);

  return (
    <div>
      {loading && promotions.length === 0 ? (
        <LoadingSpinner text="Promotionen werden geladen..." />
      ) : (
        <>
          {/* Form */}
          <div className="form-container">
            <h2>{editingPromotion ? 'Promotion bearbeiten' : 'Neue Promotion erstellen'}</h2>
            <form onSubmit={editingPromotion ? handleUpdatePromotion : handleCreatePromotion}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  required
                  value={promotionForm.name}
                  onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Beschreibung</label>
                <textarea
                  value={promotionForm.description}
                  onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Rabatt *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={promotionForm.discountType === 'PERCENTAGE' ? '100' : undefined}
                    required
                    value={promotionForm.discount}
                    onChange={(e) => setPromotionForm({ ...promotionForm, discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label>Rabatt-Typ *</label>
                  <select
                    value={promotionForm.discountType}
                    onChange={(e) => setPromotionForm({ ...promotionForm, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                  >
                    <option value="PERCENTAGE">Prozent (%)</option>
                    <option value="FIXED">Fester Betrag (€)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Gutscheincode (optional - wird automatisch generiert wenn leer)</label>
                <input
                  type="text"
                  value={promotionForm.code}
                  onChange={(e) => setPromotionForm({ ...promotionForm, code: e.target.value.toUpperCase() })}
                  placeholder="z.B. SOMMER2024"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Startdatum *</label>
                  <input
                    type="date"
                    required
                    value={promotionForm.startDate}
                    onChange={(e) => setPromotionForm({ ...promotionForm, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Enddatum *</label>
                  <input
                    type="date"
                    required
                    value={promotionForm.endDate}
                    onChange={(e) => setPromotionForm({ ...promotionForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Restaurant (optional - leer = global)</label>
                <select
                  value={promotionForm.restaurantId}
                  onChange={(e) => setPromotionForm({ ...promotionForm, restaurantId: e.target.value })}
                >
                  <option value="">Alle Restaurants (Global)</option>
                  {(restaurants || []).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Mindestbestellwert (€, optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={promotionForm.minOrderAmount}
                    onChange={(e) => setPromotionForm({ ...promotionForm, minOrderAmount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Max. Verwendungen (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={promotionForm.maxUses}
                    onChange={(e) => setPromotionForm({ ...promotionForm, maxUses: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={promotionForm.isActive}
                    onChange={(e) => setPromotionForm({ ...promotionForm, isActive: e.target.checked })}
                  />
                  {' '}Aktiv
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit">
                  {editingPromotion ? 'Aktualisieren' : 'Erstellen'}
                </button>
                {editingPromotion && (
                  <button type="button" className="secondary" onClick={resetForm}>
                    Abbrechen
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Filters & Search */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <input
              type="text"
              placeholder="Nach Name, Code oder Restaurant suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', width: '300px', minWidth: '200px' }}
            />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#F0F2F5' }}
              >
                <option value="all">Alle</option>
                <option value="active">Aktiv</option>
                <option value="upcoming">Bevorstehend</option>
                <option value="expired">Abgelaufen</option>
              </select>
              <button
                onClick={() => setBulkMode(!bulkMode)}
                style={{ padding: '8px 16px', background: bulkMode ? '#6c757d' : '#1877F2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                {bulkMode ? '✖ Bulk-Modus beenden' : '✓ Bulk-Modus'}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => exportPromotionsToCSV(filteredPromotions)}
                  style={{ padding: '8px 16px', background: '#1877F2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  📥 CSV
                </button>
                <button
                  onClick={() => exportPromotionsToPDF(filteredPromotions)}
                  style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  📄 PDF
                </button>
                <button
                  onClick={async () => {
                    try {
                      await exportPromotionsToExcel(filteredPromotions);
                    } catch (error) {
                      devError('Excel export failed:', error);
                    }
                  }}
                  style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  📊 Excel
                </button>
              </div>
            </div>
          </div>

          {bulkMode && selectedItems.size > 0 && (
            <div className="bulk-actions-bar">
              <span style={{ fontWeight: 600 }}>{selectedItems.size} ausgewählt</span>
              <div className="bulk-actions-buttons">
                <button
                  onClick={handleBulkDelete}
                  style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  🗑 Löschen
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <LoadingSpinner text="Promotionen werden geladen..." />
          ) : (
            <VirtualizedDataTable
              items={filteredPromotions}
              columns={columns}
              height={600}
              rowHeight={70}
              bulkMode={bulkMode}
              selectedItems={selectedItems}
              onBulkSelect={handleBulkSelect}
              onSelectAll={handleSelectAll}
              renderRowActions={(promotion) => (
                <div className="actions" style={{ display: 'flex', gap: '8px' }}>
                  <button className="small secondary" onClick={() => handleEditPromotion(promotion)}>
                    Bearbeiten
                  </button>
                  <button
                    className="small secondary"
                    onClick={() => handleToggleStatus(promotion.id)}
                  >
                    {promotion.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button className="small danger" onClick={() => handleDeletePromotion(promotion.id)}>
                    Löschen
                  </button>
                </div>
              )}
              emptyMessage="Keine Promotionen gefunden"
            />
          )}
        </>
      )}
    </div>
  );
}


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from './LoadingSpinner';
import './RestaurantManagement.css';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string;
  isActive: boolean;
  cuisines?: string[];
  rating?: number;
  deliveryTime?: number;
  minimumOrder?: number;
  createdAt: string;
}

type BulkAction = '' | 'activate' | 'deactivate' | 'delete';

export const RestaurantManagement = React.memo(function RestaurantManagement() {
  const { showToast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog({ isOpen: false, title: '', message: '', action: () => {} });
  }, []);

  const toggleActionMenu = useCallback((restaurantId: string) => {
    setOpenActionMenu(prev => prev === restaurantId ? null : restaurantId);
  }, []);

  const closeActionMenu = useCallback(() => {
    setOpenActionMenu(null);
  }, []);

  // Mock data - in real app this would come from API
  useEffect(() => {
    setTimeout(() => {
      setRestaurants([
        {
          id: '1',
          name: 'Pizza Palace',
          description: 'Authentische italienische Pizza seit 1985',
          address: 'Hauptstraße 123, 1010 Wien',
          phone: '+43 1 2345678',
          email: 'info@pizzapalace.at',
          imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
          isActive: true,
          cuisines: ['Italienisch', 'Pizza'],
          rating: 4.5,
          deliveryTime: 25,
          minimumOrder: 10,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'Burger Joint',
          description: 'Amerikanische Burger mit hausgemachten Patties',
          address: 'Kärntner Straße 45, 1010 Wien',
          phone: '+43 1 8765432',
          email: 'hello@burgerjoint.at',
          imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
          isActive: false,
          cuisines: ['Amerikanisch', 'Burger'],
          rating: 4.2,
          deliveryTime: 20,
          minimumOrder: 8,
          createdAt: '2024-02-01T14:30:00Z',
        },
        {
          id: '3',
          name: 'Sushi Garden',
          description: 'Frische Sushi und asiatische Küche',
          address: 'Mariahilfer Straße 89, 1070 Wien',
          phone: '+43 1 3456789',
          email: 'info@sushigarden.at',
          imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
          isActive: true,
          cuisines: ['Asiatisch', 'Japanisch', 'Sushi'],
          rating: 4.7,
          deliveryTime: 30,
          minimumOrder: 15,
          createdAt: '2024-01-20T09:15:00Z',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Get unique cuisines for filter
  const availableCuisines = useMemo(() => {
    const cuisines = new Set<string>();
    restaurants.forEach(restaurant => {
      restaurant.cuisines?.forEach(cuisine => cuisines.add(cuisine));
    });
    return Array.from(cuisines).sort();
  }, [restaurants]);

  // Filtered restaurants based on search and filters
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
      const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          restaurant.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          restaurant.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          restaurant.cuisines?.some(cuisine =>
                            cuisine.toLowerCase().includes(searchTerm.toLowerCase())
                          );

      const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'active' && restaurant.isActive) ||
                          (statusFilter === 'inactive' && !restaurant.isActive);

      const matchesCuisine = cuisineFilter === 'all' ||
                           restaurant.cuisines?.includes(cuisineFilter);

      return matchesSearch && matchesStatus && matchesCuisine;
    });
  }, [restaurants, searchTerm, statusFilter, cuisineFilter]);

  // Helper values for correct "Select All"
  const filteredIds = filteredRestaurants.map(r => r.id);
  const selectedInFilteredCount = filteredRestaurants.reduce(
    (acc, r) => acc + (selectedRestaurants.has(r.id) ? 1 : 0),
    0
  );
  const allFilteredSelected = filteredRestaurants.length > 0 && selectedInFilteredCount === filteredRestaurants.length;

  const toggleRestaurantStatus = useCallback((restaurantId: string) => {
    setRestaurants(prev =>
      prev.map(restaurant =>
        restaurant.id === restaurantId
          ? { ...restaurant, isActive: !restaurant.isActive }
          : restaurant
      )
    );
    showToast('Restaurant-Status aktualisiert', 'success');
  }, [showToast]);

  const handleDeleteRestaurant = useCallback((restaurantId: string, restaurantName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restaurant löschen',
      message: `Sind Sie sicher, dass Sie das Restaurant "${restaurantName}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden und entfernt alle zugehörigen Gerichte und Bestellungen.`,
      action: () => {
        setRestaurants(prev => prev.filter(restaurant => restaurant.id !== restaurantId));
        showToast('Restaurant erfolgreich gelöscht', 'success');
        setConfirmDialog({ isOpen: false, title: '', message: '', action: () => {} });
      },
    });
  }, [showToast]);

  const handleBulkSelect = useCallback((id: string, checked: boolean) => {
    setSelectedRestaurants(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkSelectAll = useCallback((checked: boolean) => {
    setSelectedRestaurants(prev => {
      const next = new Set(prev);
      if (checked) {
        // alle gefilterten hinzufügen (Union)
        for (const id of filteredIds) next.add(id);
      } else {
        // nur gefilterte entfernen (nicht global alles löschen)
        for (const id of filteredIds) next.delete(id);
      }
      return next;
    });
  }, [filteredIds]);

  const handleBulkAction = useCallback((action: string) => {
    if (action === 'delete' && selectedRestaurants.size > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Restaurants löschen',
        message: `Sind Sie sicher, dass Sie ${selectedRestaurants.size} Restaurants löschen möchten?`,
        action: () => {
          setRestaurants(prev => prev.filter(r => !selectedRestaurants.has(r.id)));
          setSelectedRestaurants(new Set());
          showToast(`${selectedRestaurants.size} Restaurants gelöscht`, 'success');
          closeConfirmDialog();
        }
      });
    } else if (action === 'activate' || action === 'deactivate') {
      const isActive = action === 'activate';
      setRestaurants(prev =>
        prev.map(r =>
          selectedRestaurants.has(r.id) ? { ...r, isActive } : r
        )
      );
      setSelectedRestaurants(new Set());
      showToast(`${selectedRestaurants.size} Restaurants ${isActive ? 'aktiviert' : 'deaktiviert'}`, 'success');
    }
  }, [selectedRestaurants, showToast, closeConfirmDialog]);

  // APPLY: nur hier wird wirklich ausgeführt
  const applyBulkAction = useCallback(() => {
    if (!bulkAction) return;

    handleBulkAction(bulkAction);

    // deterministisch aufräumen
    setBulkAction('');
    setSelectedRestaurants(new Set());
  }, [bulkAction, handleBulkAction]);

  const handleExportCSV = useCallback(() => {
    const csvContent = [
      'ID,Name,Description,Address,Phone,Email,IsActive,Cuisines,Rating,DeliveryTime,MinimumOrder',
      ...restaurants.map(r =>
        `"${r.id}","${r.name}","${r.description}","${r.address}","${r.phone}","${r.email}",${r.isActive},"${r.cuisines?.join(';') || ''}",${r.rating || 0},${r.deliveryTime || 0},${r.minimumOrder || 0}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `restaurants-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('CSV Export erfolgreich heruntergeladen', 'success');
  }, [restaurants, showToast]);

  const handleAddRestaurant = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('restaurant-name') as string;
    const address = formData.get('restaurant-address') as string;

    // Mock adding a new restaurant
    const newRestaurant: Restaurant = {
      id: Date.now().toString(),
      name: name || 'Neues Restaurant',
      description: 'Beschreibung folgt...',
      address: address || 'Adresse folgt...',
      phone: '+43 000 000000',
      email: 'info@restaurant.at',
      isActive: true,
      cuisines: ['Verschiedenes'],
      rating: 0,
      deliveryTime: 30,
      minimumOrder: 10,
      createdAt: new Date().toISOString(),
    };
    setRestaurants(prev => [...prev, newRestaurant]);
    showToast('Restaurant erfolgreich hinzugefügt', 'success');
    setShowAddModal(false);
  }, [showToast]);

  const handleEditRestaurant = useCallback((restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
  }, []);

  const handleUpdateRestaurant = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('restaurant-name') as string;
    const address = formData.get('restaurant-address') as string;

    setRestaurants(prev =>
      prev.map(r =>
        r.id === editingRestaurant.id
          ? { ...r, name: name || r.name, address: address || r.address }
          : r
      )
    );
    showToast('Restaurant erfolgreich aktualisiert', 'success');
    setEditingRestaurant(null);
  }, [editingRestaurant, showToast]);

  if (loading) {
    return <LoadingSpinner text="Restaurants werden geladen..." />;
  }

  return (
    <div className="restaurant-management" data-testid="restaurant-management">
      {/* Header Section */}
      <div className="page-header-section">
        <div className="header-content">
          <h1 className="typography-h2 page-title">Restaurants verwalten</h1>
          <p className="typography-body page-description">
            Verwalten Sie alle Restaurants in Ihrem System. Überwachen Sie Status,
            bearbeiten Sie Details und verwalten Sie die Restaurant-Performance.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
            data-testid="btn-create-restaurant"
          >
            <span className="btn-icon">➕</span>
            Restaurant hinzufügen
          </button>
          <button
            className="btn-secondary"
            onClick={handleExportCSV}
            data-testid="btn-export-csv"
          >
            <span className="btn-icon">📄</span>
            CSV Export
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Suche nach Name, Beschreibung, Adresse oder Küche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            data-testid="input-search-restaurants"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Alle ({restaurants.length})
          </button>
          <button
            className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Aktiv ({restaurants.filter(r => r.isActive).length})
          </button>
          <button
            className={`filter-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inaktiv ({restaurants.filter(r => !r.isActive).length})
          </button>
        </div>

        <div className="cuisine-filter">
          <select
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
            className="cuisine-select"
          >
            <option value="all">Alle Küchen</option>
            {availableCuisines.map(cuisine => (
              <option key={cuisine} value={cuisine}>{cuisine}</option>
            ))}
          </select>
        </div>

        <button
          className="btn-secondary"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          Erweiterte Filter {showAdvancedFilters ? '▲' : '▼'}
        </button>

        {/* Bulk Actions */}
        {selectedRestaurants.size > 0 && (
          <div className="bulk-actions" data-testid="bulk-actions">
            <span>{selectedRestaurants.size} ausgewählt</span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as BulkAction)}
              data-testid="bulk-action"
            >
              <option value="">Aktion wählen...</option>
              <option value="activate">Aktivieren</option>
              <option value="deactivate">Deaktivieren</option>
              <option value="delete">Löschen</option>
            </select>
            <button
              onClick={applyBulkAction}
              className="btn-primary"
              data-testid="bulk-apply"
              disabled={!bulkAction || selectedRestaurants.size === 0}
            >
              Anwenden
            </button>
          </div>
        )}

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="advanced-filters" data-testid="advanced-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Status</label>
                <select
                  name="status"
                  value={statusFilter === 'active' ? 'OPEN' : statusFilter === 'inactive' ? 'CLOSED' : 'ALL'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'OPEN') setStatusFilter('active');
                    else if (value === 'CLOSED') setStatusFilter('inactive');
                    else setStatusFilter('all');
                  }}
                >
                  <option value="ALL">Alle Status</option>
                  <option value="OPEN">Aktiv</option>
                  <option value="CLOSED">Inaktiv</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="table-container">
        <table className="restaurants-table" data-testid="restaurant-table">
          <thead>
            <tr>
              <th className="col-select">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => handleBulkSelectAll(e.target.checked)}
                  data-testid="bulk-select-all"
                />
              </th>
              <th className="col-name">Restaurant</th>
              <th className="col-address">Adresse</th>
              <th className="col-contact">Kontakt</th>
              <th className="col-cuisine">Küche</th>
              <th className="col-rating">Bewertung</th>
              <th className="col-status">Status</th>
              <th className="col-actions">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredRestaurants.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  <div className="empty-state-content">
                    <span className="empty-icon">🏪</span>
                    <h3>Keine Restaurants gefunden</h3>
                    <p>
                      {restaurants.length === 0
                        ? 'Es wurden noch keine Restaurants hinzugefügt.'
                        : 'Versuchen Sie, Ihre Suchkriterien zu ändern.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRestaurants.map(restaurant => (
                <tr key={restaurant.id} data-testid={`restaurant-row-${restaurant.id}`}>
                  <td className="col-select">
                    <input
                      type="checkbox"
                      checked={selectedRestaurants.has(restaurant.id)}
                      onChange={(e) => handleBulkSelect(restaurant.id, e.target.checked)}
                      data-testid={`bulk-row-${restaurant.id}`}
                    />
                  </td>
                  <td className="col-name">
                    <div className="restaurant-name-cell">
                      <div className="restaurant-image">
                        {restaurant.imageUrl ? (
                          <img src={restaurant.imageUrl} alt={restaurant.name} />
                        ) : (
                          <div className="restaurant-placeholder">
                            {restaurant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="restaurant-info">
                        <div className="restaurant-name">{restaurant.name}</div>
                        <div className="restaurant-description">
                          {restaurant.description.length > 60
                            ? `${restaurant.description.substring(0, 60)}...`
                            : restaurant.description}
                        </div>
                        <div className="restaurant-meta">
                          <span>🕒 {restaurant.deliveryTime}min</span>
                          <span>💰 €{restaurant.minimumOrder}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="col-address">{restaurant.address}</td>
                  <td className="col-contact">
                    <div className="contact-info">
                      <div className="contact-phone">{restaurant.phone}</div>
                      <div className="contact-email">{restaurant.email}</div>
                    </div>
                  </td>
                  <td className="col-cuisine">
                    <div className="cuisine-tags">
                      {restaurant.cuisines?.slice(0, 2).map(cuisine => (
                        <span key={cuisine} className="cuisine-tag">{cuisine}</span>
                      ))}
                      {restaurant.cuisines && restaurant.cuisines.length > 2 && (
                        <span className="cuisine-more">+{restaurant.cuisines.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="col-rating">
                    <div className="rating-display">
                      <span className="rating-stars">
                        {'★'.repeat(Math.floor(restaurant.rating || 0))}
                        {'☆'.repeat(5 - Math.floor(restaurant.rating || 0))}
                      </span>
                      <span className="rating-score">{restaurant.rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="col-status">
                    <span
                      className={`status-badge ${restaurant.isActive ? 'active' : 'inactive'}`}
                      data-testid={`restaurant-status-${restaurant.id}`}
                    >
                      {restaurant.isActive ? '🟢 Aktiv' : '🔴 Inaktiv'}
                    </span>
                  </td>
                  <td className="col-actions">
                    <div className="actions-dropdown">
                      <button
                        className="actions-btn"
                        data-testid={`btn-actions-${restaurant.id}`}
                        onClick={() => toggleActionMenu(restaurant.id)}
                      >⋯</button>
                      <div
                        className={`actions-menu ${openActionMenu === restaurant.id ? 'open' : ''}`}
                        data-testid={`actions-menu-${restaurant.id}`}
                        data-open={openActionMenu === restaurant.id ? '1' : '0'}
                      >
                        <button
                          className="action-item"
                          onClick={() => showToast('Details werden geöffnet...', 'info')}
                        >
                          👁️ Details
                        </button>
                        <button
                          className="action-item"
                          onClick={() => {
                            handleEditRestaurant(restaurant);
                            closeActionMenu();
                          }}
                          data-testid={`btn-edit-${restaurant.id}`}
                        >
                          ✏️ Bearbeiten
                        </button>
                        <button
                          className="action-item"
                          onClick={() => {
                            toggleRestaurantStatus(restaurant.id);
                            closeActionMenu();
                          }}
                          data-testid={`btn-toggle-${restaurant.id}`}
                        >
                          {restaurant.isActive ? '🚫 Deaktivieren' : '✅ Aktivieren'}
                        </button>
                        <button
                          className="action-item"
                          onClick={() => showToast('Gerichte werden angezeigt...', 'info')}
                        >
                          🍽️ Gerichte
                        </button>
                        <button
                          className="action-item"
                          onClick={() => showToast('Bestellungen werden angezeigt...', 'info')}
                        >
                          📦 Bestellungen
                        </button>
                        <hr className="action-divider" />
                        <button
                          className="action-item danger"
                          onClick={() => {
                            handleDeleteRestaurant(restaurant.id, restaurant.name);
                            closeActionMenu();
                          }}
                          data-testid={`btn-delete-${restaurant.id}`}
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

      {/* Edit Restaurant Modal */}
      {editingRestaurant && (
        <div className="modal-overlay" data-testid="restaurant-modal">
          <div className="add-restaurant-modal">
            <h3>Restaurant bearbeiten</h3>
            <form onSubmit={handleUpdateRestaurant}>
              <div className="form-group">
                <label htmlFor="edit-restaurant-name">Name</label>
                <input
                  id="edit-restaurant-name"
                  name="restaurant-name"
                  type="text"
                  defaultValue={editingRestaurant.name}
                  required
                  data-testid="restaurant-name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-restaurant-address">Adresse</label>
                <input
                  id="edit-restaurant-address"
                  name="restaurant-address"
                  type="text"
                  defaultValue={editingRestaurant.address}
                  required
                  data-testid="restaurant-address"
                />
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingRestaurant(null)}
                  data-testid="btn-cancel-edit"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  data-testid="btn-save-restaurant"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" role="dialog">
          <div className="confirm-dialog" data-testid="confirm-dialog">
            <h3 className="dialog-title">{confirmDialog.title}</h3>
            <p className="dialog-message">{confirmDialog.message}</p>
            <div className="dialog-actions">
              <button
                className="btn-secondary"
                onClick={closeConfirmDialog}
                data-testid="btn-cancel-delete"
              >
                Abbrechen
              </button>
              <button
                className="btn-danger"
                onClick={confirmDialog.action}
                data-testid="btn-confirm-delete"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Restaurant Modal */}
      {showAddModal && (
        <div className="modal-overlay" data-testid="restaurant-modal">
          <div className="add-restaurant-modal">
            <h3>Neues Restaurant hinzufügen</h3>
            <form onSubmit={handleAddRestaurant}>
              <div className="form-group">
                <label htmlFor="restaurant-name">Name</label>
                <input
                  id="restaurant-name"
                  name="restaurant-name"
                  type="text"
                  required
                  data-testid="restaurant-name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="restaurant-address">Adresse</label>
                <input
                  id="restaurant-address"
                  name="restaurant-address"
                  type="text"
                  required
                  data-testid="restaurant-address"
                />
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  data-testid="btn-cancel-add"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  data-testid="btn-save-restaurant"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

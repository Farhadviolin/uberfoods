import { useState, useEffect, useCallback, memo } from 'react';
import api from '../utils/api';
import { config } from '../config';
import { extractErrorMessage, withRetryAndErrorHandling } from '../utils/errorHandler';
import { logError } from '../utils/errorLogger';
import { getImageUrl, handleImageError, PLACEHOLDER_IMAGES } from '../utils/imageUtils';
import { sanitizeUrl, validateImageUrl, escapeHtmlAttribute } from '../utils/security';
import { useToast } from '../contexts/ToastContext';
import { ImageUpload } from './ImageUpload';
import { LoadingSpinner } from './LoadingSpinner';
import { ConfirmationDialog } from './ConfirmationDialog';
import { useFormValidation } from '../hooks/useFormValidation';
import './DishesManagement.css';

interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  safeImageUrl?: string;
  safeName?: string;
  safeCategory?: string;
  safeDescription?: string;
  category: string;
  isAvailable: boolean;
  restaurantId: string;
}

interface Restaurant {
  id: string;
  name: string;
}

function DishesManagementInner() {
  const { showToast } = useToast();
  const sanitizeInput = (v: string) => (typeof v === 'string' ? v.replace(/[<>]/g, '') : '');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spezifische Loading-States für CRUD-Operationen
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // Dish Form Validation
  const dishValidation = useFormValidation({
    restaurantId: { required: true },
    name: { required: true, minLength: 2, maxLength: 100 },
    description: { maxLength: 500 },
    price: { required: true, custom: (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) return 'Preis muss eine positive Zahl sein';
      if (num > 999.99) return 'Preis darf maximal 999.99 € betragen';
      return null;
    }},
    category: { required: true, minLength: 2, maxLength: 50 },
  });
  
  const [dishForm, setDishForm] = useState({
    restaurantId: '',
    name: '',
    description: '',
    price: 0,
    category: '',
  });
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishSearchQuery, setDishSearchQuery] = useState<string>('');

  // Advanced Dish Filters
  const [dishFilters, setDishFilters] = useState({
    restaurantId: 'all',
    category: 'all',
    availability: 'all', // 'all', 'available', 'unavailable'
    hasImage: 'all', // 'all', 'yes', 'no'
    priceRange: 'all', // 'all', '0-5', '5-10', '10-20', '20+'
  });
  const [showAdvancedDishFilters, setShowAdvancedDishFilters] = useState(false);

  // Pagination State
  const [dishPagination, setDishPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Bulk Selection State
  const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

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

  const fetchDishes = useCallback(async (page = 1, limit?: number, filters?: typeof dishFilters) => {
    const fetchData = async () => {
      const params: any = { 
        page, 
        limit: limit || dishPagination.limit 
      };

      // Use provided filters or current dishFilters
      const activeFilters = filters || dishFilters;

      // Add filters to params
      if (activeFilters.restaurantId !== 'all') {
        params.restaurantId = activeFilters.restaurantId;
      }
      if (activeFilters.category !== 'all') {
        params.category = activeFilters.category;
      }
      if (activeFilters.availability !== 'all') {
        params.isAvailable = activeFilters.availability === 'available';
      }

      const response = await api.get('/admin/dishes', { params });

      const sanitizeText = (value: string): string => {
        if (typeof value !== 'string') return '';
        // Whitelist alphanumerisch + ausgewählte Satzzeichen/Leerzeichen
        const cleaned = value
          .replace(/javascript:/gi, '')
          .replace(/script/gi, '')
          .replace(/[<>"'`]/g, '');
        return cleaned.replace(/[^A-Za-z0-9ÄÖÜäöüß .,;:!?()\/+-]/g, '');
      };
      const escapeSafe = (v: string) => escapeHtmlAttribute(sanitizeText(v));

      const sanitizeDish = (dish: any): Dish => ({
        ...dish,
        imageUrl: '',
        safeImageUrl: PLACEHOLDER_IMAGES.dish,
        name: sanitizeText(dish?.name ?? ''),
        category: sanitizeText(dish?.category ?? ''),
        description: sanitizeText(dish?.description ?? ''),
        safeName: escapeSafe(dish?.name ?? ''),
        safeCategory: escapeSafe(dish?.category ?? ''),
        safeDescription: escapeSafe(dish?.description ?? ''),
      });

      if (response.data?.data && response.data?.pagination) {
        // Paginated response
        setDishes(Array.isArray(response.data.data) ? response.data.data.map(sanitizeDish) : []);
        setDishPagination(prev => ({
          ...prev,
          page: response.data.pagination.page,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
        }));
      } else {
        // Legacy response (fallback)
        setDishes(Array.isArray(response.data) ? response.data.map(sanitizeDish) : []);
        setDishPagination(prev => ({
          ...prev,
          page: 1,
          total: response.data.length || 0,
          totalPages: 1,
        }));
      }
      return response;
    };

    try {
      setLoading(true);
      await withRetryAndErrorHandling(
        fetchData,
        undefined,
        { maxRetries: 2, delayMs: 500 },
        'Gerichte laden'
      );
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setDishes([]);
    } finally {
      setLoading(false);
    }
  }, [showToast, dishPagination.limit, dishFilters]);

  const fetchRestaurants = useCallback(async () => {
    try {
      const response = await api.get('/admin/restaurants');
      const sanitizeRestaurant = (r: any): Restaurant => ({
        id: /^[A-Za-z0-9_-]{1,64}$/.test(r?.id) ? r.id : '',
        name: typeof r?.name === 'string' ? r.name.replace(/[<>]/g, '') : '',
      });
      setRestaurants(Array.isArray(response.data) ? response.data.map(sanitizeRestaurant) : []);
    } catch (err: unknown) {
      // Error wird bereits durch errorHandler behandelt
      // Zusätzliches Logging nur in Development
      if (import.meta.env.DEV) {
        logError(err, 'DishesManagement');
      }
    }
  }, []);

  useEffect(() => {
    fetchDishes(1, undefined, dishFilters);
    fetchRestaurants();
  }, [fetchDishes, fetchRestaurants]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setDishPagination(prev => ({ ...prev, page: 1 }));
    fetchDishes(1, undefined, dishFilters);
  }, [dishFilters.restaurantId, dishFilters.category, dishFilters.availability]);

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validierung prüfen
    if (!dishValidation.validateForm(dishForm)) {
      const firstError = Object.values(dishValidation.errors).find(err => err);
      if (firstError) {
        showToast(firstError, 'error');
      }
      return;
    }

    try {
      setError(null);
      setCreating(true);

      const formData = new FormData();
      Object.entries(dishForm).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
      if (dishImage) {
        formData.append('image', dishImage);
      }

      await api.post('/admin/dishes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Gericht erfolgreich erstellt!', 'success');
      setDishForm({ restaurantId: '', name: '', description: '', price: 0, category: '' });
      setDishImage(null);
      dishValidation.clearErrors();
      fetchDishes();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish) return;

    // Validierung prüfen
    if (!dishValidation.validateForm(dishForm)) {
      const firstError = Object.values(dishValidation.errors).find(err => err);
      if (firstError) {
        showToast(firstError, 'error');
      }
      return;
    }

    try {
      setError(null);
      setUpdating(true);

      // Validate dish ID to prevent injection
      const safeDishId = /^[A-Za-z0-9_-]{1,64}$/.test(editingDish.id) ? editingDish.id : '';
      if (!safeDishId) {
        showToast('Ungültige Gericht-ID', 'error');
        setUpdating(false);
        return;
      }

      const formData = new FormData();
      Object.entries(dishForm).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
      if (dishImage) {
        formData.append('image', dishImage);
      }

      await api.put(`/admin/dishes/${safeDishId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Gericht erfolgreich aktualisiert!', 'success');
      setEditingDish(null);
      setDishForm({ restaurantId: '', name: '', description: '', price: 0, category: '' });
      setDishImage(null);
      dishValidation.clearErrors();
      fetchDishes();
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDish = async (id: string) => {
    setConfirmationDialog({
      isOpen: true,
      title: 'Gericht löschen',
      message: 'Möchten Sie dieses Gericht wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Validate dish ID to prevent injection
          const safeId = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : '';
          if (!safeId) {
            showToast('Ungültige Gericht-ID', 'error');
            setConfirmationDialog({ ...confirmationDialog, isOpen: false });
            return;
          }
          setDeleting(safeId);
          await api.delete(`/admin/dishes/${safeId}`);
          showToast('Gericht erfolgreich gelöscht!', 'success');
          fetchDishes();
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        } catch (err) {
          setError('Fehler beim Löschen des Gerichts');
          showToast('Fehler beim Löschen des Gerichts', 'error');
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const handleEditDish = (dish: Dish) => {
    setEditingDish(dish);
    setDishForm({
      restaurantId: dish.restaurantId,
      name: dish.name,
      description: dish.description || '',
      price: dish.price,
      category: dish.category,
    });
    setDishImage(null);
    dishValidation.clearErrors(); // Fehler zurücksetzen beim Bearbeiten
  };

  const handleToggleDishAvailability = async (id: string, currentStatus: boolean) => {
    try {
      // Validate dish ID to prevent injection
      const safeId = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : '';
      if (!safeId) {
        showToast('Ungültige Gericht-ID', 'error');
        return;
      }
      setToggling(safeId);
      await api.patch(`/dishes/${safeId}/toggle-availability`);
      showToast(`Gericht erfolgreich ${currentStatus ? 'deaktiviert' : 'aktiviert'}!`, 'success');
      fetchDishes();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setToggling(null);
    }
  };

  // Bulk Operations
  const handleDishSelect = (id: string) => {
    setSelectedDishes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDishSelectAll = (dishes: any[]) => {
    if (selectedDishes.size === dishes.length) {
      setSelectedDishes(new Set());
    } else {
      setSelectedDishes(new Set(dishes.map(dish => dish.id)));
    }
  };

  const handleBulkToggleDishes = async (available: boolean) => {
    if (selectedDishes.size === 0) return;

    try {
      // Validate all dish IDs to prevent injection
      const safeIds = Array.from(selectedDishes).filter(id => /^[A-Za-z0-9_-]{1,64}$/.test(id));
      if (safeIds.length === 0) {
        showToast('Keine gültigen Gericht-IDs gefunden', 'error');
        return;
      }
      await Promise.all(safeIds.map(id =>
        api.patch(`/dishes/${id}/toggle-availability`)
      ));
      showToast(`${selectedDishes.size} Gerichte erfolgreich ${available ? 'aktiviert' : 'deaktiviert'}!`, 'success');
      setSelectedDishes(new Set());
      setBulkMode(false);
      fetchDishes();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleBulkDeleteDishes = async () => {
    if (selectedDishes.size === 0) return;

    setConfirmationDialog({
      isOpen: true,
      title: 'Gerichte löschen',
      message: `Möchten Sie wirklich ${selectedDishes.size} Gericht(e) löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Validate all dish IDs to prevent injection
          const safeIds = Array.from(selectedDishes).filter(id => /^[A-Za-z0-9_-]{1,64}$/.test(id));
          if (safeIds.length === 0) {
            showToast('Keine gültigen Gericht-IDs gefunden', 'error');
            setConfirmationDialog({ ...confirmationDialog, isOpen: false });
            return;
          }
          await Promise.all(safeIds.map(id => api.delete(`/dishes/${id}`)));
          showToast(`${selectedDishes.size} Gerichte erfolgreich gelöscht!`, 'success');
          setSelectedDishes(new Set());
          setBulkMode(false);
          fetchDishes();
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        } catch (err: unknown) {
          showToast(extractErrorMessage(err), 'error');
          setConfirmationDialog({ ...confirmationDialog, isOpen: false });
        }
      },
    });
  };

  // Client-side filtering for filters not supported server-side
  // Note: restaurantId, category, and availability are now filtered server-side
  const filteredDishes = dishes.filter(dish => {
    if (!dish) return false;

    // Text search (client-side only)
    if (dishSearchQuery) {
      const query = dishSearchQuery.toLowerCase();
      const matchesSearch =
        (dish.safeName || '').toLowerCase().includes(query) ||
        (dish.safeCategory || '').toLowerCase().includes(query) ||
        (dish.safeDescription || '').toLowerCase().includes(query) ||
        ((restaurants || []).find(r => r && r.id === dish.restaurantId)?.name || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Has image filter (client-side only)
    if (dishFilters.hasImage !== 'all') {
      if (dishFilters.hasImage === 'yes' && !dish.imageUrl) return false;
      if (dishFilters.hasImage === 'no' && dish.imageUrl) return false;
    }

    // Price range filter (client-side only)
    if (dishFilters.priceRange !== 'all') {
      const price = dish.price;
      switch (dishFilters.priceRange) {
        case '0-5': if (price >= 5) return false; break;
        case '5-10': if (price < 5 || price >= 10) return false; break;
        case '10-20': if (price < 10 || price >= 20) return false; break;
        case '20+': if (price < 20) return false; break;
      }
    }

    return true;
  });

  // Sanitize nochmals für Rendering (IDs, Texte)
  const safeFilteredDishes = filteredDishes.map(dish => ({
    ...dish,
    id: /^[A-Za-z0-9_-]{1,64}$/.test(dish.id) ? dish.id : '',
    name: dish.safeName || (dish.name || '').replace(/[<>]/g, ''),
    category: dish.safeCategory || (dish.category || '').replace(/[<>]/g, ''),
    description: dish.safeDescription || (dish.description || '').replace(/[<>]/g, ''),
    renderName: escapeHtmlAttribute(dish.safeName || dish.name || ''),
    renderCategory: escapeHtmlAttribute(dish.safeCategory || dish.category || ''),
  }));

  const renderDishes = safeFilteredDishes.map(dish => ({
    id: dish.id,
    img: dish.safeImageUrl || PLACEHOLDER_IMAGES.dish,
    name: dish.renderName ? dish.renderName.substring(0, 80) : 'Gericht',
    category: dish.renderCategory ? dish.renderCategory.substring(0, 80) : 'Kategorie',
    restaurantId: dish.restaurantId,
    price: dish.price,
    isAvailable: !!dish.isAvailable,
  }));

  return (
    <div className="dishes-management">
      {error && <div className="error-message">{(error || '').replace(/[<>]/g, '')}</div>}
      
      {loading && (
        <div className="loading">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Daten werden geladen...</p>
        </div>
      )}

      <div className="form-container">
        <h2>{editingDish ? 'Gericht bearbeiten' : 'Neues Gericht erstellen'}</h2>
        <form onSubmit={editingDish ? handleUpdateDish : handleCreateDish}>
          <div className="form-group">
            <label>Restaurant *</label>
            <select
              required
              value={dishForm.restaurantId}
              onChange={(e) => {
                setDishForm({ ...dishForm, restaurantId: e.target.value });
                dishValidation.validateField('restaurantId', e.target.value);
              }}
              onBlur={() => dishValidation.validateField('restaurantId', dishForm.restaurantId)}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}
            >
              <option value="">Restaurant auswählen</option>
              {(restaurants || []).map(restaurant => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
            {dishValidation.errors.restaurantId && (
              <span className="error-text">{dishValidation.errors.restaurantId}</span>
            )}
          </div>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              required
              value={dishForm.name}
              onChange={(e) => {
                const val = sanitizeInput(e.target.value);
                setDishForm({ ...dishForm, name: val });
                dishValidation.validateField('name', val);
              }}
              onBlur={() => dishValidation.validateField('name', dishForm.name)}
            />
            {dishValidation.errors.name && (
              <span className="error-text">{dishValidation.errors.name}</span>
            )}
          </div>
          <div className="form-group">
            <label>Beschreibung</label>
            <textarea
              value={dishForm.description}
              onChange={(e) => setDishForm({ ...dishForm, description: sanitizeInput(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Preis (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={dishForm.price}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setDishForm({ ...dishForm, price: value });
                dishValidation.validateField('price', value);
              }}
              onBlur={() => dishValidation.validateField('price', dishForm.price)}
            />
            {dishValidation.errors.price && (
              <span className="error-text">{dishValidation.errors.price}</span>
            )}
          </div>
          <div className="form-group">
            <label>Kategorie *</label>
            <input
              type="text"
              required
              value={dishForm.category}
              onChange={(e) => {
                const val = sanitizeInput(e.target.value);
                setDishForm({ ...dishForm, category: val });
                dishValidation.validateField('category', val);
              }}
              onBlur={() => dishValidation.validateField('category', dishForm.category)}
              placeholder="z.B. Pizza, Pasta, Getränke"
            />
            {dishValidation.errors.category && (
              <span className="error-text">{dishValidation.errors.category}</span>
            )}
          </div>
          <ImageUpload
            label="Gericht Bild"
            onFileSelect={setDishImage}
            currentImageUrl={editingDish?.imageUrl ? `${config.apiUrl}${editingDish.imageUrl}` : undefined}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={creating || updating}>
              {(creating && 'Erstelle...') ||
               (updating && 'Aktualisiere...') ||
               (editingDish ? 'Aktualisieren' : 'Erstellen')}
            </button>
            {editingDish && (
              <button
                type="button"
                className="secondary"
                disabled={updating}
                onClick={() => {
                  setEditingDish(null);
                  setDishForm({ restaurantId: '', name: '', description: '', price: 0, category: '' });
                  setDishImage(null);
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Nach Gericht suchen..."
            value={dishSearchQuery}
            onChange={(e) => setDishSearchQuery(sanitizeInput(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #CCD0D5', borderRadius: '6px', background: '#FFFFFF', width: '300px', minWidth: '200px' }}
          />
          <button
            onClick={() => setShowAdvancedDishFilters(!showAdvancedDishFilters)}
            style={{ padding: '8px 16px', background: showAdvancedDishFilters ? '#6c757d' : '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
          >
            {showAdvancedDishFilters ? '🔽 Erweiterte Filter ausblenden' : '🔼 Erweiterte Filter anzeigen'}
          </button>
        </div>

        {showAdvancedDishFilters && (
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e9ecef' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Erweiterte Filter</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6c757d' }}>Restaurant</label>
                <select
                  value={dishFilters.restaurantId}
                  onChange={(e) => setDishFilters({...dishFilters, restaurantId: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #CCD0D5', borderRadius: '4px' }}
                >
                  <option value="all">Alle Restaurants</option>
                  {(restaurants || []).map(restaurant => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6c757d' }}>Kategorie</label>
                <select
                  value={dishFilters.category}
                  onChange={(e) => setDishFilters({...dishFilters, category: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #CCD0D5', borderRadius: '4px' }}
                >
                  <option value="all">Alle Kategorien</option>
                  <option value="Pizza">Pizza</option>
                  <option value="Pasta">Pasta</option>
                  <option value="Burger">Burger</option>
                  <option value="Salat">Salat</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Getränke">Getränke</option>
                  <option value="Vorspeise">Vorspeise</option>
                  <option value="Hauptgang">Hauptgang</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6c757d' }}>Verfügbarkeit</label>
                <select
                  value={dishFilters.availability}
                  onChange={(e) => setDishFilters({...dishFilters, availability: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #CCD0D5', borderRadius: '4px' }}
                >
                  <option value="all">Alle</option>
                  <option value="available">Verfügbar</option>
                  <option value="unavailable">Nicht verfügbar</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6c757d' }}>Bild vorhanden</label>
                <select
                  value={dishFilters.hasImage}
                  onChange={(e) => setDishFilters({...dishFilters, hasImage: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #CCD0D5', borderRadius: '4px' }}
                >
                  <option value="all">Alle</option>
                  <option value="yes">Mit Bild</option>
                  <option value="no">Ohne Bild</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#6c757d' }}>Preisbereich</label>
                <select
                  value={dishFilters.priceRange}
                  onChange={(e) => setDishFilters({...dishFilters, priceRange: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #CCD0D5', borderRadius: '4px' }}
                >
                  <option value="all">Alle Preise</option>
                  <option value="0-5">0 - 5 €</option>
                  <option value="5-10">5 - 10 €</option>
                  <option value="10-20">10 - 20 €</option>
                  <option value="20+">20 € +</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDishFilters({
                  restaurantId: 'all',
                  category: 'all',
                  availability: 'all',
                  hasImage: 'all',
                  priceRange: 'all',
                })}
                style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Filter zurücksetzen
              </button>
              <span style={{ fontSize: '12px', color: '#6c757d', alignSelf: 'center' }}>
                {filteredDishes.length} von {dishes.length} Gerichten
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setBulkMode(!bulkMode)}
            style={{ padding: '8px 16px', background: bulkMode ? '#6c757d' : '#1877F2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
          >
            {bulkMode ? '✖ Bulk-Modus beenden' : '✓ Bulk-Modus'}
          </button>
        </div>
      </div>

      {bulkMode && selectedDishes.size > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffeaa7', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#856404' }}>{selectedDishes.size} Gerichte ausgewählt</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleBulkToggleDishes(true)}
                style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                ✓ Aktivieren
              </button>
              <button
                onClick={() => handleBulkToggleDishes(false)}
                style={{ padding: '8px 16px', background: '#ffc107', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                ✖ Deaktivieren
              </button>
              <button
                onClick={handleBulkDeleteDishes}
                style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                🗑 Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Gerichte werden geladen..." />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {bulkMode && (
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedDishes.size === safeFilteredDishes.length && safeFilteredDishes.length > 0}
                      onChange={() => handleDishSelectAll(safeFilteredDishes.map(d => d.id))}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                )}
                <th>Bild</th>
                <th>Name</th>
                <th>Restaurant</th>
                <th>Kategorie</th>
                <th>Preis</th>
                <th>Verfügbar</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {safeFilteredDishes.map(dish => {
                const restaurant = (restaurants || []).find(r => r && r.id === dish.restaurantId);
                const safeRestaurantName = escapeHtmlAttribute(restaurant?.name || 'Unbekannt');
                return (
                  <tr key={dish.id}>
                    {bulkMode && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedDishes.has(dish.id)}
                          onChange={() => handleDishSelect(dish.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td>
                      <img
                        src={dish.safeImageUrl ? encodeURI(dish.safeImageUrl) : '/placeholder-dish.jpg'}
                        alt="Dish image"
                        onError={(e) => handleImageError(e, 'dish')}
                      />
                    </td>
                    <td>{dish.renderName || 'Gericht'}</td>
                    <td>{safeRestaurantName}</td>
                    <td>{dish.renderCategory || 'Kategorie'}</td>
                    <td>{dish.price.toFixed(2)} €</td>
                    <td>
                      <button
                        className={`small ${dish.isAvailable ? 'success' : 'secondary'}`}
                        disabled={toggling === dish.id}
                        onClick={() => handleToggleDishAvailability(dish.id, !!dish.isAvailable)}
                      >
                        {toggling === dish.id ? '...' : (dish.isAvailable ? 'Ja' : 'Nein')}
                      </button>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="small secondary" onClick={() => handleEditDish(dish)} disabled={updating}>
                          Bearbeiten
                        </button>
                        <button
                          className="small danger"
                          disabled={deleting === dish.id}
                          onClick={() => handleDeleteDish(dish.id)}
                        >
                          {deleting === dish.id ? 'Lösche...' : 'Löschen'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {dishPagination.totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => {
                const newPage = Math.max(1, dishPagination.page - 1);
                setDishPagination(prev => ({ ...prev, page: newPage }));
                fetchDishes(newPage, undefined, dishFilters);
              }}
              disabled={dishPagination.page <= 1 || loading}
              style={{
                padding: '8px 12px',
                background: dishPagination.page <= 1 ? '#6c757d' : '#1877F2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: dishPagination.page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Vorherige
            </button>

            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              Seite {dishPagination.page} von {dishPagination.totalPages}
              ({dishPagination.total} Gerichte gesamt)
            </span>

            <button
              onClick={() => {
                const newPage = Math.min(dishPagination.totalPages, dishPagination.page + 1);
                setDishPagination(prev => ({ ...prev, page: newPage }));
                fetchDishes(newPage, undefined, dishFilters);
              }}
              disabled={dishPagination.page >= dishPagination.totalPages || loading}
              style={{
                padding: '8px 12px',
                background: dishPagination.page >= dishPagination.totalPages ? '#6c757d' : '#1877F2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: dishPagination.page >= dishPagination.totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Nächste →
            </button>
          </div>
        </div>
      )}

      {filteredDishes.length === 0 && !loading && (
        <div className="empty-state">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍕</div>
          <p>Keine Gerichte gefunden</p>
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

export const DishesManagement = memo(DishesManagementInner);


import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { X, Filter } from 'lucide-react';
import './AdvancedFilters.css';

export interface FilterState {
  priceRange: [number, number];
  rating: number | null;
  cuisine: string[];
  dietary: string[];
  deliveryTime: number | null;
  distance: number | null; // Distance in km
  sortBy: 'name' | 'rating' | 'distance' | 'price' | 'deliveryTime';
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableCuisines: string[];
  availableDietary: string[];
  onClose?: () => void;
}

const DIETARY_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarisch', icon: '🥬' },
  { value: 'vegan', label: 'Vegan', icon: '🌱' },
  { value: 'gluten-free', label: 'Glutenfrei', icon: '🌾' },
  { value: 'halal', label: 'Halal', icon: '🕌' },
  { value: 'keto', label: 'Keto', icon: '🥑' },
  { value: 'low-carb', label: 'Low Carb', icon: '🥗' },
];

export function AdvancedFilters({
  filters,
  onFiltersChange,
  availableCuisines,
  availableDietary: _availableDietary,
  onClose,
}: AdvancedFiltersProps) {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose?.();
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      priceRange: [0, 100],
      rating: null,
      cuisine: [],
      dietary: [],
      deliveryTime: null,
      distance: null,
      sortBy: 'name',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onClose?.();
  };

  const toggleCuisine = (cuisine: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      cuisine: prev.cuisine.includes(cuisine)
        ? prev.cuisine.filter((c) => c !== cuisine)
        : [...prev.cuisine, cuisine],
    }));
  };

  const toggleDietary = (dietary: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      dietary: prev.dietary.includes(dietary)
        ? prev.dietary.filter((d) => d !== dietary)
        : [...prev.dietary, dietary],
    }));
  };

  const activeFiltersCount =
    (localFilters.rating !== null ? 1 : 0) +
    localFilters.cuisine.length +
    localFilters.dietary.length +
    (localFilters.deliveryTime !== null ? 1 : 0) +
    (localFilters.distance !== null ? 1 : 0) +
    (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 100 ? 1 : 0);

  return (
    <Card variant="elevated" className="advanced-filters">
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={20} />
          <h3>Filter</h3>
          {activeFiltersCount > 0 && (
            <span className="active-count">{activeFiltersCount}</span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="close-btn" aria-label={t('accessibility.closeFilters')}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="filters-content">
        <div className="filter-section">
          <label className="filter-label">Preisbereich (€)</label>
          <div className="price-range-inputs">
            <input
              type="number"
              min="0"
              max="100"
              value={localFilters.priceRange[0]}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  priceRange: [Number(e.target.value), localFilters.priceRange[1]],
                })
              }
              className="price-input"
              placeholder="Min"
            />
            <span>-</span>
            <input
              type="number"
              min="0"
              max="100"
              value={localFilters.priceRange[1]}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  priceRange: [localFilters.priceRange[0], Number(e.target.value)],
                })
              }
              className="price-input"
              placeholder="Max"
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={localFilters.priceRange[1]}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                priceRange: [localFilters.priceRange[0], Number(e.target.value)],
              })
            }
            className="price-slider"
          />
        </div>

        <div className="filter-section">
          <label className="filter-label">Mindestbewertung</label>
          <div className="rating-buttons">
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                className={`rating-btn ${localFilters.rating === rating ? 'active' : ''}`}
                onClick={() =>
                  setLocalFilters({
                    ...localFilters,
                    rating: localFilters.rating === rating ? null : rating,
                  })
                }
              >
                ⭐ {rating}+
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Küche</label>
          <div className="chip-group">
            {availableCuisines.map((cuisine) => (
              <button
                key={cuisine}
                className={`filter-chip ${localFilters.cuisine.includes(cuisine) ? 'active' : ''}`}
                onClick={() => toggleCuisine(cuisine)}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Ernährung</label>
          <div className="chip-group">
            {DIETARY_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`filter-chip dietary ${localFilters.dietary.includes(option.value) ? 'active' : ''}`}
                onClick={() => toggleDietary(option.value)}
              >
                <span className="chip-icon">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Max. Lieferzeit (Minuten)</label>
          <select
            value={localFilters.deliveryTime || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                deliveryTime: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="filter-select"
          >
            <option value="">Beliebig</option>
            <option value="15">Bis 15 Min</option>
            <option value="30">Bis 30 Min</option>
            <option value="45">Bis 45 Min</option>
            <option value="60">Bis 60 Min</option>
          </select>
        </div>

        <div className="filter-section">
          <label className="filter-label">Max. Entfernung (km)</label>
          <input
            type="number"
            min="0"
            max="50"
            step="1"
            placeholder="Max. Entfernung"
            value={localFilters.distance || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                distance: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="filter-select"
          />
          <div className="distance-presets">
            <button
              type="button"
              className={`preset-btn ${localFilters.distance === 5 ? 'active' : ''}`}
              onClick={() => setLocalFilters({ ...localFilters, distance: 5 })}
            >
              5 km
            </button>
            <button
              type="button"
              className={`preset-btn ${localFilters.distance === 10 ? 'active' : ''}`}
              onClick={() => setLocalFilters({ ...localFilters, distance: 10 })}
            >
              10 km
            </button>
            <button
              type="button"
              className={`preset-btn ${localFilters.distance === 20 ? 'active' : ''}`}
              onClick={() => setLocalFilters({ ...localFilters, distance: 20 })}
            >
              20 km
            </button>
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Sortieren nach</label>
          <select
            value={localFilters.sortBy}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                sortBy: e.target.value as FilterState['sortBy'],
              })
            }
            className="filter-select"
          >
            <option value="name">Name (A-Z)</option>
            <option value="rating">Bewertung (Höchste zuerst)</option>
            <option value="distance">Entfernung (Nächste zuerst)</option>
            <option value="price">Preis (Niedrigste zuerst)</option>
            <option value="deliveryTime">Lieferzeit (Schnellste zuerst)</option>
            <option value="minOrderAmount">Mindestbestellwert (Niedrigste zuerst)</option>
            <option value="deliveryFee">Liefergebühr (Niedrigste zuerst)</option>
          </select>
        </div>
      </div>

      <div className="filters-actions">
        <Button variant="secondary" onClick={handleReset}>
          Zurücksetzen
        </Button>
        <Button variant="primary" onClick={handleApply}>
          Filter anwenden
        </Button>
      </div>
    </Card>
  );
}


import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChefHat, Heart, Shield, Filter, X } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { useChefProfile, useAllergies, type ChefProfile, type DietaryPreference, type Allergy } from '../hooks/usePersonalizedChef';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import { AxiosErrorWithResponse } from '../types';
import './PersonalizedChef.css';

export function PersonalizedChef() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { showToast } = useToast();

  // API Hooks
  const { data: chefProfile, isLoading } = useChefProfile();
  const { data: allergies = [] } = useAllergies();

  const getDietaryTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'vegan': t('personalizedChef.dietaryTypes.vegan'),
      'vegetarian': t('personalizedChef.dietaryTypes.vegetarian'),
      'keto': t('personalizedChef.dietaryTypes.keto'),
      'low-carb': t('personalizedChef.dietaryTypes.lowCarb'),
      'gluten-free': t('personalizedChef.dietaryTypes.glutenFree'),
      'halal': t('personalizedChef.dietaryTypes.halal'),
      'none': t('personalizedChef.dietaryTypes.none')
    };
    return labels[type] || type;
  };

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#1877F2';
    return '#dc3545';
  };

  if (isLoading) {
    return (
      <Card variant="elevated" className="personalized-chef-card">
        <Skeleton variant="text" width="200px" height="28px" />
        <Skeleton variant="rectangular" width="100%" height="120px" />
      </Card>
    );
  }

  if (!chefProfile) {
    return null;
  }

  return (
    <Card variant="elevated" className="personalized-chef-card">
      <div className="chef-header">
        <div className="chef-header-content">
          <ChefHat className="chef-icon" />
          <div>
            <h3>Dein Personalisierter Chef</h3>
            <p className="chef-subtitle">KI lernt deine Präferenzen</p>
          </div>
        </div>
        <button
          className="chef-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? t('personalizedChef.collapse') : t('personalizedChef.expand')}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      <div className="chef-stats">
        <div className="chef-stat">
          <Heart className="stat-icon" />
          <div>
            <span className="stat-label">Ernährungstyp</span>
            <span className="stat-value">
              {getDietaryTypeLabel(chefProfile.dietaryType.type)}
            </span>
            <div className="stat-confidence">
              <div
                className="confidence-bar"
                style={{ width: `${chefProfile.dietaryType.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="chef-stat">
          <Shield className="stat-icon" />
          <div>
            <span className="stat-label">Health Score</span>
            <span
              className="stat-value"
              style={{ color: getHealthScoreColor(chefProfile.healthScore) }}
            >
              {chefProfile.healthScore}/100
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="chef-details">
          <div className="chef-section">
            <h4>Lieblingsküchen</h4>
            <div className="cuisine-tags">
              {chefProfile.favoriteCuisines.map((cuisine, index) => (
                <span key={index} className="cuisine-tag">
                  {cuisine}
                </span>
              ))}
            </div>
          </div>

          <div className="chef-section">
            <h4>Geschmacksprofil</h4>
            <div className="taste-profile">
              <div className="taste-item">
                <span>Würzig</span>
                <div className="taste-bar">
                  <div
                    className="taste-fill"
                    style={{ width: `${chefProfile.tasteProfile.spicy * 100}%` }}
                  />
                </div>
              </div>
              <div className="taste-item">
                <span>Süß</span>
                <div className="taste-bar">
                  <div
                    className="taste-fill"
                    style={{ width: `${chefProfile.tasteProfile.sweet * 100}%` }}
                  />
                </div>
              </div>
              <div className="taste-item">
                <span>Herzhaft</span>
                <div className="taste-bar">
                  <div
                    className="taste-fill"
                    style={{ width: `${chefProfile.tasteProfile.savory * 100}%` }}
                  />
                </div>
              </div>
              <div className="taste-item">
                <span>Salzig</span>
                <div className="taste-bar">
                  <div
                    className="taste-fill"
                    style={{ width: `${chefProfile.tasteProfile.salty * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="chef-section">
            <h4>Präferenzen</h4>
            <div className="preferences-list">
              <div className="preference-item">
                <Filter className="preference-icon" />
                <span>Preisbereich: {chefProfile.preferredPriceRange}</span>
              </div>
              {chefProfile.allergies.length > 0 && (
                <div className="preference-item">
                  <Shield className="preference-icon" />
                  <span>Allergien: {chefProfile.allergies.map(a => a.name).join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="chef-actions">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowEditModal(true)}
            >
              Präferenzen bearbeiten
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={async () => {
                try {
                  // Navigiere zu Restaurant-Liste mit personalisierten Empfehlungen
                  window.location.href = '/?recommendations=true';
                } catch (error) {
                  showToast('Fehler beim Laden der Empfehlungen', 'error');
                }
              }}
            >
              Personalisierte Empfehlungen
            </Button>
          </div>
          
          {showEditModal && chefProfile && (
            <EditChefProfileModal
              profile={chefProfile}
              allergies={allergies}
              onClose={() => setShowEditModal(false)}
              onSave={async (updatedProfile) => {
                try {
                  await api.put('/customers/me/chef-profile', updatedProfile);
                  showToast('Präferenzen aktualisiert!', 'success');
                  setShowEditModal(false);
                  // Refetch profile
                  window.location.reload();
                } catch (error: unknown) {
                  const axiosError = error as AxiosErrorWithResponse;
                  showToast(axiosError.response?.data?.message || 'Fehler beim Speichern', 'error');
                }
              }}
            />
          )}
        </div>
      )}
    </Card>
  );
}

interface EditChefProfileModalProps {
  profile: ChefProfile;
  allergies: Allergy[];
  onClose: () => void;
  onSave: (profile: Partial<ChefProfile>) => Promise<void>;
}

function EditChefProfileModal({ profile, allergies: _allergies, onClose, onSave }: EditChefProfileModalProps) {
  const { t } = useTranslation();
  const [dietaryType, setDietaryType] = useState<DietaryPreference['type']>(profile.dietaryType.type);
  const [priceRange, setPriceRange] = useState<ChefProfile['preferredPriceRange']>(profile.preferredPriceRange);
  const [tasteProfile, setTasteProfile] = useState(profile.tasteProfile);
  const [favoriteCuisines, setFavoriteCuisines] = useState(profile.favoriteCuisines.join(', '));
  const [dislikedIngredients, setDislikedIngredients] = useState(profile.dislikedIngredients.join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        dietaryType: {
          type: dietaryType,
          confidence: profile.dietaryType.confidence
        },
        preferredPriceRange: priceRange,
        tasteProfile,
        favoriteCuisines: favoriteCuisines.split(',').map(c => c.trim()).filter(c => c),
        dislikedIngredients: dislikedIngredients.split(',').map(i => i.trim()).filter(i => i)
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Card variant="elevated" className="edit-chef-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Präferenzen bearbeiten</h3>
          <button onClick={onClose} className="close-btn" aria-label={t('personalizedChef.close')}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-content">
          <div className="form-group">
            <label>Ernährungstyp</label>
            <select
              value={dietaryType}
              onChange={(e) => setDietaryType(e.target.value as DietaryPreference['type'])}
              className="form-select"
            >
              <option value="none">Keine Präferenz</option>
              <option value="vegan">Vegan</option>
              <option value="vegetarian">Vegetarisch</option>
              <option value="keto">Keto</option>
              <option value="low-carb">Low-Carb</option>
              <option value="gluten-free">Glutenfrei</option>
              <option value="halal">Halal</option>
            </select>
          </div>

          <div className="form-group">
            <label>Preisbereich</label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value as ChefProfile['preferredPriceRange'])}
              className="form-select"
            >
              <option value="budget">Budget</option>
              <option value="mid">Mittel</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <div className="form-group">
            <label>Geschmacksprofil</label>
            <div className="taste-inputs">
              <div className="taste-input-item">
                <span>Würzig</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={tasteProfile.spicy}
                  onChange={(e) => setTasteProfile({ ...tasteProfile, spicy: parseFloat(e.target.value) })}
                />
                <span>{Math.round(tasteProfile.spicy * 100)}%</span>
              </div>
              <div className="taste-input-item">
                <span>Süß</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={tasteProfile.sweet}
                  onChange={(e) => setTasteProfile({ ...tasteProfile, sweet: parseFloat(e.target.value) })}
                />
                <span>{Math.round(tasteProfile.sweet * 100)}%</span>
              </div>
              <div className="taste-input-item">
                <span>Herzhaft</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={tasteProfile.savory}
                  onChange={(e) => setTasteProfile({ ...tasteProfile, savory: parseFloat(e.target.value) })}
                />
                <span>{Math.round(tasteProfile.savory * 100)}%</span>
              </div>
              <div className="taste-input-item">
                <span>Salzig</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={tasteProfile.salty}
                  onChange={(e) => setTasteProfile({ ...tasteProfile, salty: parseFloat(e.target.value) })}
                />
                <span>{Math.round(tasteProfile.salty * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Lieblingsküchen (kommagetrennt)</label>
            <input
              type="text"
              value={favoriteCuisines}
              onChange={(e) => setFavoriteCuisines(e.target.value)}
              placeholder="z.B. Italienisch, Asiatisch, Griechisch"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Nicht gemochte Zutaten (kommagetrennt)</label>
            <input
              type="text"
              value={dislikedIngredients}
              onChange={(e) => setDislikedIngredients(e.target.value)}
              placeholder="z.B. Zwiebeln, Pilze, Oliven"
              className="form-input"
            />
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t('personalizedChef.saving') : t('personalizedChef.save')}
          </Button>
        </div>
      </Card>
    </div>
  );
}


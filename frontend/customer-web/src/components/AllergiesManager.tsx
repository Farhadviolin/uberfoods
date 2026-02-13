import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';
import { Badge, type BadgeVariant } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { EmptyState } from '../design-system/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { AlertTriangle, Plus, X, Shield } from 'lucide-react';
import './AllergiesManager.css';

interface Allergy {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
}

// Common allergies will be translated dynamically

export function AllergiesManager() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newAllergy, setNewAllergy] = useState({
    name: '',
    severity: 'moderate' as Allergy['severity'],
    description: '',
  });

  // Common allergies with translations
  const commonAllergies = [
    { key: 'gluten', label: t('allergies.common.gluten') },
    { key: 'lactose', label: t('allergies.common.lactose') },
    { key: 'nuts', label: t('allergies.common.nuts') },
    { key: 'peanuts', label: t('allergies.common.peanuts') },
    { key: 'soy', label: t('allergies.common.soy') },
    { key: 'eggs', label: t('allergies.common.eggs') },
    { key: 'fish', label: t('allergies.common.fish') },
    { key: 'shellfish', label: t('allergies.common.shellfish') },
    { key: 'sesame', label: t('allergies.common.sesame') },
    { key: 'celery', label: t('allergies.common.celery') },
    { key: 'mustard', label: t('allergies.common.mustard') },
    { key: 'lupins', label: t('allergies.common.lupins') },
    { key: 'molluscs', label: t('allergies.common.molluscs') },
    { key: 'sulphites', label: t('allergies.common.sulphites') },
  ];

  const loadAllergies = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await api.get('/customers/me/allergies', {
        params: { customerId: user.id },
      }).then((response) => {
        setAllergies(response.data || []);
      });
    } catch (err) {
      setAllergies([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadAllergies();
    } else {
      setLoading(false);
    }
  }, [user?.id, loadAllergies]);

  const handleAddAllergy = async () => {
    if (!user?.id) return;

    if (!newAllergy.name.trim()) {
      showToast(t('allergies.nameRequired'), 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/customers/me/allergies', newAllergy, {
        params: { customerId: user.id },
      });
      showToast(t('allergies.allergyAdded'), 'success');
      setIsAdding(false);
      setNewAllergy({
        name: '',
        severity: 'moderate',
        description: '',
      });
      loadAllergies();
    } catch (err) {
      showToast(extractErrorMessage(err) || t('allergies.addError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllergy = async (id: string) => {
    if (!user?.id) return;
    if (!confirm(t('allergies.deleteConfirm'))) return;

    setSaving(true);
    try {
      await api.delete(`/customers/me/allergies/${id}`, {
        params: { customerId: user.id },
      });
      showToast(t('allergies.allergyDeleted'), 'success');
      loadAllergies();
    } catch (err) {
      showToast(extractErrorMessage(err) || t('allergies.deleteError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity: Allergy['severity']): BadgeVariant => {
    switch (severity) {
      case 'mild':
        return 'info';
      case 'moderate':
        return 'warning';
      case 'severe':
        return 'error';
      default:
        return 'default';
    }
  };

  if (!user) {
    return (
      <div className="allergies-container">
        <Card>
          <div className="allergies-empty">
            <Shield size={48} />
            <h2>{t('allergies.title')}</h2>
            <p>{t('allergies.pleaseLogin')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="allergies-container">
      <div className="allergies-header">
        <div>
          <h1>{t('allergies.title')}</h1>
          <p>{t('allergies.subtitle')}</p>
        </div>
        <Button onClick={() => setIsAdding(true)} variant="primary">
          <Plus size={18} />
          {t('allergies.addAllergy')}
        </Button>
      </div>

      {loading ? (
        <div className="allergies-skeleton">
          <Skeleton variant="rectangular" width="100%" height="100px" />
          <Skeleton variant="rectangular" width="100%" height="100px" />
        </div>
      ) : allergies.length === 0 && !isAdding ? (
        <Card>
          <EmptyState
            icon={<Shield size={48} />}
            title={t('allergies.noAllergies')}
            description={t('allergies.noAllergiesDesc')}
            action={{
              label: t('allergies.addAllergy'),
              onClick: () => setIsAdding(true),
            }}
          />
        </Card>
      ) : (
        <>
          {isAdding && (
            <Card className="allergy-form-card">
              <div className="allergy-form-header">
                <h3>{t('allergies.addAllergy')}</h3>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewAllergy({
                      name: '',
                      severity: 'moderate',
                      description: '',
                    });
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X size={16} />
                </Button>
              </div>
              <div className="allergy-form">
                <div className="form-group">
                  <label>{t('allergies.commonAllergies')}</label>
                  <div className="common-allergies-grid">
                    {commonAllergies.map((allergy) => (
                      <button
                        key={allergy.key}
                        type="button"
                        className={`common-allergy-button ${
                          newAllergy.name === allergy.label ? 'selected' : ''
                        }`}
                        onClick={() => setNewAllergy({ ...newAllergy, name: allergy.label })}
                      >
                        {allergy.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label={t('allergies.allergyName')}
                  value={newAllergy.name}
                  onChange={(e) => setNewAllergy({ ...newAllergy, name: e.target.value })}
                  placeholder={t('allergies.allergyNamePlaceholder')}
                />
                <div className="form-group">
                  <label>{t('allergies.severity')}</label>
                  <div className="severity-options">
                    <label className="severity-option">
                      <input
                        type="radio"
                        value="mild"
                        checked={newAllergy.severity === 'mild'}
                        onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value as Allergy['severity'] })}
                      />
                      <span>{t('allergies.severity.mild')}</span>
                    </label>
                    <label className="severity-option">
                      <input
                        type="radio"
                        value="moderate"
                        checked={newAllergy.severity === 'moderate'}
                        onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value as Allergy['severity'] })}
                      />
                      <span>{t('allergies.severity.moderate')}</span>
                    </label>
                    <label className="severity-option">
                      <input
                        type="radio"
                        value="severe"
                        checked={newAllergy.severity === 'severe'}
                        onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value as Allergy['severity'] })}
                      />
                      <span>{t('allergies.severity.severe')}</span>
                    </label>
                  </div>
                </div>
                <Input
                  label={t('allergies.description')}
                  value={newAllergy.description}
                  onChange={(e) => setNewAllergy({ ...newAllergy, description: e.target.value })}
                  placeholder={t('allergies.descriptionPlaceholder')}
                />
                <div className="form-actions">
                  <Button
                    onClick={() => {
                      setIsAdding(false);
                      setNewAllergy({
                        name: '',
                        severity: 'moderate',
                        description: '',
                      });
                    }}
                    variant="outline"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleAddAllergy} variant="primary" loading={saving}>
                    <Plus size={18} />
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="allergies-list">
            {allergies.map((allergy) => (
              <Card key={allergy.id} className="allergy-card">
                <div className="allergy-header">
                  <div className="allergy-info">
                    <div className="allergy-name-row">
                      <AlertTriangle size={20} className="allergy-icon" />
                      <h3>{allergy.name}</h3>
                      <Badge variant={getSeverityColor(allergy.severity)} size="sm">
                        {t(`allergies.severity.${allergy.severity}`)}
                      </Badge>
                    </div>
                    {allergy.description && (
                      <p className="allergy-description">{allergy.description}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleDeleteAllergy(allergy.id)}
                    variant="error"
                    size="sm"
                    disabled={saving}
                  >
                    <X size={16} />
                    {t('common.delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


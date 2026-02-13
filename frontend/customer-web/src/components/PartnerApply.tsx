import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import './PartnerApply.css';

type Role = 'driver' | 'restaurant' | 'other';

interface FormState {
  role: Role;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  notes: string;
  consentTerms: boolean;
  consentMarketing: boolean;
  driver: {
    licenseClass: string;
    vehicleType: string;
    availability: string;
  };
  restaurant: {
    companyName: string;
    address: string;
    cuisine: string;
    openingHours: string;
  };
}

const initialState: FormState = {
  role: 'driver',
  name: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  notes: '',
  consentTerms: false,
  consentMarketing: false,
  driver: {
    licenseClass: '',
    vehicleType: '',
    availability: '',
  },
  restaurant: {
    companyName: '',
    address: '',
    cuisine: '',
    openingHours: '',
  },
};

export function PartnerApply() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: keyof FormState, value: FormState[keyof FormState]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateDriver = (key: keyof FormState['driver'], value: string) => {
    setForm((prev) => ({ ...prev, driver: { ...prev.driver, [key]: value } }));
  };

  const updateRestaurant = (key: keyof FormState['restaurant'], value: string) => {
    setForm((prev) => ({ ...prev, restaurant: { ...prev.restaurant, [key]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consentTerms) {
      showToast(t('partnerApply.validation.consent'), 'error');
      return;
    }
    if (!form.name || !form.email || !form.phone) {
      showToast(t('partnerApply.validation.required'), 'error');
      return;
    }
    setLoading(true);
    try {
      interface PartnerApplicationPayload {
        role: Role;
        contact: {
          name: string;
          email: string;
          phone: string;
          city: string;
          country: string;
        };
        notes: string;
        consent: {
          termsAccepted: boolean;
          marketingOptIn: boolean;
        };
        driverInfo?: {
          licenseClass: string;
          vehicleType: string;
          availability: string;
        };
        restaurantInfo?: {
          companyName: string;
          address: string;
          cuisine: string;
          openingHours: string;
        };
      }

      const payload: PartnerApplicationPayload = {
        role: form.role,
        contact: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          country: form.country,
        },
        notes: form.notes,
        consent: {
          termsAccepted: form.consentTerms,
          marketingOptIn: form.consentMarketing,
        },
      };
      if (form.role === 'driver') {
        payload.driverInfo = {
          licenseClass: form.driver.licenseClass,
          vehicleType: form.driver.vehicleType,
          availabilityNote: form.driver.availability,
        };
      }
      if (form.role === 'restaurant') {
        payload.restaurantInfo = {
          companyName: form.restaurant.companyName,
          address: form.restaurant.address,
          cuisine: form.restaurant.cuisine,
          openingHours: form.restaurant.openingHours,
        };
      }
      await api.post('/partners/apply', payload);
      setSubmitted(true);
      showToast(t('partnerApply.successToast'), 'success');
    } catch (error) {
      showToast(t('partnerApply.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="partner-apply-page">
        <Card variant="elevated" className="partner-apply-card">
          <div className="partner-apply-header">
            <div className="partner-apply-pill">🚀 {t('partnerApply.thankYou')}</div>
            <h2>{t('partnerApply.successTitle')}</h2>
            <p>{t('partnerApply.successSubtitle')}</p>
          </div>
          <Button variant="primary" onClick={() => setSubmitted(false)}>
            {t('partnerApply.back')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="partner-apply-page">
      <Card variant="elevated" className="partner-apply-card">
        <div className="partner-apply-header">
          <div className="partner-apply-pill">⭐ {t('partnerApply.pill')}</div>
          <h2>{t('partnerApply.title')}</h2>
          <p>{t('partnerApply.subtitle')}</p>
        </div>

        <form className="partner-apply-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>{t('partnerApply.role.label')}</label>
              <select
                value={form.role}
                onChange={(e) => update('role', e.target.value as Role)}
              >
                <option value="driver">{t('partnerApply.role.driver')}</option>
                <option value="restaurant">{t('partnerApply.role.restaurant')}</option>
                <option value="other">{t('partnerApply.role.other')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('partnerApply.contact.name')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('partnerApply.contact.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('partnerApply.contact.phone')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('partnerApply.contact.city')}</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>{t('partnerApply.contact.country')}</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
              />
            </div>
          </div>

          {form.role === 'driver' && (
            <div className="form-grid">
              <div className="form-group">
                <label>{t('partnerApply.driver.licenseClass')}</label>
                <input
                  type="text"
                  value={form.driver.licenseClass}
                  onChange={(e) => updateDriver('licenseClass', e.target.value)}
                  placeholder="B, B1, A"
                />
              </div>
              <div className="form-group">
                <label>{t('partnerApply.driver.vehicle')}</label>
                <input
                  type="text"
                  value={form.driver.vehicleType}
                  onChange={(e) => updateDriver('vehicleType', e.target.value)}
                  placeholder="Auto, Roller, Fahrrad"
                />
              </div>
              <div className="form-group">
                <label>{t('partnerApply.driver.availability')}</label>
                <input
                  type="text"
                  value={form.driver.availability}
                  onChange={(e) => updateDriver('availability', e.target.value)}
                  placeholder={t('partnerApply.driver.availabilityPlaceholder')}
                />
              </div>
            </div>
          )}

          {form.role === 'restaurant' && (
            <div className="form-grid">
              <div className="form-group">
                <label>{t('partnerApply.restaurant.company')}</label>
                <input
                  type="text"
                  value={form.restaurant.companyName}
                  onChange={(e) => updateRestaurant('companyName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('partnerApply.restaurant.address')}</label>
                <input
                  type="text"
                  value={form.restaurant.address}
                  onChange={(e) => updateRestaurant('address', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('partnerApply.restaurant.cuisine')}</label>
                <input
                  type="text"
                  value={form.restaurant.cuisine}
                  onChange={(e) => updateRestaurant('cuisine', e.target.value)}
                  placeholder="Pizza, Sushi, Burger..."
                />
              </div>
              <div className="form-group">
                <label>{t('partnerApply.restaurant.hours')}</label>
                <input
                  type="text"
                  value={form.restaurant.openingHours}
                  onChange={(e) => updateRestaurant('openingHours', e.target.value)}
                  placeholder="Mo-So 11:00 - 22:00"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>{t('partnerApply.notes')}</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder={t('partnerApply.notesPlaceholder') || ''}
            />
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={form.consentTerms}
                onChange={(e) => update('consentTerms', e.target.checked)}
              />
              {t('partnerApply.consents.terms')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.consentMarketing}
                onChange={(e) => update('consentMarketing', e.target.checked)}
              />
              {t('partnerApply.consents.marketing')}
            </label>
          </div>

          <div className="submit-row">
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? t('partnerApply.submitting') : t('partnerApply.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


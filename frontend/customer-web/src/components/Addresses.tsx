import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress } from '../hooks/useAddresses';
import api from '../utils/api';
import { AxiosErrorWithResponse } from '../types';
import './Addresses.css';

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  notes?: string;
}

export function Addresses() {
  const { t } = useTranslation();
  const { data: addressesData = [], isLoading: loading } = useAddresses();
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    label: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    notes: string;
    isDefault: boolean;
  }>({
    label: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Österreich',
    notes: '',
    isDefault: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        setSuccess(t('addresses.updateSuccess'));
      } else {
        await createMutation.mutateAsync(formData);
        setSuccess(t('addresses.addSuccess'));
      }
      resetForm();
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      setError(axiosError.response?.data?.message || t('addresses.saveError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('addresses.deleteConfirm'))) return;

    try {
      await deleteMutation.mutateAsync(id);
      setSuccess(t('addresses.deleteSuccess'));
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      setError(axiosError.response?.data?.message || t('addresses.deleteError'));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.put(`/customers/me/addresses/${id}/set-default`);
      setSuccess(t('addresses.setDefaultSuccess'));
      // Query wird automatisch invalidiert durch den API-Interceptor
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      setError(axiosError.response?.data?.message || t('addresses.setDefaultError'));
    }
  };

  const startEdit = (address: Address) => {
    setFormData({
      label: address.label,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      notes: address.notes || '',
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      label: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Österreich',
      notes: '',
      isDefault: false,
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
        <div>{t('addresses.loading')}</div>
      </div>
    );
  }

  return (
    <div className="addresses-page">
      <div className="addresses-header">
        <h1>{t('addresses.title')}</h1>
        <button onClick={() => setShowAddForm(!showAddForm)} className="add-address-btn">
          {showAddForm ? t('addresses.cancel') : t('addresses.addNew')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showAddForm && (
        <div className="address-form-card">
          <h2>{editingId ? t('addresses.edit') : t('addresses.add')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('addresses.label')} *</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder={t('addresses.labelPlaceholder')}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('addresses.street')} *</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder={t('addresses.streetPlaceholder')}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('addresses.postalCode')} *</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder={t('addresses.postalCodePlaceholder')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('addresses.city')} *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('addresses.cityPlaceholder')}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('addresses.country')} *</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              >
                <option value="Österreich">Österreich</option>
                <option value="Deutschland">Deutschland</option>
                <option value="Schweiz">Schweiz</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('addresses.notes')}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('addresses.notesPlaceholder')}
                rows={3}
              />
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              />
              {t('addresses.setAsDefault')}
            </label>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="cancel-btn">
                {t('common.cancel')}
              </button>
              <button type="submit" className="save-btn">
                {editingId ? t('addresses.update') : t('addresses.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="addresses-list">
        {addressesData.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
            <p>{t('addresses.emptyState')}</p>
            <p style={{ color: '#65676B', fontSize: '14px' }}>
              {t('addresses.emptyStateMessage')}
            </p>
          </div>
        ) : (
          addressesData.map((address) => (
            <div key={address.id} className="address-card">
              <div className="address-header">
                <div>
                  <h3>{address.label}</h3>
                  {address.isDefault && <span className="default-badge">{t('addresses.default')}</span>}
                </div>
                <div className="address-actions">
                  <button onClick={() => startEdit(address)} className="edit-btn">
                    {t('addresses.editButton')}
                  </button>
                  <button onClick={() => handleDelete(address.id)} className="delete-btn">
                    {t('addresses.deleteButton')}
                  </button>
                </div>
              </div>
              <div className="address-details">
                <p>{address.street}</p>
                <p>{address.postalCode} {address.city}</p>
                <p>{address.country}</p>
                {address.notes && (
                  <p className="address-notes">📝 {address.notes}</p>
                )}
              </div>
              {!address.isDefault && (
                <button
                  onClick={() => handleSetDefault(address.id)}
                  className="set-default-btn"
                >
                  {t('addresses.setDefault')}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


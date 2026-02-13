import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Modal } from '../design-system/Modal';
import { Input } from '../design-system/Input';
import { Skeleton } from '../design-system/Skeleton';
import { EmptyState } from '../design-system/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { CreditCard, Plus, Trash2, Star, Edit2, Check } from 'lucide-react';
import './PaymentMethods.css';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'sepa_direct_debit' | 'bank_transfer';
  last4?: string;
  brand?: string;
  iban?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
  holderName?: string;
}

export function PaymentMethods() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'card' as PaymentMethod['type'],
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    holderName: '',
    iban: '',
    bic: '',
  });

  const loadPaymentMethods = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await api.get('/customers/me/payment-methods', {
        params: { customerId: user.id },
      });
      setPaymentMethods(response.data || []);
    } catch (err) {
      // Ignore errors - show empty state
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadPaymentMethods();
    } else {
      setLoading(false);
    }
  }, [user?.id, loadPaymentMethods]);

  const handleAddMethod = () => {
    setEditingMethod(null);
    setFormData({
      type: 'card',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      holderName: '',
      iban: '',
      bic: '',
    });
    setIsModalOpen(true);
  };

  const handleEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      type: method.type,
      cardNumber: method.last4 ? `**** **** **** ${method.last4}` : '',
      expiryMonth: method.expiryMonth?.toString() || '',
      expiryYear: method.expiryYear?.toString() || '',
      cvv: '',
      holderName: method.holderName || '',
      iban: method.iban || '',
      bic: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveMethod = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const methodData: any = {
        type: formData.type,
      };

      if (formData.type === 'card') {
        methodData.cardNumber = formData.cardNumber.replace(/\s/g, '');
        methodData.expiryMonth = parseInt(formData.expiryMonth);
        methodData.expiryYear = parseInt(formData.expiryYear);
        methodData.cvv = formData.cvv;
        methodData.holderName = formData.holderName;
      } else if (formData.type === 'sepa_direct_debit') {
        methodData.iban = formData.iban.replace(/\s/g, '');
        methodData.bic = formData.bic;
        methodData.holderName = formData.holderName;
      }

      if (editingMethod) {
        await api.put(`/customers/me/payment-methods/${editingMethod.id}`, methodData, {
          params: { customerId: user.id },
        });
        showToast(t('paymentMethods.methodUpdated'), 'success');
      } else {
        await api.post('/customers/me/payment-methods', methodData, {
          params: { customerId: user.id },
        });
        showToast(t('paymentMethods.methodAdded'), 'success');
      }

      setIsModalOpen(false);
      loadPaymentMethods();
    } catch (err) {
      showToast(extractErrorMessage(err) || t('paymentMethods.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!user?.id) return;
    if (!confirm(t('paymentMethods.deleteConfirm'))) return;

    setDeletingId(id);
    try {
      await api.delete(`/customers/me/payment-methods/${id}`, {
        params: { customerId: user.id },
      });
      showToast(t('paymentMethods.methodDeleted'), 'success');
      loadPaymentMethods();
    } catch (err) {
      showToast(extractErrorMessage(err) || t('paymentMethods.deleteError'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await api.put(`/customers/me/payment-methods/${id}/default`, {}, {
        params: { customerId: user.id },
      });
      showToast(t('paymentMethods.defaultSet'), 'success');
      loadPaymentMethods();
    } catch (err) {
      showToast(extractErrorMessage(err) || t('paymentMethods.defaultError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const getMethodIcon = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'card':
        return <CreditCard size={24} />;
      case 'paypal':
        return <span className="payment-method-icon">PP</span>;
      case 'apple_pay':
        return <span className="payment-method-icon">AP</span>;
      case 'sepa_direct_debit':
        return <span className="payment-method-icon">SEPA</span>;
      case 'bank_transfer':
        return <span className="payment-method-icon">BT</span>;
      default:
        return <CreditCard size={24} />;
    }
  };

  const getMethodLabel = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'card':
        return t('paymentMethods.card');
      case 'paypal':
        return t('paymentMethods.paypal');
      case 'apple_pay':
        return t('paymentMethods.applePay');
      case 'sepa_direct_debit':
        return t('paymentMethods.sepaDirectDebit');
      case 'bank_transfer':
        return t('paymentMethods.bankTransfer');
      default:
        return type;
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    }
    return v;
  };

  if (!user) {
    return (
      <div className="payment-methods-container">
        <Card>
          <div className="payment-methods-empty">
            <CreditCard size={48} />
            <h2>{t('paymentMethods.title')}</h2>
            <p>{t('paymentMethods.pleaseLogin')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="payment-methods-container">
      <div className="payment-methods-header">
        <div>
          <h1>{t('paymentMethods.title')}</h1>
          <p>{t('paymentMethods.subtitle')}</p>
        </div>
        <Button onClick={handleAddMethod} variant="primary">
          <Plus size={18} />
          {t('paymentMethods.addMethod')}
        </Button>
      </div>

      {loading ? (
        <div className="payment-methods-skeleton">
          <Skeleton variant="rectangular" width="100%" height="120px" />
          <Skeleton variant="rectangular" width="100%" height="120px" />
        </div>
      ) : paymentMethods.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CreditCard size={48} />}
            title={t('paymentMethods.noMethods')}
            description={t('paymentMethods.noMethodsDesc')}
            action={
              <Button onClick={handleAddMethod} variant="primary">
                <Plus size={18} />
                {t('paymentMethods.addMethod')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="payment-methods-list">
          {paymentMethods.map((method) => (
            <Card key={method.id} className="payment-method-card">
              <div className="payment-method-header">
                <div className="payment-method-info">
                  <div className="payment-method-icon-wrapper">
                    {getMethodIcon(method.type)}
                  </div>
                  <div>
                    <div className="payment-method-title">
                      {getMethodLabel(method.type)}
                      {method.isDefault && (
                        <span className="payment-method-default-badge">
                          <Star size={14} fill="currentColor" />
                          {t('paymentMethods.default')}
                        </span>
                      )}
                    </div>
                    <div className="payment-method-details">
                      {method.type === 'card' && method.last4 && (
                        <span>**** **** **** {method.last4}</span>
                      )}
                      {method.type === 'card' && method.brand && (
                        <span className="payment-method-brand">{method.brand}</span>
                      )}
                      {method.type === 'card' && method.expiryMonth && method.expiryYear && (
                        <span>
                          {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                        </span>
                      )}
                      {method.type === 'sepa_direct_debit' && method.iban && (
                        <span>{method.iban}</span>
                      )}
                      {method.holderName && (
                        <span>{method.holderName}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="payment-method-actions">
                  {!method.isDefault && (
                    <Button
                      onClick={() => handleSetDefault(method.id)}
                      variant="outline"
                      size="small"
                      disabled={saving}
                    >
                      <Star size={16} />
                      {t('paymentMethods.setDefault')}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleEditMethod(method)}
                    variant="outline"
                    size="small"
                  >
                    <Edit2 size={16} />
                    {t('common.edit')}
                  </Button>
                  <Button
                    onClick={() => handleDeleteMethod(method.id)}
                    variant="danger"
                    size="small"
                    disabled={deletingId === method.id}
                    loading={deletingId === method.id}
                  >
                    <Trash2 size={16} />
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMethod ? t('paymentMethods.editMethod') : t('paymentMethods.addMethod')}
        size="medium"
      >
        <div className="payment-method-form">
          <div className="form-group">
            <label>{t('paymentMethods.methodType')}</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as PaymentMethod['type'] })}
              disabled={!!editingMethod}
            >
              <option value="card">{t('paymentMethods.card')}</option>
              <option value="sepa_direct_debit">{t('paymentMethods.sepaDirectDebit')}</option>
              <option value="paypal">{t('paymentMethods.paypal')}</option>
            </select>
          </div>

          {formData.type === 'card' && (
            <>
              <Input
                label={t('paymentMethods.cardNumber')}
                value={formData.cardNumber}
                onChange={(e) => setFormData({ ...formData, cardNumber: formatCardNumber(e.target.value) })}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                disabled={!!editingMethod}
              />
              <div className="form-row">
                <Input
                  label={t('paymentMethods.expiryMonth')}
                  value={formData.expiryMonth}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                      setFormData({ ...formData, expiryMonth: val });
                    }
                  }}
                  placeholder="MM"
                  maxLength={2}
                  disabled={!!editingMethod}
                />
                <Input
                  label={t('paymentMethods.expiryYear')}
                  value={formData.expiryYear}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setFormData({ ...formData, expiryYear: val });
                  }}
                  placeholder="YYYY"
                  maxLength={4}
                  disabled={!!editingMethod}
                />
                {!editingMethod && (
                  <Input
                    label={t('paymentMethods.cvv')}
                    value={formData.cvv}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                      setFormData({ ...formData, cvv: val });
                    }}
                    placeholder="123"
                    maxLength={3}
                    type="password"
                  />
                )}
              </div>
            </>
          )}

          {formData.type === 'sepa_direct_debit' && (
            <>
              <Input
                label="IBAN"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
                placeholder="DE89 3704 0044 0532 0130 00"
                disabled={!!editingMethod}
              />
              <Input
                label="BIC"
                value={formData.bic}
                onChange={(e) => setFormData({ ...formData, bic: e.target.value.toUpperCase() })}
                placeholder="COBADEFFXXX"
                disabled={!!editingMethod}
              />
            </>
          )}

          <Input
            label={t('paymentMethods.holderName')}
            value={formData.holderName}
            onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
            placeholder={t('paymentMethods.holderNamePlaceholder')}
          />

          <div className="form-actions">
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveMethod} variant="primary" loading={saving}>
              <Check size={18} />
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


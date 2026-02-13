import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import { extractErrorMessage, isAuthError } from '../utils/errorHandler';
import { AxiosErrorWithResponse } from '../types';
import { logError } from '../utils/errorReporting';
import './SubscriptionManagement.css';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'MONTHLY' | 'YEARLY';
  features: string[];
  popular?: boolean;
}

interface CurrentSubscription {
  id: string;
  planId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export function SubscriptionManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/subscriptions/plans');
      setPlans(response.data || []);
    } catch (error: unknown) {
      logError(error, { component: 'SubscriptionManagement', action: 'loadPlans' });
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await api.get('/subscriptions/me');
      setCurrentSubscription(response.data);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status !== 404) {
          logError(error, { component: 'SubscriptionManagement', action: 'loadSubscription' });
        }
      }
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      const response = await api.post('/subscriptions/subscribe', { planId });
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        showToast('Abonnement erfolgreich aktiviert!', 'success');
        fetchCurrentSubscription();
      }
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Möchten Sie Ihr Abonnement wirklich kündigen?')) return;

    try {
      await api.post('/subscriptions/cancel');
      showToast('Abonnement wird am Ende der Laufzeit gekündigt', 'success');
      fetchCurrentSubscription();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  const handleResume = async () => {
    try {
      await api.post('/subscriptions/resume');
      showToast('Abonnement wurde reaktiviert!', 'success');
      fetchCurrentSubscription();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  if (loading) {
    return (
      <div className="subscription-loading">
        <div>Lade Abonnement-Pläne...</div>
      </div>
    );
  }

  return (
    <div className="subscription-management">
      <h1>Abonnement-Verwaltung</h1>

      {currentSubscription && (
        <div className="current-subscription-card">
          <h2>Aktuelles Abonnement</h2>
          <div className="subscription-info">
            <div>
              <strong>Status:</strong>{' '}
              <span className={`status-badge ${currentSubscription.status.toLowerCase()}`}>
                {currentSubscription.status === 'ACTIVE' && 'Aktiv'}
                {currentSubscription.status === 'CANCELLED' && 'Gekündigt'}
                {currentSubscription.status === 'EXPIRED' && 'Abgelaufen'}
                {currentSubscription.status === 'TRIAL' && 'Testphase'}
              </span>
            </div>
            {currentSubscription.currentPeriodEnd && (
              <div>
                <strong>Läuft ab:</strong>{' '}
                {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('de-DE')}
              </div>
            )}
          </div>
          <div className="subscription-actions">
            {currentSubscription.status === 'ACTIVE' && (
              <button
                onClick={handleCancel}
                className="cancel-subscription-btn"
              >
                Abonnement kündigen
              </button>
            )}
            {currentSubscription.cancelAtPeriodEnd && (
              <button onClick={handleResume} className="resume-subscription-btn">
                Kündigung widerrufen
              </button>
            )}
          </div>
        </div>
      )}

      <div className="subscription-plans">
        <h2>Verfügbare Pläne</h2>
        <div className="plans-grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && (
                <div className="popular-badge">Beliebt</div>
              )}
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <span className="price-amount">
                  €{plan.price.toFixed(2)}
                </span>
                <span className="price-interval">
                  /{plan.interval === 'MONTHLY' ? 'Monat' : 'Jahr'}
                </span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                className="subscribe-btn"
                disabled={
                  currentSubscription?.status === 'ACTIVE' &&
                  currentSubscription.planId === plan.id
                }
              >
                {currentSubscription?.status === 'ACTIVE' &&
                currentSubscription.planId === plan.id
                  ? 'Aktueller Plan'
                  : 'Jetzt abonnieren'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

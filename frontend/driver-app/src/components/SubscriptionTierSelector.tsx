import { useState, useEffect } from 'react';
import api from '../utils/api';
import './SubscriptionTierSelector.css';

interface SubscriptionTier {
  id: 'BASIC' | 'PRO' | 'FULLTIME' | 'ENTERPRISE';
  name: string;
  price: number;
  commission: string;
  features: string[];
  popular?: boolean;
}

interface SubscriptionTierSelectorProps {
  driverId: string;
  currentSubscription?: any;
  onSubscriptionChange?: () => void;
}

export function SubscriptionTierSelector({
  driverId,
  currentSubscription,
  onSubscriptionChange,
}: SubscriptionTierSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);

  // Lade Tier-Konfigurationen vom Backend
  useEffect(() => {
    const fetchTierConfigs = async () => {
      try {
        setLoadingTiers(true);
        // Verwende neuen Driver-Endpoint: /api/drivers/subscription/tiers
        const res = await api.get('/drivers/subscription/tiers');
        const tierData = res.data || {};
        const configs = tierData.tiers || [];
        
        // Transformiere Backend-Config zu Frontend-Format
        const transformedTiers: SubscriptionTier[] = configs
          .filter((config: any) => config.isActive !== false) // Nur aktive Tiers
          .map((config: any) => ({
            id: config.tier,
            name: config.name,
            price: config.price,
            commission: config.displayCommission,
            popular: config.isPopular || false,
            features: config.features || [],
          }));
        
        // Fallback zu Default-Werten wenn keine Configs vorhanden
        if (transformedTiers.length === 0) {
          setTiers(getDefaultTiers());
        } else {
          setTiers(transformedTiers);
        }
      } catch (error) {
        console.error('Error loading tier configs, using defaults:', error);
        setTiers(getDefaultTiers());
      } finally {
        setLoadingTiers(false);
      }
    };

    fetchTierConfigs();
  }, []);

  // Default Tiers (Fallback)
  const getDefaultTiers = (): SubscriptionTier[] => [
    {
      id: 'BASIC',
      name: 'Basic',
      price: 29,
      commission: '25%',
      features: [
        '25% Provision vom Restaurant',
        'Tägliche Auszahlungen ab 50€',
        'Standard Support',
        'Bis zu 50 Lieferungen/Monat',
      ],
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: 49,
      commission: '30% (100%)',
      popular: true,
      features: [
        '30% Provision (VOLLSTÄNDIG)',
        'Sofortige Auszahlungen ab 20€',
        'Priority Support',
        'Unbegrenzte Lieferungen',
        'Exklusive Features',
      ],
    },
    {
      id: 'FULLTIME',
      name: 'Vollzeit',
      price: 99,
      commission: '30% + Bonus',
      features: [
        '30% Provision',
        '2% Bonus bei >100 Lieferungen/Monat',
        'Exklusive High-Value Orders',
        'Dedicated Support',
        'Alle Pro-Features',
      ],
    },
  ];

  // Verwende geladene Tiers oder Defaults
  const displayTiers = tiers.length > 0 ? tiers : getDefaultTiers();

  const handleSubscribe = async (tier: SubscriptionTier['id']) => {
    setLoading(true);
    setError(null);
    setSelectedTier(tier);

    try {
      const response = await api.post(`/drivers/${driverId}/subscription`, {
        tier,
      });

      if (response.data.clientSecret) {
        // Stripe Payment Confirmation notwendig
        alert('Bitte bestätige die Zahlung in Stripe. Client Secret: ' + response.data.clientSecret);
      } else {
        alert('Subscription erfolgreich erstellt!');
        onSubscriptionChange?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Erstellen der Subscription');
    } finally {
      setLoading(false);
      setSelectedTier(null);
    }
  };

  const handleUpgrade = async (tier: SubscriptionTier['id']) => {
    setLoading(true);
    setError(null);
    setSelectedTier(tier);

    try {
      await api.post(`/drivers/${driverId}/subscription/upgrade`, { tier });
      alert('Subscription erfolgreich upgegradet!');
      onSubscriptionChange?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Upgrade');
    } finally {
      setLoading(false);
      setSelectedTier(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Möchtest du deine Subscription wirklich kündigen?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`/drivers/${driverId}/subscription/cancel`, {
        cancelAtPeriodEnd: true,
      });
      alert('Subscription wird am Periodenende gekündigt');
      onSubscriptionChange?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Kündigen');
    } finally {
      setLoading(false);
    }
  };

  const currentTierIndex = displayTiers.findIndex(
    (t) => t.id === currentSubscription?.tier,
  );
  const canUpgrade = (tierIndex: number) => {
    if (!currentSubscription) return true;
    return tierIndex > currentTierIndex;
  };

  if (loadingTiers) {
    return (
      <div className="subscription-tier-selector">
        <p>Lade Subscription-Tiers...</p>
      </div>
    );
  }

  return (
    <div className="subscription-tier-selector">
      <h2>Wähle dein Subscription-Tier</h2>
      {error && <div className="error-message">{error}</div>}

      {currentSubscription && (
        <div className="current-subscription">
          <h3>Aktuelle Subscription</h3>
          <p>
            Tier: <strong>{currentSubscription.tier}</strong>
          </p>
          <p>
            Status: <strong>{currentSubscription.status}</strong>
          </p>
          {currentSubscription.trialEndsAt && (
            <p>
              Trial endet: {new Date(currentSubscription.trialEndsAt).toLocaleDateString('de-DE')}
            </p>
          )}
          <button onClick={handleCancel} className="cancel-button" disabled={loading}>
            {loading ? 'Wird gekündigt...' : 'Kündigen'}
          </button>
        </div>
      )}

      <div className="tiers-grid">
        {displayTiers.map((tier) => (
          <div
            key={tier.id}
            className={`tier-card ${tier.popular ? 'popular' : ''} ${
              currentSubscription?.tier === tier.id ? 'current' : ''
            }`}
          >
            {tier.popular && <div className="popular-badge">Beliebt</div>}
            {currentSubscription?.tier === tier.id && (
              <div className="current-badge">Aktuell</div>
            )}

            <h3>{tier.name}</h3>
            <div className="price">
              <span className="amount">{tier.price}€</span>
              <span className="period">/Monat</span>
            </div>
            <div className="commission">{tier.commission} Provision</div>

            <ul className="features">
              {tier.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>

            {!currentSubscription ? (
              <button
                onClick={() => handleSubscribe(tier.id)}
                disabled={loading}
                className="subscribe-button"
              >
                {loading && selectedTier === tier.id ? 'Wird erstellt...' : 'Jetzt abonnieren'}
              </button>
            ) : currentSubscription.tier === tier.id ? (
              <button disabled className="current-button">
                Aktuelles Tier
              </button>
            ) : canUpgrade(displayTiers.indexOf(tier)) ? (
              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={loading}
                className="upgrade-button"
              >
                {loading && selectedTier === tier.id ? 'Wird upgegradet...' : 'Upgraden'}
              </button>
            ) : (
              <button disabled className="downgrade-button">
                Downgrade nicht möglich
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


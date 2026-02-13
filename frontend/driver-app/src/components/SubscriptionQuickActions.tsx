import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import './SubscriptionQuickActions.css';

export function SubscriptionQuickActions() {
  const { driver } = useAuth();
  const { subscription, isTrialEndingSoon, trialDaysRemaining, upgradeSubscription } = useSubscription();
  const [showMenu, setShowMenu] = useState(false);

  if (!subscription) return null;

  const handleUpgrade = async (tier: string) => {
    const result = await upgradeSubscription(tier);
    if (result.success) {
      setShowMenu(false);
    }
  };

  return (
    <div className="subscription-quick-actions">
      {isTrialEndingSoon && (
        <div className="trial-alert" onClick={() => setShowMenu(true)}>
          ⚠️ Trial endet in {trialDaysRemaining} Tagen
        </div>
      )}
      
      {subscription.tier !== 'ENTERPRISE' && (
        <button
          className="quick-upgrade-button"
          onClick={() => {
            const tiers = ['BASIC', 'PRO', 'FULLTIME', 'ENTERPRISE'];
            const nextTier = tiers[tiers.indexOf(subscription.tier) + 1];
            if (nextTier) handleUpgrade(nextTier);
          }}
        >
          ⬆️ Upgrade zu {subscription.tier === 'BASIC' ? 'PRO' : subscription.tier === 'PRO' ? 'FULLTIME' : 'ENTERPRISE'}
        </button>
      )}

      {showMenu && (
        <div className="quick-actions-menu">
          <button onClick={() => setShowMenu(false)} className="close-button">×</button>
          <h4>Schnellaktionen</h4>
          <div className="menu-actions">
            {subscription.tier !== 'PRO' && (
              <button onClick={() => handleUpgrade('PRO')} className="menu-action">
                Zu PRO upgraden
              </button>
            )}
            {subscription.tier !== 'FULLTIME' && (
              <button onClick={() => handleUpgrade('FULLTIME')} className="menu-action">
                Zu FULLTIME upgraden
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


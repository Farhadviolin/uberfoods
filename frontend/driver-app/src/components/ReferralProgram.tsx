import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useReferral } from '../hooks/useReferral';
import { DriverService } from '../services/driverService';
import { extractErrorMessage } from '../utils/errorHandler';
import './ReferralProgram.css';

interface Referral {
  id: string;
  code: string;
  referredDriverId?: string;
  status: 'pending' | 'completed' | 'rewarded';
  rewardAmount: number;
  createdAt: string;
  completedAt?: string;
}

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalRewards: number;
  pendingRewards: number;
}

export function ReferralProgram() {
  const { driver } = useAuth();
  const [applyingCode, setApplyingCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');

  const {
    referralCode,
    referrals,
    stats,
    isLoading,
    error,
    refetch,
    applyReferralCode,
    claimReward,
    isApplying,
    isClaiming,
  } = useReferral();

  const handleClaimReward = async (referralId: string) => {
    try {
      await claimReward(referralId);
      alert('Belohnung erfolgreich eingelöst!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error && typeof error === 'object' && 'response' in error && typeof error.response === 'object' && error.response !== null && 'data' in error.response && typeof error.response.data === 'object' && error.response.data !== null && 'message' in error.response.data && typeof error.response.data.message === 'string')
          ? error.response.data.message
          : 'Unbekannter Fehler';
      alert('Fehler: ' + errorMessage);
    }
  };

  const handleApplyCode = async () => {
    if (!codeInput.trim()) {
      alert('Bitte geben Sie einen Code ein');
      return;
    }
    try {
      setApplyingCode(true);
      await applyReferralCode(codeInput.trim());
      setCodeInput('');
      alert('Referral-Code erfolgreich angewendet!');
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : extractErrorMessage(error);
      alert('Fehler: ' + errorMessage);
    } finally {
      setApplyingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (referralCode?.code) {
      navigator.clipboard.writeText(referralCode.code);
      alert('Code wurde in die Zwischenablage kopiert!');
    }
  };

  if (!driver) return null;

  return (
    <div className="referral-program">
      <h2>🎁 Empfehlungsprogramm</h2>

      <div className="referral-code-section">
        <h3>Ihr Empfehlungscode</h3>
        <div className="code-display">
          <div className="code-value">{referralCode?.code || 'Lädt...'}</div>
          <button className="copy-button" onClick={handleCopyCode} disabled={!referralCode?.code}>
            📋 Kopieren
          </button>
        </div>
        <p className="code-description">
          Teilen Sie diesen Code mit anderen Fahrern. Für jeden erfolgreichen Empfehlung erhalten Sie 50€ Belohnung!
        </p>
      </div>

      <div className="apply-referral-section">
        <h3>Referral-Code anwenden</h3>
        <div className="code-input-group">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Geben Sie einen Referral-Code ein"
            className="code-input"
          />
          <button
            className="apply-button"
            onClick={handleApplyCode}
            disabled={isApplying || !codeInput.trim()}
          >
            {isApplying ? 'Wird angewendet...' : 'Code anwenden'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="referral-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalReferrals}</div>
            <div className="stat-label">Gesamt Empfehlungen</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.completedReferrals}</div>
            <div className="stat-label">Abgeschlossen</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalRewards.toFixed(2)} €</div>
            <div className="stat-label">Verdiente Belohnungen</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pendingRewards.toFixed(2)} €</div>
            <div className="stat-label">Ausstehend</div>
          </div>
        </div>
      )}

      <div className="referrals-list">
        <h3>Ihre Empfehlungen</h3>
        {referrals.length === 0 ? (
          <div className="empty-state">Noch keine Empfehlungen</div>
        ) : (
          referrals.map((referral) => (
            <div key={referral.id} className="referral-item">
              <div className="referral-info">
                <div className="referral-code">Code: {referral.code}</div>
                <div className="referral-status">
                  Status: <span className={`status-${referral.status}`}>{referral.status}</span>
                </div>
                <div className="referral-date">
                  Erstellt: {new Date(referral.createdAt).toLocaleDateString('de-DE')}
                </div>
                {referral.referredDriver && (
                  <div className="referred-driver">
                    Empfohlen: {referral.referredDriver.name} ({new Date(referral.referredDriver.joinedAt).toLocaleDateString('de-DE')})
                  </div>
                )}
                {referral.earnedAt && (
                  <div className="referral-completed">
                    Belohnung erhalten: {new Date(referral.earnedAt).toLocaleDateString('de-DE')}
                  </div>
                )}
              </div>
              <div className="referral-reward">
                <div className="reward-amount">{referral.rewardAmount} €</div>
                {referral.status === 'COMPLETED' && (
                  <button
                    className="claim-button"
                    onClick={() => handleClaimReward(referral.id)}
                    disabled={isClaiming}
                  >
                    {isClaiming ? 'Wird eingelöst...' : 'Belohnung einlösen'}
                  </button>
                )}
                {referral.earnedAt && (
                  <div className="rewarded-badge">✓ Eingelöst</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


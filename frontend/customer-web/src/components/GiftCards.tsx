import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGiftCards, useActiveGiftCards, usePurchaseGiftCard, useRedeemGiftCard, useCheckGiftCardBalance } from '../hooks/useGiftCards';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { Gift, Plus, Check, Copy, Search } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { AxiosErrorWithResponse } from '../types';
import './GiftCards.css';

interface PurchaseData {
  amount: number;
  recipientEmail: string;
  recipientName: string;
  message: string;
}

export function GiftCards() {
  const { t, i18n } = useTranslation();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [purchaseData, setPurchaseData] = useState<PurchaseData>({
    amount: 25,
    recipientEmail: '',
    recipientName: '',
    message: '',
  });

  const { data: giftCards, isLoading } = useGiftCards();
  const { data: activeGiftCards, isLoading: activeLoading } = useActiveGiftCards();
  const purchaseMutation = usePurchaseGiftCard();
  const redeemMutation = useRedeemGiftCard();
  const checkBalanceMutation = useCheckGiftCardBalance();
  const { showToast } = useToast();

  const handlePurchase = async () => {
    if (purchaseData.amount <= 0) {
      showToast('Bitte geben Sie einen gültigen Betrag ein', 'error');
      return;
    }

    try {
      const result = await purchaseMutation.mutateAsync(purchaseData);
      showToast(`Geschenkkarte erfolgreich gekauft! Code: ${result.code}`, 'success');
      setShowPurchaseModal(false);
      setPurchaseData({ amount: 25, recipientEmail: '', recipientName: '', message: '' });
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || 'Fehler beim Kauf', 'error');
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      showToast('Bitte geben Sie einen Geschenkkarten-Code ein', 'error');
      return;
    }

    try {
      await redeemMutation.mutateAsync(redeemCode.trim().toUpperCase());
      showToast('Geschenkkarte erfolgreich eingelöst!', 'success');
      setShowRedeemModal(false);
      setRedeemCode('');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || 'Fehler beim Einlösen', 'error');
    }
  };

  const handleCheckBalance = async () => {
    if (!redeemCode.trim()) {
      showToast('Bitte geben Sie einen Geschenkkarten-Code ein', 'error');
      return;
    }

    try {
      const result = await checkBalanceMutation.mutateAsync(redeemCode.trim().toUpperCase());
      showToast(`Guthaben: ${result.balance.toFixed(2)}€`, 'info');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || 'Geschenkkarte nicht gefunden', 'error');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Code kopiert!', 'success');
    } catch {
      showToast('Code konnte nicht kopiert werden', 'error');
    }
  };

  if (isLoading || activeLoading) {
    return (
      <div className="gift-cards">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" width="100%" height="200px" />
      </div>
    );
  }

  return (
    <div className="gift-cards">
      <div className="gift-cards-header">
        <h2>Geschenkkarten</h2>
        <div className="header-actions">
          <Button variant="secondary" onClick={() => setShowRedeemModal(true)}>
            <Search size={16} />
            Code einlösen
          </Button>
          <Button variant="primary" onClick={() => setShowPurchaseModal(true)}>
            <Plus size={16} />
            Geschenkkarte kaufen
          </Button>
        </div>
      </div>

      {activeGiftCards && activeGiftCards.length > 0 && (
        <Card variant="elevated" className="active-gift-cards-section">
          <h3>Aktive Geschenkkarten</h3>
          <div className="gift-cards-grid">
            {activeGiftCards.map((card) => (
              <Card key={card.id} variant="outlined" className="gift-card-item">
                <div className="gift-card-header">
                  <Gift size={24} color="#1877F2" />
                  <div className="gift-card-code">
                    <code>{card.code}</code>
                    <button
                      onClick={() => handleCopyCode(card.code)}
                      className="copy-code-btn"
                      aria-label={t('giftCards.copyCode')}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div className="gift-card-balance">
                  <span className="balance-label">{t('giftCards.balance')}</span>
                  <span className="balance-value">{card.balance.toFixed(2)}€</span>
                </div>
                {card.expiresAt && (
                  <div className="gift-card-expiry">
                    {t('giftCards.validUntil')} {new Date(card.expiresAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US')}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}

      {giftCards && (
        <>
          {giftCards.purchased && giftCards.purchased.length > 0 && (
            <Card variant="elevated" className="gift-cards-section">
              <h3>Gekaufte Geschenkkarten</h3>
              <div className="gift-cards-list">
                {giftCards.purchased.map((card) => (
                  <div key={card.id} className="gift-card-list-item">
                    <div className="gift-card-info">
                      <div className="gift-card-code">
                        <code>{card.code}</code>
                        <button
                          onClick={() => handleCopyCode(card.code)}
                          className="copy-code-btn"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="gift-card-details">
                        <span>Betrag: {card.amount.toFixed(2)}€</span>
                        {card.recipientEmail && (
                          <span>Empfänger: {card.recipientEmail}</span>
                        )}
                        <span>Gekauft: {new Date(card.createdAt).toLocaleDateString('de-DE')}</span>
                      </div>
                    </div>
                    <div className="gift-card-status">
                      {card.isRedeemed ? (
                        <span className="status-redeemed">
                          <Check size={16} />
                          Eingelöst
                        </span>
                      ) : (
                        <span className="status-pending">Ausstehend</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {giftCards.redeemed && giftCards.redeemed.length > 0 && (
            <Card variant="elevated" className="gift-cards-section">
              <h3>Eingelöste Geschenkkarten</h3>
              <div className="gift-cards-list">
                {giftCards.redeemed.map((card) => (
                  <div key={card.id} className="gift-card-list-item">
                    <div className="gift-card-info">
                      <div className="gift-card-code">
                        <code>{card.code}</code>
                      </div>
                      <div className="gift-card-details">
                        <span>Betrag: {card.amount.toFixed(2)}€</span>
                        <span>Guthaben: {card.balance.toFixed(2)}€</span>
                        {card.redeemedAt && (
                          <span>Eingelöst: {new Date(card.redeemedAt).toLocaleDateString('de-DE')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {(!giftCards || (giftCards.purchased?.length === 0 && giftCards.redeemed?.length === 0)) && (!activeGiftCards || activeGiftCards.length === 0) && (
        <Card variant="elevated" className="empty-state">
          <Gift size={48} color="#8A8D91" />
          <p>Noch keine Geschenkkarten</p>
          <Button variant="primary" onClick={() => setShowPurchaseModal(true)}>
            Geschenkkarte kaufen
          </Button>
        </Card>
      )}

      {showPurchaseModal && (
        <div className="modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Geschenkkarte kaufen</h3>
            <div className="form-group">
              <label>Betrag (€)</label>
              <input
                type="number"
                min="5"
                max="1000"
                step="5"
                value={purchaseData.amount}
                onChange={(e) => setPurchaseData({ ...purchaseData, amount: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Empfänger E-Mail (optional)</label>
              <input
                type="email"
                value={purchaseData.recipientEmail}
                onChange={(e) => setPurchaseData({ ...purchaseData, recipientEmail: e.target.value })}
                placeholder="email@example.com"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Empfänger Name (optional)</label>
              <input
                type="text"
                value={purchaseData.recipientName}
                onChange={(e) => setPurchaseData({ ...purchaseData, recipientName: e.target.value })}
                placeholder="Max Mustermann"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Nachricht (optional)</label>
              <textarea
                value={purchaseData.message}
                onChange={(e) => setPurchaseData({ ...purchaseData, message: e.target.value })}
                placeholder="Persönliche Nachricht..."
                rows={3}
                className="form-textarea"
              />
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowPurchaseModal(false)}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onClick={handlePurchase}
                disabled={purchaseMutation.isPending}
              >
                {purchaseMutation.isPending ? 'Wird gekauft...' : `${purchaseData.amount.toFixed(2)}€ kaufen`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRedeemModal && (
        <div className="modal-overlay" onClick={() => setShowRedeemModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Geschenkkarte einlösen</h3>
            <div className="form-group">
              <label>Geschenkkarten-Code</label>
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="GC-XXXXXXXXXXXX"
                className="form-input"
              />
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={handleCheckBalance}>
                Guthaben prüfen
              </Button>
              <Button variant="secondary" onClick={() => setShowRedeemModal(false)}>
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onClick={handleRedeem}
                disabled={redeemMutation.isPending || !redeemCode.trim()}
              >
                {redeemMutation.isPending ? 'Wird eingelöst...' : 'Einlösen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


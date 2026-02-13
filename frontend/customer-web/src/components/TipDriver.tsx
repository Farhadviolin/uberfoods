import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import './TipDriver.css';

interface TipDriverProps {
  orderId: string;
  driverId: string;
  driverName: string;
  orderAmount: number;
  onTipSent?: () => void;
}

export function TipDriver({
  orderId,
  driverId,
  driverName,
  orderAmount,
  onTipSent,
}: TipDriverProps) {
  const { showToast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presetAmounts = [
    { label: '€2', value: 2 },
    { label: '€5', value: 5 },
    { label: '€10', value: 10 },
    { label: `${Math.round(orderAmount * 0.1)}€ (10%)`, value: Math.round(orderAmount * 0.1) },
    { label: `${Math.round(orderAmount * 0.15)}€ (15%)`, value: Math.round(orderAmount * 0.15) },
  ];

  const handleTipSubmit = async () => {
    const tipAmount = selectedAmount || parseFloat(customAmount);
    
    if (!tipAmount || tipAmount <= 0) {
      showToast('Bitte wählen Sie einen Betrag', 'error');
      return;
    }

    if (tipAmount > orderAmount * 0.5) {
      const confirmed = confirm(
        `Sie möchten ${tipAmount.toFixed(2)}€ Trinkgeld geben (mehr als 50% der Bestellung). Möchten Sie fortfahren?`
      );
      if (!confirmed) return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/orders/${orderId}/tip`, {
        driverId,
        amount: tipAmount,
      });
      showToast(`Trinkgeld von €${tipAmount.toFixed(2)} wurde gesendet!`, 'success');
      onTipSent?.();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tip-driver-modal">
      <div className="tip-driver-content">
        <h2>Trinkgeld für {driverName}</h2>
        <p className="tip-driver-subtitle">
          Zeigen Sie Ihre Wertschätzung für den schnellen Service!
        </p>

        <div className="tip-preset-amounts">
          {presetAmounts.map((preset) => (
            <button
              key={preset.value}
              className={`tip-preset-btn ${
                selectedAmount === preset.value ? 'active' : ''
              }`}
              onClick={() => {
                setSelectedAmount(preset.value);
                setCustomAmount('');
              }}
              disabled={isSubmitting}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="tip-custom-amount">
          <label>Oder eigenen Betrag eingeben:</label>
          <div className="tip-input-wrapper">
            <span className="tip-currency">€</span>
            <input
              type="number"
              min="0"
              step="0.50"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              placeholder="0.00"
              className="tip-custom-input"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="tip-actions">
          <button
            onClick={handleTipSubmit}
            className="tip-submit-btn"
            disabled={isSubmitting || (!selectedAmount && !customAmount)}
          >
            {isSubmitting ? 'Wird gesendet...' : 'Trinkgeld senden'}
          </button>
        </div>
      </div>
    </div>
  );
}

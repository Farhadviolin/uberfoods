import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import './SplitPayment.css';

interface SplitPaymentProps {
  orderId: string;
  totalAmount: number;
  onSplitComplete?: () => void;
}

interface SplitParticipant {
  id: string;
  email: string;
  amount: number;
  paid: boolean;
}

export function SplitPayment({
  orderId,
  totalAmount,
  onSplitComplete,
}: SplitPaymentProps) {
  const { showToast } = useToast();
  const [participants, setParticipants] = useState<SplitParticipant[]>([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addParticipant = () => {
    if (!newParticipantEmail.trim()) {
      showToast('Bitte geben Sie eine E-Mail-Adresse ein', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newParticipantEmail)) {
      showToast('Bitte geben Sie eine gültige E-Mail-Adresse ein', 'error');
      return;
    }

    if (participants.some((p) => p.email === newParticipantEmail)) {
      showToast('Diese E-Mail-Adresse wurde bereits hinzugefügt', 'error');
      return;
    }

    const amountPerPerson =
      splitMethod === 'equal'
        ? totalAmount / (participants.length + 1)
        : 0;

    setParticipants([
      ...participants,
      {
        id: Date.now().toString(),
        email: newParticipantEmail,
        amount: amountPerPerson,
        paid: false,
      },
    ]);
    setNewParticipantEmail('');
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const updateParticipantAmount = (id: string, amount: number) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, amount } : p))
    );
  };

  const handleSplitPayment = async () => {
    if (participants.length === 0) {
      showToast('Bitte fügen Sie mindestens einen Teilnehmer hinzu', 'error');
      return;
    }

    const totalSplit = participants.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalSplit - totalAmount) > 0.01) {
      showToast(
        `Die Summe der Anteile (€${totalSplit.toFixed(2)}) muss dem Gesamtbetrag (€${totalAmount.toFixed(2)}) entsprechen`,
        'error'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/orders/${orderId}/split-payment`, {
        participants: participants.map((p) => ({
          email: p.email,
          amount: p.amount,
        })),
      });
      showToast('Zahlungsaufteilung wurde erstellt!', 'success');
      onSplitComplete?.();
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const distributeEqually = () => {
    const amountPerPerson = totalAmount / (participants.length + 1);
    setParticipants(
      participants.map((p) => ({ ...p, amount: amountPerPerson }))
    );
  };

  return (
    <div className="split-payment-modal">
      <div className="split-payment-content">
        <h2>Zahlung aufteilen</h2>
        <p className="split-payment-subtitle">
          Gesamtbetrag: <strong>€{totalAmount.toFixed(2)}</strong>
        </p>

        <div className="split-method-selector">
          <label>
            <input
              type="radio"
              value="equal"
              checked={splitMethod === 'equal'}
              onChange={(e) => {
                setSplitMethod(e.target.value as 'equal' | 'custom');
                if (e.target.value === 'equal') {
                  distributeEqually();
                }
              }}
            />
            Gleichmäßig aufteilen
          </label>
          <label>
            <input
              type="radio"
              value="custom"
              checked={splitMethod === 'custom'}
              onChange={(e) => setSplitMethod(e.target.value as 'equal' | 'custom')}
            />
            Individuelle Beträge
          </label>
        </div>

        <div className="participants-list">
          <div className="participant-item">
            <div className="participant-info">
              <span className="participant-email">Sie (Hauptzahler)</span>
              <span className="participant-amount">
                €
                {(
                  totalAmount -
                  participants.reduce((sum, p) => sum + p.amount, 0)
                ).toFixed(2)}
              </span>
            </div>
          </div>

          {participants.map((participant) => (
            <div key={participant.id} className="participant-item">
              <div className="participant-info">
                <span className="participant-email">{participant.email}</span>
                {splitMethod === 'custom' ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={participant.amount}
                    onChange={(e) =>
                      updateParticipantAmount(
                        participant.id,
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="participant-amount-input"
                  />
                ) : (
                  <span className="participant-amount">
                    €{participant.amount.toFixed(2)}
                  </span>
                )}
              </div>
              <button
                onClick={() => removeParticipant(participant.id)}
                className="remove-participant-btn"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="add-participant">
          <input
            type="email"
            value={newParticipantEmail}
            onChange={(e) => setNewParticipantEmail(e.target.value)}
            placeholder="E-Mail-Adresse hinzufügen"
            className="participant-email-input"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addParticipant();
              }
            }}
          />
          <button onClick={addParticipant} className="add-participant-btn">
            + Hinzufügen
          </button>
        </div>

        <div className="split-actions">
          <button
            onClick={handleSplitPayment}
            className="split-submit-btn"
            disabled={isSubmitting || participants.length === 0}
          >
            {isSubmitting ? 'Wird erstellt...' : 'Aufteilung erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}

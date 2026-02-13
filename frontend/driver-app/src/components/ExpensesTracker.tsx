import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './ExpensesTracker.css';

interface Expense {
  id: string;
  type: 'fuel' | 'maintenance' | 'toll' | 'parking' | 'other';
  amount: number;
  description?: string;
  receiptUrl?: string;
  date: string;
  createdAt: string;
}

interface ExpenseSummary {
  total: number;
  byType: {
    fuel: number;
    maintenance: number;
    toll: number;
    parking: number;
    other: number;
  };
  period: {
    today: number;
    week: number;
    month: number;
  };
}

export function ExpensesTracker() {
  const { driver } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'fuel' as Expense['type'],
    amount: '',
    description: '',
  });

  useEffect(() => {
    if (driver) {
      fetchExpenses();
      fetchSummary();
    }
  }, [driver, period]);

  const fetchExpenses = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const response = await api.get(`/drivers/${driver.id}/expenses?period=${period}`);
      setExpenses(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Ausgaben:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!driver) return;
    try {
      const response = await api.get(`/drivers/${driver.id}/expenses/summary?period=${period}`);
      setSummary(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Zusammenfassung:', error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !formData.amount) return;
    try {
      await api.post(`/drivers/${driver.id}/expenses`, {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
      });
      setFormData({ type: 'fuel', amount: '', description: '' });
      setShowAddForm(false);
      fetchExpenses();
      fetchSummary();
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!driver) return;
    if (!confirm('Ausgabe wirklich löschen?')) return;
    try {
      await api.delete(`/drivers/${driver.id}/expenses/${expenseId}`);
      fetchExpenses();
      fetchSummary();
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    }
  };

  const getTypeIcon = (type: Expense['type']) => {
    switch (type) {
      case 'fuel':
        return '⛽';
      case 'maintenance':
        return '🔧';
      case 'toll':
        return '🛣️';
      case 'parking':
        return '🅿️';
      default:
        return '📝';
    }
  };

  if (!driver) return null;

  return (
    <div className="expenses-tracker">
      <div className="expenses-header">
        <h2>💸 Ausgaben</h2>
        <button
          className="add-expense-button"
          onClick={() => setShowAddForm(true)}
        >
          + Ausgabe hinzufügen
        </button>
      </div>

      {summary && (
        <div className="expenses-summary">
          <div className="summary-card">
            <div className="summary-label">Gesamt ({period})</div>
            <div className="summary-value">{summary.period[period as keyof typeof summary.period].toFixed(2)} €</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Gesamt</div>
            <div className="summary-value">{summary.total.toFixed(2)} €</div>
          </div>
        </div>
      )}

      <div className="period-selector">
        <button
          className={period === 'today' ? 'active' : ''}
          onClick={() => setPeriod('today')}
        >
          Heute
        </button>
        <button
          className={period === 'week' ? 'active' : ''}
          onClick={() => setPeriod('week')}
        >
          Woche
        </button>
        <button
          className={period === 'month' ? 'active' : ''}
          onClick={() => setPeriod('month')}
        >
          Monat
        </button>
      </div>

      {showAddForm && (
        <div className="add-expense-modal">
          <div className="modal-content">
            <h3>Ausgabe hinzufügen</h3>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label>Typ</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Expense['type'] })}
                >
                  <option value="fuel">⛽ Kraftstoff</option>
                  <option value="maintenance">🔧 Wartung</option>
                  <option value="toll">🛣️ Maut</option>
                  <option value="parking">🅿️ Parken</option>
                  <option value="other">📝 Sonstiges</option>
                </select>
              </div>
              <div className="form-group">
                <label>Betrag (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="submit">Hinzufügen</button>
                <button type="button" onClick={() => setShowAddForm(false)}>Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Lade Ausgaben...</div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">Keine Ausgaben gefunden</div>
      ) : (
        <div className="expenses-list">
          {expenses.map((expense) => (
            <div key={expense.id} className="expense-item">
              <div className="expense-icon">{getTypeIcon(expense.type)}</div>
              <div className="expense-info">
                <div className="expense-type">{expense.type}</div>
                {expense.description && (
                  <div className="expense-description">{expense.description}</div>
                )}
                <div className="expense-date">
                  {new Date(expense.date).toLocaleDateString('de-DE')}
                </div>
              </div>
              <div className="expense-amount">-{expense.amount.toFixed(2)} €</div>
              <button
                className="delete-expense"
                onClick={() => handleDelete(expense.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


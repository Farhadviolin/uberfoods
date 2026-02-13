import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { logger } from '../utils/logger';

interface FinancialBalance {
  totalBalance: number;
  availableBalance: number;
  pendingAmount: number;
  lastPayout?: string;
}

interface Transaction {
  id: string;
  type: 'earning' | 'payout' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface FinancialStats {
  totalEarnings: number;
  totalPayouts: number;
  averageEarningsPerOrder: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

export function useFinancial() {
  const { driver } = useAuth();
  const [balance, setBalance] = useState<FinancialBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/financial/balance`);
      setBalance(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Laden des Kontostands');
      logger.error('Financial Balance Fetch Error', 'useFinancial', err);
    }
  }, [driver?.id]);

  const fetchTransactions = useCallback(async (limit: number = 50, offset: number = 0) => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/financial/transactions`, {
        params: { limit, offset },
      });
      setTransactions(response.data.transactions || []);
    } catch (err: any) {
      logger.error('Financial Transactions Fetch Error', 'useFinancial', err);
    }
  }, [driver?.id]);

  const fetchStats = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/financial/statistics`);
      setStats(response.data);
    } catch (err: any) {
      logger.error('Financial Stats Fetch Error', 'useFinancial', err);
    }
  }, [driver?.id]);

  const requestPayout = useCallback(async (amount: number) => {
    if (!driver?.id) return { success: false, error: 'Driver ID fehlt' };

    try {
      await api.post(`/drivers/${driver.id}/financial/payout`, { amount });
      await fetchBalance();
      return { success: true };
    } catch (err: any) {
      logger.error('Request Payout Error', 'useFinancial', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Fehler beim Auszahlungsantrag',
      };
    }
  }, [driver?.id, fetchBalance]);

  useEffect(() => {
    if (driver?.id) {
      setLoading(true);
      Promise.all([fetchBalance(), fetchTransactions(), fetchStats()]).finally(() => {
        setLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]); // ✅ Nur driver?.id als Dependency - Callbacks sind stabil durch useCallback

  return {
    balance,
    transactions,
    stats,
    loading,
    error,
    requestPayout,
    refetch: () => {
      fetchBalance();
      fetchTransactions();
      fetchStats();
    },
  };
}


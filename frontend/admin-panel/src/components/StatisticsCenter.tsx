import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { memo } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { extractErrorMessage } from '../utils/errorHandler';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

type StatValue = string | number | boolean | null | undefined;

interface StatBlock {
  title: string;
  data: Record<string, StatValue> | StatValue[];
}

function StatisticsCenterInner() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('week');
  const [blocks, setBlocks] = useState<StatBlock[]>([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashboard,
        revenue,
        topRestaurants,
        driverPerf,
        promotions,
        customerGrowth,
        orderStatus,
      ] = await Promise.all([
        api.get('/statistics/dashboard').catch(() => ({ data: {} })),
        api.get('/statistics/revenue', { params: { period } }).catch(() => ({ data: {} })),
        api.get('/statistics/top-restaurants').catch(() => ({ data: [] })),
        api.get('/statistics/driver-performance').catch(() => ({ data: [] })),
        api.get('/statistics/top-promotions').catch(() => ({ data: [] })),
        api.get('/statistics/customer-growth', { params: { period } }).catch(() => ({ data: {} })),
        api.get('/statistics/order-status-distribution').catch(() => ({ data: {} })),
      ]);

      setBlocks([
        { title: 'Dashboard', data: dashboard.data || {} },
        { title: `Revenue (${period})`, data: revenue.data || {} },
        { title: 'Top Restaurants', data: topRestaurants.data || [] },
        { title: 'Driver Performance', data: driverPerf.data || [] },
        { title: 'Top Promotions', data: promotions.data || [] },
        { title: `Customer Growth (${period})`, data: customerGrowth.data || {} },
        { title: 'Order Status Distribution', data: orderStatus.data || {} },
      ]);
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Statistics Center</h2>
        <p className="text-muted">Zentrale Übersicht der Statistiken & KPIs.</p>
      </div>

      <div className="card-section">
        <label htmlFor="stats-period-select">Zeitraum</label>
        <select
          id="stats-period-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Statistik-Zeitraum auswählen"
        >
          <option value="day">day</option>
          <option value="week">week</option>
          <option value="month">month</option>
          <option value="year">year</option>
        </select>
        <button type="button" className="btn" onClick={loadStats} aria-label="Statistiken neu laden">Neu laden</button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : blocks.length === 0 ? (
        <EmptyState
          message="Keine Statistiken verfügbar. Laden Sie die Statistiken neu."
          icon="📊"
          action={{
            label: "Statistiken laden",
            onClick: loadStats
          }}
        />
      ) : (
        <div className="grid two-cols gap" role="region" aria-label="Statistik-Blöcke">
          {blocks.map((block) => (
            <div key={block.title} className="card-section" role="article" aria-label={block.title}>
              <h3>{block.title}</h3>
              {Array.isArray(block.data) ? (
                block.data.length === 0 ? (
                  <EmptyState message="Keine Daten verfügbar." icon="📊" />
                ) : (
                  <ul role="list">
                    {block.data.map((item, idx) => (
                      <li key={idx} role="listitem">{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                    ))}
                  </ul>
                )
              ) : Object.keys(block.data).length === 0 ? (
                <EmptyState message="Keine Daten verfügbar." icon="📊" />
              ) : (
                <ul role="list">
                  {Object.entries(block.data).map(([k, v]) => (
                    <li key={k} role="listitem">
                      <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const StatisticsCenter = memo(StatisticsCenterInner);

import { render, screen } from '@testing-library/react';
import { DashboardStats } from '../DashboardStats';

const t = (key: string, options?: any) => {
  if (options?.count !== undefined) {
    return `${key}-${options.count}`;
  }
  return key;
};

describe('DashboardStats', () => {
  it('rendert Kennzahlen und KI-Infos', () => {
    render(
      <DashboardStats
        t={t as any}
        activeOrders={3}
        completedOrders={7}
        todayEarnings={42.5}
        aiAnalyzing={false}
        aiStats={{
          averageScore: 88,
          autoAcceptedCount: 2,
          recommendations: { accept: 1, auto_accept: 1 },
        }}
      />,
    );

    expect(screen.getByText('dashboard.stats.active')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('dashboard.stats.completed')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('dashboard.stats.earnings')).toBeInTheDocument();
    expect(screen.getByText('42.50 €')).toBeInTheDocument();
    expect(screen.getByText('dashboard.stats.ai')).toBeInTheDocument();
    expect(screen.getByText('88/100')).toBeInTheDocument();
  });
});

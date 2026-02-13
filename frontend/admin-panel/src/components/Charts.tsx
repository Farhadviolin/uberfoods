import { memo, useMemo } from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

import type { ChartData, ChartOptions } from 'chart.js';

interface ChartProps {
  data: ChartData<'line' | 'bar' | 'pie' | 'doughnut'> | {
    data: ChartData<'line' | 'bar' | 'pie' | 'doughnut'>;
    options?: ChartOptions<'line' | 'bar' | 'pie' | 'doughnut'>;
  };
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title?: string;
  options?: ChartOptions<'line' | 'bar' | 'pie' | 'doughnut'>;
}

export const Chart = memo(function Chart({ data, type, title, options: propOptions }: ChartProps) {
  const chartData = useMemo(() => {
    // Handle both formats: direct ChartData or { data, options } object
    const chartDataValue = 'data' in data && 'labels' in (data as { data: ChartData<'line' | 'bar' | 'pie' | 'doughnut'> }).data 
      ? (data as { data: ChartData<'line' | 'bar' | 'pie' | 'doughnut'> }).data 
      : data as ChartData<'line' | 'bar' | 'pie' | 'doughnut'>;
    const chartOptions = propOptions || ('options' in data ? (data as { options?: ChartOptions<'line' | 'bar' | 'pie' | 'doughnut'> }).options : undefined);
    
    return {
      data: chartDataValue,
      options: {
        ...chartOptions,
        plugins: {
          ...chartOptions?.plugins,
          legend: {
            position: 'top' as const,
          },
          title: title ? {
            display: true,
            text: title,
          } : undefined,
        },
        responsive: true,
        maintainAspectRatio: false,
      } as ChartOptions<'line' | 'bar' | 'pie' | 'doughnut'>,
    };
  }, [data, title, propOptions]);

  switch (type) {
    case 'line':
      return <Line data={chartData.data as ChartData<'line'>} options={chartData.options as ChartOptions<'line'>} />;
    case 'bar':
      return <Bar data={chartData.data as ChartData<'bar'>} options={chartData.options as ChartOptions<'bar'>} />;
    case 'pie':
      return <Pie data={chartData.data as ChartData<'pie'>} options={chartData.options as ChartOptions<'pie'>} />;
    case 'doughnut':
      return <Doughnut data={chartData.data as ChartData<'doughnut'>} options={chartData.options as ChartOptions<'doughnut'>} />;
    default:
      return null;
  }
});


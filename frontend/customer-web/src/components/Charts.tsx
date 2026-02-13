import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
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
  Legend
);

type ChartType = 'line' | 'bar' | 'pie' | 'doughnut';

interface ChartDataset {
  label?: string; // Optional machen, da einige Charts es nicht brauchen
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  [key: string]: unknown;
}

interface ChartDataShape {
  labels: string[];
  datasets: ChartDataset[];
  options?: Record<string, unknown>;
}

interface ChartProps {
  data: ChartDataShape | { data: ChartDataShape; options?: Record<string, unknown> };
  type: ChartType;
  title?: string;
}

export function Chart({ data, type, title }: ChartProps) {
  const { t } = useTranslation();

  // Unterstütze beide Datenformate: direkt ChartDataShape oder { data: ChartDataShape }
  const chartData = 'data' in data ? data.data : data;

  // Validiere dass data existiert und die richtige Struktur hat
  if (!chartData || !chartData.labels || !chartData.datasets) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#65676B' }}>
        {t('charts.noData')}
      </div>
    );
  }

  const chartOptions: Record<string, unknown> = {
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: title
        ? {
            display: true,
            text: title,
          }
        : undefined,
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // Stelle sicher, dass datasets das label-Feld haben
  const normalizedData = {
    ...chartData,
    datasets: chartData.datasets.map(dataset => ({
      label: dataset.label || title || 'Data',
      ...dataset,
    })),
  };

  switch (type) {
    case 'line':
      return (
        <div style={{ height: '400px' }}>
          <Line data={normalizedData} options={chartOptions} />
        </div>
      );
    case 'bar':
      return (
        <div style={{ height: '400px' }}>
          <Bar data={normalizedData} options={chartOptions} />
        </div>
      );
    case 'pie':
      return (
        <div style={{ height: '400px' }}>
          <Pie data={normalizedData} options={chartOptions} />
        </div>
      );
    case 'doughnut':
      return (
        <div style={{ height: '400px' }}>
          <Doughnut data={normalizedData} options={chartOptions} />
        </div>
      );
    default:
      return null;
  }
}


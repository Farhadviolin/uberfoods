import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { RevenueData } from "../../hooks/useRestaurant";
import { formatCurrency } from "../../utils/formatters";
import "./RevenueChart.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface RevenueChartProps {
  revenueData: RevenueData[];
  period: "7d" | "30d" | "90d";
}

export function RevenueChart({ revenueData }: RevenueChartProps) {
  const chartData = useMemo(() => {
    // Verwende API-Daten statt clientseitige Berechnung
    return {
      labels: revenueData.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        });
      }),
      datasets: [
        {
          label: "Umsatz (€)",
          data: revenueData.map((d) => d.revenue),
          borderColor: "var(--fb-primary)",
          backgroundColor: "rgba(24, 119, 242, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [revenueData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "var(--fb-bg-primary)",
        titleColor: "var(--fb-text-primary)",
        bodyColor: "var(--fb-text-primary)",
        borderColor: "var(--fb-border-primary)",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            return `Umsatz: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "var(--fb-text-secondary)",
        },
      },
      y: {
        grid: {
          color: "var(--fb-border-primary)",
        },
        ticks: {
          color: "var(--fb-text-secondary)",
          callback: (value: any) => `€${value}`,
        },
      },
    },
  };

  return (
    <div className="revenue-chart-container">
      <h3
        style={{
          marginBottom: "20px",
          fontSize: "var(--fb-font-size-lg)",
          fontWeight: 600,
        }}
      >
        Umsatz-Entwicklung
      </h3>
      <div style={{ height: "300px", position: "relative" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

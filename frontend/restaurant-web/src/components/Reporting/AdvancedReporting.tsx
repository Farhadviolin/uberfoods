import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import api from "../../utils/api";
import {
  logError,
  handleApiError,
  getErrorMessage,
} from "../../utils/errorUtils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton, SkeletonChart, SkeletonCard } from "../common/Skeleton";
import "./AdvancedReporting.css";

interface ReportData {
  revenue: {
    daily: Array<{ date: string; revenue: number }>;
    weekly: Array<{ week: string; revenue: number }>;
    monthly: Array<{ month: string; revenue: number }>;
  };
  orders: {
    byStatus: Array<{ status: string; count: number }>;
    byTime: Array<{ hour: number; count: number }>;
  };
  dishes: {
    topSelling: Array<{ name: string; quantity: number; revenue: number }>;
    categoryBreakdown: Array<{ category: string; revenue: number }>;
  };
  customers: {
    newVsReturning: { new: number; returning: number };
    topCustomers: Array<{ name: string; orders: number; revenue: number }>;
  };
  locations: Array<{ name: string; revenue: number; orders: number }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isRevenueSeries(value: unknown, label: string): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry[label] === "string" &&
        typeof entry.revenue === "number",
    )
  );
}

function isReportData(value: unknown): value is ReportData {
  if (!isRecord(value)) return false;

  const revenue = value.revenue;
  const orders = value.orders;
  const dishes = value.dishes;
  const customers = value.customers;

  return (
    isRecord(revenue) &&
    isRevenueSeries(revenue.daily, "date") &&
    isRevenueSeries(revenue.weekly, "week") &&
    isRevenueSeries(revenue.monthly, "month") &&
    isRecord(orders) &&
    Array.isArray(orders.byStatus) &&
    orders.byStatus.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.status === "string" &&
        typeof entry.count === "number",
    ) &&
    Array.isArray(orders.byTime) &&
    orders.byTime.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.hour === "number" &&
        typeof entry.count === "number",
    ) &&
    isRecord(dishes) &&
    Array.isArray(dishes.topSelling) &&
    dishes.topSelling.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.name === "string" &&
        typeof entry.quantity === "number" &&
        typeof entry.revenue === "number",
    ) &&
    Array.isArray(dishes.categoryBreakdown) &&
    dishes.categoryBreakdown.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.category === "string" &&
        typeof entry.revenue === "number",
    ) &&
    isRecord(customers) &&
    isRecord(customers.newVsReturning) &&
    typeof customers.newVsReturning.new === "number" &&
    typeof customers.newVsReturning.returning === "number" &&
    Array.isArray(customers.topCustomers) &&
    customers.topCustomers.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.name === "string" &&
        typeof entry.orders === "number" &&
        typeof entry.revenue === "number",
    ) &&
    Array.isArray(value.locations) &&
    value.locations.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.name === "string" &&
        typeof entry.revenue === "number" &&
        typeof entry.orders === "number",
    )
  );
}

function normalizeReportData(payload: unknown): ReportData | null {
  if (isRecord(payload) && "success" in payload) {
    if (payload.success !== true) return null;
    return isReportData(payload.data) ? payload.data : null;
  }

  return isReportData(payload) ? payload : null;
}

const COLORS = [
  "#4338CA",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#9333EA",
  "#3B82F6",
];

export function AdvancedReporting() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30days");
  const [reportType, setReportType] = useState("overview");

  // Retry-Logik für Report-Fetching
  const retryFetchReport = useRetry(
    async () => {
      const response = await api.get(`/restaurants/${restaurantId}/reports`, {
        params: { range: dateRange, type: reportType },
      });
      return response.data;
    },
    { maxRetries: 3, retryDelay: 2000, exponentialBackoff: true },
  );

  const retryExportReport = useRetry(
    async (format: "pdf" | "csv" | "excel") => {
      const allowedFormats = ["pdf", "csv", "excel"] as const;
      const safeFormat = allowedFormats.includes(format) ? format : "pdf";
      const allowedRanges = ["7days", "30days", "90days", "year"] as const;
      const safeRange = allowedRanges.includes(dateRange as any)
        ? dateRange
        : "30days";
      const allowedTypes = [
        "overview",
        "revenue",
        "orders",
        "dishes",
        "customers",
      ] as const;
      const safeReportType = allowedTypes.includes(reportType as any)
        ? reportType
        : "overview";

      const response = await api.get(
        `/restaurants/${restaurantId}/reports/export`,
        {
          params: {
            range: safeRange,
            type: safeReportType,
            format: safeFormat,
          },
          responseType: "blob",
        },
      );
      return response.data;
    },
    { maxRetries: 2, retryDelay: 3000, exponentialBackoff: true },
  );

  useEffect(() => {
    if (restaurantId) {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, dateRange, reportType]);

  const fetchReportData = async () => {
    if (!restaurantId) {
      setReportData(null);
      setError("Restaurant-Identität fehlt.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const payload = await retryFetchReport.execute();
      const data = normalizeReportData(payload);
      if (!data) {
        throw new Error("Ungültiges Berichtsdatenformat.");
      }
      setReportData(data);
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "AdvancedReporting.fetchReportData");
      setReportData(null);
      setError(getErrorMessage(appError));
      showToast(getErrorMessage(appError), "error");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: "pdf" | "csv" | "excel") => {
    try {
      const blob = await retryExportReport.execute(format);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      const allowedFormats = ["pdf", "csv", "excel"] as const;
      const safeFormat = allowedFormats.includes(format) ? format : "pdf";
      const allowedRanges = ["7days", "30days", "90days", "year"] as const;
      const safeRange = allowedRanges.includes(dateRange as any)
        ? dateRange
        : "30days";
      const allowedTypes = [
        "overview",
        "revenue",
        "orders",
        "dishes",
        "customers",
      ] as const;
      const safeReportType = allowedTypes.includes(reportType as any)
        ? reportType
        : "overview";
      const safeName = `report-${safeRange}-${safeReportType}-${Date.now()}.${safeFormat}`;
      link.setAttribute("download", safeName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Bericht wurde exportiert", "success");
    } catch (error: unknown) {
      const appError = handleApiError(error);
      logError(appError, "AdvancedReporting.exportReport");
      showToast(getErrorMessage(appError), "error");
    }
  };

  if (loading) {
    return (
      <div className="advanced-reporting">
        <div className="report-header">
          <Skeleton variant="text" width="200px" height={32} />
          <div className="report-controls">
            <Skeleton variant="rectangular" width="150px" height={40} />
            <Skeleton variant="rectangular" width="150px" height={40} />
            <div className="export-buttons">
              <Skeleton variant="rectangular" width="80px" height={40} />
              <Skeleton variant="rectangular" width="80px" height={40} />
              <Skeleton variant="rectangular" width="80px" height={40} />
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "20px",
            marginTop: "24px",
          }}
        >
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (!reportData) {
    if (error) {
      return (
        <div className="empty-state" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="fb-button-secondary"
            onClick={() => void fetchReportData()}
          >
            Erneut versuchen
          </button>
        </div>
      );
    }

    return <div className="empty-state">Keine Daten verfügbar</div>;
  }

  return (
    <div className="advanced-reporting">
      <div className="report-header">
        <h1>Erweiterte Berichte</h1>
        <div className="report-controls">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="fb-input"
          >
            <option value="7days">Letzte 7 Tage</option>
            <option value="30days">Letzte 30 Tage</option>
            <option value="90days">Letzte 90 Tage</option>
            <option value="year">Letztes Jahr</option>
          </select>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="fb-input"
          >
            <option value="overview">Übersicht</option>
            <option value="revenue">Umsatz</option>
            <option value="orders">Bestellungen</option>
            <option value="dishes">Gerichte</option>
            <option value="customers">Kunden</option>
          </select>
          <div className="export-buttons">
            <button
              onClick={() => exportReport("pdf")}
              className="fb-button-secondary"
            >
              PDF
            </button>
            <button
              onClick={() => exportReport("csv")}
              className="fb-button-secondary"
            >
              CSV
            </button>
            <button
              onClick={() => exportReport("excel")}
              className="fb-button-secondary"
            >
              Excel
            </button>
          </div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card full-width">
          <h2>Umsatzentwicklung</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.revenue.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#4338CA"
                strokeWidth={2}
                name="Umsatz (€)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="report-card">
          <h2>Bestellungen nach Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.orders.byStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {reportData.orders.byStatus.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="report-card">
          <h2>Bestellungen nach Uhrzeit</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.orders.byTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" name="Bestellungen" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="report-card full-width">
          <h2>Top verkaufte Gerichte</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.dishes.topSelling}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantity" fill="#4338CA" name="Menge" />
              <Bar dataKey="revenue" fill="#10B981" name="Umsatz (€)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="report-card">
          <h2>Kategorien-Umsatz</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.dishes.categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {reportData.dishes.categoryBreakdown.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="report-card">
          <h2>Neue vs. Stammkunden</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  {
                    name: "Neu",
                    value: reportData.customers.newVsReturning.new,
                  },
                  {
                    name: "Stammkunden",
                    value: reportData.customers.newVsReturning.returning,
                  },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#3B82F6" />
                <Cell fill="#10B981" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {reportData.locations.length > 0 && (
          <div className="report-card full-width">
            <h2>Vergleich nach Standorten</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.locations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="#4338CA"
                  name="Umsatz (€)"
                />
                <Bar
                  yAxisId="right"
                  dataKey="orders"
                  fill="#10B981"
                  name="Bestellungen"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

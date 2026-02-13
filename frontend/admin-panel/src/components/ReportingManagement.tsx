import { useState } from 'react';
import { useReportingData, Report, Dashboard, ScheduledReport } from '../hooks/useReportingData';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';
import { Input } from '../design-system/Input';
import { Select } from '../design-system/Select';
import { Modal } from '../design-system/Modal';
import { Badge } from '../design-system/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../design-system/Tabs';
import { Alert } from '../design-system/Alert';
import { Spinner } from '../design-system/Spinner';
import { devError } from '../utils/errorLogger';
import { extractErrorMessage } from '../utils/errorHandler';
import './ReportingManagement.css';

export function ReportingManagement() {
  const {
    reports,
    dashboards,
    scheduledReports,
    isLoading,
    error,
    refetch,
  } = useReportingData();

  const [activeTab, setActiveTab] = useState<'reports' | 'dashboards' | 'scheduled'>('reports');
  const [showSalesReportModal, setShowSalesReportModal] = useState(false);
  const [showCustomerReportModal, setShowCustomerReportModal] = useState(false);
  const [showPerformanceReportModal, setShowPerformanceReportModal] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0],
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const generateSalesReport = async () => {
    try {
      setIsGeneratingReport(true);
      const response = await fetch(`/api/reporting/sales?startDate=${reportDateRange.startDate}&endDate=${reportDateRange.endDate}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate sales report');
      }

      const data = await response.json();

      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${reportDateRange.startDate}-to-${reportDateRange.endDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowSalesReportModal(false);
    } catch (error) {
      devError('Error generating sales report:', error);
      alert('Fehler beim Generieren des Verkaufsberichts: ' + extractErrorMessage(error));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const generateCustomerReport = async () => {
    try {
      setIsGeneratingReport(true);
      const response = await fetch('/api/reporting/customers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate customer report');
      }

      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowCustomerReportModal(false);
    } catch (error) {
      devError('Error generating customer report:', error);
      alert('Fehler beim Generieren des Kundenberichts: ' + extractErrorMessage(error));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const generatePerformanceReport = async () => {
    try {
      setIsGeneratingReport(true);
      const response = await fetch('/api/reporting/performance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate performance report');
      }

      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowPerformanceReportModal(false);
    } catch (error) {
      devError('Error generating performance report:', error);
      alert('Fehler beim Generieren des Leistungsberichts: ' + extractErrorMessage(error));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const exportReport = async (reportType: string, format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await fetch(`/api/reporting/export?reportType=${reportType}&format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to export ${reportType} report`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      devError(`Error exporting ${reportType} report:`, error);
      alert(`Fehler beim Exportieren des ${reportType} Berichts: ` + extractErrorMessage(error));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'success' as const,
      running: 'warning' as const,
      failed: 'error' as const,
      pending: 'secondary' as const,
    };
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="reporting-loading">
        <Spinner size="lg" />
        <p>Lade Reporting-Daten...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" className="reporting-error">
        <strong>Fehler beim Laden der Reporting-Daten:</strong> {error.message}
        <Button onClick={refetch} variant="outline" size="sm">
          Erneut versuchen
        </Button>
      </Alert>
    );
  }

  return (
    <div className="reporting-management">
      <div className="reporting-header">
        <h2>Reporting verwalten</h2>
        <Button onClick={refetch} variant="outline">
          Aktualisieren
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'reports' | 'dashboards' | 'scheduled')}>
        <TabsList>
          <TabsTrigger value="reports">Berichte</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          <TabsTrigger value="scheduled">Geplante Berichte</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <div className="reports-content">
            <div className="reports-section">
              <h3>Sofortberichte generieren</h3>
              <div className="quick-reports-grid">
                <Card className="report-card">
                  <div className="report-header">
                    <h4>Verkaufsbericht</h4>
                    <Badge variant="default">Sofort</Badge>
                  </div>
                  <p>Generieren Sie einen detaillierten Verkaufsbericht für einen bestimmten Zeitraum.</p>
                  <div className="report-actions">
                    <Button onClick={() => setShowSalesReportModal(true)} variant="primary" size="sm">
                      Generieren
                    </Button>
                    <Button
                      onClick={() => exportReport('sales', 'pdf')}
                      variant="outline"
                      size="sm"
                    >
                      Export PDF
                    </Button>
                  </div>
                </Card>

                <Card className="report-card">
                  <div className="report-header">
                    <h4>Kundenbericht</h4>
                    <Badge variant="default">Sofort</Badge>
                  </div>
                  <p>Analysieren Sie Kundenverhalten und Segmente.</p>
                  <div className="report-actions">
                    <Button onClick={() => setShowCustomerReportModal(true)} variant="primary" size="sm">
                      Generieren
                    </Button>
                    <Button
                      onClick={() => exportReport('customers', 'excel')}
                      variant="outline"
                      size="sm"
                    >
                      Export Excel
                    </Button>
                  </div>
                </Card>

                <Card className="report-card">
                  <div className="report-header">
                    <h4>Leistungsbericht</h4>
                    <Badge variant="default">Sofort</Badge>
                  </div>
                  <p>Überprüfen Sie System- und Geschäftsleistung.</p>
                  <div className="report-actions">
                    <Button onClick={() => setShowPerformanceReportModal(true)} variant="primary" size="sm">
                      Generieren
                    </Button>
                    <Button
                      onClick={() => exportReport('performance', 'csv')}
                      variant="outline"
                      size="sm"
                    >
                      Export CSV
                    </Button>
                  </div>
                </Card>
              </div>
            </div>

            <div className="reports-section">
              <h3>Gespeicherte Berichte</h3>
              <div className="saved-reports-list">
                {reports.map((report) => (
                  <Card key={report.id} className="saved-report-card">
                    <div className="report-header">
                      <h4>{report.name}</h4>
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="report-meta">
                      <small>Typ: {report.type}</small>
                      <small>Erstellt: {new Date(report.createdAt).toLocaleString('de-DE')}</small>
                      {report.lastRun && (
                        <small>Zuletzt ausgeführt: {new Date(report.lastRun).toLocaleString('de-DE')}</small>
                      )}
                    </div>
                    <div className="report-actions">
                      <Button variant="outline" size="sm">
                        Anzeigen
                      </Button>
                      <Button variant="outline" size="sm">
                        Herunterladen
                      </Button>
                    </div>
                  </Card>
                ))}

                {reports.length === 0 && (
                  <div className="empty-state">
                    <p>Keine gespeicherten Berichte vorhanden</p>
                    <Button variant="outline" size="sm">
                      Ersten Bericht erstellen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dashboards">
          <div className="dashboards-content">
            <div className="dashboards-header">
              <h3>Dashboards</h3>
              <Button variant="primary">Neues Dashboard</Button>
            </div>

            <div className="dashboards-grid">
              {dashboards.map((dashboard) => (
                <Card key={dashboard.id} className="dashboard-card">
                  <div className="dashboard-header">
                    <h4>{dashboard.name}</h4>
                    <Badge variant="secondary">{dashboard.widgetCount} Widgets</Badge>
                  </div>
                  <div className="dashboard-meta">
                    <small>Erstellt: {new Date(dashboard.createdAt).toLocaleString('de-DE')}</small>
                    {dashboard.lastViewed && (
                      <small>Zuletzt angesehen: {new Date(dashboard.lastViewed).toLocaleString('de-DE')}</small>
                    )}
                  </div>
                  <div className="dashboard-actions">
                    <Button variant="primary" size="sm">
                      Anzeigen
                    </Button>
                    <Button variant="outline" size="sm">
                      Bearbeiten
                    </Button>
                  </div>
                </Card>
              ))}

              {dashboards.length === 0 && (
                <div className="empty-state">
                  <p>Keine Dashboards vorhanden</p>
                  <Button variant="primary">
                    Erstes Dashboard erstellen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="scheduled-content">
            <div className="scheduled-header">
              <h3>Geplante Berichte</h3>
              <Button variant="primary">Neuer geplanter Bericht</Button>
            </div>

            <div className="scheduled-reports-list">
              {scheduledReports.map((scheduledReport) => (
                <Card key={scheduledReport.id} className="scheduled-report-card">
                  <div className="report-header">
                    <h4>{scheduledReport.reportName}</h4>
                    {getStatusBadge(scheduledReport.status)}
                  </div>
                  <div className="report-details">
                    <div className="report-schedule">
                      <strong>Zeitplan:</strong> {scheduledReport.schedule}
                    </div>
                    <div className="report-format">
                      <strong>Format:</strong> {scheduledReport.format}
                    </div>
                    <div className="report-recipients">
                      <strong>Empfänger:</strong>
                      {scheduledReport.recipients.map((recipient) => (
                        <Badge key={recipient} variant="secondary" size="sm">
                          {recipient}
                        </Badge>
                      ))}
                    </div>
                    <div className="report-meta">
                      <small>Nächste Ausführung: {new Date(scheduledReport.nextRun).toLocaleString('de-DE')}</small>
                    </div>
                  </div>
                  <div className="report-actions">
                    <Button variant="outline" size="sm">
                      Bearbeiten
                    </Button>
                    <Button variant="outline" size="sm">
                      Deaktivieren
                    </Button>
                  </div>
                </Card>
              ))}

              {scheduledReports.length === 0 && (
                <div className="empty-state">
                  <p>Keine geplanten Berichte vorhanden</p>
                  <Button variant="primary">
                    Ersten geplanten Bericht erstellen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sales Report Modal */}
      <Modal
        isOpen={showSalesReportModal}
        onClose={() => setShowSalesReportModal(false)}
        title="Verkaufsbericht generieren"
      >
        <div className="report-modal-content">
          <p>Wählen Sie den Zeitraum für den Verkaufsbericht aus.</p>
          <div className="date-fields">
            <Input
              placeholder="Startdatum"
              type="date"
              value={reportDateRange.startDate}
              onChange={(e) => setReportDateRange({ ...reportDateRange, startDate: e.target.value })}
            />
            <Input
              placeholder="Enddatum"
              type="date"
              value={reportDateRange.endDate}
              onChange={(e) => setReportDateRange({ ...reportDateRange, endDate: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <Button onClick={() => setShowSalesReportModal(false)} variant="outline">
              Abbrechen
            </Button>
            <Button onClick={generateSalesReport} disabled={isGeneratingReport}>
              {isGeneratingReport ? <Spinner size="sm" /> : 'Generieren'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Customer Report Modal */}
      <Modal
        isOpen={showCustomerReportModal}
        onClose={() => setShowCustomerReportModal(false)}
        title="Kundenbericht generieren"
      >
        <div className="report-modal-content">
          <p>Der Kundenbericht enthält Analysen zu Kundenverhalten und Segmentierung.</p>
          <div className="modal-actions">
            <Button onClick={() => setShowCustomerReportModal(false)} variant="outline">
              Abbrechen
            </Button>
            <Button onClick={generateCustomerReport} disabled={isGeneratingReport}>
              {isGeneratingReport ? <Spinner size="sm" /> : 'Generieren'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Performance Report Modal */}
      <Modal
        isOpen={showPerformanceReportModal}
        onClose={() => setShowPerformanceReportModal(false)}
        title="Leistungsbericht generieren"
      >
        <div className="report-modal-content">
          <p>Der Leistungsbericht enthält Metriken zu System- und Geschäftsleistung.</p>
          <div className="modal-actions">
            <Button onClick={() => setShowPerformanceReportModal(false)} variant="outline">
              Abbrechen
            </Button>
            <Button onClick={generatePerformanceReport} disabled={isGeneratingReport}>
              {isGeneratingReport ? <Spinner size="sm" /> : 'Generieren'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

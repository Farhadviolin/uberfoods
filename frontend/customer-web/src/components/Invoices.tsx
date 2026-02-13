import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useInvoices } from '../hooks/useInvoices';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';
import { Select } from '../design-system/Select';
import { Badge, type BadgeVariant } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { EmptyState } from '../design-system/EmptyState';
import { Modal } from '../design-system/Modal';
import { useToast } from '../contexts/ToastContext';
import { FileText, Download, Eye, Calendar, DollarSign, Filter } from 'lucide-react';
import { sanitizeFilename, sanitizeUrl } from '../utils/security';
import './Invoices.css';

interface Invoice {
  id: string;
  invoiceId: string;
  orderId: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  createdAt: string;
  dueDate?: string;
  description?: string;
  items?: InvoiceItem[];
  tax?: number;
  total?: number;
}

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

export function Invoices() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'paid' | 'pending' | 'overdue' | 'cancelled',
    search: '',
    startDate: '',
    endDate: '',
    period: undefined as string | undefined,
  });

  const {
    invoices: invoicesData,
    isLoading: loading,
    downloadInvoice,
  } = useInvoices({
    period: filters.period,
    status: filters.status !== 'all' ? filters.status : undefined,
  });

  // Transform invoices data to match component interface
  const invoices: Invoice[] = invoicesData.map((inv) => ({
    id: inv.invoiceId,
    invoiceId: inv.invoiceId,
    orderId: inv.orderId,
    amount: inv.amount,
    status: inv.status === 'paid' || inv.status === 'COMPLETED' ? 'paid' : 
            inv.status === 'pending' || inv.status === 'PENDING' ? 'pending' : 
            inv.status === 'overdue' ? 'overdue' : 'cancelled',
    createdAt: inv.issuedAt,
    dueDate: inv.dueDate,
    description: inv.restaurant ? `Invoice for ${inv.restaurant.name}` : undefined,
    tax: inv.taxAmount,
    total: inv.amount,
  }));

  const handleViewInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailModalOpen(true);

    // Load full invoice details if not already loaded
    if (!invoice.items) {
      try {
        // Validate invoice.id to prevent injection
        const safeId = /^[A-Za-z0-9_-]{1,64}$/.test(invoice.id) ? invoice.id : '';
        if (!safeId) {
          showToast('Ungültige Rechnungs-ID', 'error');
          return;
        }
        const response = await api.get(`/financial/invoices/${safeId}`);
        if (response.data) {
          setSelectedInvoice(response.data);
        }
      } catch (err) {
        // Ignore errors
      }
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      // Validate invoiceId to prevent injection
      const safeInvoiceId = /^[A-Za-z0-9_-]{1,64}$/.test(invoice.invoiceId) ? invoice.invoiceId : 'invoice';
      const result = await downloadInvoice(safeInvoiceId);
      const safeDownloadUrl = sanitizeUrl(result.downloadUrl);
      if (!safeDownloadUrl) {
        throw new Error('Invalid download URL');
      }

      const validated = new URL(safeDownloadUrl, window.location.origin);
      if (validated.origin !== window.location.origin) {
        throw new Error('Cross-origin download blocked');
      }
      const finalUrl = `${validated.pathname}${validated.search}`;

      // Download the PDF (only same-origin/relative)
      const response = await api.get(finalUrl, {
        responseType: 'blob',
      });

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (!url.startsWith('blob:')) {
        throw new Error('Unsichere Blob-URL erzeugt');
      }
      const a = document.createElement('a');
      a.href = url;
      // Sanitize filename to prevent XSS
      a.download = sanitizeFilename(result.filename || `invoice-${safeInvoiceId}.pdf`, 'invoice.pdf');
      a.rel = 'noopener noreferrer';
      a.referrerPolicy = 'no-referrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      showToast(t('invoices.downloaded'), 'success');
    } catch (err) {
      // Fallback: try direct PDF endpoint
      try {
        // Validate invoiceId to prevent injection
        const safeInvoiceId = /^[A-Za-z0-9_-]{1,64}$/.test(invoice.invoiceId) ? invoice.invoiceId : 'invoice';
        const response = await api.get(`/financial/invoices/${safeInvoiceId}/pdf`, {
          responseType: 'blob',
        });

        const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (!url.startsWith('blob:')) {
          throw new Error('Unsichere Blob-URL erzeugt');
        }
        const a = document.createElement('a');
        a.href = url;
        // Sanitize filename to prevent XSS
        a.download = sanitizeFilename(`invoice-${safeInvoiceId}.pdf`, 'invoice.pdf');
        a.rel = 'noopener noreferrer';
        a.referrerPolicy = 'no-referrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        showToast(t('invoices.downloaded'), 'success');
      } catch (err2) {
        showToast(extractErrorMessage(err) || t('invoices.downloadError'), 'error');
      }
    } finally {
      setDownloadingId(null);
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusColor = (status: Invoice['status']): BadgeVariant => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = filters.status === 'all' || invoice.status === filters.status;
    const matchesSearch =
      filters.search === '' ||
      invoice.invoiceId.toLowerCase().includes(filters.search.toLowerCase()) ||
      invoice.orderId.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDate =
      (!filters.startDate || new Date(invoice.createdAt) >= new Date(filters.startDate)) &&
      (!filters.endDate || new Date(invoice.createdAt) <= new Date(filters.endDate));
    return matchesStatus && matchesSearch && matchesDate;
  });

  if (!user) {
    return (
      <div className="invoices-container">
        <Card>
          <div className="invoices-empty">
            <FileText size={48} />
            <h2>{t('invoices.title')}</h2>
            <p>{t('invoices.pleaseLogin')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="invoices-container">
      <div className="invoices-header">
        <div>
          <h1>{t('invoices.title')}</h1>
          <p>{t('invoices.subtitle')}</p>
        </div>
      </div>

      <Card className="invoices-filters">
        <div className="invoices-filters-row">
          <Input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder={t('invoices.searchPlaceholder')}
            leftIcon={<Filter size={18} />}
          />
          <Select
            value={filters.status}
            onChange={(value: any) => setFilters({ ...filters, status: value as typeof filters.status })}
            options={[
              { value: 'all', label: t('invoices.allStatuses') },
              { value: 'paid', label: t('invoices.status.paid') },
              { value: 'pending', label: t('invoices.status.pending') },
              { value: 'overdue', label: t('invoices.status.overdue') },
              { value: 'cancelled', label: t('invoices.status.cancelled') },
            ]}
          />
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            placeholder={t('invoices.startDate')}
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            placeholder={t('invoices.endDate')}
          />
        </div>
      </Card>

      {loading ? (
        <div className="invoices-skeleton">
          <Skeleton variant="rectangular" width="100%" height="120px" />
          <Skeleton variant="rectangular" width="100%" height="120px" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={48} />}
            title={t('invoices.noInvoices')}
            description={t('invoices.noInvoicesDesc')}
          />
        </Card>
      ) : (
        <div className="invoices-list">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="invoice-card">
              <div className="invoice-header">
                <div className="invoice-info">
                  <div className="invoice-id">
                    <FileText size={20} />
                    <span>{invoice.invoiceId}</span>
                  </div>
                  <div className="invoice-meta">
                    <span className="invoice-order-id">
                      {t('invoices.orderId')}: {invoice.orderId}
                    </span>
                    <span className="invoice-date">
                      <Calendar size={14} />
                      {formatDate(invoice.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="invoice-amount">
                  <DollarSign size={20} />
                  <span>{formatCurrency(invoice.amount)}</span>
                </div>
              </div>
              <div className="invoice-footer">
                <Badge variant={getStatusColor(invoice.status)} size="sm">
                  {t(`invoices.status.${invoice.status}`)}
                </Badge>
                <div className="invoice-actions">
                  <Button
                    onClick={() => handleViewInvoice(invoice)}
                    variant="outline"
                    size="sm"
                  >
                    <Eye size={16} />
                    {t('common.view')}
                  </Button>
                  <Button
                    onClick={() => handleDownloadInvoice(invoice)}
                    variant="outline"
                    size="sm"
                    loading={downloadingId === invoice.id}
                    disabled={downloadingId === invoice.id}
                  >
                    <Download size={16} />
                    {t('common.download')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedInvoice(null);
        }}
        title={selectedInvoice ? `Invoice ${selectedInvoice.invoiceId}` : ''}
        size="lg"
      >
        {selectedInvoice && (
          <div className="invoice-detail">
            <div className="invoice-detail-header">
              <div>
                <h3>{t('invoices.invoiceDetails')}</h3>
                <p className="invoice-detail-id">Invoice ID: {selectedInvoice.invoiceId}</p>
                <p className="invoice-detail-order">Order ID: {selectedInvoice.orderId}</p>
              </div>
              <div className="invoice-detail-amount">
                <span className="invoice-detail-amount-label">{t('invoices.total')}</span>
                <span className="invoice-detail-amount-value">{formatCurrency(selectedInvoice.amount)}</span>
              </div>
            </div>

            <div className="invoice-detail-info">
              <div className="invoice-detail-info-item">
                <span className="invoice-detail-info-label">{t('invoices.date')}</span>
                <span className="invoice-detail-info-value">{formatDate(selectedInvoice.createdAt)}</span>
              </div>
              <div className="invoice-detail-info-item">
                <span className="invoice-detail-info-label">{t('invoices.status')}</span>
                <Badge variant={getStatusColor(selectedInvoice.status)} size="sm">
                  {t(`invoices.status.${selectedInvoice.status}`)}
                </Badge>
              </div>
              {selectedInvoice.dueDate && (
                <div className="invoice-detail-info-item">
                  <span className="invoice-detail-info-label">{t('invoices.dueDate')}</span>
                  <span className="invoice-detail-info-value">{formatDate(selectedInvoice.dueDate)}</span>
                </div>
              )}
            </div>

            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div className="invoice-detail-items">
                <h4>{t('invoices.items')}</h4>
                <table className="invoice-items-table">
                  <thead>
                    <tr>
                      <th>{t('invoices.itemName')}</th>
                      <th>{t('invoices.quantity')}</th>
                      <th>{t('invoices.price')}</th>
                      <th>{t('invoices.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedInvoice.description && (
              <div className="invoice-detail-description">
                <h4>{t('invoices.description')}</h4>
                <p>{selectedInvoice.description}</p>
              </div>
            )}

            <div className="invoice-detail-summary">
              {selectedInvoice.tax && (
                <div className="invoice-detail-summary-row">
                  <span>{t('invoices.subtotal')}</span>
                  <span>{formatCurrency(selectedInvoice.amount - (selectedInvoice.tax || 0))}</span>
                </div>
              )}
              {selectedInvoice.tax && (
                <div className="invoice-detail-summary-row">
                  <span>{t('invoices.tax')}</span>
                  <span>{formatCurrency(selectedInvoice.tax)}</span>
                </div>
              )}
              <div className="invoice-detail-summary-row invoice-detail-summary-total">
                <span>{t('invoices.total')}</span>
                <span>{formatCurrency(selectedInvoice.amount)}</span>
              </div>
            </div>

            <div className="invoice-detail-actions">
              <Button
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                variant="primary"
                loading={downloadingId === selectedInvoice.id}
                disabled={downloadingId === selectedInvoice.id}
              >
                <Download size={18} />
                {t('invoices.downloadPDF')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


import { useState, memo, useCallback } from 'react';
import { Button } from '../design-system/Button';
import { useToast } from '../contexts/ToastContext';
import { bulkExport, BulkExportOptions } from '../utils/export';
import { devError } from '../utils/errorLogger';
import './BulkExportButton.css';

interface BulkExportButtonProps<T = Record<string, unknown>> {
  data: T[];
  filename: string;
  title?: string;
  columns?: string[];
  transform?: (item: T) => Record<string, unknown>;
  disabled?: boolean;
  showCount?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

function BulkExportButtonInner({
  data,
  filename,
  title,
  columns,
  transform,
  disabled = false,
  showCount = true,
  variant = 'primary',
}: BulkExportButtonProps) {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const handleExport = useCallback(async (format: 'csv' | 'excel' | 'pdf') => {
    if (!data || data.length === 0) {
      showToast('Keine Daten zum Exportieren', 'warning');
      return;
    }

    setIsExporting(true);
    setShowFormatMenu(false);

    try {
      const options: BulkExportOptions = {
        format,
        data,
        filename,
        title,
        columns,
        transform,
      };

      await bulkExport(options);
      showToast(`${format.toUpperCase()}-Export erfolgreich erstellt`, 'success');
    } catch (error: unknown) {
      devError('Export error:', error);
      showToast('Fehler beim Exportieren', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [data, filename, title, columns, transform, showToast]);

  if (disabled || !data || data.length === 0) {
    return null;
  }

  return (
    <div className="bulk-export-button-container">
      {showFormatMenu ? (
        <div className="bulk-export-menu">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="export-option csv"
            title="CSV Export"
          >
            📥 CSV {showCount && `(${data.length})`}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="export-option excel"
            title="Excel Export"
          >
            📊 Excel {showCount && `(${data.length})`}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="export-option pdf"
            title="PDF Export"
          >
            📄 PDF {showCount && `(${data.length})`}
          </button>
          <button
            onClick={() => setShowFormatMenu(false)}
            className="export-option cancel"
            title="Abbrechen"
          >
            ✖
          </button>
        </div>
      ) : (
        <Button
          onClick={() => setShowFormatMenu(true)}
          disabled={isExporting || disabled}
          variant={variant}
          size="sm"
        >
          {isExporting ? '⏳ Exportiere...' : `📥 Export ${showCount ? `(${data.length})` : ''}`}
        </Button>
      )}
    </div>
  );
}

export const BulkExportButton = memo(BulkExportButtonInner);


import { useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import './VirtualizedTable.css';

interface VirtualizedTableProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  height?: number;
  itemHeight?: number;
  header?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

/**
 * VirtualizedTable - Optimiert für große Datenmengen
 * Nutzt react-window für effizientes Rendering
 */
function VirtualizedTableInner<T extends { id: string }>({
  items,
  renderRow,
  height = 600,
  itemHeight = 60,
  header,
  emptyMessage = 'Keine Daten verfügbar',
  className = '',
}: VirtualizedTableProps<T>) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    if (!item) return null;

    return (
      <div style={style} className="virtualized-row">
        {renderRow(item, index)}
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <div className={`virtualized-table-empty ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`virtualized-table-container ${className}`}>
      {header && <div className="virtualized-table-header">{header}</div>}
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        width="100%"
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
}

export const VirtualizedTable = memo(VirtualizedTableInner) as typeof VirtualizedTableInner;

/**
 * VirtualizedDataTable - Speziell für Tabellen mit Headern
 * Unterstützt komplexe Tabellen-Strukturen
 */
interface VirtualizedDataTableProps<T> {
  items: T[];
  columns: Array<{
    key: string;
    label: string;
    width?: string;
    render?: (item: T, index: number) => React.ReactNode;
  }>;
  height?: number;
  rowHeight?: number;
  onRowClick?: (item: T, index: number) => void;
  emptyMessage?: string;
  className?: string;
  renderRowActions?: (item: T, index: number) => React.ReactNode;
  bulkMode?: boolean;
  selectedItems?: Set<string>;
  onBulkSelect?: (id: string) => void;
  onSelectAll?: () => void;
}

function VirtualizedDataTableInner<T extends { id: string }>({
  items,
  columns,
  height = 600,
  rowHeight = 60,
  onRowClick,
  emptyMessage = 'Keine Daten verfügbar',
  className = '',
  renderRowActions,
  bulkMode = false,
  selectedItems = new Set(),
  onBulkSelect,
  onSelectAll,
}: VirtualizedDataTableProps<T>) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    if (!item) return null;

    const isSelected = selectedItems.has(item.id);

    return (
      <div
        style={style}
        className={`virtualized-table-row ${isSelected ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
        onClick={() => onRowClick?.(item, index)}
      >
        {bulkMode && onBulkSelect && (
          <div className="virtualized-table-cell" style={{ width: '40px', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onBulkSelect(item.id);
              }}
              style={{ cursor: 'pointer' }}
            />
          </div>
        )}
        {columns.map((column) => (
          <div
            key={column.key}
            className="virtualized-table-cell"
            style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
          >
            {column.render ? column.render(item, index) : (item as any)[column.key]}
          </div>
        ))}
        {renderRowActions && (
          <div className="virtualized-table-cell actions-cell" style={{ width: '150px', flexShrink: 0 }}>
            {renderRowActions(item, index)}
          </div>
        )}
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <div className={`virtualized-table-empty ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const allSelected = items.length > 0 && selectedItems.size === items.length;

  return (
    <div className={`virtualized-data-table-container ${className}`}>
      <div className="virtualized-table-header-row">
        {bulkMode && onSelectAll && (
          <div className="virtualized-table-header-cell" style={{ width: '40px', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
              style={{ cursor: 'pointer' }}
            />
          </div>
        )}
        {columns.map((column) => (
          <div
            key={column.key}
            className="virtualized-table-header-cell"
            style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
          >
            {column.label}
          </div>
        ))}
        {renderRowActions && (
          <div className="virtualized-table-header-cell actions-cell" style={{ width: '150px', flexShrink: 0 }}>
            Aktionen
          </div>
        )}
      </div>
      <List
        height={height}
        itemCount={items.length}
        itemSize={rowHeight}
        width="100%"
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
}

export const VirtualizedDataTable = memo(VirtualizedDataTableInner) as typeof VirtualizedDataTableInner;

import { FixedSizeList as List } from 'react-window';
import './VirtualizedTable.css';

interface VirtualizedTableProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  height?: number;
  itemHeight?: number;
  header?: React.ReactNode;
}

export function VirtualizedTable<T extends { id: string }>({
  items,
  renderRow,
  height = 600,
  itemHeight = 60,
  header,
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
      <div className="virtualized-table-empty">
        <p>Keine Daten verfügbar</p>
      </div>
    );
  }

  return (
    <div className="virtualized-table-container">
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


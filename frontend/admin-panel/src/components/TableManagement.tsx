import React, { useState, useMemo } from 'react';
import { VirtualizedTable } from './VirtualizedTable';
import { useRestaurants } from '../hooks/useRestaurants';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  imageUrl: string;
  isActive: boolean;
}

const TableManagement: React.FC = () => {
  const { data: restaurants = [], isLoading } = useRestaurants();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRestaurants = useMemo(() => {
    if (!searchTerm) return restaurants;
    return restaurants.filter((restaurant: Restaurant) =>
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [restaurants, searchTerm]);

  const renderRow = (restaurant: Restaurant, index: number) => (
    <div key={restaurant.id} className="table-row" style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white'
    }}>
      <div style={{ flex: 2, fontWeight: 'bold' }}>{restaurant.name}</div>
      <div style={{ flex: 2 }}>{restaurant.address}</div>
      <div style={{ flex: 1 }}>{restaurant.phone}</div>
      <div style={{ flex: 1 }}>
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          backgroundColor: restaurant.isActive ? '#10b981' : '#ef4444',
          color: 'white'
        }}>
          {restaurant.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <button
          style={{
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => console.log('Edit restaurant:', restaurant.id)}
        >
          Bearbeiten
        </button>
      </div>
    </div>
  );

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      backgroundColor: '#f3f4f6',
      borderBottom: '2px solid #d1d5db',
      fontWeight: 'bold'
    }}>
      <div style={{ flex: 2 }}>Name</div>
      <div style={{ flex: 2 }}>Adresse</div>
      <div style={{ flex: 1 }}>Telefon</div>
      <div style={{ flex: 1 }}>Status</div>
      <div style={{ flex: 1 }}>Aktionen</div>
    </div>
  );

  if (isLoading) {
    return <div className="loading">Lädt...</div>;
  }

  return (
    <div className="table-management">
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Suche nach Restaurants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <VirtualizedTable
        items={filteredRestaurants}
        renderRow={renderRow}
        header={header}
        height={600}
        itemHeight={60}
        emptyMessage="Keine Restaurants gefunden"
        className="restaurant-table"
      />

      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          {filteredRestaurants.length} von {restaurants.length} Restaurants
        </span>
      </div>
    </div>
  );
};

export { TableManagement };
export default TableManagement;

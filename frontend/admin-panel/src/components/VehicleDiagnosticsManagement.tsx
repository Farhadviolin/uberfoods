import React, { useState, useMemo } from 'react';
import { useDrivers } from '../hooks/useDrivers';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  location: any;
}

interface VehicleDiagnostics {
  speed: number;
  fuelLevel: number;
  batteryHealth: number;
}

export const VehicleDiagnosticsManagement: React.FC = () => {
  const { data: drivers = [], isLoading } = useDrivers();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  // Mock diagnostics data - in real app this would come from API
  const diagnosticsData: Record<string, VehicleDiagnostics> = useMemo(() => ({
    'driver-1': { speed: 60, fuelLevel: 75, batteryHealth: 90 },
    'driver-2': { speed: 45, fuelLevel: 60, batteryHealth: 85 },
  }), []);

  const getDiagnosticsForDriver = (driverId: string): VehicleDiagnostics => {
    return diagnosticsData[driverId] || { speed: 0, fuelLevel: 0, batteryHealth: 0 };
  };

  if (isLoading) {
    return <div className="loading">Lädt Fahrer-Daten...</div>;
  }

  return (
    <div className="vehicle-diagnostics-management">
      <h2>Fahrzeug-Diagnose Verwaltung</h2>

      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedDriver || ''}
          onChange={(e) => setSelectedDriver(e.target.value || null)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          <option value="">Fahrer auswählen...</option>
          {drivers.map((driver: Driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} ({driver.isActive ? 'Aktiv' : 'Inaktiv'})
            </option>
          ))}
        </select>
      </div>

      {selectedDriver && (
        <div className="diagnostics-display" style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#f9fafb'
        }}>
          <h3>Diagnose-Daten für {drivers.find((d: Driver) => d.id === selectedDriver)?.name}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {(() => {
              const diagnostics = getDiagnosticsForDriver(selectedDriver);
              return (
                <>
                  <div className="diagnostic-item">
                    <label style={{ fontWeight: 'bold', color: '#374151' }}>Geschwindigkeit:</label>
                    <span style={{ marginLeft: '8px', color: '#059669' }}>{diagnostics.speed} km/h</span>
                  </div>

                  <div className="diagnostic-item">
                    <label style={{ fontWeight: 'bold', color: '#374151' }}>Kraftstofflevel:</label>
                    <span style={{
                      marginLeft: '8px',
                      color: diagnostics.fuelLevel > 50 ? '#059669' : diagnostics.fuelLevel > 25 ? '#d97706' : '#dc2626'
                    }}>
                      {diagnostics.fuelLevel}%
                    </span>
                  </div>

                  <div className="diagnostic-item">
                    <label style={{ fontWeight: 'bold', color: '#374151' }}>Batteriegesundheit:</label>
                    <span style={{
                      marginLeft: '8px',
                      color: diagnostics.batteryHealth > 80 ? '#059669' : diagnostics.batteryHealth > 60 ? '#d97706' : '#dc2626'
                    }}>
                      {diagnostics.batteryHealth}%
                    </span>
                  </div>

                  <div className="diagnostic-item">
                    <label style={{ fontWeight: 'bold', color: '#374151' }}>Status:</label>
                    <span style={{
                      marginLeft: '8px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: diagnostics.speed > 0 ? '#10b981' : '#6b7280',
                      color: 'white'
                    }}>
                      {diagnostics.speed > 0 ? 'In Bewegung' : 'Stehend'}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => alert('Diagnose aktualisiert!')}
            >
              Diagnose aktualisieren
            </button>
          </div>
        </div>
      )}

      {!selectedDriver && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Wählen Sie einen Fahrer aus, um die Fahrzeug-Diagnose-Daten anzuzeigen.
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
        {drivers.length} Fahrer verfügbar
      </div>
    </div>
  );
};

export default VehicleDiagnosticsManagement;

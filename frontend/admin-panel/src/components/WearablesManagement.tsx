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

interface WearableDevice {
  id: string;
  driverId: string;
  deviceType: string;
  batteryLevel: number;
  heartRate: number;
  stepsToday: number;
  isConnected: boolean;
  lastSync: string;
}

export const WearablesManagement: React.FC = () => {
  const { data: drivers = [], isLoading } = useDrivers();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  // Mock wearable data - in real app this would come from API
  const wearableData: Record<string, WearableDevice> = useMemo(() => ({
    'driver-1': {
      id: 'wearable-1',
      driverId: 'driver-1',
      deviceType: 'Fitness Tracker Pro',
      batteryLevel: 85,
      heartRate: 72,
      stepsToday: 8420,
      isConnected: true,
      lastSync: new Date().toISOString()
    },
    'driver-2': {
      id: 'wearable-2',
      driverId: 'driver-2',
      deviceType: 'Smart Watch X1',
      batteryLevel: 23,
      heartRate: 68,
      stepsToday: 12350,
      isConnected: false,
      lastSync: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
  }), []);

  const getWearableForDriver = (driverId: string): WearableDevice | null => {
    return wearableData[driverId] || null;
  };

  const getBatteryColor = (level: number): string => {
    if (level > 50) return '#10b981'; // green
    if (level > 20) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getConnectionStatus = (isConnected: boolean, lastSync: string): { status: string; color: string } => {
    if (!isConnected) return { status: 'Nicht verbunden', color: '#6b7280' };

    const lastSyncTime = new Date(lastSync);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

    if (diffMinutes < 30) return { status: 'Verbunden', color: '#10b981' };
    if (diffMinutes < 120) return { status: 'Letzte Sync vor 1h', color: '#f59e0b' };
    return { status: 'Sync veraltet', color: '#ef4444' };
  };

  if (isLoading) {
    return <div className="loading">Lädt Wearable-Daten...</div>;
  }

  return (
    <div className="wearables-management">
      <h2>Wearables Verwaltung</h2>

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
        <div className="wearable-display" style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#f9fafb'
        }}>
          {(() => {
            const wearable = getWearableForDriver(selectedDriver);
            const driver = drivers.find((d: Driver) => d.id === selectedDriver);

            if (!wearable) {
              return (
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                  <p>Kein Wearable-Gerät für {driver?.name} gefunden.</p>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '10px'
                    }}
                    onClick={() => alert('Wearable würde hier zugewiesen werden')}
                  >
                    Wearable zuweisen
                  </button>
                </div>
              );
            }

            const batteryColor = getBatteryColor(wearable.batteryLevel);
            const connectionInfo = getConnectionStatus(wearable.isConnected, wearable.lastSync);

            return (
              <>
                <h3>Wearable-Daten für {driver?.name}</h3>
                <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                  Gerät: {wearable.deviceType}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="wearable-metric">
                    <label style={{ fontWeight: 'bold', color: '#374151' }}>Batterie:</label>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                      <div style={{
                        width: '60px',
                        height: '20px',
                        border: '1px solid #d1d5db',
                        borderRadius: '2px',
                        marginRight: '8px',
                        backgroundColor: '#f3f4f6',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${wearable.batteryLevel}%`,
                          height: '100%',
                          backgroundColor: batteryColor,
                          borderRadius: '1px'
                        }}></div>
                      </div>
                      <span style={{ color: batteryColor, fontWeight: 'bold' }}>
                        {wearable.batteryLevel}%
                      </span>
                    </div>
                  </div>

                  <div className="wearable-metric">
                    <label style={{ fontWeight: 'bold', color: '#374151' }}>Herzfrequenz:</label>
                    <span style={{ marginLeft: '8px', color: '#059669', fontSize: '18px', fontWeight: 'bold' }}>
                      {wearable.heartRate} bpm
                    </span>
                  </div>

                  <div className="wearable-metric">
                    <label style={{ fontWeight: 'bold', color: '#374151' }}>Schritte heute:</label>
                    <span style={{ marginLeft: '8px', color: '#3b82f6', fontSize: '18px', fontWeight: 'bold' }}>
                      {wearable.stepsToday.toLocaleString()}
                    </span>
                  </div>

                  <div className="wearable-metric">
                    <label style={{ fontWeight: 'bold', color: '#374151' }}>Verbindungsstatus:</label>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: connectionInfo.color,
                        marginRight: '8px'
                      }}></div>
                      <span style={{ color: connectionInfo.color }}>
                        {connectionInfo.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                    onClick={() => alert('Daten synchronisiert!')}
                  >
                    Sofort synchronisieren
                  </button>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => alert('Wearable-Einstellungen würden hier geöffnet werden')}
                  >
                    Einstellungen
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {!selectedDriver && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Wählen Sie einen Fahrer aus, um die Wearable-Daten anzuzeigen.
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
        {drivers.length} Fahrer verfügbar • {Object.keys(wearableData).length} Wearables registriert
      </div>
    </div>
  );
};

export default WearablesManagement;

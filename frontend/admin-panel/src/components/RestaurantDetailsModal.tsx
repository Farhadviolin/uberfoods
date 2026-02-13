import { useState, useEffect, memo } from 'react';
import { Modal } from './Modal';
import api from '../utils/api';
import { config } from '../config';
import { format } from 'date-fns';
import { useToast } from '../contexts/ToastContext';
import { openRestaurantDashboard, openRestaurantOrder } from '../utils/navigation';
import { Restaurant, RestaurantStats, BusinessHours } from '../types/restaurant';
import './RestaurantDetailsModal.css';

interface RestaurantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string | null;
}

function RestaurantDetailsModalInner({
  isOpen,
  onClose,
  restaurantId,
}: RestaurantDetailsModalProps) {
  const { showToast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'hours' | 'stats' | 'dishes'>('info');
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { open: '09:00', close: '22:00', isClosed: false },
    tuesday: { open: '09:00', close: '22:00', isClosed: false },
    wednesday: { open: '09:00', close: '22:00', isClosed: false },
    thursday: { open: '09:00', close: '22:00', isClosed: false },
    friday: { open: '09:00', close: '22:00', isClosed: false },
    saturday: { open: '10:00', close: '23:00', isClosed: false },
    sunday: { open: '10:00', close: '22:00', isClosed: false },
  });
  const [editingHours, setEditingHours] = useState(false);
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string }>>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [savingHours, setSavingHours] = useState(false);
  const [savingHolidays, setSavingHolidays] = useState(false);

  useEffect(() => {
    if (isOpen && restaurantId) {
      fetchRestaurantDetails();
    } else {
      setRestaurant(null);
      setStats(null);
    }
  }, [isOpen, restaurantId]);

  const fetchRestaurantDetails = async () => {
    if (!restaurantId) return;

    try {
      setLoading(true);
      setError(null);

      const [restaurantRes, statsRes, hoursRes, holidaysRes] = await Promise.all([
        api.get(`/admin/restaurants/${restaurantId}`),
        api.get(`/admin/statistics/restaurant/${restaurantId}`).catch(() => ({ data: null })),
        api.get(`/admin/settings/restaurant/${restaurantId}/hours`).catch(() => ({ data: null })),
        api.get(`/admin/settings/restaurant/${restaurantId}/holidays`).catch(() => ({ data: null })),
      ]);

      setRestaurant(restaurantRes.data);
      setStats(statsRes.data);
      
      // Load business hours
      if (hoursRes?.data?.value) {
        try {
          setBusinessHours(JSON.parse(hoursRes.data.value));
        } catch {
          // Keep default hours
        }
      }
      
      // Load holidays
      if (holidaysRes?.data?.value) {
        try {
          setHolidays(JSON.parse(holidaysRes.data.value));
        } catch {
          // Keep empty array
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Laden der Restaurant-Details');
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessHours = async () => {
    if (!restaurantId) return;
    try {
      setSavingHours(true);
      await api.put(`/admin/settings/restaurant/${restaurantId}/hours`, businessHours);
      showToast('Öffnungszeiten erfolgreich gespeichert!', 'success');
      setEditingHours(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Fehler beim Speichern der Öffnungszeiten';
      showToast(errorMessage, 'error');
    } finally {
      setSavingHours(false);
    }
  };

  const saveHolidays = async () => {
    if (!restaurantId) return;
    try {
      setSavingHolidays(true);
      await api.put(`/settings/restaurant/${restaurantId}/holidays`, { holidays });
      showToast('Feiertage erfolgreich gespeichert!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Fehler beim Speichern der Feiertage';
      showToast(errorMessage, 'error');
    } finally {
      setSavingHolidays(false);
    }
  };



  const isRestaurantOpen = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Check holidays
    if (holidays.some(h => h.date === todayStr)) return false;
    
    const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const hours = businessHours[day];
    
    if (hours.isClosed) return false;
    
    const [openHour, openMin] = hours.open.split(':').map(Number);
    const [closeHour, closeMin] = hours.close.split(':').map(Number);
    const nowTime = now.getHours() * 60 + now.getMinutes();
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return nowTime >= openTime && nowTime <= closeTime;
  };

  const addHoliday = () => {
    if (!newHoliday.trim()) {
      showToast('Bitte geben Sie ein gültiges Datum ein', 'error');
      return;
    }

    const holidayExists = holidays.some(h => h.date === newHoliday);
    if (holidayExists) {
      showToast('Dieses Datum ist bereits als Feiertag eingetragen', 'error');
      return;
    }

    const newHolidayObj = { date: newHoliday, name: 'Feiertag' };
    const updatedHolidays = [...holidays, newHolidayObj].sort((a, b) => a.date.localeCompare(b.date));

    setHolidays(updatedHolidays);
    setNewHoliday('');
    saveHolidays();
  };

  const removeHoliday = (index: number) => {
    const updatedHolidays = holidays.filter((_, i) => i !== index);
    setHolidays(updatedHolidays);
    saveHolidays();
  };

  if (!isOpen || !restaurantId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={restaurant?.name || 'Restaurant Details'}
      size="large"
    >
      {loading ? (
        <div className="loading">Lädt Restaurant-Details...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : restaurant ? (
        <div className="restaurant-details">
          {/* Header with Image */}
          <div className="restaurant-details-header">
            {restaurant.imageUrl && (
              <img
                src={`${config.apiUrl}${restaurant.imageUrl}`}
                alt={restaurant.name}
                className="restaurant-details-image"
              />
            )}
            <div className="restaurant-details-status">
              <span className={`status-badge ${restaurant.isActive ? 'active' : 'inactive'}`}>
                {restaurant.isActive ? 'Aktiv' : 'Inaktiv'}
              </span>
              <span style={{
                marginLeft: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: isRestaurantOpen() ? '#d4edda' : '#f8d7da',
                color: isRestaurantOpen() ? '#155724' : '#721c24',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {isRestaurantOpen() ? '🟢 Jetzt geöffnet' : '🔴 Jetzt geschlossen'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E4E6EB' }}>
            <button
              onClick={() => setActiveTab('info')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'info' ? '2px solid #1877F2' : '2px solid transparent',
                color: activeTab === 'info' ? '#1877F2' : '#65676B',
                fontWeight: activeTab === 'info' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Informationen
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'hours' ? '2px solid #1877F2' : '2px solid transparent',
                color: activeTab === 'hours' ? '#1877F2' : '#65676B',
                fontWeight: activeTab === 'hours' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Öffnungszeiten
            </button>
            {stats && (
              <button
                onClick={() => setActiveTab('stats')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === 'stats' ? '2px solid #1877F2' : '2px solid transparent',
                  color: activeTab === 'stats' ? '#1877F2' : '#65676B',
                  fontWeight: activeTab === 'stats' ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Statistiken
              </button>
            )}
            {restaurant.dishes && restaurant.dishes.length > 0 && (
              <button
                onClick={() => setActiveTab('dishes')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === 'dishes' ? '2px solid #1877F2' : '2px solid transparent',
                  color: activeTab === 'dishes' ? '#1877F2' : '#65676B',
                  fontWeight: activeTab === 'dishes' ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Gerichte ({restaurant.dishes.length})
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div className="restaurant-details-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Informationen</h3>
                <button
                  onClick={() => openRestaurantDashboard(restaurantId!)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1877F2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title="Restaurant-Dashboard in Restaurant-Web öffnen"
                >
                  <span>🚀</span>
                  Restaurant-Dashboard öffnen
                </button>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Beschreibung:</strong>
                  <p>{restaurant.description || 'Keine Beschreibung'}</p>
                </div>
                <div className="info-item">
                  <strong>Adresse:</strong>
                  <p>{restaurant.address}</p>
                </div>
                <div className="info-item">
                  <strong>Telefon:</strong>
                  <p>{restaurant.phone}</p>
                </div>
                <div className="info-item">
                  <strong>E-Mail:</strong>
                  <p>{restaurant.email}</p>
                </div>
                <div className="info-item">
                  <strong>Erstellt am:</strong>
                  <p>{format(new Date(restaurant.createdAt), 'dd.MM.yyyy')}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="restaurant-details-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Öffnungszeiten</h3>
                {!editingHours && (
                  <button
                    onClick={() => setEditingHours(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1877F2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Bearbeiten
                  </button>
                )}
              </div>

              {!editingHours ? (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#F0F2F5', 
                  borderRadius: '8px' 
                }}>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {Object.entries(businessHours).map(([day, hours]) => (
                      <div key={day} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '14px',
                        padding: '8px 0'
                      }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>
                          {day === 'monday' ? 'Montag' : 
                           day === 'tuesday' ? 'Dienstag' :
                           day === 'wednesday' ? 'Mittwoch' :
                           day === 'thursday' ? 'Donnerstag' :
                           day === 'friday' ? 'Freitag' :
                           day === 'saturday' ? 'Samstag' : 'Sonntag'}
                        </span>
                        <span>
                          {hours.isClosed ? 'Geschlossen' : `${hours.open} - ${hours.close}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                    {Object.entries(businessHours).map(([day, hours]) => (
                      <div key={day} style={{ 
                        padding: '16px', 
                        border: '1px solid #E4E6EB', 
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <label style={{ fontWeight: '600', textTransform: 'capitalize', fontSize: '15px' }}>
                            {day === 'monday' ? 'Montag' : 
                             day === 'tuesday' ? 'Dienstag' :
                             day === 'wednesday' ? 'Mittwoch' :
                             day === 'thursday' ? 'Donnerstag' :
                             day === 'friday' ? 'Freitag' :
                             day === 'saturday' ? 'Samstag' : 'Sonntag'}
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={!hours.isClosed}
                              onChange={(e) => setBusinessHours(prev => ({
                                ...prev,
                                [day]: { ...prev[day], isClosed: !e.target.checked }
                              }))}
                            />
                            Geöffnet
                          </label>
                        </div>
                        {!hours.isClosed && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>Öffnet</label>
                              <input
                                type="time"
                                value={hours.open}
                                onChange={(e) => setBusinessHours(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], open: e.target.value }
                                }))}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #CCD0D5',
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>Schließt</label>
                              <input
                                type="time"
                                value={hours.close}
                                onChange={(e) => setBusinessHours(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], close: e.target.value }
                                }))}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #CCD0D5',
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Holidays */}
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E4E6EB' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Feiertage / Schließtage</h3>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <input
                        type="date"
                        value={newHoliday}
                        onChange={(e) => setNewHoliday(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #CCD0D5',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                      <button
                        onClick={addHoliday}
                        disabled={!newHoliday}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#1877F2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: newHoliday ? 'pointer' : 'not-allowed',
                          fontSize: '14px',
                          fontWeight: '600',
                          opacity: newHoliday ? 1 : 0.5
                        }}
                      >
                        Hinzufügen
                      </button>
                    </div>
                    {holidays.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {holidays.map((holiday, index) => (
                          <div key={holiday.date} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            backgroundColor: '#F0F2F5',
                            borderRadius: '6px'
                          }}>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                {new Date(holiday.date).toLocaleDateString('de-DE', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                {holiday.name}
                              </div>
                            </div>
                            <button
                              onClick={() => removeHoliday(index)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Entfernen
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#65676B', fontSize: '14px', fontStyle: 'italic' }}>
                        Keine Feiertage eingetragen
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                      onClick={saveBusinessHours}
                      disabled={savingHours}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#1877F2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingHours ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        opacity: savingHours ? 0.6 : 1
                      }}
                    >
                      {savingHours ? 'Wird gespeichert...' : 'Speichern'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingHours(false);
                        fetchRestaurantDetails();
                      }}
                      disabled={savingHours}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#E4E6EB',
                        color: '#1C1E21',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingHours ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            stats ? (
            <div className="restaurant-details-section">
              <h3>Statistiken</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Gesamt Bestellungen</div>
                  <div className="stat-value">{stats.totalOrders}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Gesamtumsatz</div>
                  <div className="stat-value">{stats.totalRevenue.toFixed(2)} €</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Ø Bestellwert</div>
                  <div className="stat-value">{stats.averageOrderValue.toFixed(2)} €</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Gerichte</div>
                  <div className="stat-value">
                    {stats.activeDishes} / {stats.totalDishes} aktiv
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="restaurant-details-section">
                <h3>Statistiken</h3>
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: '#F8F9FA',
                  borderRadius: '8px',
                  border: '1px solid #E9ECEF'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                    opacity: 0.5
                  }}>
                    📊
                  </div>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    color: '#6C757D',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    Statistiken nicht verfügbar
                  </h4>
                  <p style={{
                    margin: '0',
                    color: '#6C757D',
                    fontSize: '14px'
                  }}>
                    Die Restaurant-Statistiken konnten nicht geladen werden.
                    <br />
                    Dies kann an temporären Verbindungsproblemen liegen.
                  </p>
                </div>
              </div>
            )
          )}

          {activeTab === 'dishes' && restaurant.dishes && restaurant.dishes.length > 0 && (
            <div className="restaurant-details-section">
              <h3>Gerichte ({restaurant.dishes.length})</h3>
              <div className="dishes-grid">
                {restaurant.dishes.map((dish) => (
                  <div key={dish.id} className="dish-card">
                    {dish.imageUrl && (
                      <img
                        src={`${config.apiUrl}${dish.imageUrl}`}
                        alt={dish.name}
                        className="dish-thumbnail"
                      />
                    )}
                    <div className="dish-info">
                      <div className="dish-name">{dish.name}</div>
                      <div className="dish-details">
                        <span>{dish.category}</span>
                        <span className="dish-price">{dish.price.toFixed(2)} €</span>
                      </div>
                      <span className={`dish-status ${dish.isAvailable ? 'available' : 'unavailable'}`}>
                        {dish.isAvailable ? 'Verfügbar' : 'Nicht verfügbar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

export const RestaurantDetailsModal = memo(RestaurantDetailsModalInner);


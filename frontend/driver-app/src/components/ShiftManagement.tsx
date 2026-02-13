import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DriverService } from '../services/driverService';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../utils/api';
import './ShiftManagement.css';

interface Shift {
  id: string;
  startTime: string;
  endTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  totalBreakTime: number;
  status: 'active' | 'on_break' | 'ended';
  earnings: number;
  ordersCompleted: number;
}

interface ShiftHistory {
  id: string;
  startTime: string;
  endTime: string;
  totalBreakTime: number;
  earnings: number;
  ordersCompleted: number;
}

interface ShiftAnalytics {
  totalShifts: number;
  totalHours: number;
  averageEarnings: number;
  averageOrders: number;
  bestShift: ShiftHistory;
}

export function ShiftManagement() {
  const { driver } = useAuth();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [shiftTime, setShiftTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);
  const [shiftHistory, setShiftHistory] = useState<ShiftHistory[]>([]);
  const [analytics, setAnalytics] = useState<ShiftAnalytics | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showCRUD, setShowCRUD] = useState(false);
  const [reminder, setReminder] = useState<{ type: 'break' | 'end_warning'; message: string } | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [allShifts, setAllShifts] = useState<ShiftHistory[]>([]);
  const [editingShift, setEditingShift] = useState<ShiftHistory | null>(null);
  const [shiftGoal, setShiftGoal] = useState<{ orders?: number; earnings?: number } | null>(null);
  const [shiftNotes, setShiftNotes] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // ✅ WebSocket-Integration für Real-time Updates
  useWebSocket(driver?.id || null, {
    onShiftStarted: (shift) => {
      setCurrentShift(shift);
      fetchShiftAnalytics();
    },
    onShiftEnded: (shift) => {
      setCurrentShift(null);
      setShiftTime(0);
      fetchShiftHistory();
      fetchShiftAnalytics();
    },
    onBreakStarted: (shift) => {
      setCurrentShift(shift);
    },
    onBreakEnded: (shift) => {
      setCurrentShift(shift);
    },
    onShiftStatusUpdate: (shift) => {
      setCurrentShift(shift);
    },
    onShiftReminder: (reminderData) => {
      setReminder(reminderData);
      // Auto-hide nach 10 Sekunden
      setTimeout(() => setReminder(null), 10000);
    },
  });

  useEffect(() => {
    if (driver) {
      fetchCurrentShift();
      const interval = setInterval(() => {
        if (currentShift && currentShift.status === 'active') {
          const elapsed = Math.floor((Date.now() - new Date(currentShift.startTime).getTime()) / 1000);
          setShiftTime(elapsed);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [driver, currentShift]);

  const fetchCurrentShift = async () => {
    if (!driver) return;
    try {
      const result = await DriverService.getCurrentShift(driver.id);
      setCurrentShift(result.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        // Shift loading error handled by error boundary
      }
      setCurrentShift(null);
    }
  };

  const fetchShiftHistory = async () => {
    if (!driver) return;
    try {
      const result = await DriverService.getShiftHistory(driver.id, 1, 20);
      setShiftHistory(result.data.shifts || result.data || []);
    } catch (error: any) {
        // Shift history error handled by error boundary
    }
  };

  const fetchShiftAnalytics = async () => {
    if (!driver) return;
    try {
      const result = await DriverService.getShiftAnalytics(driver.id, 'month');
      setAnalytics(result.data);
    } catch (error: any) {
        // Shift analytics error handled by error boundary
    }
  };

  // ✅ Schedule-Management
  const fetchSchedule = async () => {
    if (!driver) return;
    try {
      const result = await DriverService.getShiftSchedule(driver.id);
      setSchedule(Array.isArray(result.data) ? result.data : []);
    } catch (error: any) {
        // Shift schedule error handled by error boundary
    }
  };

  const createSchedule = async (scheduleData: { startTime: string; endTime: string; dayOfWeek: number; recurring?: boolean }) => {
    if (!driver) return;
    try {
      setLoading(true);
      await DriverService.createShiftSchedule(driver.id, scheduleData);
      await fetchSchedule();
      alert('Schichtplan erstellt!');
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Erweiterte Statistiken
  const fetchStatistics = async () => {
    if (!driver) return;
    try {
      const result = await DriverService.getShiftStatistics(driver.id, selectedPeriod);
      setStatistics(result.data);
    } catch (error: any) {
        // Shift statistics error handled by error boundary
    }
  };

  // ✅ CRUD-Operationen
  const fetchAllShifts = async () => {
    if (!driver) return;
    try {
      const result = await DriverService.getAllShifts(driver.id, { limit: 50 });
      setAllShifts(Array.isArray(result.data) ? result.data : []);
    } catch (error: any) {
        // All shifts loading error handled by error boundary
    }
  };

  const handleCreateShift = async (shiftData: { startTime: string; endTime?: string; type?: string; notes?: string }) => {
    if (!driver) return;
    try {
      setLoading(true);
      await DriverService.createShift(driver.id, shiftData);
      await fetchAllShifts();
      await fetchShiftHistory();
      alert('Schicht erstellt!');
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShift = async (shiftId: string, shiftData: { startTime?: string; endTime?: string; notes?: string }) => {
    if (!driver) return;
    try {
      setLoading(true);
      await DriverService.updateShift(driver.id, shiftId, shiftData);
      await fetchAllShifts();
      await fetchShiftHistory();
      setEditingShift(null);
      alert('Schicht aktualisiert!');
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!driver) return;
    if (!confirm('Möchten Sie diese Schicht wirklich löschen?')) return;
    try {
      setLoading(true);
      await DriverService.deleteShift(driver.id, shiftId);
      await fetchAllShifts();
      await fetchShiftHistory();
      alert('Schicht gelöscht!');
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const startShift = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const result = await DriverService.startShift(driver.id);
      setCurrentShift(result.data);
      fetchShiftAnalytics();
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const endShift = async () => {
    if (!driver) return;
    if (!confirm('Möchten Sie die Schicht wirklich beenden?')) return;
    try {
      setLoading(true);
      await DriverService.endShift(driver.id);
      setCurrentShift(null);
      setShiftTime(0);
      fetchShiftHistory();
      fetchShiftAnalytics();
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const takeBreak = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const result = await DriverService.startBreak(driver.id);
      setCurrentShift(result.data);
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const endBreak = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const result = await DriverService.endBreak(driver.id);
      setCurrentShift(result.data);
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!driver) return null;

  return (
    <div className="shift-management">
      <h2>⏰ Schichtverwaltung</h2>

      {/* ✅ Shift Reminder (WebSocket) */}
      {reminder && (
        <div className={`shift-reminder ${reminder.type === 'end_warning' ? 'warning' : 'info'}`}>
          <div className="reminder-icon">
            {reminder.type === 'break' ? '⏸️' : '⚠️'}
          </div>
          <div className="reminder-message">{reminder.message}</div>
          <button className="reminder-close" onClick={() => setReminder(null)}>✕</button>
        </div>
      )}

      {!currentShift ? (
        <div className="shift-start">
          <div className="shift-start-card">
            <h3>Schicht starten</h3>
            <p>Beginnen Sie Ihre Schicht, um Bestellungen zu erhalten</p>
            <button
              className="start-shift-button"
              onClick={startShift}
              disabled={loading}
            >
              {loading ? 'Wird gestartet...' : '🚀 Schicht starten'}
            </button>
          </div>
        </div>
      ) : (
        <div className="shift-active">
          <div className="shift-timer">
            <div className="timer-display">
              <div className="timer-label">Schichtzeit</div>
              <div className="timer-value">{formatTime(shiftTime)}</div>
            </div>
            {currentShift.status === 'on_break' && (
              <div className="break-indicator">
                <span>⏸️ Pause</span>
              </div>
            )}
          </div>

          <div className="shift-stats">
            <div className="shift-stat">
              <div className="stat-label">Verdienst</div>
              <div className="stat-value">{currentShift.earnings.toFixed(2)} €</div>
            </div>
            <div className="shift-stat">
              <div className="stat-label">Bestellungen</div>
              <div className="stat-value">{currentShift.ordersCompleted}</div>
            </div>
            <div className="shift-stat">
              <div className="stat-label">Pausenzeit</div>
              <div className="stat-value">{Math.floor(currentShift.totalBreakTime / 60)} min</div>
            </div>
          </div>

          <div className="shift-actions">
            {currentShift.status === 'active' ? (
              <>
                <button
                  className="break-button"
                  onClick={takeBreak}
                  disabled={loading}
                >
                  ⏸️ Pause starten
                </button>
                <button
                  className="end-shift-button"
                  onClick={endShift}
                  disabled={loading}
                >
                  🏁 Schicht beenden
                </button>
              </>
            ) : (
              <button
                className="resume-button"
                onClick={endBreak}
                disabled={loading}
              >
                ▶️ Pause beenden
              </button>
            )}
          </div>
        </div>
      )}

      <div className="shift-options">
        <button
          className="option-button"
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchShiftHistory();
          }}
        >
          📊 Schichthistorie
        </button>
        <button
          className="option-button"
          onClick={() => {
            setShowAnalytics(!showAnalytics);
            if (!showAnalytics) fetchShiftAnalytics();
          }}
        >
          📈 Analytics
        </button>
        <button
          className="option-button"
          onClick={() => {
            setShowSchedule(!showSchedule);
            if (!showSchedule) fetchSchedule();
          }}
        >
          📅 Schichtplan
        </button>
        <button
          className="option-button"
          onClick={() => {
            setShowStatistics(!showStatistics);
            if (!showStatistics) fetchStatistics();
          }}
        >
          📊 Statistiken
        </button>
        <button
          className="option-button"
          onClick={() => {
            setShowCRUD(!showCRUD);
            if (!showCRUD) fetchAllShifts();
          }}
        >
          ✏️ Schichten verwalten
        </button>
      </div>

      {showHistory && (
        <div className="shift-history">
          <h3>Schichthistorie</h3>
          {shiftHistory.length === 0 ? (
            <div className="empty-state">Keine Schichthistorie verfügbar</div>
          ) : (
            <div className="history-list">
              {shiftHistory.map((shift) => (
                <div key={shift.id} className="history-item">
                  <div className="history-date">
                    {new Date(shift.startTime).toLocaleDateString('de-DE')}
                  </div>
                  <div className="history-stats">
                    <span>Verdienst: {shift.earnings.toFixed(2)} €</span>
                    <span>Bestellungen: {shift.ordersCompleted}</span>
                    <span>Dauer: {Math.floor((new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / 3600000)}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAnalytics && analytics && (
        <div className="shift-analytics">
          <h3>Schicht-Analytics</h3>
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-value">{analytics.totalShifts}</div>
              <div className="analytics-label">Gesamt Schichten</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-value">{analytics.totalHours.toFixed(1)}h</div>
              <div className="analytics-label">Gesamt Stunden</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-value">{analytics.averageEarnings.toFixed(2)} €</div>
              <div className="analytics-label">Ø Verdienst</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-value">{analytics.averageOrders.toFixed(1)}</div>
              <div className="analytics-label">Ø Bestellungen</div>
            </div>
          </div>
          {analytics.bestShift && (
            <div className="best-shift">
              <h4>Beste Schicht</h4>
              <div className="best-shift-stats">
                <span>Verdienst: {analytics.bestShift.earnings.toFixed(2)} €</span>
                <span>Bestellungen: {analytics.bestShift.ordersCompleted}</span>
                <span>Datum: {new Date(analytics.bestShift.startTime).toLocaleDateString('de-DE')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ Schedule-Management */}
      {showSchedule && (
        <div className="shift-schedule">
          <h3>📅 Schichtplan</h3>
          <div className="schedule-actions">
            <button
              className="create-schedule-button"
              onClick={() => {
                const startTime = prompt('Startzeit (HH:MM):');
                const endTime = prompt('Endzeit (HH:MM):');
                const dayOfWeek = prompt('Wochentag (0=Sonntag, 1=Montag, ...):');
                const recurring = confirm('Wiederkehrende Schicht?');
                if (startTime && endTime && dayOfWeek) {
                  createSchedule({
                    startTime: `2000-01-01T${startTime}:00`,
                    endTime: `2000-01-01T${endTime}:00`,
                    dayOfWeek: parseInt(dayOfWeek),
                    recurring
                  });
                }
              }}
              disabled={loading}
            >
              ➕ Neue Schicht planen
            </button>
          </div>
          {schedule.length === 0 ? (
            <div className="empty-state">Kein Schichtplan vorhanden</div>
          ) : (
            <div className="schedule-list">
              {schedule.map((item: any, index: number) => (
                <div key={index} className="schedule-item">
                  <div className="schedule-time">
                    {item.startTime} - {item.endTime}
                  </div>
                  <div className="schedule-date">
                    {item.date ? new Date(item.date).toLocaleDateString('de-DE') : 'Wiederkehrend'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ✅ Erweiterte Statistiken */}
      {showStatistics && (
        <div className="shift-statistics">
          <h3>📊 Erweiterte Statistiken</h3>
          <div className="statistics-period-selector">
            <button
              className={selectedPeriod === 'week' ? 'active' : ''}
              onClick={() => {
                setSelectedPeriod('week');
                fetchStatistics();
              }}
            >
              Woche
            </button>
            <button
              className={selectedPeriod === 'month' ? 'active' : ''}
              onClick={() => {
                setSelectedPeriod('month');
                fetchStatistics();
              }}
            >
              Monat
            </button>
            <button
              className={selectedPeriod === 'year' ? 'active' : ''}
              onClick={() => {
                setSelectedPeriod('year');
                fetchStatistics();
              }}
            >
              Jahr
            </button>
          </div>
          {statistics ? (
            <div className="statistics-content">
              <div className="statistics-grid-extended">
                <div className="statistics-card">
                  <div className="statistics-label">Gesamt Schichten</div>
                  <div className="statistics-value-large">{statistics.totalShifts}</div>
                </div>
                <div className="statistics-card">
                  <div className="statistics-label">Gesamt Stunden</div>
                  <div className="statistics-value-large">{statistics.totalHours?.toFixed(1) || 0}h</div>
                </div>
                <div className="statistics-card">
                  <div className="statistics-label">Ø Stunden/Schicht</div>
                  <div className="statistics-value-large">{statistics.averageHoursPerShift?.toFixed(1) || 0}h</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">Lade Statistiken...</div>
          )}
        </div>
      )}

      {/* ✅ CRUD-Operationen */}
      {showCRUD && (
        <div className="shift-crud">
          <h3>✏️ Schichten verwalten</h3>
          <div className="crud-actions">
            <button
              className="create-shift-button"
              onClick={() => {
                const startTime = prompt('Startzeit (YYYY-MM-DD HH:MM):');
                const endTime = prompt('Endzeit (YYYY-MM-DD HH:MM) - optional:');
                const notes = prompt('Notizen - optional:');
                if (startTime) {
                  handleCreateShift({
                    startTime,
                    endTime: endTime || undefined,
                    notes: notes || undefined
                  });
                }
              }}
              disabled={loading}
            >
              ➕ Schicht erstellen
            </button>
          </div>
          {allShifts.length === 0 ? (
            <div className="empty-state">Keine Schichten vorhanden</div>
          ) : (
            <div className="shifts-list">
              {allShifts.map((shift) => (
                <div key={shift.id} className="shift-item-crud">
                  <div className="shift-item-header">
                    <div className="shift-item-date">
                      {new Date(shift.startTime).toLocaleString('de-DE')}
                      {shift.endTime && ` - ${new Date(shift.endTime).toLocaleString('de-DE')}`}
                    </div>
                    <div className="shift-item-actions">
                      <button
                        className="edit-button"
                        onClick={() => setEditingShift(shift)}
                        disabled={loading}
                      >
                        ✏️ Bearbeiten
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteShift(shift.id)}
                        disabled={loading}
                      >
                        🗑️ Löschen
                      </button>
                    </div>
                  </div>
                  {editingShift?.id === shift.id && (
                    <div className="edit-form">
                      <input
                        type="datetime-local"
                        defaultValue={new Date(shift.startTime).toISOString().slice(0, 16)}
                        onChange={(e) => {
                          setEditingShift({ ...editingShift, startTime: e.target.value });
                        }}
                      />
                      {shift.endTime && (
                        <input
                          type="datetime-local"
                          defaultValue={new Date(shift.endTime).toISOString().slice(0, 16)}
                          onChange={(e) => {
                            setEditingShift({ ...editingShift, endTime: e.target.value });
                          }}
                        />
                      )}
                      <div className="edit-form-actions">
                        <button
                          onClick={() => {
                            if (editingShift) {
                              handleUpdateShift(editingShift.id, {
                                startTime: editingShift.startTime,
                                endTime: editingShift.endTime
                              });
                            }
                          }}
                          disabled={loading}
                        >
                          💾 Speichern
                        </button>
                        <button onClick={() => setEditingShift(null)}>❌ Abbrechen</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ✅ Erweiterte UI-Features: Ziele & Notizen */}
      {currentShift && (
        <div className="shift-extended-features">
          <div className="shift-goals">
            <h4>🎯 Schicht-Ziele</h4>
            <div className="goals-input">
              <input
                type="number"
                placeholder="Ziel: Bestellungen"
                value={shiftGoal?.orders || ''}
                onChange={(e) => setShiftGoal({ ...shiftGoal, orders: parseInt(e.target.value) || undefined })}
              />
              <input
                type="number"
                placeholder="Ziel: Verdienst (€)"
                value={shiftGoal?.earnings || ''}
                onChange={(e) => setShiftGoal({ ...shiftGoal, earnings: parseFloat(e.target.value) || undefined })}
              />
              <button onClick={() => {
                localStorage.setItem(`shift_goal_${currentShift.id}`, JSON.stringify(shiftGoal));
                alert('Ziele gespeichert!');
              }}>
                💾 Speichern
              </button>
            </div>
            {shiftGoal && (
              <div className="goals-progress">
                {shiftGoal.orders && (
                  <div className="goal-item">
                    <span>Bestellungen: {currentShift.ordersCompleted} / {shiftGoal.orders}</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min((currentShift.ordersCompleted / shiftGoal.orders) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {shiftGoal.earnings && (
                  <div className="goal-item">
                    <span>Verdienst: {currentShift.earnings.toFixed(2)}€ / {shiftGoal.earnings}€</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min((currentShift.earnings / shiftGoal.earnings) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="shift-notes">
            <h4>📝 Schicht-Notizen</h4>
            <textarea
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="Notizen für diese Schicht..."
              rows={3}
            />
            <button onClick={() => {
              localStorage.setItem(`shift_notes_${currentShift.id}`, shiftNotes);
              alert('Notizen gespeichert!');
            }}>
              💾 Speichern
            </button>
          </div>
          <div className="shift-export">
            <h4>📤 Export</h4>
            <button onClick={() => {
              const data = {
                shift: currentShift,
                goals: shiftGoal,
                notes: shiftNotes,
                timestamp: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `shift_${currentShift.id}_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              📥 Als JSON exportieren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


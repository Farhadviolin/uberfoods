import { useState, useEffect } from 'react';
import { offlineService } from '../services/offline';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import './OfflineIndicator.css';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);
  const [conflicts, setConflicts] = useState(0);
  const [conflictList, setConflictList] = useState<{ url: string; method: string; status: number; timestamp: number }[]>([]);
  const [isConflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictFilter, setConflictFilter] = useState<'all' | '409' | '412' | 'other'>('all');
  const [conflictPage, setConflictPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    // Initial Check
    setIsOffline(offlineService.isOffline());
    setPendingCount(offlineService.getPendingCount());
    const stats = offlineService.getStats();
    setShowClearButton(stats.old > 0 || stats.total > 100);
    setConflicts(offlineService.getConflicts().length);
    setConflictList(offlineService.getConflicts());

    // Load pending requests from storage
    offlineService.loadPendingRequests();
    
    // Filtere alte Requests beim Start
    const removed = offlineService.clearOldRequests();
    if (removed > 0) {
      console.log(`🗑️ ${removed} alte Requests beim Start entfernt`);
    }
    setPendingCount(offlineService.getPendingCount());

    // Progress Callback
    const unsubscribe = offlineService.onSyncProgress((progress, total) => {
      setSyncProgress(progress);
      setSyncTotal(total);
      setIsSyncing(progress < total && total > 0);
      if (progress === total && total > 0) {
        // Synchronisation abgeschlossen
        setTimeout(() => {
          setPendingCount(offlineService.getPendingCount());
          const newStats = offlineService.getStats();
          setShowClearButton(newStats.old > 0 || newStats.total > 100);
      setConflicts(offlineService.getConflicts().length);
      setConflictList(offlineService.getConflicts());
        }, 1000);
      }
    });

    // Listen to online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      offlineService.syncPendingRequests().then(() => {
        setPendingCount(offlineService.getPendingCount());
        const stats = offlineService.getStats();
        setShowClearButton(stats.old > 0 || stats.total > 100);
      setConflicts(offlineService.getConflicts().length);
      setConflictList(offlineService.getConflicts());
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count periodically
    const interval = setInterval(() => {
      const count = offlineService.getPendingCount();
      setPendingCount(count);
      const stats = offlineService.getStats();
      setShowClearButton(stats.old > 0 || stats.total > 100);
      setConflicts(offlineService.getConflicts().length);
      
      // Auto-Sync wenn online und nicht bereits syncing
      if (!offlineService.isOffline() && count > 0 && !isSyncing) {
        offlineService.syncPendingRequests();
      }
    }, 10000); // Alle 10 Sekunden prüfen

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      unsubscribe();
    };
  }, [isSyncing]);

  const handleClearOld = () => {
    const removed = offlineService.clearOldRequests();
    setPendingCount(offlineService.getPendingCount());
    const stats = offlineService.getStats();
    setShowClearButton(stats.old > 0 || stats.total > 100);
    alert(t('offline.clearedOld', { count: removed }));
  };

  const handleClearAll = () => {
    if (confirm(t('offline.confirmClearAll'))) {
      offlineService.clearAllRequests();
      setPendingCount(0);
      setShowClearButton(false);
      alert(t('offline.clearedAll'));
    }
  };

  const handleShowConflicts = () => {
    const list = offlineService.getConflicts();
    setConflictList(list);
    setConflictModalOpen(true);
  };

  const handleClearConflicts = () => {
    offlineService.clearConflicts();
    setConflicts(0);
    setConflictList([]);
    alert(t('offline.conflicts.cleared'));
  };

  if (!isOffline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const progressPercent = syncTotal > 0 ? Math.round((syncProgress / syncTotal) * 100) : 0;
  const filteredConflicts = conflictList.filter((c) => {
    if (conflictFilter === 'all') return true;
    if (conflictFilter === '409') return c.status === 409;
    if (conflictFilter === '412') return c.status === 412;
    return c.status !== 409 && c.status !== 412;
  });
  const totalPages = Math.max(1, Math.ceil(filteredConflicts.length / pageSize));
  const currentPage = Math.min(conflictPage, totalPages - 1);
  const pageItems = filteredConflicts.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  return (
    <div className={`offline-indicator ${isOffline ? 'offline' : isSyncing ? 'syncing' : 'idle'}`}>
      {isOffline ? (
        <>
          <span className="offline-icon">📡</span>
          <span className="offline-text">{t('offline.offlineText')}</span>
          {pendingCount > 0 && (
            <span className="offline-count">({pendingCount})</span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <span className="offline-icon">🔄</span>
          <div className="sync-progress-container">
            <span className="offline-text">
              {t('offline.syncing', { progress: syncProgress, total: syncTotal })}
            </span>
            <div className="sync-progress-bar">
              <div 
                className="sync-progress-fill" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="sync-progress-percent">{progressPercent}%</span>
          </div>
        </>
      ) : (
        <>
          <span className="offline-icon">✅</span>
          <span className="offline-text">
            {pendingCount > 0
              ? t('offline.pending', { count: pendingCount })
              : t('offline.synced')}
          </span>
          {conflicts > 0 && (
            <span className="offline-conflicts" title="Konflikte anzeigen">
              ⚠️ {conflicts}
            </span>
          )}
          {showClearButton && (
            <div className="offline-actions">
              <button 
                className="clear-old-button"
                onClick={handleClearOld}
                title={t('offline.clearOld')}
              >
                🗑️ {t('offline.clearOld')}
              </button>
              {pendingCount > 50 && (
                <button 
                  className="clear-all-button"
                  onClick={handleClearAll}
                  title={t('offline.clearAll')}
                >
                  🗑️ {t('offline.clearAll')}
                </button>
              )}
              {conflicts > 0 && (
                <>
                  <button 
                    className="clear-old-button"
                    onClick={handleShowConflicts}
                    title={t('offline.conflicts.view')}
                  >
                    📄 {t('offline.conflicts.view')}
                  </button>
                  <button 
                    className="clear-all-button"
                    onClick={handleClearConflicts}
                    title={t('offline.conflicts.clear')}
                  >
                    🧹 {t('offline.conflicts.clear')}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
      <Modal
        isOpen={isConflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        title={t('offline.conflicts.title')}
        size="medium"
      >
        <div className="conflict-controls">
          <select
            value={conflictFilter}
            onChange={(e) => {
              setConflictFilter(e.target.value as any);
              setConflictPage(0);
            }}
          >
            <option value="all">{t('offline.conflicts.filter.all')}</option>
            <option value="409">{t('offline.conflicts.filter.409')}</option>
            <option value="412">{t('offline.conflicts.filter.412')}</option>
            <option value="other">{t('offline.conflicts.filter.other')}</option>
          </select>
          <div className="conflict-pagination">
            <button
              onClick={() => setConflictPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              {t('offline.conflicts.prev')}
            </button>
            <span>{t('offline.conflicts.pagination', { page: currentPage + 1, pages: totalPages })}</span>
            <button
              onClick={() => setConflictPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              {t('offline.conflicts.next')}
            </button>
          </div>
        </div>
        {pageItems.length === 0 ? (
          <p>{t('offline.conflicts.empty')}</p>
        ) : (
          <div className="conflict-list">
            {pageItems.map((c, idx) => (
              <div key={`${c.timestamp}-${idx}`} className="conflict-item">
                <div className="conflict-row">
                  <span className="conflict-method">{c.method}</span>
                  <span className="conflict-status">HTTP {c.status}</span>
                </div>
                <div className="conflict-url">{c.url}</div>
                <div className="conflict-time">
                  {new Date(c.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}


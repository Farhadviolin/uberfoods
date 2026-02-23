import React, { useState, useMemo } from 'react';
import { useSocialPosts, useSocialStats, useSyncSocialMedia, SocialPost } from '../hooks/useSocialMedia';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export const SocialManagement: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  // Fetch real data from API
  const { data: socialPosts = [], isLoading, error } = useSocialPosts();
  const { data: stats } = useSocialStats();
  const syncMutation = useSyncSocialMedia();

  const filteredPosts = useMemo(() => {
    if (selectedPlatform === 'all') return socialPosts;
    return socialPosts.filter(post => post.platform.toLowerCase() === selectedPlatform.toLowerCase());
  }, [socialPosts, selectedPlatform]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'posted': return '#10b981'; // green
      case 'scheduled': return '#f59e0b'; // yellow
      case 'draft': return '#6b7280'; // gray
      case 'failed': return '#ef4444'; // red
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'posted': return 'Veröffentlicht';
      case 'scheduled': return 'Geplant';
      case 'draft': return 'Entwurf';
      case 'failed': return 'Fehlgeschlagen';
      default: return status;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.abs(diffMs) / (1000 * 60 * 60);

    if (diffHours < 24) {
      if (diffMs > 0) {
        return `In ${Math.round(diffHours)}h`;
      } else {
        return `Vor ${Math.round(diffHours)}h`;
      }
    } else {
      return date.toLocaleDateString('de-DE');
    }
  };

  const platforms = useMemo(() => {
    const uniquePlatforms = Array.from(new Set(socialPosts.map(p => p.platform)));
    return ['all', ...uniquePlatforms];
  }, [socialPosts]);

  const handleSyncAll = async () => {
    try {
      await syncMutation.mutateAsync(undefined);
      alert('Social Media Synchronisation erfolgreich abgeschlossen');
    } catch (error) {
      alert('Fehler bei der Synchronisation');
    }
  };

  if (error) {
    return (
      <div className="social-management">
        <h2>Social Media Verwaltung</h2>
        <div style={{ color: 'red', padding: '20px' }}>
          Fehler beim Laden der Social Media Posts: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="social-management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Social Media Verwaltung</h2>
        {stats && (
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {stats.total} Posts • {stats.totalEngagement} Engagement • {stats.recentPosts} aktuelle
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            minWidth: '150px'
          }}
        >
          <option value="all">Alle Plattformen</option>
          {platforms.slice(1).map(platform => (
            <option key={platform} value={platform}>{platform}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
          onClick={() => alert('Neuer Social Media Post würde erstellt werden')}
        >
          Neuer Post
        </button>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: syncMutation.isPending ? 0.6 : 1
          }}
          onClick={handleSyncAll}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? 'Synchronisiere...' : 'Alle synchronisieren'}
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          message={selectedPlatform === 'all'
            ? "Noch keine Social Media Posts vorhanden."
            : `Keine Posts für ${selectedPlatform} gefunden.`
          }
          icon="📱"
          action={{
            label: "Neuer Post erstellen",
            onClick: () => alert('Neuer Social Media Post würde erstellt werden')
          }}
        />
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#f9fafb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: post.platform.toLowerCase() === 'facebook' ? '#1877f2' :
                                     post.platform.toLowerCase() === 'instagram' ? '#e4405f' :
                                     post.platform.toLowerCase() === 'twitter' ? '#1da1f2' :
                                     post.platform.toLowerCase() === 'linkedin' ? '#0077b5' : '#6b7280',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {post.platform}
                  </span>
                  <span style={{
                    padding: '2px 6px',
                    backgroundColor: getStatusColor(post.status),
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}>
                    {getStatusText(post.status)}
                  </span>
                  {post.restaurant && (
                    <span style={{ fontSize: '11px', color: '#6b7280', backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>
                      {post.restaurant.name}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatDate(post.postedAt || post.scheduledAt || post.createdAt)}
                </span>
              </div>

              <p style={{ margin: '0 0 12px 0', lineHeight: '1.5' }}>
                {post.content}
              </p>

              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {post.mediaUrls.slice(0, 3).map((url, index) => (
                    <div key={index} style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px'
                    }}>
                      📷
                    </div>
                  ))}
                  {post.mediaUrls.length > 3 && (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      +{post.mediaUrls.length - 3}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    ❤️ {post.engagement} Engagement
                  </span>
                  {post.errorMessage && (
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>
                      ⚠️ {post.errorMessage}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {post.status === 'draft' && (
                    <button
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => alert('Post würde veröffentlicht werden')}
                    >
                      Veröffentlichen
                    </button>
                  )}
                  <button
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onClick={() => alert('Post würde bearbeitet werden')}
                  >
                    Bearbeiten
                  </button>
                  <button
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onClick={() => alert('Post würde gelöscht werden')}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
          {filteredPosts.length} Posts angezeigt
        </div>
      )}
    </div>
  );
};

export default SocialManagement;

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Heart, MessageCircle, Share2, Trophy } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { AxiosErrorWithResponse } from '../types';
import {
  useSocialFeed,
  useSuggestedFoodies,
  useChallenges,
  useLikePost,
  useFollowUser,
  useJoinChallenge,
  useAddComment,
  usePostComments,
  type FoodPost,
  type Comment,
} from '../hooks/useSocialFoodNetwork';
import './SocialFoodNetwork.css';

interface PostCommentsProps {
  postId: string;
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onAddComment: (postId: string) => void;
}

function PostComments({ postId, commentText, onCommentTextChange, onAddComment }: PostCommentsProps) {
  const { t } = useTranslation();
  const { data: comments = [], isLoading } = usePostComments(postId);

  const formatTimeAgo = (date: string): string => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('social.justNow');
    if (diffInMinutes < 60) return t('social.minutesAgo', { minutes: diffInMinutes });
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('social.hoursAgo', { hours: diffInHours });
    const diffInDays = Math.floor(diffInHours / 24);
    return t('social.daysAgo', { days: diffInDays });
  };

  return (
    <div className="post-comments">
      <div className="comments-list">
        {isLoading ? (
          <div style={{ padding: '1rem' }}>
            <Skeleton variant="rectangular" width="100%" height="40px" />
            <Skeleton variant="rectangular" width="100%" height="40px" />
          </div>
        ) : comments.length === 0 ? (
          <p className="comments-placeholder">{t('social.noComments')}</p>
        ) : (
          comments.map((comment: Comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-author-avatar">
                {comment.author.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author-name">{comment.author.name}</span>
                  <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
                </div>
                <p className="comment-text">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="comment-input">
        <input
          type="text"
          placeholder={t('social.writeComment')}
          value={commentText}
          onChange={(e) => onCommentTextChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onAddComment(postId);
            }
          }}
          className="comment-input-field"
        />
        <button
          onClick={() => onAddComment(postId)}
          className="comment-submit-btn"
          disabled={!commentText.trim()}
        >
          Senden
        </button>
      </div>
    </div>
  );
}

export function SocialFoodNetwork() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'feed' | 'discover' | 'challenges'>('feed');

  // API Hooks
  const { data: feed = [], isLoading: feedLoading } = useSocialFeed();
  const { data: suggestedFoodies = [], isLoading: foodiesLoading } = useSuggestedFoodies();
  const { data: challenges = [], isLoading: challengesLoading } = useChallenges();

  // Mutation Hooks
  const likeMutation = useLikePost();
  const followMutation = useFollowUser();
  const joinChallengeMutation = useJoinChallenge();
  const addCommentMutation = useAddComment();
  
  // State für Kommentare
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  const handleLike = async (postId: string) => {
    try {
      await likeMutation.mutateAsync(postId);
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || 'Fehler beim Liken', 'error');
    }
  };

  const handleFollow = async (foodieId: string) => {
    try {
      await followMutation.mutateAsync(foodieId);
      showToast(t('social.actionSuccess'), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('errors.generic'), 'error');
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await joinChallengeMutation.mutateAsync(challengeId);
      showToast(t('social.joinChallenge'), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('errors.generic'), 'error');
    }
  };

  const handleAddComment = async (postId: string) => {
    const commentText = commentTexts[postId]?.trim();
    if (!commentText) return;
    
    try {
      await addCommentMutation.mutateAsync({
        postId,
        content: commentText
      });
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      showToast(t('social.commentAdded'), 'success');
    } catch (error: unknown) {
      const axiosError = error as AxiosErrorWithResponse;
      showToast(axiosError.response?.data?.message || t('errors.generic'), 'error');
    }
  };

  const handleShare = async (post: FoodPost) => {
    const shareData = {
      title: `${post.author.name} hat ${post.dish} von ${post.restaurant} gepostet`,
      text: post.content,
      url: `${window.location.origin}/social/post/${post.id}`
    };
    
    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast('Post geteilt!', 'success');
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        showToast('Link in Zwischenablage kopiert!', 'success');
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareData.url).then(() => {
        showToast('Link in Zwischenablage kopiert!', 'success');
      }).catch(() => {
        // Fallback: Copy to clipboard
        showToast('Fehler beim Teilen', 'error');
      });
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const formatTimeAgo = (date: string): string => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('social.justNow');
    if (diffInHours < 24) return t('social.hoursAgo', { hours: diffInHours });
    const diffInDays = Math.floor(diffInHours / 24);
    return t('social.daysAgo', { days: diffInDays });
  };

  return (
    <Card variant="elevated" className="social-food-network-card">
      <div className="social-header">
        <div className="social-title">
          <Users className="social-icon" />
          <div>
            <h3>Social Food Network</h3>
            <p className="social-subtitle">Verbinde dich mit anderen Foodies</p>
          </div>
        </div>
      </div>

      <div className="social-tabs">
        <button
          className={`social-tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          Feed
        </button>
        <button
          className={`social-tab ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          Entdecken
        </button>
        <button
          className={`social-tab ${activeTab === 'challenges' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenges')}
        >
          Challenges
        </button>
      </div>

      <div className="social-content">
        {activeTab === 'feed' && (
          <div className="feed-list">
            {feedLoading ? (
              <div style={{ padding: '2rem' }}>
                <Skeleton variant="rectangular" width="100%" height="200px" />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="80%" />
              </div>
            ) : feed.length === 0 ? (
              <div className="empty-state">
                <p>Noch keine Posts im Feed</p>
              </div>
            ) : (
              feed.map((post) => (
              <div key={post.id} className="food-post">
                <div className="post-header">
                  <div className="post-author">
                    <div className="author-avatar">
                      {post.author.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="author-info">
                      <div className="author-name">{post.author.name}</div>
                      <div className="post-time">{formatTimeAgo(post.createdAt)}</div>
                    </div>
                  </div>
                  {!post.author.isFollowing && (
                    <Button variant="secondary" size="sm" onClick={() => handleFollow(post.author.id)}>
                      Folgen
                    </Button>
                  )}
                </div>

                <div className="post-content">
                  <p>{post.content}</p>
                  <div className="post-restaurant">
                    <span className="restaurant-name">{post.restaurant}</span>
                    <span className="dish-name">{post.dish}</span>
                  </div>
                </div>

                <div className="post-actions">
                  <button
                    className={`post-action-btn ${post.isLiked ? 'liked' : ''}`}
                    onClick={() => handleLike(post.id)}
                  >
                    <Heart className="action-icon" />
                    <span>{post.likes}</span>
                  </button>
                  <button 
                    className="post-action-btn"
                    onClick={() => toggleComments(post.id)}
                  >
                    <MessageCircle className="action-icon" />
                    <span>{post.comments}</span>
                  </button>
                  <button 
                    className="post-action-btn"
                    onClick={() => handleShare(post)}
                  >
                    <Share2 className="action-icon" />
                    <span>Teilen</span>
                  </button>
                </div>
                
                {expandedComments.has(post.id) && (
                  <PostComments postId={post.id} commentText={commentTexts[post.id] || ''} onCommentTextChange={(text) => setCommentTexts(prev => ({ ...prev, [post.id]: text }))} onAddComment={handleAddComment} />
                )}
              </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="discover-section">
            <h4>Empfohlene Foodies</h4>
            <div className="foodies-list">
              {foodiesLoading ? (
                <div style={{ padding: '2rem' }}>
                  <Skeleton variant="rectangular" width="100%" height="150px" />
                </div>
              ) : suggestedFoodies.length === 0 ? (
                <div className="empty-state">
                  <p>Keine empfohlenen Foodies gefunden</p>
                </div>
              ) : (
                suggestedFoodies.map((foodie) => (
                <div key={foodie.id} className="foodie-card">
                  <div className="foodie-header">
                    <div className="foodie-avatar">
                      {foodie.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="foodie-info">
                      <div className="foodie-name">{foodie.name}</div>
                      {foodie.bio && <div className="foodie-bio">{foodie.bio}</div>}
                      <div className="foodie-stats">
                        <span>{foodie.followers} Follower</span>
                        <span>•</span>
                        <span>{foodie.posts} Posts</span>
                      </div>
                    </div>
                  </div>
                  {foodie.recentOrder && (
                    <div className="foodie-recent-order">
                      <span>Letzte Bestellung: {foodie.recentOrder.dish} von {foodie.recentOrder.restaurant}</span>
                    </div>
                  )}
                  <Button
                    variant={foodie.isFollowing ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => handleFollow(foodie.id)}
                    className="follow-btn"
                  >
                    {foodie.isFollowing ? 'Gefolgt' : 'Folgen'}
                  </Button>
                </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="challenges-section">
            <h4>Aktive Challenges</h4>
            <div className="challenges-list">
              {challengesLoading ? (
                <div style={{ padding: '2rem' }}>
                  <Skeleton variant="rectangular" width="100%" height="200px" />
                </div>
              ) : challenges.length === 0 ? (
                <div className="empty-state">
                  <p>Keine aktiven Challenges</p>
                </div>
              ) : (
                challenges.map((challenge) => (
                <div key={challenge.id} className="challenge-card">
                  <div className="challenge-header">
                    <div className="challenge-icon-large">{challenge.icon}</div>
                    <div className="challenge-info">
                      <h4>{challenge.title}</h4>
                      <p>{challenge.description}</p>
                      <div className="challenge-stats">
                        <Users className="challenge-stat-icon" />
                        <span>{challenge.participants} Teilnehmer</span>
                        <span>•</span>
                        <span>Endet in {Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Tagen</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={challenge.isJoined ? 'secondary' : 'primary'}
                    onClick={() => handleJoinChallenge(challenge.id)}
                  >
                    {challenge.isJoined ? (
                      <>
                        <Trophy className="btn-icon" />
                        Teilgenommen
                      </>
                    ) : (
                      t('social.joinChallenge')
                    )}
                  </Button>
                </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}


import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRestaurants } from '../hooks/useRestaurants';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Skeleton } from '../design-system/Skeleton';
import { Search, X, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AdvancedSearch.css';

interface HighlightedTextProps {
  text: string;
  query: string;
}

function HighlightedText({ text, query }: HighlightedTextProps) {
  if (!query.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="search-highlight">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

export function AdvancedSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: restaurants, isLoading } = useRestaurants();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });

  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || !restaurants) return [];

    const query = searchQuery.toLowerCase();
    const results: Array<{
      type: 'restaurant' | 'dish';
      id: string;
      name: string;
      restaurantId?: string;
      restaurantName?: string;
      description?: string;
    }> = [];

    // Restaurant Matches
    restaurants.forEach((restaurant) => {
      if (restaurant.name?.toLowerCase().includes(query)) {
        results.push({
          type: 'restaurant',
          id: restaurant.id,
          name: restaurant.name,
          description: restaurant.description,
        });
      }

      // Dish Matches
      (restaurant as any).dishes?.forEach((dish: { id: string; name?: string }) => {
        if (dish.name?.toLowerCase().includes(query)) {
          results.push({
            type: 'dish',
            id: dish.id,
            name: dish.name,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
          });
        }
      });
    });

    return results.slice(0, 8); // Max 8 suggestions
  }, [searchQuery, restaurants]);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    // Add to recent searches
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    setShowSuggestions(false);
    // Navigate to restaurant list with search query
    navigate(`/?search=${encodeURIComponent(query)}`);
  };

  const handleSuggestionClick = (suggestion: typeof suggestions[0]) => {
    if (suggestion.type === 'restaurant') {
      navigate(`/restaurant/${suggestion.id}`);
    } else if (suggestion.restaurantId) {
      navigate(`/restaurant/${suggestion.restaurantId}`);
    }
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className="advanced-search">
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Restaurant oder Gericht suchen..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchQuery);
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            className="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className="clear-search-btn"
              aria-label={t('advancedSearch.clearSearch')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <Button onClick={() => handleSearch(searchQuery)} className="search-button">
          Suchen
        </Button>
      </div>

      {showSuggestions && (
        <Card variant="elevated" className="suggestions-dropdown">
          {isLoading ? (
            <div className="suggestions-loading">
              <Skeleton variant="text" width="100%" height="40px" />
              <Skeleton variant="text" width="80%" height="40px" />
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="suggestions-header">
                <TrendingUp size={16} />
                <span>Vorschläge</span>
              </div>
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.type}-${suggestion.id}-${index}`}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="suggestion-icon">
                      {suggestion.type === 'restaurant' ? '🍽️' : '🍕'}
                    </div>
                    <div className="suggestion-content">
                      <div className="suggestion-name">
                        <HighlightedText text={suggestion.name} query={searchQuery} />
                      </div>
                      {suggestion.type === 'dish' && suggestion.restaurantName && (
                        <div className="suggestion-meta">
                          bei <HighlightedText text={suggestion.restaurantName} query={searchQuery} />
                        </div>
                      )}
                      {suggestion.description && (
                        <div className="suggestion-description">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : searchQuery.trim() ? (
            <div className="no-suggestions">
              <p>Keine Ergebnisse für &quot;{searchQuery}&quot;</p>
            </div>
          ) : recentSearches.length > 0 ? (
            <>
              <div className="suggestions-header">
                <span>Letzte Suchen</span>
                <button
                  onClick={clearRecentSearches}
                  className="clear-recent-btn"
                  aria-label="Letzte Suchen löschen"
                >
                  Löschen
                </button>
              </div>
              <div className="recent-searches">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(search);
                      handleSearch(search);
                    }}
                    className="recent-search-item"
                  >
                    <Search size={14} />
                    {search}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </Card>
      )}
    </div>
  );
}


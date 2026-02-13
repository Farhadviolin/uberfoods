import { useCallback, useMemo } from 'react';
import {
  Brain,
  Flame,
  Filter,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Mic,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { useMegaSearch } from '../hooks/useMegaSearch';
import { MegaSearchResult } from '../services/searchService';
import './MegaSearch.css';

interface MegaSearchProps {
  initialQuery?: string;
  onQuerySelected?: (query: string) => void;
}

export function MegaSearch({ initialQuery = '', onQuerySelected }: MegaSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    insights,
    isLoading,
    isFetching,
    hasBackendResults,
    setLastSelectedQuery,
  } = useMegaSearch(initialQuery);

  const dietaryCandidates = useMemo(() => [
    { key: 'vegan', label: t('megaSearch.dietary.vegan') },
    { key: 'vegetarisch', label: t('megaSearch.dietary.vegetarisch') },
    { key: 'glutenfrei', label: t('megaSearch.dietary.glutenfrei') },
    { key: 'proteinreich', label: t('megaSearch.dietary.proteinreich') },
  ], [t]);

  const handleResultSelect = useCallback(
    (result: MegaSearchResult) => {
      if (result.action?.type === 'navigate') {
        navigate(result.action.payload);
      }
      setLastSelectedQuery(result.title);
      onQuerySelected?.(result.title);
    },
    [navigate, onQuerySelected, setLastSelectedQuery]
  );

  const toggleDietary = useCallback(
    (dietary: string) => {
      setFilters((prev) => {
        const exists = prev.dietary.includes(dietary);
        return {
          ...prev,
          dietary: exists
            ? prev.dietary.filter((item) => item !== dietary)
            : [...prev.dietary, dietary],
        };
      });
    },
    [setFilters]
  );

  const getResultTypeLabel = useCallback((type: string) => {
    return t(`megaSearch.resultTypes.${type}`, { defaultValue: type });
  }, [t]);

  const filterChips = useMemo(
    () => [
      {
        id: 'budget',
        label: t('megaSearch.smartBudget'),
        active: filters.budget === 'budget',
        onClick: () =>
          setFilters((prev) => ({
            ...prev,
            budget: prev.budget === 'budget' ? null : 'budget',
          })),
      },
      {
        id: 'premium',
        label: t('megaSearch.premiumDining'),
        active: filters.budget === 'premium',
        onClick: () =>
          setFilters((prev) => ({
            ...prev,
            budget: prev.budget === 'premium' ? null : 'premium',
          })),
      },
      {
        id: 'fast',
        label: t('megaSearch.in10Min'),
        active: filters.deliverySpeed === 'fast',
        onClick: () =>
          setFilters((prev) => ({
            ...prev,
            deliverySpeed: prev.deliverySpeed === 'fast' ? null : 'fast',
          })),
      },
      {
        id: 'healthy',
        label: t('megaSearch.healthyMode'),
        active: filters.mood === 'healthy',
        onClick: () =>
          setFilters((prev) => ({
            ...prev,
            mood: prev.mood === 'healthy' ? null : 'healthy',
          })),
      },
    ],
    [filters.budget, filters.deliverySpeed, filters.mood, setFilters, t]
  );

  return (
    <section className="mega-search" aria-label={t('megaSearch.title')}>
      <Card variant="elevated" className="mega-search-card">
        <header className="mega-search-header">
          <div>
            <p className="mega-search-kicker">{t('megaSearch.title')}</p>
            <h2>{t('megaSearch.subtitle')}</h2>
          </div>
          <span className="mega-search-badge">
            <Sparkles size={16} />
            {t('megaSearch.mlBoostActive')}
          </span>
        </header>

        <div className="mega-search-input-row">
          <div className="mega-search-input-wrapper">
            <Search size={18} className="mega-search-input-icon" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Z. B. „veganes Comfort Food nahe Büro“"
              aria-label={t('megaSearch.title')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && results[0]) {
                  handleResultSelect(results[0]);
                }
              }}
            />
            <button
              type="button"
              className="mega-search-icon-btn"
              aria-label={t('megaSearch.voiceSearch')}
              onClick={() => setQuery((prev) => prev + ' 🗣️')}
            >
              <Mic size={16} />
            </button>
            <button
              type="button"
              className="mega-search-icon-btn"
              aria-label={t('megaSearch.imageSearch')}
              onClick={() => setQuery((prev) => (prev ? `${prev} #vision` : '#vision'))}
            >
              <ImageIcon size={16} />
            </button>
          </div>

          <div className="mega-search-secondary-actions">
            <Button variant="ghost" onClick={() => navigator.geolocation?.getCurrentPosition(() => {})}>
              <MapPin size={16} />
              {t('megaSearch.locationBoost')}
            </Button>
            <Button variant="primary">
              <Wand2 size={16} />
              {t('megaSearch.aiAsk')}
            </Button>
          </div>
        </div>

        <div className="mega-search-filters">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`mega-search-filter-chip ${chip.active ? 'active' : ''}`}
              onClick={chip.onClick}
            >
              <Filter size={14} />
              {chip.label}
            </button>
          ))}
          {dietaryCandidates.map((dietary) => (
            <button
              key={dietary.key}
              type="button"
              className={`mega-search-filter-chip ${
                filters.dietary.includes(dietary.key) ? 'active' : ''
              }`}
              onClick={() => toggleDietary(dietary.key)}
            >
              <Brain size={14} />
              {dietary.label}
            </button>
          ))}
        </div>

        <div className="mega-search-body">
          <div className="mega-search-results">
            {isLoading && (
              <div className="mega-search-status">
                <Loader2 size={16} className="spin" />
                {t('megaSearch.loadingContext')}
              </div>
            )}
            {!isLoading && results.length === 0 && (
              <div className="mega-search-status muted">
                {t('megaSearch.noResults')}
              </div>
            )}

            {results.map((result) => (
              <button
                key={result.id}
                className="mega-search-result-item"
                onClick={() => handleResultSelect(result)}
              >
                <div className="mega-search-result-meta">
                  <span className="mega-search-result-type">{getResultTypeLabel(result.type)}</span>
                  <span className="mega-search-score">
                    {Math.round(result.score * 100)} {t('megaSearch.relevance')}
                  </span>
                </div>
                <h3>{result.title}</h3>
                {result.subtitle && <p className="mega-search-subtitle">{result.subtitle}</p>}
                {result.description && <p className="mega-search-description">{result.description}</p>}
                {!!result.badges?.length && (
                  <div className="mega-search-badges">
                    {result.badges.map((badge) => (
                      <span key={badge} className="mega-search-badge-pill">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          <aside className="mega-search-insights">
            <div className="mega-search-insight-card">
              <header>
                <Flame size={18} />
                <div>
                  <p>{t('megaSearch.liveTrends')}</p>
                  <span>{hasBackendResults ? t('megaSearch.serverInsights') : t('megaSearch.hybridFallback')}</span>
                </div>
              </header>
              <ul>
                {insights?.trendingQueries?.map((trend) => (
                  <li key={trend}>
                    <button type="button" onClick={() => setQuery(trend)}>
                      {trend}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mega-search-insight-card">
              <header>
                <Brain size={18} />
                <div>
                  <p>{t('megaSearch.popularFilters')}</p>
                  <span>{insights?.dataFreshness}</span>
                </div>
              </header>
              <div className="mega-search-badge-cloud">
                {insights?.popularFilters?.map((filter) => (
                  <span key={filter}>{filter}</span>
                ))}
              </div>
            </div>

            {isFetching && !isLoading && (
              <div className="mega-search-status inline">
                <Loader2 size={14} className="spin" />
                {t('megaSearch.realtimeUpdate')}
              </div>
            )}
          </aside>
        </div>
      </Card>
    </section>
  );
}



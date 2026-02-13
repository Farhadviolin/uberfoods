import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import './LegalPage.css';

interface LegalPageData {
  id: string;
  slug: string;
  title: string;
  content: string;
  language: string;
  isPublished: boolean;
}

export function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<LegalPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sanitizeToText = (html: string) => {
    const temp = document.createElement('div');
    temp.textContent = html || '';
    return temp.textContent || '';
  };

  const safeContent = useMemo(() => sanitizeToText(page?.content || ''), [page?.content]);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/legal-pages/public/${slug}`, {
          params: { language: 'de' },
        });
        setPage(response.data);
      } catch (err: unknown) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="driver-legal-page-container">
        <div className="loading-spinner"></div>
        <p>Lade Seite...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="driver-legal-page-container">
        <div className="driver-legal-page-error">
          <h1>Seite nicht gefunden</h1>
          <p>{error || 'Die angeforderte Seite konnte nicht gefunden werden.'}</p>
          <Link to="/" className="btn-back">Zurück zum Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-legal-page-container">
      <div className="driver-legal-page-header">
        <Link to="/" className="btn-back">← Zurück</Link>
        <h1>{page.title}</h1>
      </div>
      <article className="driver-legal-page">
        <div className="driver-legal-page-content">{safeContent}</div>
      </article>
    </div>
  );
}


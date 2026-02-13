import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { LoadingSpinner } from './LoadingSpinner';
import { AxiosErrorWithResponse } from '../types';
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
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<LegalPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const safeContent = useMemo(() => {
    if (!page?.content) return '';
    const div = document.createElement('div');
    div.textContent = page.content;
    return div.textContent || '';
  }, [page?.content]);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/legal-pages/public/${slug}`, {
          params: { language: i18n.language },
        });
        setPage(response.data);
        setError(null);
      } catch (err: unknown) {
        const axiosError = err as AxiosErrorWithResponse;
        // Bei 404-Fehler: Seite existiert nicht (erwartet)
        if (axiosError.response?.status === 404) {
          setError(t('legalPage.notFound'));
        } else {
          setError(axiosError.response?.data?.message || t('legalPage.notFound'));
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug, i18n.language, t]);

  if (loading) {
    return (
      <div className="legal-page-container">
        <LoadingSpinner>{t('legalPage.loading')}</LoadingSpinner>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="legal-page-container">
        <div className="legal-page-error">
          <h1>{t('legalPage.notFound')}</h1>
          <p>{error || t('legalPage.notFoundMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="legal-page-container">
      <article className="legal-page">
        <h1>{page.title}</h1>
        <div className="legal-page-content">{safeContent}</div>
      </article>
    </div>
  );
}


import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Card } from '../design-system/Card';
import { Input } from '../design-system/Input';
import { Accordion } from '../design-system/Accordion';
import { Skeleton } from '../design-system/Skeleton';
import { HelpCircle, Search } from 'lucide-react';
import './FAQ.css';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export function FAQ() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // ✅ VOLLSTÄNDIGE BACKEND-INTEGRATION - KEINE FALLBACKS MEHR
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faq'],
    queryFn: async () => {
      const response = await api.get<FAQItem[]>('/support/faq');
      if (!response.data || response.data.length === 0) {
        // Wenn Backend leer ist, leeres Array zurückgeben (kein Fallback)
        return [];
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
    retry: 2, // 2 Retries bei Fehlern
    retryDelay: 1000,
  });

  const categories = [
    { value: 'all', label: t('faq.allCategories') },
    { value: 'ordering', label: t('faq.category.ordering') },
    { value: 'payment', label: t('faq.category.payment') },
    { value: 'delivery', label: t('faq.category.delivery') },
    { value: 'loyalty', label: t('faq.category.loyalty') },
  ];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  const accordionItems = Object.entries(groupedFAQs).map(([category, items]) => ({
    id: category,
    title: categories.find((c) => c.value === category)?.label || category,
    content: (
      <div className="faq-category-content">
        {items.map((faq) => (
          <div key={faq.id} className="faq-item">
            <h4 className="faq-question">{faq.question}</h4>
            <p className="faq-answer">{faq.answer}</p>
          </div>
        ))}
      </div>
    ),
  }));

  // If no category grouping, show flat list
  const flatAccordionItems =
    accordionItems.length === 0
      ? filteredFAQs.map((faq) => ({
          id: faq.id,
          title: faq.question,
          content: <p className="faq-answer">{faq.answer}</p>,
        }))
      : accordionItems;

  return (
    <div className="faq-container">
      <div className="faq-header">
        <div className="faq-header-icon">
          <HelpCircle size={48} />
        </div>
        <h1>{t('faq.title')}</h1>
        <p>{t('faq.subtitle')}</p>
      </div>

      <Card className="faq-search-card">
        <div className="faq-search">
          <Search size={20} className="faq-search-icon" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('faq.searchPlaceholder')}
            className="faq-search-input"
          />
        </div>
        <div className="faq-categories">
          {categories.map((category) => (
            <button
              key={category.value}
              className={`faq-category-button ${selectedCategory === category.value ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <div className="faq-skeleton">
          <Skeleton variant="rectangular" width="100%" height="80px" />
          <Skeleton variant="rectangular" width="100%" height="80px" />
          <Skeleton variant="rectangular" width="100%" height="80px" />
        </div>
      ) : flatAccordionItems.length === 0 ? (
        <Card>
          <div className="faq-empty">
            <HelpCircle size={48} />
            <h3>{t('faq.noResults')}</h3>
            <p>{t('faq.noResultsDesc')}</p>
          </div>
        </Card>
      ) : (
        <div className="faq-content">
          <Accordion items={flatAccordionItems} />
        </div>
      )}
    </div>
  );
}


import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  type?: string;
  canonical?: string;
}

export function SEOHead({
  title = 'UberFoods - Food Delivery Service',
  description = 'Order food online from your favorite restaurants. Fast delivery, great deals, and real-time tracking.',
  keywords = ['food delivery', 'restaurants', 'order online', 'fast delivery'],
  image = '/og-image.jpg',
  type = 'website',
  canonical,
}: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    // Update page title
    document.title = title;

    // Update meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords.join(', '));

    // Open Graph tags
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:url', window.location.href, 'property');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', title, 'name');
    updateMetaTag('twitter:description', description, 'name');
    updateMetaTag('twitter:image', image, 'name');

    // Canonical URL
    if (canonical) {
      updateLinkTag('canonical', canonical);
    } else {
      updateLinkTag('canonical', window.location.origin + location.pathname);
    }

    // JSON-LD Structured Data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'FoodEstablishment',
      'name': 'UberFoods',
      'description': description,
      'url': window.location.href,
      'image': image,
      'servesCuisine': 'International',
      'priceRange': '€€',
      'address': {
        '@type': 'PostalAddress',
        'addressCountry': 'AT',
        'addressLocality': 'Vienna',
      },
    };

    updateStructuredData(structuredData);
  }, [title, description, keywords, image, type, canonical, location.pathname]);

  return null;
}

// Helper Functions
function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
}

function updateStructuredData(data: any) {
  let script = document.querySelector('script[type="application/ld+json"]');
  
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  
  script.textContent = JSON.stringify(data);
}

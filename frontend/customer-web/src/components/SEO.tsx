import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from '../hooks/useTranslation';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = [],
  noindex = false,
}) => {
  const { currentLanguage } = useTranslation();

  const siteName = 'UberFoods';
  const defaultTitle = 'UberFoods - Essen bestellen leicht gemacht';
  const defaultDescription = 'Entdecke die besten Restaurants in deiner Nähe. Bestelle Essen online mit UberFoods - schnell, einfach und lecker.';
  const defaultImage = '/og-image.jpg';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://uberfoods.com';

  const pageTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageImage = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : `${siteUrl}${defaultImage}`;
  const pageUrl = url ? `${siteUrl}${url}` : siteUrl;

  // Generate structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type === 'website' ? 'WebSite' : type === 'product' ? 'Product' : 'Article',
    name: pageTitle,
    description: pageDescription,
    url: pageUrl,
    image: pageImage,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    ...(type === 'article' && {
      headline: title,
      datePublished: publishedTime,
      dateModified: modifiedTime,
      author: author ? {
        '@type': 'Person',
        name: author,
      } : undefined,
      articleSection: section,
      keywords: tags.join(', '),
    }),
    ...(type === 'product' && {
      category: section,
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        priceCurrency: 'EUR',
      },
    }),
  };

  return (
    <Helmet>
      {/* Basic meta tags */}
      <html lang={currentLanguage} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={[...keywords, 'essen bestellen', 'lieferdienst', 'restaurant', 'food delivery'].join(', ')} />

      {/* Canonical URL */}
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={currentLanguage === 'de' ? 'de_DE' : currentLanguage === 'en' ? 'en_US' : 'fa_IR'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />

      {/* Additional meta tags */}
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'} />
      <meta name="googlebot" content={noindex ? 'noindex,nofollow' : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'} />

      {/* Mobile optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#FF6B6B" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteName} />

      {/* Favicons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

      {/* Preload critical resources */}
      <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="//api.uberfoods.com" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

// Specialized SEO components
export const HomePageSEO: React.FC = () => (
  <SEO
    title="Essen bestellen - Schnell & Einfach"
    description="Entdecke die besten Restaurants in deiner Nähe. Bestelle Essen online mit UberFoods - schnell, einfach und lecker. Kostenlose Lieferung ab €15."
    keywords={['essen bestellen', 'lieferdienst', 'restaurant', 'pizza', 'asiatisch', 'italienisch', 'schnell', 'einfach']}
    type="website"
    image="/og-home.jpg"
  />
);

export const RestaurantPageSEO: React.FC<{ restaurant: any }> = ({ restaurant }) => (
  <SEO
    title={`${restaurant.name} - Essen bestellen`}
    description={`${restaurant.name} - ${restaurant.cuisine} Restaurant. ${restaurant.rating} Sterne. Lieferzeit: ${restaurant.deliveryTime} Min. Bestelle jetzt online!`}
    keywords={[restaurant.name, restaurant.cuisine, 'restaurant', 'essen bestellen', 'lieferdienst']}
    type="product"
    image={restaurant.image || '/restaurant-default.jpg'}
    section={restaurant.cuisine}
  />
);

export const OrderTrackingSEO: React.FC<{ orderId: string }> = ({ orderId }) => (
  <SEO
    title="Bestellung verfolgen"
    description="Verfolge deine Essen-Bestellung in Echtzeit. Schaue dir den Status, die Lieferzeit und den Standort des Fahrers an."
    keywords={['bestellung verfolgen', 'lieferstatus', 'essen tracking', 'fahrer location']}
    type="website"
    noindex={true} // Don't index tracking pages
  />
);

export const ProfilePageSEO: React.FC = () => (
  <SEO
    title="Mein Profil - UberFoods"
    description="Verwalte dein Profil, Adressen, Zahlungsmethoden und Bestellhistorie bei UberFoods."
    keywords={['profil', 'adressen', 'zahlungsmethoden', 'bestellhistorie']}
    type="website"
    noindex={true} // Don't index personal profile pages
  />
);
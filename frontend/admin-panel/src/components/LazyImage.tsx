import { useState, useEffect, useRef, memo } from 'react';
import { getImageUrl, handleImageError, PLACEHOLDER_IMAGES } from '../utils/imageUtils';

interface LazyImageProps {
  src: string | null | undefined;
  alt: string;
  type?: 'restaurant' | 'dish' | 'customer' | 'driver' | 'order' | 'default';
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * LazyImage - Lazy Loading für Bilder mit Intersection Observer
 * Lädt Bilder nur wenn sie sichtbar sind
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  type = 'default',
  className = '',
  style = {},
  width,
  height,
  placeholder,
  onLoad,
  onError,
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || PLACEHOLDER_IMAGES[type]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Intersection Observer für Lazy Loading
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Starte Laden 50px bevor Bild sichtbar wird
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Lade Bild nur wenn es sichtbar ist
    if (isInView && src) {
      const fullImageUrl = getImageUrl(src, type);
      setImageSrc(fullImageUrl);
    }
  }, [isInView, src, type]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, type);
    setIsLoaded(true);
    onError?.();
  };

  return (
    <div
      style={{
        position: 'relative',
        width: width || 'auto',
        height: height || 'auto',
        ...style,
      }}
      className={className}
    >
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0.5,
          transition: 'opacity 0.3s ease-in-out',
        }}
        loading="lazy"
      />
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ccc',
              borderTopColor: '#1877F2',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});


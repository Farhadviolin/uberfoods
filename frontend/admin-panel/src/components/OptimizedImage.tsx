import { useMemo } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Lightweight optimized image with lazy loading and WebP fallback.
 * Avoids additional deps; relies on browser support for <picture>.
 */
export function OptimizedImage({ src, alt, className, width, height, onError }: Props) {
  const { webpSrc, fallbackSrc } = useMemo(() => {
    if (!src) {
      return { webpSrc: src, fallbackSrc: src };
    }
    const webpCandidate = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    return { webpSrc: webpCandidate, fallbackSrc: src };
  }, [src]);

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading="lazy"
        width={width}
        height={height}
        onError={onError}
        style={{ objectFit: 'cover' }}
      />
    </picture>
  );
}

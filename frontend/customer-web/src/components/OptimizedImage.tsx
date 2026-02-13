import React, { useState, useCallback, useMemo } from 'react';
import { LazyImage } from './LazyImage';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: number;
  priority?: boolean;
  sizes?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Generate responsive image URLs
const generateResponsiveUrls = (
  baseSrc: string,
  width?: number,
  quality: number = 80
): { src: string; srcSet: string } => {
  if (!width) {
    return {
      src: `${baseSrc}?q=${quality}`,
      srcSet: `${baseSrc}?q=${quality} ${width}w`,
    };
  }

  // Generate multiple sizes for responsive images
  const sizes = [width, width * 1.5, width * 2].map(size =>
    `${baseSrc}?w=${Math.round(size)}&q=${quality} ${Math.round(size)}w`
  );

  return {
    src: `${baseSrc}?w=${width}&q=${quality}`,
    srcSet: sizes.join(', '),
  };
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  quality = 80,
  priority = false,
  sizes,
  placeholder,
  onLoad,
  onError,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const optimizedUrls = useMemo(() =>
    generateResponsiveUrls(src, width, quality),
    [src, width, quality]
  );

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageLoaded(true); // Prevent skeleton from showing on error
    onError?.();
  }, [onError]);

  // For images that need optimization, use LazyImage with responsive srcSet
  return (
    <div className={`optimized-image ${className}`}>
      <LazyImage
        src={optimizedUrls.src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        placeholder={placeholder}
        onLoad={handleLoad}
        onError={handleError}
        className="optimized-image-element"
      />

      {/* Preload critical images */}
      {priority && (
        <link
          rel="preload"
          as="image"
          href={optimizedUrls.src}
          imageSrcSet={optimizedUrls.srcSet}
          imageSizes={sizes}
        />
      )}
    </div>
  );
};
import { useState, useEffect, ImgHTMLAttributes } from "react";
import { validateImageUrl } from "../../utils/security";
import "./OptimizedImage.css";

interface OptimizedImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "loading"
> {
  src: string;
  alt: string;
  fallback?: string;
  lazy?: boolean;
  aspectRatio?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * Optimized Image Component with:
 * - Lazy loading support
 * - WebP format detection
 * - Error handling with fallback
 * - Aspect ratio preservation
 * - Loading placeholder
 */
export function OptimizedImage({
  src,
  alt,
  fallback,
  lazy = true,
  aspectRatio,
  objectFit = "cover",
  className = "",
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webpSupported, setWebpSupported] = useState(false);

  // Check WebP support
  useEffect(() => {
    const webp = new Image();
    webp.onload = webp.onerror = () => {
      setWebpSupported(webp.height === 2);
    };
    webp.src =
      "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
  }, []);

  // Generate optimized image URL
  useEffect(() => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Security: Validate and sanitize image URL
    const validatedUrl = validateImageUrl(src);
    if (!validatedUrl) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // If src is already a full URL, use it directly
    if (
      validatedUrl.startsWith("http://") ||
      validatedUrl.startsWith("https://") ||
      validatedUrl.startsWith("data:")
    ) {
      setImageSrc(validatedUrl);
      return;
    }

    // Construct full URL from API base URL
    const apiUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";
    const fullUrl = validatedUrl.startsWith("/")
      ? `${apiUrl}${validatedUrl}`
      : `${apiUrl}/${validatedUrl}`;

    // Try WebP version if supported
    if (webpSupported && !validatedUrl.includes(".webp")) {
      const webpUrl = fullUrl.replace(/\.(jpg|jpeg|png)$/i, ".webp");
      setImageSrc(webpUrl);
    } else {
      setImageSrc(fullUrl);
    }
  }, [src, webpSupported]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    if (fallback) {
      setImageSrc(fallback);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    ...(aspectRatio && { aspectRatio }),
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit,
    transition: "opacity 0.3s ease-in-out",
    opacity: isLoading ? 0 : 1,
  };

  if (hasError && !fallback) {
    return (
      <div
        className={`optimized-image-error ${className}`}
        style={containerStyle}
        role="img"
        aria-label={alt}
      >
        <div className="error-placeholder">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span>Bild nicht verfügbar</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`optimized-image-container ${className}`}
      style={containerStyle}
    >
      {isLoading && (
        <div className="optimized-image-skeleton" aria-hidden="true">
          <div className="skeleton-shimmer" />
        </div>
      )}
      <img
        src={imageSrc || undefined}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        style={imageStyle}
        {...props}
      />
    </div>
  );
}

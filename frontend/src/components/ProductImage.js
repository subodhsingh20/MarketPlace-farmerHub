import { useEffect, useMemo, useState } from "react";

function normalizeImageUrl(value) {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://") ||
    trimmedValue.startsWith("data:") ||
    trimmedValue.startsWith("blob:") ||
    trimmedValue.startsWith("/")
  ) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("//")) {
    return `https:${trimmedValue}`;
  }

  return `https://${trimmedValue.replace(/^www\./i, "www.")}`;
}

function createFallbackImage(productName) {
  const safeName = String(productName || "Product").slice(0, 24);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d1fae5" />
          <stop offset="100%" stop-color="#bbf7d0" />
        </linearGradient>
      </defs>
      <rect width="800" height="800" rx="48" fill="url(#bg)" />
      <circle cx="400" cy="300" r="88" fill="#059669" fill-opacity="0.18" />
      <path d="M400 214c48 0 86 38 86 86s-38 86-86 86-86-38-86-86 38-86 86-86Zm-102 250h204c43 0 78 35 78 78v22H220v-22c0-43 35-78 78-78Z" fill="#047857" fill-opacity="0.22" />
      <text x="400" y="640" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#065f46">
        ${safeName}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function ProductImage({
  src,
  alt,
  productName,
  className,
  fallbackClassName,
}) {
  const resolvedSrc = useMemo(() => normalizeImageUrl(src), [src]);
  const fallbackSrc = useMemo(
    () => createFallbackImage(productName || alt),
    [alt, productName]
  );
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(resolvedSrc || fallbackSrc);
  }, [fallbackSrc, resolvedSrc]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={currentSrc === fallbackSrc && fallbackClassName ? fallbackClassName : className}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}

export { normalizeImageUrl };

export default ProductImage;

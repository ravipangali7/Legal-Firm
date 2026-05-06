import { useCallback, useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';
import { AvatarImage } from '@/components/ui/avatar';
import hero1 from '@/assets/hero-1.jpg';
import hero2 from '@/assets/hero-2.jpg';
import hero3 from '@/assets/hero-3.jpg';
import defaultBrandIcon from '@/assets/logo-icon.png';

export type CmsImageFallbackKind = 'hero' | 'card' | 'about' | 'brand';

const KIND_SRC: Record<CmsImageFallbackKind, string> = {
  hero: hero1,
  card: hero2,
  about: hero3,
  brand: defaultBrandIcon,
};

export type CmsImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  /** CMS path, absolute URL, data URL, or Vite asset URL */
  src: string | undefined | null;
  /** When true (default), run through `cmsMediaSrc` (no-op for `data:` URLs). */
  resolve?: boolean;
  /**
   * When true (default), empty `src` shows the fallback image.
   * Set false for optional images (e.g. hide block when no upload).
   */
  fillEmpty?: boolean;
  fallbackSrc?: string;
  fallbackKind?: CmsImageFallbackKind;
};

function resolveMaybe(raw: string, resolve: boolean): string {
  const t = raw.trim();
  if (!t) return '';
  if (!resolve || t.startsWith('data:')) return t;
  return cmsMediaSrc(t);
}

/**
 * CMS / remote image with `cmsMediaSrc` resolution and a stable fallback when `src` is empty
 * or the request fails (404, wrong host, etc.).
 */
export function CmsImage({
  src,
  alt = '',
  className,
  loading,
  resolve = true,
  fillEmpty = true,
  fallbackSrc,
  fallbackKind = 'hero',
  ...rest
}: CmsImageProps) {
  const primaryRaw = typeof src === 'string' ? src : '';
  const fallbackResolved = useMemo(() => {
    const fb = (fallbackSrc ?? '').trim() || KIND_SRC[fallbackKind];
    return resolveMaybe(fb, resolve);
  }, [fallbackSrc, fallbackKind, resolve]);

  const primaryResolved = useMemo(() => resolveMaybe(primaryRaw, resolve), [primaryRaw, resolve]);

  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [primaryRaw]);

  const onError = useCallback(() => {
    if (primaryRaw.trim()) setBroken(true);
  }, [primaryRaw]);

  const useFallback = (!primaryRaw.trim() && fillEmpty) || (Boolean(primaryRaw.trim()) && broken);
  const url = useFallback ? fallbackResolved : primaryResolved;

  if (!url) return null;

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      onError={onError}
      {...rest}
    />
  );
}

type CmsAvatarImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
};

/** Radix avatar image that hides on load error so `AvatarFallback` shows. */
export function CmsAvatarImage({ src, alt = '', className }: CmsAvatarImageProps) {
  const raw = (src || '').trim();
  const resolved = useMemo(() => (raw ? cmsMediaSrc(raw) : ''), [raw]);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [raw]);

  if (!raw || broken || !resolved) return null;

  return <AvatarImage src={resolved} alt={alt} className={className} onError={() => setBroken(true)} />;
}

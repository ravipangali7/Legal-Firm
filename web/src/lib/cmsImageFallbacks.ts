/** Matches `seed_cms_homepage` testimonial portrait URLs — used when API omits a face image. */
export const TESTIMONIAL_FACE_FALLBACKS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
] as const;

/** Portrait URL for a testimonial: CMS or absolute URL when set; otherwise a stable stock face by index. */
export function testimonialPortraitSrc(image: string | null | undefined, index: number): string {
  const t = (typeof image === 'string' ? image : '').trim();
  if (t) return t;
  return TESTIMONIAL_FACE_FALLBACKS[index % TESTIMONIAL_FACE_FALLBACKS.length];
}

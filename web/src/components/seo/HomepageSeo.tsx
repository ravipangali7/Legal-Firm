import { useMemo } from 'react';
import { useCms } from '@/store/cmsStore';
import { usePageSeo } from '@/context/SeoContext';

/** Dynamic homepage meta from the first enabled hero slide. */
export default function HomepageSeo() {
  const { slides } = useCms();
  const hero = useMemo(() => {
    const visible = slides.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
    return visible[0];
  }, [slides]);

  usePageSeo(
    hero
      ? {
          pathname: '/',
          title: hero.title || undefined,
          description: hero.subtitle || hero.eyebrow || undefined,
          image: hero.image || undefined,
        }
      : { pathname: '/' }
  );

  return null;
}

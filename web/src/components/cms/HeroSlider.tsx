import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCms } from '@/store/cmsStore';
import { cn } from '@/lib/utils';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';

const HeroSlider = () => {
  const { slides } = useCms();
  const visible = slides.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const [i, setI] = useState(0);
  const total = visible.length;

  useEffect(() => { if (i >= total) setI(0); }, [i, total]);
  useEffect(() => {
    if (total < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total]);

  if (total === 0) return null;
  const s = visible[i] ?? visible[0];
  const eyebrow = (s.eyebrow || '').trim() || 'Tax consultant';
  const secondaryLabel = (s.secondaryCta || '').trim() || 'Talk to a lawyer';
  const secondaryLink = (s.secondaryHref || '').trim() || '/contact';

  return (
    <section className="relative h-[88vh] min-h-[560px] max-h-[820px] overflow-hidden pt-[72px] sm:pt-20">
      {visible.map((slide, idx) => (
        <div key={slide.id} className={cn('absolute inset-0 transition-opacity duration-1000', idx === i ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
          <img src={cmsMediaSrc(slide.image)} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" loading={idx === 0 ? 'eager' : 'lazy'} />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.94] via-primary/75 to-primary/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/65 via-transparent to-transparent" />
          {/* Lady Justice–style emphasis on the right: extra depth for legal hero stock photos */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-primary/20" />
        </div>
      ))}

      <div className="relative h-full container mx-auto px-4 sm:px-6 flex items-center">
        <div className="max-w-3xl text-primary-foreground">
          <span className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold bg-accent/90 text-accent-foreground tracking-wide uppercase">
            {eyebrow}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">{s.title}</h1>
          <p className="mt-5 text-base sm:text-lg lg:text-xl text-primary-foreground/85 max-w-2xl">{s.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent-light h-12 px-6 rounded-full">
              <Link to={s.href}>{s.cta} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/50 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white h-12 px-6 rounded-full">
              <Link to={secondaryLink}>{secondaryLabel}</Link>
            </Button>
          </div>
        </div>
      </div>

      {total > 1 && (
        <>
          <button type="button" aria-label="Previous slide" onClick={() => setI((i - 1 + total) % total)} className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white items-center justify-center"><ChevronLeft /></button>
          <button type="button" aria-label="Next slide" onClick={() => setI((i + 1) % total)} className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white items-center justify-center"><ChevronRight /></button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {visible.map((_, idx) => (
              <button key={idx} type="button" onClick={() => setI(idx)} aria-label={`Go to slide ${idx + 1}`} className={cn('h-1.5 rounded-full transition-all', idx === i ? 'bg-accent w-8' : 'bg-white/50 w-4 hover:bg-white/80')} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroSlider;

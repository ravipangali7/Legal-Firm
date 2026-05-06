import { HtmlPreview } from '@/components/HtmlPreview';
import { AboutMediaVisual } from '@/components/about/AboutMediaVisual';
import { useCms } from '@/store/cmsStore';
import { cn } from '@/lib/utils';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';

const AboutBlock = () => {
  const { about } = useCms();
  if (!about.enabled) return null;
  const statCount = about.stats?.length ?? 0;
  const statGridClass =
    statCount <= 1
      ? 'grid-cols-1 max-w-[16rem]'
      : statCount === 2
        ? 'grid-cols-2 max-w-lg gap-5 sm:gap-6'
        : statCount === 3
          ? 'grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5'
          : 'grid-cols-2 gap-5 sm:gap-6';
  const imgSrc = cmsMediaSrc(about.image || '');
  return (
    <section className="py-20 sm:py-24 bg-background overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:items-center lg:gap-16 max-w-6xl">
        <AboutMediaVisual imageSrc={imgSrc} alt={about.title || 'About'} className="order-1" />
        <div className="min-w-0 order-2 space-y-0">
          {about.eyebrow ? (
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{about.eyebrow}</span>
          ) : null}
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-primary-onBg leading-[1.12] tracking-tight [overflow-wrap:anywhere]">
            {about.title}
          </h2>
          <HtmlPreview
            content={about.body || ''}
            containWideBlocks
            className="mt-6 max-w-xl text-muted-foreground prose-neutral dark:prose-invert prose-base sm:prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed prose-headings:text-primary-onBg"
          />
          {statCount > 0 ? (
            <div className={cn('mt-10 grid min-w-0', statGridClass)}>
              {about.stats.map((s, i) => (
                <div
                  key={i}
                  className="bg-secondary/50 rounded-xl border border-border px-5 py-5 min-w-0 flex flex-col justify-center"
                >
                  <div className="text-lg sm:text-xl font-bold text-primary-onBg tabular-nums tracking-tight leading-tight [overflow-wrap:anywhere]">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 leading-snug line-clamp-2">{s.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default AboutBlock;

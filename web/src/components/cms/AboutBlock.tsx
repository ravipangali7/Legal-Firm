import { HtmlPreview } from '@/components/HtmlPreview';
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
  return (
    <section className="py-20 sm:py-24 bg-background overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:items-start lg:gap-14">
        <div className="relative min-w-0 lg:sticky lg:top-28 self-start">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-elegant">
            {about.image && <img src={cmsMediaSrc(about.image)} alt={about.title} className="w-full h-full object-cover" loading="lazy" />}
          </div>
          <div className="absolute -bottom-6 -right-6 bg-accent text-accent-foreground rounded-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-gold hidden sm:block max-w-[min(100%,18rem)]">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight tabular-nums [overflow-wrap:anywhere]">
              {about.stats[0]?.value}
            </div>
            <div className="text-xs uppercase tracking-wider mt-2 text-accent-foreground/90 line-clamp-2">
              {about.stats[0]?.label}
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{about.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-onBg leading-tight [overflow-wrap:anywhere]">
            {about.title}
          </h2>
          <HtmlPreview
            content={about.body || ''}
            containWideBlocks
            className="mt-5 max-w-none text-muted-foreground prose-neutral dark:prose-invert prose-base sm:prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed"
          />
          <div className={cn('mt-8 grid min-w-0', statGridClass)}>
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
        </div>
      </div>
    </section>
  );
};

export default AboutBlock;

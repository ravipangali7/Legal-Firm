import { Link } from 'react-router-dom';
import { HtmlPreview } from '@/components/HtmlPreview';
import { AboutMediaVisual } from '@/components/about/AboutMediaVisual';
import { useCms } from '@/store/cmsStore';
import { cn } from '@/lib/utils';
import { isAboutBodyLongForHomePreview } from '@/lib/aboutHomePreview';

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
  const bodyLong = isAboutBodyLongForHomePreview(about.body || '');
  const previewBodyClass =
    'mt-6 max-w-xl text-muted-foreground prose-neutral dark:prose-invert prose-base sm:prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed prose-headings:text-primary-onBg';

  return (
    <section className="py-20 sm:py-24 bg-background overflow-x-hidden">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-14 xl:gap-x-16 gap-10 lg:gap-y-0 lg:items-start">
          <AboutMediaVisual imageSrc={about.image || ''} alt={about.title || 'About'} className="order-1 w-full" />
          <div className="order-2 min-w-0 flex flex-col">
            {about.eyebrow ? (
              <span className="block text-xs font-bold uppercase tracking-[0.2em] text-accent">{about.eyebrow}</span>
            ) : null}
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-primary-onBg leading-[1.12] tracking-tight [overflow-wrap:anywhere]">
              {about.title}
            </h2>
            <div className="min-w-0">
              {bodyLong ? (
                <div className="relative mt-6">
                  <div className="relative max-h-[13rem] sm:max-h-[15rem] overflow-hidden rounded-md">
                    <HtmlPreview content={about.body || ''} containWideBlocks className={previewBodyClass} />
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/85 to-transparent"
                      aria-hidden
                    />
                  </div>
                  <Link
                    to="/about"
                    className="mt-3 inline-flex text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    See more
                  </Link>
                </div>
              ) : (
                <HtmlPreview content={about.body || ''} containWideBlocks className={previewBodyClass} />
              )}
            </div>
            {statCount > 0 ? (
              <div className={cn('mt-10 grid min-w-0 w-full', statGridClass)}>
                {about.stats.map((s, i) => (
                  <div
                    key={s.id ?? `${s.label}-${i}`}
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
      </div>
    </section>
  );
};

export default AboutBlock;

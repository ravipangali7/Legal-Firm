import { Link } from 'react-router-dom';
import { HtmlPreview } from '@/components/HtmlPreview';
import { AboutMediaVisual } from '@/components/about/AboutMediaVisual';
import { AboutStatCards } from '@/components/about/AboutStatCards';
import { useCms } from '@/store/cmsStore';
import { isAboutBodyLongForHomePreview } from '@/lib/aboutHomePreview';

const AboutBlock = () => {
  const { about } = useCms();
  if (!about.enabled) return null;
  const stats = about.stats ?? [];
  const bodyLong = isAboutBodyLongForHomePreview(about.body || '');
  const previewBodyClass =
    'mt-6 max-w-xl text-muted-foreground prose-neutral dark:prose-invert prose-base sm:prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed prose-headings:text-primary-onBg';

  return (
    <section className="py-20 sm:py-24 bg-muted/45 overflow-x-hidden">
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
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-muted/45 via-muted/30 to-transparent"
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
            <AboutStatCards stats={stats} className="mt-8 sm:mt-10 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutBlock;

import { HtmlPreview } from '@/components/HtmlPreview';
import { AboutMediaVisual } from '@/components/about/AboutMediaVisual';
import { AboutStatCards } from '@/components/about/AboutStatCards';
import { useCms } from '@/store/cmsStore';

const AboutBlock = () => {
  const { about } = useCms();
  if (!about.enabled) return null;
  const stats = about.stats ?? [];
  const cornerHighlight =
    stats[0] && (stats[0].value ?? '').trim()
      ? { value: (stats[0].value ?? '').trim(), label: (stats[0].label ?? '').trim() || 'Years of practice' }
      : null;
  const previewBodyClass =
    'mt-6 max-w-xl text-muted-foreground prose-neutral dark:prose-invert prose-base sm:prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed prose-headings:text-primary-onBg';

  return (
    <section className="py-20 sm:py-24 bg-background overflow-x-hidden">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-14 xl:gap-x-16 gap-10 lg:gap-y-0 lg:items-start">
          <AboutMediaVisual
            imageSrc={about.image || ''}
            alt={about.title || 'About'}
            className="order-1 w-full"
            cornerHighlight={cornerHighlight}
          />
          <div className="order-2 min-w-0 flex flex-col">
            {about.eyebrow ? (
              <span className="block text-xs font-bold uppercase tracking-[0.2em] text-accent">{about.eyebrow}</span>
            ) : null}
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-primary-onBg leading-[1.12] tracking-tight [overflow-wrap:anywhere]">
              {about.title}
            </h2>
            <div className="min-w-0">
              <HtmlPreview content={about.body || ''} containWideBlocks className={previewBodyClass} />
            </div>
            <AboutStatCards stats={stats} className="mt-8 sm:mt-10 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutBlock;

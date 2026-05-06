import { Star, Quote } from 'lucide-react';
import { useCms } from '@/store/cmsStore';
import { CmsImage } from '@/components/CmsImage';
import { HtmlPreview } from '@/components/HtmlPreview';
import { testimonialPortraitSrc } from '@/lib/cmsImageFallbacks';

const Testimonials = () => {
  const { testimonials } = useCms();
  const heading = testimonials.title?.trim() || 'What Our Clients Say';
  const intro = testimonials.intro?.trim();
  const metrics = testimonials.metrics || [];
  const items = (testimonials.items || []).filter((t) => t.enabled).sort((a, b) => a.order - b.order);

  if (items.length === 0) return null;

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">{heading}</h2>
          {intro ? (
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-3">
              {intro}
            </p>
          ) : null}
        </div>

        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] items-stretch">
          {items.map((testimonial, idx) => (
            <div
              key={testimonial.id}
              className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg border border-border/50 card-hover flex flex-col h-full min-h-0 min-w-0"
            >
              <div className="mb-3 shrink-0">
                <Quote className="w-8 h-8 text-accent mb-3" />
                <div className="flex flex-wrap gap-0.5">
                  {Array.from({ length: Math.min(5, Math.max(1, testimonial.rating)) }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent shrink-0" />
                  ))}
                </div>
              </div>

              <blockquote className="flex-1 min-h-0 min-w-0 mb-6 m-0 border-0 pl-0 not-italic">
                <HtmlPreview
                  content={testimonial.content}
                  containWideBlocks
                  className="text-muted-foreground text-sm leading-relaxed italic prose-p:text-muted-foreground prose-p:text-sm prose-p:leading-relaxed prose-p:italic prose-headings:text-card-foreground"
                />
              </blockquote>

              <div className="mt-auto flex items-center gap-3 min-w-0 pt-1 border-t border-border/40">
                <CmsImage
                  src={testimonialPortraitSrc(testimonial.image, idx)}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                  fallbackKind="card"
                  fillEmpty
                />
                <div className="min-w-0">
                  <h4 className="font-semibold text-card-foreground text-sm truncate">
                    {testimonial.name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 [overflow-wrap:anywhere]">
                    {testimonial.roleTitle}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {metrics.length > 0 && (
          <div className="mt-12 w-full max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-0 bg-card rounded-lg border border-border/60 shadow-md overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border">
              {metrics.map((m, idx) => (
                <div key={`testimonial-metric-${idx}`} className="text-center px-6 py-5 sm:py-6">
                  <div className="text-xl sm:text-2xl font-bold text-primary-onBg">{m.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;

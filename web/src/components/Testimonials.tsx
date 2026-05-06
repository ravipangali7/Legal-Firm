import { Star, Quote } from 'lucide-react';
import { useCms } from '@/store/cmsStore';
import { CmsImage } from '@/components/CmsImage';
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((testimonial, idx) => (
            <div
              key={testimonial.id}
              className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg border border-border/50 card-hover"
            >
              <div className="mb-4">
                <Quote className="w-8 h-8 text-accent mb-4" />
                <div className="flex mb-3">
                  {Array.from({ length: Math.min(5, Math.max(1, testimonial.rating)) }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <CmsImage
                  src={testimonialPortraitSrc(testimonial.image, idx)}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                  fallbackKind="card"
                  fillEmpty
                />
                <div>
                  <h4 className="font-semibold text-card-foreground text-sm">
                    {testimonial.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.roleTitle}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {metrics.length > 0 && (
          <div className="mt-12 w-full max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 bg-card rounded-lg border border-border/60 shadow-md overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border">
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

import { useCallback, useEffect, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { useCms } from '@/store/cmsStore';
import { CmsImage } from '@/components/CmsImage';
import { HtmlPreview } from '@/components/HtmlPreview';
import { testimonialPortraitSrc } from '@/lib/cmsImageFallbacks';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

const Testimonials = () => {
  const { testimonials } = useCms();
  const heading = testimonials.title?.trim() || 'What Our Clients Say';
  const intro = testimonials.intro?.trim();
  const metrics = testimonials.metrics || [];
  const items = (testimonials.items || []).filter((t) => t.enabled).sort((a, b) => a.order - b.order);

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  const onCarouselSelect = useCallback((api: CarouselApi) => {
    setActiveIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!carouselApi) return;
    onCarouselSelect(carouselApi);
    carouselApi.on('reInit', onCarouselSelect);
    carouselApi.on('select', onCarouselSelect);
    return () => {
      carouselApi.off('select', onCarouselSelect);
      carouselApi.off('reInit', onCarouselSelect);
    };
  }, [carouselApi, onCarouselSelect]);

  if (items.length === 0) return null;

  const showControls = items.length > 1;

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

        <div className="relative mx-auto max-w-6xl px-10 sm:px-12">
          <Carousel
            className="w-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary/30 rounded-lg"
            opts={{
              align: 'start',
              loop: items.length > 2,
              containScroll: 'trimSnaps',
              watchDrag: true,
            }}
            setApi={setCarouselApi}
            tabIndex={0}
          >
            <CarouselContent className="items-stretch">
              {items.map((testimonial, idx) => (
                <CarouselItem
                  key={testimonial.id}
                  className="basis-[min(100%,20rem)] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg border border-border/50 card-hover flex flex-col h-full min-h-[280px] min-w-0">
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
                        draggable={false}
                      />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-card-foreground text-sm break-words [overflow-wrap:anywhere]">
                          {testimonial.name}
                        </h4>
                        <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">
                          {testimonial.roleTitle}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {showControls ? (
              <>
                <CarouselPrevious
                  type="button"
                  className="left-0 sm:left-1 border-border/80 bg-card/95 shadow-md hover:bg-card disabled:opacity-40"
                />
                <CarouselNext
                  type="button"
                  className="right-0 sm:right-1 border-border/80 bg-card/95 shadow-md hover:bg-card disabled:opacity-40"
                />
              </>
            ) : null}
          </Carousel>
          {showControls ? (
            <div
              className="mt-8 flex flex-wrap justify-center gap-2"
              role="group"
              aria-label="Choose a testimonial"
            >
              {items.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  aria-label={`Go to testimonial ${i + 1} of ${items.length}`}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  className={cn(
                    'h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    i === activeIndex ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55',
                  )}
                  onClick={() => carouselApi?.scrollTo(i)}
                />
              ))}
            </div>
          ) : null}
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

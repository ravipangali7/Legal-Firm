import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { useCms } from '@/store/cmsStore';

const cardClassName =
  'group relative marketing-card p-6 card-hover overflow-hidden block no-underline text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const ServicesGrid = () => {
  const { services } = useCms();
  const items = services.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  if (items.length === 0) return null;
  return (
    <section className="py-20 sm:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="eyebrow-label">What we do</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-onBg">Services that move your business forward</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((s) => {
            const iconKey = s.icon as keyof typeof Icons;
            const Icon = (iconKey in Icons ? Icons[iconKey] : Icons.Sparkles) as LucideIcon;
            const to = `/services/${encodeURIComponent(s.id)}`;
            return (
              <Link key={s.id} to={to} className={cardClassName}>
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent/5 rounded-full group-hover:bg-accent/15 transition-colors" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary-onBg flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-primary-onBg">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-accent">
                    Learn more <ArrowUpRight className="ml-1 h-4 w-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;

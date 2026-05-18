import { Link } from 'react-router-dom';
import { useCms } from '@/store/cmsStore';
import { CmsImage } from '@/components/CmsImage';
import { Calendar } from 'lucide-react';

const NewsGrid = () => {
  const { news } = useCms();
  const items = news.filter((n) => n.enabled).sort((a, b) => a.order - b.order);
  if (items.length === 0) return null;
  return (
    <section className="py-20 sm:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-3">
          <div>
            <span className="eyebrow-label">News & Events</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-primary-onBg">Latest from our desk</h2>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((n) => (
            <Link
              key={n.id}
              to={`/news/${n.id}`}
              className="group block marketing-card overflow-hidden card-hover text-left"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <CmsImage
                  src={n.image}
                  alt={n.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  fallbackKind="card"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold uppercase tracking-wider">{n.tag}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {n.date}</span>
                </div>
                <h3 className="mt-3 font-bold text-primary-onBg leading-snug group-hover:text-accent transition-colors">{n.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{n.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsGrid;

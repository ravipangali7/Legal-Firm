import { Link } from 'react-router-dom';
import { useCms } from '@/store/cmsStore';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';

const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

const TeamGrid = () => {
  const { team } = useCms();
  const items = team.filter((m) => m.enabled).sort((a, b) => a.order - b.order);
  if (items.length === 0) return null;
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">The team</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-onBg">Lawyers you can trust</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((m) => (
            <Link
              key={m.id}
              to={`/professionals/${encodeURIComponent(m.id)}`}
              className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-elegant transition-all block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="aspect-square bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-primary-foreground">
                {m.avatar ? (
                  <img src={cmsMediaSrc(m.avatar)} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-4xl font-bold">{initials(m.name)}</span>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs uppercase tracking-wider text-accent font-semibold">{m.role}</div>
                <div className="font-bold text-primary-onBg mt-1">{m.name}</div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.bio}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamGrid;

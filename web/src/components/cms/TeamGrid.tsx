import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Users, type LucideIcon } from 'lucide-react';
import { useCms } from '@/store/cmsStore';
import { CmsImage } from '@/components/CmsImage';
import { heroStatsWithLiveExperience } from '@/lib/professionalsHeroStats';

const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

const STAT_ICONS: Record<string, LucideIcon> = {
  users: Users,
  award: Award,
  book_open: BookOpen,
};

const TeamGrid = () => {
  const { team, professionalsPage } = useCms();
  const items = team.filter((m) => m.enabled).sort((a, b) => a.order - b.order);
  const heroStats = useMemo(
    () => heroStatsWithLiveExperience(professionalsPage?.stats, team),
    [professionalsPage?.stats, team],
  );
  const heading = professionalsPage?.title?.trim() || 'Lawyers you can trust';
  const subtitle = professionalsPage?.subtitle?.trim();
  if (items.length === 0) return null;
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="eyebrow-label">The team</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-onBg">{heading}</h2>
          {subtitle ? (
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">{subtitle}</p>
          ) : null}
          {heroStats.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8 sm:gap-10 mt-10">
              {heroStats.map((s) => {
                const Icon = STAT_ICONS[s.icon] ?? Users;
                return (
                  <div key={`${s.icon}-${s.label}`} className="text-center min-w-[100px]">
                    <Icon className="h-6 w-6 mx-auto mb-2 text-accent" />
                    <div className="text-2xl sm:text-3xl font-bold text-primary-onBg tabular-nums">{s.value}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((m) => (
            <Link
              key={m.id}
              to={`/professionals/${encodeURIComponent(m.id)}`}
              className="group marketing-card overflow-hidden card-hover block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="relative aspect-square bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-primary-foreground">
                {m.avatar?.trim() ? (
                  <CmsImage
                    src={m.avatar}
                    alt={m.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    fallbackKind="card"
                    fillEmpty
                  />
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

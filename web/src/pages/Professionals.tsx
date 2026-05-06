import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import {
  Mail,
  Linkedin,
  Briefcase,
  Award,
  BookOpen,
  Users,
  Facebook,
  Instagram,
  Twitter,
} from 'lucide-react';
import { CmsStoreProvider, useCms, type TeamMember } from '@/store/cmsStore';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { professionalsPageQueryOptions } from '@/lib/professionalsPageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { safeCmsExternalHref } from '@/lib/cmsAssetUrl';
import { CmsImage } from '@/components/CmsImage';
import type { ProfessionalsPageApi } from '@/lib/api';
import { heroStatsWithLiveExperience } from '@/lib/professionalsHeroStats';

const STAT_ICONS: Record<string, LucideIcon> = {
  users: Users,
  award: Award,
  book_open: BookOpen,
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

type SocialDef = {
  key: keyof Pick<TeamMember, 'linkedinUrl' | 'facebookUrl' | 'twitterUrl' | 'instagramUrl'>;
  Icon: typeof Linkedin;
  label: string;
};

const SOCIAL_ICONS: SocialDef[] = [
  { key: 'linkedinUrl', Icon: Linkedin, label: 'LinkedIn' },
  { key: 'facebookUrl', Icon: Facebook, label: 'Facebook' },
  { key: 'twitterUrl', Icon: Twitter, label: 'X / Twitter' },
  { key: 'instagramUrl', Icon: Instagram, label: 'Instagram' },
];

export function SocialRow({ member }: { member: TeamMember }) {
  const nodes: ReactNode[] = [];
  const mail = safeCmsExternalHref(member.contactEmail, 'email');
  if (mail) {
    nodes.push(
      <a
        key="mail"
        href={mail}
        aria-label="Email"
        className="text-muted-foreground hover:text-primary-onBg transition-colors"
      >
        <Mail className="h-4 w-4" />
      </a>,
    );
  }
  for (const { key, Icon, label } of SOCIAL_ICONS) {
    const href = safeCmsExternalHref(member[key], 'url');
    if (!href) continue;
    nodes.push(
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="text-muted-foreground hover:text-primary-onBg transition-colors"
      >
        <Icon className="h-4 w-4" />
      </a>,
    );
  }
  if (nodes.length === 0) return null;
  return <div className="flex justify-center gap-3 mt-5 pt-4 border-t">{nodes}</div>;
}

function ProfessionalsBody({
  loadError,
  page,
  pageError,
}: {
  loadError: boolean;
  page: ProfessionalsPageApi | undefined;
  pageError: boolean;
}) {
  const { team: allTeam } = useCms();

  const team = useMemo(
    () => [...allTeam].filter((m) => m.enabled).sort((a, b) => a.order - b.order),
    [allTeam],
  );

  const heroStats = useMemo(() => heroStatsWithLiveExperience(page?.stats, team), [page?.stats, team]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-16 px-4 mb-12">
          <div className="container mx-auto max-w-7xl text-center">
            {pageError && !page ? (
              <p className="text-lg text-primary-foreground/90 max-w-xl mx-auto">
                The professionals summary could not be loaded. Check that the API is running and try again.
              </p>
            ) : (
              <>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{page?.title}</h1>
                {page?.subtitle ? (
                  <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">{page.subtitle}</p>
                ) : null}
                <div className="flex flex-wrap justify-center gap-8 mt-10">
                  {heroStats.map((s) => {
                    const Icon = STAT_ICONS[s.icon] ?? Users;
                    return (
                      <div key={s.label} className="text-center">
                        <Icon className="h-6 w-6 mx-auto mb-2 text-primary-foreground/70" />
                        <div className="text-3xl font-bold">{s.value}</div>
                        <div className="text-sm text-primary-foreground/70">{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {(loadError || (pageError && page)) && (
              <p className="text-sm text-primary-foreground/90 mt-4 max-w-xl mx-auto">
                {loadError ? 'Live roster could not be loaded; showing saved or default content.' : ''}
                {loadError && pageError && page ? ' ' : ''}
                {pageError && page ? 'Summary numbers may be out of date.' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4">
          {team.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No team members are published yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map((p) => {
                return (
                  <Card
                    key={p.id}
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md"
                  >
                    <CardContent className="p-0">
                      <Link
                        to={`/professionals/${encodeURIComponent(p.id)}`}
                        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
                      >
                        <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                        <div className="p-6 text-center">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4 ring-4 ring-primary/10 group-hover:ring-primary/30 transition-all overflow-hidden">
                            {p.avatar?.trim() ? (
                              <CmsImage
                                src={p.avatar}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                fallbackKind="card"
                                fillEmpty
                              />
                            ) : (
                              initials(p.name)
                            )}
                          </div>
                          <h3 className="text-lg font-bold">{p.name}</h3>
                          <p className="text-sm text-primary-onBg font-medium flex items-center justify-center gap-1 mt-1">
                            <Briefcase className="h-3.5 w-3.5" /> {p.role}
                          </p>
                          {p.bio ? (
                            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.bio}</p>
                          ) : null}
                        </div>
                      </Link>
                      <div className="px-6 pb-6">
                        <SocialRow member={p} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

const Professionals = () => {
  const { data, isLoading, isError } = useQuery(siteHomepageQueryOptions);
  const {
    data: pageData,
    isLoading: pageLoading,
    isError: pageError,
  } = useQuery(professionalsPageQueryOptions);
  const initialSnapshot = useMemo(() => (data ? mapHomepageApiToSnapshot(data) : null), [data]);

  if (isLoading || pageLoading) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      </CmsStoreProvider>
    );
  }

  return (
    <CmsStoreProvider initialSnapshot={initialSnapshot}>
      <ProfessionalsBody loadError={isError} page={pageData} pageError={pageError} />
    </CmsStoreProvider>
  );
};

export default Professionals;

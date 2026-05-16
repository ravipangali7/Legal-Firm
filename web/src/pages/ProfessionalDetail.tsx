import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CmsStoreProvider, useCms } from '@/store/cmsStore';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { CmsImage } from '@/components/CmsImage';
import { SocialRow, initials } from './Professionals';
import { usePageSeo } from '@/context/SeoContext';

function ProfessionalDetailBody({ loadError, memberId }: { loadError: boolean; memberId: string }) {
  const { team: allTeam } = useCms();
  const team = useMemo(
    () => [...allTeam].filter((m) => m.enabled).sort((a, b) => a.order - b.order),
    [allTeam],
  );
  const id = decodeURIComponent(memberId);
  const member = team.find((m) => m.id === id);

  usePageSeo(
    member
      ? {
          title: member.name,
          description: `${member.role} — ${member.bio || 'Tax and legal professional at TaxLexis.'}`,
          pathname: `/professionals/${encodeURIComponent(member.id)}`,
          type: 'profile',
          image: member.avatar,
        }
      : null
  );

  if (!member) {
    return (
      <main className="pt-28 pb-16 px-4 flex-1">
        <div className="container mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">Professional not found</h1>
          <p className="text-muted-foreground mb-6">
            This team member is not listed or the link may be outdated.
          </p>
          <Button asChild>
            <Link to="/professionals">Back to professionals</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-16">
      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-12 px-4 mb-10">
        <div className="container mx-auto max-w-3xl">
          <Button
            asChild
            variant="ghost"
            className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 -ml-2 mb-6"
          >
            <Link to="/professionals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All professionals
            </Link>
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-28 h-28 shrink-0 rounded-full bg-primary-foreground/15 ring-4 ring-primary-foreground/20 flex items-center justify-center text-3xl font-bold overflow-hidden">
              {member.avatar?.trim() ? (
                <CmsImage
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                  fallbackKind="card"
                  fillEmpty
                />
              ) : (
                initials(member.name)
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{member.name}</h1>
              <p className="text-primary-foreground/85 mt-2 flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 shrink-0 opacity-90" />
                {member.role}
              </p>
            </div>
          </div>
          {loadError && (
            <p className="text-sm text-primary-foreground/90 mt-6 max-w-xl">
              Live profile could not be loaded; showing saved or default content.
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4">
        {member.bio ? (
          <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">{member.bio}</p>
        ) : (
          <p className="text-muted-foreground italic">No biography has been added for this profile yet.</p>
        )}
        <div className="mt-8">
          <SocialRow member={member} />
        </div>
      </div>
    </main>
  );
}

const ProfessionalDetail = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { data, isLoading, isError } = useQuery(siteHomepageQueryOptions);
  const initialSnapshot = useMemo(() => (data ? mapHomepageApiToSnapshot(data) : null), [data]);

  if (!memberId) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 px-4 flex-1">
            <div className="container mx-auto max-w-2xl text-center">
              <h1 className="text-2xl font-semibold mb-2">Invalid link</h1>
              <Button asChild className="mt-4">
                <Link to="/professionals">Back to professionals</Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </CmsStoreProvider>
    );
  }

  if (isLoading) {
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
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <ProfessionalDetailBody loadError={isError} memberId={memberId} />
        <Footer />
      </div>
    </CmsStoreProvider>
  );
};

export default ProfessionalDetail;

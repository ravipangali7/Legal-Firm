import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Bookmark, 
  Share2, 
  FileText,
  Calendar,
  MapPin,
  Users,
  Scale,
  Star,
  ChevronRight,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { HtmlPreview } from '@/components/HtmlPreview';
import { sampleCases, type Case } from '@/data/sampleCases';
import { getPracticeAreaBySlug } from '@/data/practiceAreas';
import { fetchPublicLegalCaseBySlug } from '@/lib/api';
import { mapLegalCaseApiToCase } from '@/lib/legalCaseMap';
import { useAuth } from '@/context/AuthContext';
import { hasLibraryEntitlement } from '@/lib/subscriptionAccess';
import { usePageSeo } from '@/context/SeoContext';
import { entitySeoDescription, entitySeoTitle } from '@/lib/seo';
import type { LegalCaseApi } from '@/lib/legalCaseMap';

const FullCaseContent = () => {
  const { caseId } = useParams();
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const { data: caseLoad, isLoading, isError } = useQuery({
    queryKey: ['legal-case', caseId],
    queryFn: async (): Promise<{ caseData: Case | null; api: LegalCaseApi | null }> => {
      if (!caseId) return { caseData: null, api: null };
      try {
        const api = await fetchPublicLegalCaseBySlug(caseId);
        if (api) return { caseData: mapLegalCaseApiToCase(api), api };
      } catch {
        /* API unreachable — fall back to bundled samples */
      }
      const fallback = sampleCases.find((c) => c.id === caseId || c.slug === caseId) ?? null;
      return { caseData: fallback, api: null };
    },
    enabled: Boolean(caseId),
    staleTime: 60_000,
    retry: 1,
  });

  const caseData = caseLoad?.caseData ?? null;
  const caseApi = caseLoad?.api ?? null;

  usePageSeo(
    caseData && caseId
      ? {
          title: entitySeoTitle(caseApi?.meta_title, caseData.title),
          description: entitySeoDescription(caseApi?.meta_description, caseData.teaser),
          pathname: `/case/${caseId}`,
          type: 'article',
        }
      : null
  );

  const handleDownloadPDF = () => {
    console.log('Downloading PDF for case:', caseData?.id);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    console.log('Bookmarked:', !isBookmarked);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: caseData?.title,
        text: caseData?.teaser,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Loading case…
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Case Not Found</h2>
        <p className="text-muted-foreground mb-6">
          {isError ? 'The case could not be loaded from the server.' : 'The requested case could not be found.'}
        </p>
        <Link to="/practice-areas/taxation-law">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to practice areas
          </Button>
        </Link>
      </div>
    );
  }

  if (!hasLibraryEntitlement(user)) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4 rounded-xl border border-border bg-card p-8">
        <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold">Take a subscription</h2>
        <p className="text-sm text-muted-foreground">
          Legal case details are available with an active subscription. Open Pricing or your dashboard wallet to
          subscribe.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button asChild>
            <Link to="/pricing">View pricing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard?tab=wallet">Dashboard wallet</Link>
          </Button>
        </div>
      </div>
    );
  }

  const pa = getPracticeAreaBySlug(caseData.practiceArea);
  const practiceBackHref = `/practice-areas/${caseData.practiceArea}`;
  const practiceBackLabel = pa ? `${pa.name} cases` : 'practice area';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
            <Link to={practiceBackHref} className="hover:text-primary-onBg">
              {pa?.name ?? caseData.practiceArea}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Case Details</span>
          </nav>
          
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary">{caseData.referenceNumber}</Badge>
            <Badge className="bg-accent/20 text-accent-onBg">
              {caseData.category}
            </Badge>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">{caseData.title}</h1>
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadPDF} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button 
            onClick={handleBookmark} 
            variant="outline" 
            size="sm"
            className={isBookmarked ? 'bg-accent/20' : ''}
          >
            <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          <Button onClick={handleShare} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Case Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Case Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Filed</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(caseData.dateFiled).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            {caseData.dateDecided && (
              <div className="flex items-center gap-3">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Decided</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(caseData.dateDecided).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Court</p>
                <p className="text-sm text-muted-foreground">{caseData.court}</p>
              </div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Parties Involved</h3>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
              <HtmlPreview content={caseData.parties} className="prose-p:text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Background */}
      {caseData.fullContent && (
        <Card>
          <CardHeader>
            <CardTitle>Case Background</CardTitle>
          </CardHeader>
          <CardContent>
            <HtmlPreview content={caseData.fullContent.background} className="prose prose-sm max-w-none" />
          </CardContent>
        </Card>
      )}

      {/* Legal Arguments */}
      {caseData.fullContent?.legalArguments && (
        <Card>
          <CardHeader>
            <CardTitle>Legal Arguments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {caseData.fullContent.legalArguments.map((argument, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary-onBg mt-0.5">
                    {index + 1}
                  </div>
                  <HtmlPreview content={argument} className="prose prose-sm max-w-none text-sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Court Judgment */}
      {caseData.fullContent?.judgment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Court Judgment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HtmlPreview content={caseData.fullContent.judgment} className="prose prose-sm max-w-none" />
          </CardContent>
        </Card>
      )}

      {/* Expert Analysis */}
      {caseData.fullContent?.analysis && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-onBg">
              <Star className="h-5 w-5" />
              Expert Legal Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HtmlPreview content={caseData.fullContent.analysis} className="prose prose-sm max-w-none" />
          </CardContent>
        </Card>
      )}

      {/* Practical Implications */}
      {caseData.fullContent?.implications && (
        <Card>
          <CardHeader>
            <CardTitle>Practical Implications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {caseData.fullContent.implications.map((implication, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                  <HtmlPreview content={implication} className="prose prose-sm max-w-none flex-1 min-w-0 text-sm" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Related Precedents */}
      {caseData.fullContent?.precedents && (
        <Card>
          <CardHeader>
            <CardTitle>Related Precedents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {caseData.fullContent.precedents.map((precedent, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">{precedent}</span>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Insights */}
      {caseData.fullContent?.strategicInsights && (
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent-foreground">
              Strategic Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {caseData.fullContent.strategicInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent-foreground mt-0.5">
                    !
                  </div>
                  <HtmlPreview content={insight} className="prose prose-sm max-w-none flex-1 min-w-0 text-sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Outcome */}
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-800 dark:text-green-200">Final Outcome</CardTitle>
        </CardHeader>
        <CardContent>
          <HtmlPreview
            content={caseData.outcome}
            className="prose prose-sm max-w-none text-green-700 dark:text-green-300 prose-p:text-green-700 dark:prose-p:text-green-300"
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center pt-8">
        <Link to={practiceBackHref}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {practiceBackLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default FullCaseContent;
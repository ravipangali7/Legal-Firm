import { X, Calendar, MapPin, Users, Scale, Lock, Star, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HtmlPreview } from '@/components/HtmlPreview';
import { looksLikeHtml } from '@/lib/summaryHtml';
import { Case } from '@/data/sampleCases';

interface CaseModalProps {
  case: Case | null;
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  onLogin: () => void;
}

const CaseModal = ({ case: caseData, isOpen, onClose, onSubscribe, onLogin }: CaseModalProps) => {
  if (!caseData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold mb-2 pr-8">
                {caseData.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="text-xs">
                  {caseData.referenceNumber}
                </Badge>
                <Badge className="text-xs bg-accent/20 text-accent-onBg">
                  {caseData.category}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Case Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Filed</div>
                <div>{new Date(caseData.dateFiled).toLocaleDateString()}</div>
              </div>
            </div>
            
            {caseData.dateDecided && (
              <div className="flex items-center gap-2 text-sm">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Decided</div>
                  <div>{new Date(caseData.dateDecided).toLocaleDateString()}</div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Court</div>
                <div className="text-muted-foreground">{caseData.court}</div>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Parties Involved</h3>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
              <HtmlPreview content={caseData.parties} className="prose-p:text-muted-foreground" />
            </div>
          </div>

          {/* Case Summary */}
          <div>
            <h3 className="font-semibold mb-3">Case Summary</h3>
            {looksLikeHtml(caseData.summary) ? (
              <HtmlPreview content={caseData.summary} className="text-sm" />
            ) : (
              <div className="space-y-3 text-sm leading-relaxed">
                {caseData.summary.split('. ').map((sentence, index) => (
                  <p key={index}>
                    {sentence}
                    {sentence.endsWith('.') ? '' : '.'}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Key Legal Points */}
          {caseData.keyPoints.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Key Legal Points</h3>
              <ul className="space-y-2">
                {caseData.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Star className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <HtmlPreview content={point} className="prose prose-sm max-w-none flex-1 min-w-0 text-sm" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Outcome */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Case Outcome</h3>
            <HtmlPreview
              content={caseData.outcome}
              className="prose prose-sm max-w-none text-sm text-green-700 dark:text-green-300 prose-p:text-green-700 dark:prose-p:text-green-300"
            />
          </div>

          {/* Subscription CTA */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg border-2 border-dashed border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-6 w-6 text-primary-onBg" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Want to read the full case analysis?</h3>
                <p className="text-muted-foreground mb-4">
                  Get access to complete case details, expert legal analysis, court judgments, and strategic insights.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span>Detailed legal arguments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span>Full court judgment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span>Expert analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span>Practical implications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span>Related precedents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span>Strategic insights</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={onSubscribe} className="btn-primary">
                    Subscribe Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button onClick={onLogin} variant="outline">
                    Already have an account? Login
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-3">
                  Starting from NPR 999/month • 7-day free trial • Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CaseModal;
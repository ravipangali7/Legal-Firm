import { Calendar, MapPin, Badge, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Case } from '@/data/sampleCases';

interface CaseCardProps {
  case: Case;
  onPreview: (caseData: Case) => void;
}

const CaseCard = ({ case: caseData, onPreview }: CaseCardProps) => {
  return (
    <Card className="h-full flex flex-col card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
            {caseData.referenceNumber}
          </span>
          <span className={`
            text-xs font-medium px-2 py-1 rounded-full
            ${caseData.category === 'Banking Tax Cases' ? 'bg-blue-100 text-blue-700' :
              caseData.category === 'Insurance Tax Cases' ? 'bg-green-100 text-green-700' :
              caseData.category === 'Corporate Tax Cases' ? 'bg-purple-100 text-purple-700' :
              caseData.category === 'VAT Cases' ? 'bg-orange-100 text-orange-700' :
              caseData.category === 'Income Tax Cases' ? 'bg-red-100 text-red-700' :
              'bg-accent/20 text-accent-onBg'
            }
          `}>
            {caseData.category}
          </span>
        </div>
        
        <CardTitle 
          className="text-lg leading-tight cursor-pointer hover:text-primary-onBg transition-colors duration-200"
          onClick={() => onPreview(caseData)}
        >
          {caseData.title}
        </CardTitle>
        
        <CardDescription className="text-sm line-clamp-2">
          {caseData.teaser}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>Filed: {new Date(caseData.dateFiled).toLocaleDateString()}</span>
          </div>
          
          {caseData.dateDecided && (
            <div className="flex items-center gap-2">
              <Badge className="h-4 w-4 flex-shrink-0" />
              <span>Decided: {new Date(caseData.dateDecided).toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{caseData.court}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <Button 
          onClick={() => onPreview(caseData)}
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview Case
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CaseCard;
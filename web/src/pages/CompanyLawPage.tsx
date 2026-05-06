import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, FileText, Users, Briefcase, Globe, AlertCircle } from 'lucide-react';
import CategoryFilter from '@/components/CategoryFilter';
import CasesList from '@/components/CasesList';
import CaseModal from '@/components/CaseModal';
import SubscriptionModal from '@/components/SubscriptionModal';
import { buildCaseFilterCategories, sampleCases, type Case } from '@/data/sampleCases';
import { useAuth } from '@/context/AuthContext';

const CompanyLawPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const casesForArea = useMemo(
    () => sampleCases.filter((c) => c.practiceArea === 'company-law'),
    []
  );
  const caseFilterCategories = useMemo(
    () => buildCaseFilterCategories('Company Law', casesForArea),
    [casesForArea]
  );
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCategoryChange = async (category: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSelectedCategory(category);
    setLoading(false);
  };

  const handleCasePreview = (caseData: Case) => {
    setSelectedCase(caseData);
    setShowCaseModal(true);
  };

  const handleSubscribe = () => {
    if (authLoading) return;
    setShowCaseModal(false);
    if (!user) {
      const next = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setShowSubscriptionModal(true);
  };

  const handleLogin = () => {
    setShowCaseModal(false);
    const next = `${location.pathname}${location.search}`;
    navigate(`/login?next=${encodeURIComponent(next)}`);
  };

  const services = [
    {
      icon: FileText,
      title: 'Company Registration',
      description: 'Complete company registration services including name reservation and incorporation'
    },
    {
      icon: Users,
      title: 'Corporate Compliance',
      description: 'Ongoing compliance management and regulatory filing requirements'
    },
    {
      icon: Briefcase,
      title: 'Corporate Governance',
      description: 'Board governance, shareholder meetings, and corporate restructuring'
    },
    {
      icon: Globe,
      title: 'Business Licensing',
      description: 'Assistance with various business licenses and regulatory approvals'
    },
    {
      icon: AlertCircle,
      title: 'Company Dissolution',
      description: 'Complete company winding up and dissolution procedures'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Building2 className="h-8 w-8 text-primary-onBg" />
          </div>
          <h1 className="section-title">Company Law</h1>
        </div>
        
        <p className="text-lg text-muted-foreground max-w-3xl">
          Comprehensive company law services covering incorporation, compliance, governance, 
          and all aspects of corporate legal requirements in Nepal.
        </p>
        
        <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
          <span className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
            Company Registration
          </span>
          <span className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
            Corporate Compliance
          </span>
          <span className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
            Business Licensing
          </span>
          <span className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
            Corporate Governance
          </span>
        </div>
      </div>

      <div>
        <h2 className="subsection-title">Our Company Law Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div key={index} className="p-6 bg-card rounded-lg shadow-sm border card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconComponent className="h-5 w-5 text-primary-onBg" />
                  </div>
                  <h3 className="font-semibold">{service.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="subsection-title mb-6">Related Company Law Cases</h2>
        
        <CategoryFilter
          categories={caseFilterCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          loading={loading}
        />
        
        <CasesList
          cases={casesForArea}
          selectedCategory={selectedCategory}
          onCasePreview={handleCasePreview}
        />
      </div>

      <CaseModal
        case={selectedCase}
        isOpen={showCaseModal}
        onClose={() => setShowCaseModal(false)}
        onSubscribe={handleSubscribe}
        onLogin={handleLogin}
      />
      
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
};

export default CompanyLawPage;
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Receipt, Scale, FileText, Users, Globe, AlertCircle } from 'lucide-react';
import CategoryFilter from '@/components/CategoryFilter';
import CasesList from '@/components/CasesList';
import CaseModal from '@/components/CaseModal';
import SubscriptionModal from '@/components/SubscriptionModal';
import { buildCaseFilterCategories, sampleCases, type Case } from '@/data/sampleCases';
import { useAuth } from '@/context/AuthContext';

const TaxLawPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const casesForArea = useMemo(
    () => sampleCases.filter((c) => c.practiceArea === 'taxation-law'),
    []
  );
  const caseFilterCategories = useMemo(
    () => buildCaseFilterCategories('Tax Law', casesForArea),
    [casesForArea]
  );
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCategoryChange = async (category: string) => {
    setLoading(true);
    // Simulate API call delay
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
      title: 'Tax Compliance and Filing',
      description: 'Complete tax return preparation and filing services for individuals and businesses'
    },
    {
      icon: Scale,
      title: 'Tax Planning and Advisory',
      description: 'Strategic tax planning to minimize liability and ensure regulatory compliance'
    },
    {
      icon: AlertCircle,
      title: 'Tax Dispute Resolution',
      description: 'Expert representation in tax disputes and appeals before revenue authorities'
    },
    {
      icon: Users,
      title: 'Corporate Tax Matters',
      description: 'Specialized corporate taxation services including mergers, acquisitions, and restructuring'
    },
    {
      icon: Globe,
      title: 'International Tax Issues',
      description: 'Cross-border taxation, transfer pricing, and double taxation treaty matters'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center md:text-left">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Receipt className="h-8 w-8 text-primary-onBg" />
          </div>
          <h1 className="section-title">Taxation Law</h1>
        </div>
        
        <p className="text-lg text-muted-foreground max-w-3xl">
          Our taxation law practice provides comprehensive legal services covering all aspects of Nepal's 
          tax system, from compliance and planning to dispute resolution and appeals.
        </p>
        
        <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
          <span className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
            Tax Compliance
          </span>
          <span className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
            VAT & Income Tax
          </span>
          <span className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
            International Tax
          </span>
          <span className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
            Tax Disputes
          </span>
        </div>
      </div>

      {/* Service Overview */}
      <div>
        <h2 className="subsection-title">Our Tax Law Services</h2>
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

      {/* Related Cases Section */}
      <div>
        <h2 className="subsection-title mb-6">Related Tax Law Cases</h2>
        
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

      {/* Modals */}
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

export default TaxLawPage;
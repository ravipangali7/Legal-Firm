import { Scale, BookOpen, Gavel, Users, Globe, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LawDetails = () => {
  const lawAreas = [
    {
      icon: Scale,
      title: 'Constitutional Law',
      description: 'Understanding Nepal\'s constitutional framework, fundamental rights, and governance structure',
      details: [
        'Fundamental Rights and Duties',
        'Constitutional Interpretation',
        'Judicial Review Process',
        'Federal Structure and Governance'
      ]
    },
    {
      icon: BookOpen,
      title: 'Civil Code',
      description: 'Comprehensive coverage of Nepal\'s civil law including property, contracts, and obligations',
      details: [
        'Property Rights and Ownership',
        'Contract Law and Agreements',
        'Tort Law and Liability',
        'Succession and Inheritance'
      ]
    },
    {
      icon: Gavel,
      title: 'Criminal Justice System',
      description: 'Criminal law procedures, rights of accused, and justice administration in Nepal',
      details: [
        'Criminal Procedure Code',
        'Rights of the Accused',
        'Court Procedures',
        'Sentencing Guidelines'
      ]
    },
    {
      icon: Users,
      title: 'Administrative Law',
      description: 'Government administration, public service regulations, and administrative procedures',
      details: [
        'Administrative Procedures',
        'Public Service Regulations',
        'Government Decision Making',
        'Administrative Remedies'
      ]
    },
    {
      icon: Globe,
      title: 'International Law',
      description: 'Nepal\'s engagement with international legal frameworks and treaties',
      details: [
        'International Treaties',
        'Diplomatic Relations',
        'International Trade Law',
        'Human Rights Conventions'
      ]
    },
    {
      icon: Shield,
      title: 'Human Rights Law',
      description: 'Protection of human rights and fundamental freedoms under Nepalese law',
      details: [
        'Fundamental Rights Protection',
        'Anti-Discrimination Laws',
        'Women\'s Rights',
        'Children\'s Rights'
      ]
    }
  ];

  const legalPrinciples = [
    {
      title: 'Rule of Law',
      description: 'The principle that all persons and institutions are subject to and accountable to law'
    },
    {
      title: 'Due Process',
      description: 'Fair treatment through the normal judicial system with proper legal procedures'
    },
    {
      title: 'Equal Justice',
      description: 'Equal treatment of all individuals before the law regardless of status or background'
    },
    {
      title: 'Legal Certainty',
      description: 'Laws must be clear, predictable, and consistently applied by all authorities'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center md:text-left">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Scale className="h-8 w-8 text-primary-onBg" />
          </div>
          <h1 className="section-title">Understanding Law in Nepal</h1>
        </div>
        
        <p className="text-lg text-muted-foreground max-w-4xl">
          Nepal's legal system is based on a written constitution and follows a federal democratic republican 
          framework. Our legal system combines traditional practices with modern jurisprudence, creating a 
          unique legal landscape that serves the diverse needs of our society.
        </p>
      </div>

      {/* Legal System Overview */}
      <div>
        <h2 className="subsection-title">Legal System Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Court Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-primary/5 rounded-lg">
                  <h4 className="font-semibold text-primary-onBg">Supreme Court</h4>
                  <p className="text-sm text-muted-foreground">Highest court of final appeal</p>
                </div>
                <div className="p-3 bg-secondary/5 rounded-lg">
                  <h4 className="font-semibold">High Courts</h4>
                  <p className="text-sm text-muted-foreground">Provincial level appellate courts</p>
                </div>
                <div className="p-3 bg-accent/5 rounded-lg">
                  <h4 className="font-semibold">District Courts</h4>
                  <p className="text-sm text-muted-foreground">Primary trial courts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sources of Law</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Constitution of Nepal 2015</h4>
                    <p className="text-sm text-muted-foreground">Supreme law of the land</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Federal and Provincial Laws</h4>
                    <p className="text-sm text-muted-foreground">Legislation by parliament and assemblies</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Judicial Precedents</h4>
                    <p className="text-sm text-muted-foreground">Court decisions and interpretations</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Areas of Law */}
      <div>
        <h2 className="subsection-title">Major Areas of Law</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lawAreas.map((area, index) => {
            const IconComponent = area.icon;
            return (
              <Card key={index} className="card-hover">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary-onBg" />
                    </div>
                    <CardTitle className="text-lg">{area.title}</CardTitle>
                  </div>
                  <CardDescription>{area.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {area.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Legal Principles */}
      <div>
        <h2 className="subsection-title">Fundamental Legal Principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {legalPrinciples.map((principle, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{principle.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {principle.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Legal Resources */}
      <div>
        <h2 className="subsection-title">Legal Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-6">
            <BookOpen className="h-12 w-12 text-primary-onBg mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Legal Acts & Codes</h3>
            <p className="text-sm text-muted-foreground">
              Access to all major legal acts and codes of Nepal
            </p>
          </Card>
          <Card className="text-center p-6">
            <Gavel className="h-12 w-12 text-primary-onBg mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Case Law</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive database of court decisions and precedents
            </p>
          </Card>
          <Card className="text-center p-6">
            <Users className="h-12 w-12 text-primary-onBg mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Legal Guidance</h3>
            <p className="text-sm text-muted-foreground">
              Expert interpretation and practical guidance
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LawDetails;
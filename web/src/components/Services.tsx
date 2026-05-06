import { Building, Calculator, Lightbulb, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Services = () => {
  const services = [
    {
      icon: Building,
      title: "Company & Corporate",
      description: "Complete corporate services including company registration, name change, share transfers, and compliance management.",
      features: [
        "Company Registration",
        "Name Change Procedures", 
        "Share Transfer Services",
        "Corporate Compliance",
        "Board Resolutions"
      ]
    },
    {
      icon: Calculator,
      title: "Accounting Services",
      description: "Professional accounting and auditing services with comprehensive tax planning and business financial management.",
      features: [
        "Financial Auditing",
        "PAN/VAT Registration",
        "Tax Return Filing",
        "Business Plan Development",
        "Financial Consulting"
      ]
    },
    {
      icon: Lightbulb,
      title: "Intellectual Property",
      description: "Protect your innovations and brand with our comprehensive IP services covering patents, trademarks, and designs.",
      features: [
        "Patent Registration",
        "Trademark Protection",
        "Design Registration",
        "IP Portfolio Management",
        "Infringement Cases"
      ]
    },
    {
      icon: FileText,
      title: "Legal Services",
      description: "Full-spectrum legal services across all practice areas with expert representation and advisory support.",
      features: [
        "Legal Consultation",
        "Contract Drafting",
        "Litigation Support",
        "Legal Documentation",
        "Compliance Advisory"
      ]
    }
  ];

  return (
    <section id="services" className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">Our Professional Services</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Comprehensive legal and tax advisory services tailored to meet your business needs 
            across all sectors in Nepal.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-xl p-6 shadow-elegant hover:shadow-gold card-hover border border-border/50"
              >
                <div className="mb-6">
                  <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-card-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full group">
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="btn-primary">
            View All Services
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;
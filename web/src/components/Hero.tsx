import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Scale, Users } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative min-h-screen pt-32 pb-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-hero opacity-95"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-primary/10 rounded-full blur-2xl"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm">
                <Shield size={16} />
                Trusted Legal Advisory Since 2010
              </div>
              
              <h1 className="hero-title">
                Expert Legal &amp; Tax Solutions for Nepal
              </h1>
              
              <p className="text-xl text-white/90 leading-relaxed max-w-lg">
                Navigate complex legal and tax matters with confidence. Our expert team provides 
                comprehensive advisory services across corporate law, taxation, and intellectual property.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="btn-accent group">
                Get Free Consultation
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                View Our Services
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">500+</div>
                <div className="text-white/80 text-sm">Cases Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">15+</div>
                <div className="text-white/80 text-sm">Years Experience</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">100+</div>
                <div className="text-white/80 text-sm">Happy Clients</div>
              </div>
            </div>
          </div>

          {/* Visual element */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                    <Scale className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Legal Expertise</h3>
                    <p className="text-white/70 text-sm">Comprehensive legal services</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Client-Focused</h3>
                    <p className="text-white/70 text-sm">Personalized solutions</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Trusted Advisor</h3>
                    <p className="text-white/70 text-sm">Reliable partnership</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
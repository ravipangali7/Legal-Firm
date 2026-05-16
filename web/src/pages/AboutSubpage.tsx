import { Link, NavLink, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Award, Users, Building2, Briefcase, Scale, Calculator, Globe2, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageSeo } from '@/context/SeoContext';

const SUBPAGES = [
  { slug: 'background', label: 'Background' },
  { slug: 'our-team', label: 'Our Team' },
  { slug: 'our-services', label: 'Our Services' },
];

const TEAM = [
  { name: 'Adv. Sushil Kandel', role: 'Managing Partner', initials: 'SK', area: 'Tax & Corporate Law' },
  { name: 'CA Sanjita Nepal', role: 'Senior Tax Advisor', initials: 'SN', area: 'Audit & Compliance' },
  { name: 'Adv. Prakash Chaudhary', role: 'Associate Partner', initials: 'PC', area: 'Litigation' },
  { name: 'Kaushal Raj Kandel', role: 'Business Consultant', initials: 'KK', area: 'Outsourcing' },
  { name: 'Adv. Rita Sharma', role: 'Legal Consultant', initials: 'RS', area: 'Family & Civil Law' },
  { name: 'CA Bibek Adhikari', role: 'Tax Manager', initials: 'BA', area: 'VAT & TDS' },
];

const SERVICES = [
  { icon: Calculator, title: 'Tax Advisory', desc: 'Income tax, VAT, TDS planning, returns and assessments.' },
  { icon: Building2, title: 'Company Setup', desc: 'Private/public limited company registration, FDI structuring.' },
  { icon: Scale, title: 'Litigation', desc: 'Tax tribunals, civil/criminal court representation.' },
  { icon: Briefcase, title: 'Corporate Compliance', desc: 'AGM, OCR filings, annual returns, audit support.' },
  { icon: Globe2, title: 'Foreign Investment', desc: 'FITTA approvals, IBN, NRB capital injection.' },
  { icon: Shield, title: 'Intellectual Property', desc: 'Trademark, copyright, patent registration.' },
];

const AboutSubpage = () => {
  const { sub } = useParams();
  const current = SUBPAGES.find(s => s.slug === sub) ?? SUBPAGES[0];

  usePageSeo({
    title: current.label,
    description: `About TaxLexis — ${current.label}.`,
    pathname: `/about/${current.slug}`,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="bg-primary text-primary-foreground pt-28 pb-10">
        <div className="container mx-auto px-4">
          <nav className="text-xs opacity-80 mb-2 flex items-center gap-1">
            <Link to="/" className="hover:underline">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/about" className="hover:underline">About</Link>
            <ChevronRight className="h-3 w-3" />
            <span>{current.label}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold">{current.label}</h1>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 flex-1 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3">
          <div className="sticky top-24 rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-semibold">About</h3>
            </div>
            <ul className="text-sm">
              <li>
                <NavLink to="/about" end className={({ isActive }) => cn('block px-3 py-2 border-b border-border/60', isActive ? 'bg-emerald-600 text-white' : 'hover:bg-muted/50')}>
                  Overview
                </NavLink>
              </li>
              {SUBPAGES.map(p => (
                <li key={p.slug}>
                  <NavLink to={`/about/${p.slug}`} className={({ isActive }) => cn('block px-3 py-2 border-b border-border/60', isActive ? 'bg-emerald-600 text-white' : 'hover:bg-muted/50')}>
                    {p.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="col-span-12 md:col-span-9">
          {current.slug === 'background' && (
            <article className="prose max-w-none">
              <h2 className="text-2xl font-bold text-primary-onBg">Our Background</h2>
              <p>Founded in 2015 in the heart of Kathmandu, Nepal Taxlexis Advisory began as a small team of tax practitioners and lawyers dedicated to helping local businesses navigate the complex Nepalese regulatory landscape.</p>
              <p>Over the past decade, we have grown into a multi-disciplinary firm with expertise spanning taxation, corporate law, FDI advisory, litigation and outsourced compliance. Our clientele today ranges from individual taxpayers to publicly listed companies and multinational enterprises operating in Nepal.</p>
              <h3 className="text-xl font-bold mt-6">Milestones</h3>
              <ul>
                <li><strong>2015</strong> — Firm founded in Kathmandu</li>
                <li><strong>2018</strong> — Expanded into corporate advisory and FDI structuring</li>
                <li><strong>2021</strong> — Launched our online legal database</li>
                <li><strong>2024</strong> — Opened branch office in Pokhara</li>
                <li><strong>2026</strong> — Serving 1,500+ clients across Nepal</li>
              </ul>
              <h3 className="text-xl font-bold mt-6">Our Approach</h3>
              <p>We blend deep technical knowledge with a practical, business-first mindset. Every engagement is staffed by a dedicated lead partner and supported by subject-matter specialists.</p>
            </article>
          )}

          {current.slug === 'our-team' && (
            <div>
              <h2 className="text-2xl font-bold text-primary-onBg mb-2">Our Team</h2>
              <p className="text-muted-foreground mb-6">Experienced advocates, chartered accountants and consultants working together for you.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEAM.map(m => (
                  <Card key={m.name}>
                    <CardContent className="p-5 text-center">
                      <Avatar className="h-20 w-20 mx-auto mb-3">
                        <AvatarFallback className="bg-primary/10 text-primary-onBg text-lg font-semibold">{m.initials}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold">{m.name}</h3>
                      <p className="text-sm text-primary-onBg">{m.role}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.area}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {current.slug === 'our-services' && (
            <div>
              <h2 className="text-2xl font-bold text-primary-onBg mb-2">Our Services</h2>
              <p className="text-muted-foreground mb-6">A full suite of legal, tax and corporate advisory services for businesses and individuals.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {SERVICES.map(s => (
                  <Card key={s.title}>
                    <CardContent className="p-5 flex gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg h-fit">
                        <s.icon className="h-5 w-5 text-primary-onBg" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{s.title}</h3>
                        <p className="text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-8 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <Award className="h-8 w-8 text-primary-onBg mx-auto mb-2" />
                <h3 className="font-bold mb-2">Custom engagement?</h3>
                <p className="text-sm text-muted-foreground mb-3">We tailor our services to your specific situation.</p>
                <Link to="/contact" className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  <Users className="h-4 w-4 mr-2" /> Talk to us
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutSubpage;
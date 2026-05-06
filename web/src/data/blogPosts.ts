export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  featured?: boolean;
  /** Full article body, one string per paragraph */
  content: string[];
};

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'New Tax Regulations 2024: What Businesses Need to Know',
    excerpt:
      'The latest tax regulations in Nepal bring significant changes for businesses. Our comprehensive guide covers everything.',
    author: 'Adv. Rajesh Sharma',
    date: '2026-04-15',
    category: 'Tax Law',
    featured: true,
    content: [
      'Recent amendments to income tax, value added tax, and compliance timelines affect how companies record revenue, claim deductions, and file returns. Businesses should review their accounting policies and internal controls in light of these updates.',
      'Key areas to watch include withholding obligations on payments to non-residents, documentation for related-party transactions, and electronic filing requirements. Penalties for late filing and underpayment have been clarified, so finance teams should align calendars with statutory deadlines.',
      'We recommend a short compliance audit: verify TIN registrations, reconcile VAT ledgers with purchase and sales registers, and ensure payroll tax deductions match current slabs. Where uncertainty remains, seek a formal opinion before year-end positions are locked in.',
    ],
  },
  {
    id: '2',
    title: 'Understanding Intellectual Property Rights in Nepal',
    excerpt:
      'A comprehensive guide to protecting your intellectual property in Nepal, covering patents, trademarks, and copyrights.',
    author: 'Adv. Sunita Karki',
    date: '2026-04-12',
    category: 'Intellectual Property',
    content: [
      'Nepal’s IP framework distinguishes patents (inventions), trademarks (distinctive signs), and copyrights (original literary and artistic works). Each right has its own application process, term of protection, and enforcement path before the Department of Industry and the courts.',
      'Trademark owners should conduct clearance searches before adoption, file in appropriate classes, and monitor the gazette for conflicting marks. For patents, novelty and inventive step must be documented carefully; provisional specifications can secure an early priority date when used correctly.',
      'Copyright arises upon creation for qualifying works, but registration assists in proving ownership in disputes. Licensing and assignment agreements should be in writing and, where required, recorded to bind successors and licensees.',
    ],
  },
  {
    id: '3',
    title: 'Corporate Governance Best Practices',
    excerpt:
      'Essential guidelines for maintaining good corporate governance and compliance with Nepalese corporate law.',
    author: 'Adv. Bharat Thapa',
    date: '2026-04-10',
    category: 'Corporate Law',
    content: [
      'Strong governance starts with a clear division of roles between shareholders, the board, and management. The board should set strategy, oversee risk, and ensure integrity of reporting—without stepping into day-to-day operations except where law or the articles require.',
      'Listed and larger private companies benefit from written charters for audit, risk, and nomination committees, even when not strictly mandated. Related-party transactions deserve transparent disclosure, independent review, and arm’s-length pricing evidence.',
      'Minutes, resolutions, and statutory registers must be maintained contemporaneously. Regular training for directors on duties of care and loyalty reduces exposure and supports a culture of compliance across subsidiaries and joint ventures.',
    ],
  },
  {
    id: '4',
    title: 'Banking Law Updates: Digital Payment Regulations',
    excerpt:
      'Recent changes in banking law affecting digital payments and financial services in Nepal.',
    author: 'Adv. Meera Pradhan',
    date: '2026-04-08',
    category: 'Banking Law',
    content: [
      'Regulators continue to refine rules for payment service providers, wallet interoperability, and customer due diligence for digital onboarding. Institutions must balance innovation with anti-money laundering controls and consumer protection standards.',
      'Contractual terms for merchants and end-users should reflect liability caps, dispute resolution, and data processing in line with applicable privacy obligations. Incident reporting timelines for security breaches are tightening—operational playbooks should be tested.',
      'Partnerships between banks and fintechs should be documented to allocate compliance duties clearly, including KYC refresh, transaction monitoring, and audit access for supervisors.',
    ],
  },
  {
    id: '5',
    title: 'Family Law: Property Rights and Inheritance',
    excerpt:
      'Understanding property rights and inheritance laws under the new civil code of Nepal.',
    author: 'Adv. Krishna Bahadur',
    date: '2026-04-05',
    category: 'Family Law',
    content: [
      'The civil code organizes succession around classes of heirs and specific shares. Gifts, wills, and partition deeds interact with statutory shares, so documents should be reviewed holistically rather than in isolation.',
      'Matrimonial property regimes affect how acquisitions during marriage are divided upon separation or death. Prenuptial agreements may be recognized when they meet formal requirements and do not deprive compulsory heirs of their lawful minimums.',
      'Disputes often turn on evidence of contributions, registration of title, and timing of transfers. Early mediation can preserve family relationships while narrowing issues for any eventual litigation.',
    ],
  },
  {
    id: '6',
    title: 'Consumer Protection Laws and Your Rights',
    excerpt:
      'Everything consumers need to know about their rights and protection under Nepalese law.',
    author: 'Adv. Ram Prasad',
    date: '2026-04-01',
    category: 'Consumer Law',
    content: [
      'Consumers are entitled to fair information, safe goods and services, and remedies for defective products or misleading advertising. Sector regulators and consumer forums provide avenues for redress alongside ordinary civil courts.',
      'Keep invoices, warranty cards, and correspondence. For digital purchases, screenshots of offers, terms, and chats strengthen a file. Statutory limitation periods apply, so delays can bar claims.',
      'Businesses should align marketing, return policies, and after-sales support with legal minima to avoid penalties and reputational harm. Staff training on complaint handling often prevents escalation.',
    ],
  },
];

export function getBlogPostById(id: string | undefined): BlogPost | undefined {
  if (!id) return undefined;
  return blogPosts.find((p) => p.id === id);
}

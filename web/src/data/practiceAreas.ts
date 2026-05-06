import {
  AlertTriangle,
  Building2,
  Copyright,
  Gavel,
  Globe,
  Heart,
  Landmark,
  Receipt,
  Scale,
  Shield,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface ServicePreview {
  label: string;
  value: string;
}

export interface PracticeAreaService {
  id: string;
  title: string;
  description: string;
  details: string[];
  previews: ServicePreview[];
}

export interface PracticeAreaContent {
  slug: string;
  name: string;
  icon: LucideIcon;
  overview: string;
  tags: string[];
  relatedCasesTitle: string;
  services: PracticeAreaService[];
}

const baseService = (
  id: string,
  title: string,
  description: string,
  focus: string
): PracticeAreaService => ({
  id,
  title,
  description,
  details: [
    `End-to-end advisory for ${focus} from assessment through execution.`,
    "Drafting, review, and compliance support tailored to the transaction profile.",
    "Risk analysis with practical recommendations aligned with Nepalese legal requirements.",
  ],
  previews: [
    { label: "Scope", value: focus },
    { label: "Support", value: "Advisory + Documentation" },
    { label: "Delivery", value: "Step-by-step legal guidance" },
  ],
});

export const PRACTICE_AREAS: PracticeAreaContent[] = [
  {
    slug: "company-law",
    name: "Company Law",
    icon: Building2,
    overview:
      "Comprehensive company law services covering incorporation, governance, and statutory compliance for businesses in Nepal.",
    tags: ["Company Registration", "Compliance", "Governance", "Licensing"],
    relatedCasesTitle: "Related Company Law Cases",
    services: [
      baseService("company-registration", "Company Registration", "Name reservation, incorporation filings, and setup compliance.", "Company setup and registration"),
      baseService("compliance", "Corporate Compliance", "Periodic filings, statutory registers, and annual compliance management.", "Regulatory and annual compliance"),
      baseService("governance", "Corporate Governance", "Board process structuring, resolutions, and governance framework review.", "Board and shareholder governance"),
      baseService("dissolution", "Company Dissolution", "Winding-up support with closure filings and legal risk mitigation.", "Company closure and winding up"),
    ],
  },
  {
    slug: "corporate-law",
    name: "Corporate Law",
    icon: Scale,
    overview:
      "Strategic corporate legal counsel for transactions, structuring, investments, and long-term business risk management.",
    tags: ["M&A", "Joint Ventures", "Restructuring", "Corporate Contracts"],
    relatedCasesTitle: "Related Corporate Law Cases",
    services: [
      baseService("ma", "Mergers and Acquisitions", "Transaction support from due diligence to closing.", "M&A transactions"),
      baseService("jv", "Joint Venture Structuring", "JV term structuring and partnership documentation.", "Joint venture and partnerships"),
      baseService("capital", "Capital Structuring", "Advisory on investment rounds and shareholder rights.", "Capital and investment structuring"),
      baseService("corp-contracts", "Corporate Contracting", "Drafting and negotiation of key corporate agreements.", "Corporate contract lifecycle"),
    ],
  },
  {
    slug: "taxation-law",
    name: "Taxation Law",
    icon: Receipt,
    overview:
      "Tax legal services for compliance, advisory, planning, and dispute management across direct and indirect tax obligations.",
    tags: ["Tax Compliance", "Advisory", "Tax Planning", "Tax Disputes"],
    relatedCasesTitle: "Related Taxation Law Cases",
    services: [
      baseService("tax-filing", "Tax Compliance and Filing", "Return preparation, filing validation, and compliance review.", "Tax filing and compliance"),
      baseService("tax-plan", "Tax Planning and Advisory", "Practical planning to optimize tax positions lawfully.", "Tax planning strategy"),
      baseService("tax-dispute", "Tax Dispute Resolution", "Representation in assessments, objections, and appeals.", "Tax dispute handling"),
      baseService("intl-tax", "International Tax Matters", "Cross-border structuring, treaties, and transfer-pricing advisory.", "Cross-border taxation"),
    ],
  },
  {
    slug: "banking-law",
    name: "Banking Law",
    icon: Landmark,
    overview:
      "Specialized banking law support for lending documentation, compliance, debt recovery, and regulatory response.",
    tags: ["Lending", "Compliance", "Debt Recovery", "Banking Regulation"],
    relatedCasesTitle: "Related Banking Law Cases",
    services: [
      baseService("lending", "Lending Documentation", "Facility documentation and security structuring support.", "Loan and security documentation"),
      baseService("reg-bank", "Banking Compliance", "Regulatory readiness and compliance control advisory.", "Banking regulatory compliance"),
      baseService("recovery", "Debt Recovery", "Recovery process planning and enforcement strategy.", "Debt recovery actions"),
      baseService("audit-response", "Regulatory Response", "Legal support for regulator notices and inspections.", "Regulatory correspondence"),
    ],
  },
  {
    slug: "insurance-law",
    name: "Insurance Law",
    icon: Shield,
    overview:
      "Insurance legal assistance for policy structuring, claims support, disputes, and compliance with insurer obligations.",
    tags: ["Policy Review", "Claims", "Disputes", "Insurance Compliance"],
    relatedCasesTitle: "Related Insurance Law Cases",
    services: [
      baseService("policy", "Policy Structuring", "Review and drafting support for policy language and exclusions.", "Insurance policy design"),
      baseService("claims", "Claims Advisory", "Claim preparation and evidence alignment for better outcomes.", "Claims handling"),
      baseService("ins-dispute", "Claims Dispute Resolution", "Representation in claim denial or settlement disputes.", "Insurance dispute resolution"),
      baseService("ins-reg", "Regulatory Compliance", "Compliance support for insurer and intermediary obligations.", "Insurance compliance systems"),
    ],
  },
  {
    slug: "intellectual-property-law",
    name: "Intellectual Property Law",
    icon: Copyright,
    overview:
      "IP law services covering registration, enforcement, licensing, and strategic protection of valuable business assets.",
    tags: ["Trademark", "Copyright", "Patent", "Licensing"],
    relatedCasesTitle: "Related Intellectual Property Law Cases",
    services: [
      baseService("tm", "Trademark Protection", "Search, filing, and prosecution support for marks.", "Trademark lifecycle"),
      baseService("copyright", "Copyright Advisory", "Protection strategy for literary, software, and media works.", "Copyright compliance"),
      baseService("licensing", "IP Licensing", "Drafting and negotiation of IP licensing terms.", "IP commercialization"),
      baseService("enforcement", "IP Enforcement", "Notice, negotiation, and litigation prep for infringement.", "IP infringement response"),
    ],
  },
  {
    slug: "cooperative-law",
    name: "Co-operative Law",
    icon: Users,
    overview:
      "Legal services for co-operative societies in registration, member governance, compliance, and dispute management.",
    tags: ["Registration", "Governance", "Members", "Compliance"],
    relatedCasesTitle: "Related Co-operative Law Cases",
    services: [
      baseService("coop-reg", "Society Registration", "Formation, registration, and constitutional document support.", "Co-operative registration"),
      baseService("member", "Member Governance", "By-law and member rights advisory for smooth operation.", "Member governance structures"),
      baseService("coop-compliance", "Co-operative Compliance", "Regulatory filings and internal governance checks.", "Regulatory compliance"),
      baseService("coop-dispute", "Internal Dispute Support", "Resolution framework for management and member disputes.", "Internal dispute management"),
    ],
  },
  {
    slug: "civil-law",
    name: "Civil Law",
    icon: Gavel,
    overview:
      "Civil law representation for contractual, property, and liability disputes with clear strategy and documentation.",
    tags: ["Contracts", "Property", "Damages", "Civil Procedure"],
    relatedCasesTitle: "Related Civil Law Cases",
    services: [
      baseService("civil-contract", "Contractual Disputes", "Claim assessment and representation in contract breaches.", "Contract dispute resolution"),
      baseService("property", "Property Matters", "Ownership, possession, and title-related civil actions.", "Property civil claims"),
      baseService("damages", "Damages and Compensation", "Quantification and claim strategy for civil losses.", "Compensation claims"),
      baseService("injunction", "Injunction and Relief", "Urgent and interim relief applications in civil courts.", "Interim civil relief"),
    ],
  },
  {
    slug: "criminal-law",
    name: "Criminal Law",
    icon: AlertTriangle,
    overview:
      "Criminal law assistance from complaint stage through trial, including defense strategy and procedural safeguards.",
    tags: ["Defense", "Bail", "Investigation", "Trial Support"],
    relatedCasesTitle: "Related Criminal Law Cases",
    services: [
      baseService("defense", "Criminal Defense", "Fact review, legal defense strategy, and court representation.", "Criminal defense strategy"),
      baseService("bail", "Bail and Custody Matters", "Bail petition preparation and custody hearing support.", "Bail and custody proceedings"),
      baseService("investigation", "Investigation-stage Advisory", "Rights protection during statements and investigation actions.", "Investigation representation"),
      baseService("appeal", "Criminal Appeals", "Appeal drafting and challenge strategy after conviction.", "Post-trial criminal appeals"),
    ],
  },
  {
    slug: "family-law",
    name: "Family Law",
    icon: Heart,
    overview:
      "Family law services addressing marriage, divorce, custody, support, and property matters with practical sensitivity.",
    tags: ["Divorce", "Custody", "Maintenance", "Family Property"],
    relatedCasesTitle: "Related Family Law Cases",
    services: [
      baseService("divorce", "Divorce and Separation", "Petition support and settlement structuring for separation.", "Marital separation"),
      baseService("custody", "Custody and Guardianship", "Child-focused custody planning and representation.", "Custody and guardianship"),
      baseService("maintenance", "Maintenance and Support", "Maintenance claims and defense strategy.", "Family maintenance claims"),
      baseService("family-property", "Family Property Issues", "Property allocation and ownership claims in family disputes.", "Family property resolution"),
    ],
  },
  {
    slug: "consumer-law",
    name: "Consumer Law",
    icon: ShoppingCart,
    overview:
      "Consumer law support for unfair trade, service deficiency, product liability, and complaint adjudication.",
    tags: ["Consumer Complaints", "Defective Products", "Service Deficiency", "Compensation"],
    relatedCasesTitle: "Related Consumer Law Cases",
    services: [
      baseService("complaints", "Consumer Complaints", "Case preparation and complaint filing support.", "Consumer complaint process"),
      baseService("product", "Defective Product Claims", "Assessment and claim structuring for product defects.", "Product liability claims"),
      baseService("service", "Service Deficiency Matters", "Legal handling for deficient or unfair service practices.", "Service deficiency disputes"),
      baseService("consumer-comp", "Compensation Actions", "Quantification and recovery strategy for losses.", "Consumer compensation"),
    ],
  },
];

export const getPracticeAreaBySlug = (slug?: string) =>
  PRACTICE_AREAS.find((area) => area.slug === slug);

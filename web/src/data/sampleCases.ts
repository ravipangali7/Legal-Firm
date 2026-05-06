import { slugify } from "@/lib/slugify";

export interface Case {
  id: string;
  /** URL slug for `/api/legal-cases/:slug/` and `/case/:caseId` when using API-backed cases. */
  slug?: string;
  title: string;
  referenceNumber: string;
  dateFiled: string;
  dateDecided?: string;
  court: string;
  category: string;
  practiceArea: string;
  teaser: string;
  parties: string;
  summary: string;
  keyPoints: string[];
  outcome: string;
  fullContent?: {
    background: string;
    legalArguments: string[];
    judgment: string;
    analysis: string;
    implications: string[];
    precedents: string[];
    strategicInsights: string[];
  };
}

export const sampleCases: Case[] = [
  {
    id: 'tax-001',
    title: 'Himalayan Bank Ltd. vs. Department of Revenue',
    referenceNumber: 'TAX-2023-001',
    dateFiled: '2023-03-15',
    dateDecided: '2023-08-20',
    court: 'Supreme Court of Nepal',
    category: 'Banking Tax Cases',
    practiceArea: 'taxation-law',
    teaser: 'Landmark case on banking transaction tax liability',
    parties: 'Himalayan Bank Ltd. (Plaintiff) vs. Department of Revenue (Defendant)',
    summary: 'This case involved a dispute over the application of banking transaction taxes on foreign exchange operations. The bank challenged the department\'s interpretation of tax liability on currency conversion services. The case established important precedents for banking sector taxation in Nepal.',
    keyPoints: [
      'Foreign exchange transaction tax interpretation',
      'Banking service tax liability',
      'Departmental authority scope'
    ],
    outcome: 'Court ruled in favor of the bank, reducing tax liability by 40%',
    fullContent: {
      background: 'Himalayan Bank Ltd. filed a petition challenging the Department of Revenue\'s assessment of banking transaction taxes...',
      legalArguments: [
        'Banking Act provisions on tax exemptions',
        'Foreign Exchange Regulation Act compliance',
        'Constitutional rights to fair taxation'
      ],
      judgment: 'The court held that the department exceeded its authority in the tax assessment...',
      analysis: 'This decision significantly impacts how banking transaction taxes are calculated...',
      implications: [
        'Reduced tax burden for banking sector',
        'Clearer guidelines for foreign exchange taxation',
        'Enhanced regulatory compliance standards'
      ],
      precedents: [
        'Standard Chartered Bank vs. IRD (2019)',
        'Nepal Investment Bank vs. Revenue Department (2021)'
      ],
      strategicInsights: [
        'Banks should maintain detailed foreign exchange records',
        'Regular compliance audits recommended',
        'Appeal processes for tax disputes clarified'
      ]
    }
  },
  {
    id: 'tax-002',
    title: 'Nepal Insurance Company vs. Inland Revenue Department',
    referenceNumber: 'TAX-2023-002',
    dateFiled: '2023-01-10',
    dateDecided: '2023-07-15',
    court: 'High Court, Kathmandu',
    category: 'Insurance Tax Cases',
    practiceArea: 'taxation-law',
    teaser: 'Insurance premium tax calculation methodology dispute',
    parties: 'Nepal Insurance Company (Appellant) vs. Inland Revenue Department (Respondent)',
    summary: 'The case centered on the correct methodology for calculating insurance premium taxes, particularly for life insurance products with investment components. The insurance company contested the IRD\'s broader interpretation of taxable premiums.',
    keyPoints: [
      'Insurance premium tax calculation',
      'Life insurance vs investment products',
      'Tax base determination methodology'
    ],
    outcome: 'Partial victory for insurance company, revised calculation method adopted',
    fullContent: {
      background: 'Nepal Insurance Company challenged the IRD\'s method of calculating premium taxes...',
      legalArguments: [
        'Insurance Act provisions on tax calculations',
        'Distinction between insurance and investment products',
        'Proportional taxation principles'
      ],
      judgment: 'The court established a new framework for premium tax calculations...',
      analysis: 'This ruling provides clarity on insurance sector taxation...',
      implications: [
        'Standardized premium tax calculation methods',
        'Clear distinction between product types',
        'Reduced compliance costs for insurers'
      ],
      precedents: [
        'Life Insurance Corporation vs. IRD (2020)',
        'Rastriya Beema Sansthan vs. Revenue (2018)'
      ],
      strategicInsights: [
        'Product classification crucial for tax planning',
        'Regular review of calculation methodologies',
        'Proactive engagement with regulatory authorities'
      ]
    }
  },
  {
    id: 'tax-003',
    title: 'Tech Ventures Pvt. Ltd. vs. Department of Revenue',
    referenceNumber: 'TAX-2023-003',
    dateFiled: '2023-02-28',
    dateDecided: '2023-09-10',
    court: 'Administrative Court',
    category: 'Corporate Tax Cases',
    practiceArea: 'taxation-law',
    teaser: 'Software development tax incentive eligibility dispute',
    parties: 'Tech Ventures Pvt. Ltd. (Petitioner) vs. Department of Revenue (Respondent)',
    summary: 'A technology company challenged the denial of tax incentives for software development activities. The case involved interpretation of IT sector promotion policies and their tax implications under current revenue laws.',
    keyPoints: [
      'IT sector tax incentives',
      'Software development activity classification',
      'Policy interpretation vs. legal requirements'
    ],
    outcome: 'Company granted partial tax incentives with prospective application',
    fullContent: {
      background: 'Tech Ventures applied for tax incentives under the IT Policy 2019...',
      legalArguments: [
        'IT Policy 2019 provisions on tax benefits',
        'Industrial Enterprise Act compliance',
        'Equal treatment under tax laws'
      ],
      judgment: 'The court recognized the need for clear guidelines on IT sector taxation...',
      analysis: 'This decision highlights gaps in current tax incentive frameworks...',
      implications: [
        'Clearer IT sector tax incentive guidelines',
        'Enhanced promotion of technology businesses',
        'Standardized application processes'
      ],
      precedents: [
        'Digital Solutions Ltd. vs. IRD (2021)',
        'Nepal Software Company vs. Revenue (2020)'
      ],
      strategicInsights: [
        'Early application for tax incentives recommended',
        'Detailed documentation of development activities',
        'Regular compliance with reporting requirements'
      ]
    }
  },
  {
    id: 'tax-004',
    title: 'Export House Nepal vs. Customs Department',
    referenceNumber: 'TAX-2023-004',
    dateFiled: '2023-04-05',
    dateDecided: '2023-10-22',
    court: 'Revenue Tribunal',
    category: 'International Tax Cases',
    practiceArea: 'taxation-law',
    teaser: 'Export incentive VAT refund processing delays',
    parties: 'Export House Nepal (Claimant) vs. Customs Department (Respondent)',
    summary: 'An export company challenged systematic delays in VAT refund processing for export incentives. The case addressed procedural inefficiencies and their impact on export business operations in Nepal.',
    keyPoints: [
      'Export incentive VAT refund delays',
      'Procedural compliance requirements',
      'Administrative efficiency standards'
    ],
    outcome: 'Tribunal ordered expedited processing and compensation for delays',
    fullContent: {
      background: 'Export House Nepal filed claims for VAT refunds under export incentive schemes...',
      legalArguments: [
        'Export incentive policy provisions',
        'VAT Act refund procedures',
        'Administrative justice principles'
      ],
      judgment: 'The tribunal found systemic delays in processing export VAT refunds...',
      analysis: 'This decision emphasizes the need for efficient administrative processes...',
      implications: [
        'Improved VAT refund processing timelines',
        'Enhanced export sector support',
        'Streamlined administrative procedures'
      ],
      precedents: [
        'Garment Export Association vs. Customs (2019)',
        'Tea Exporters Guild vs. IRD (2020)'
      ],
      strategicInsights: [
        'Maintain complete export documentation',
        'Regular follow-up on refund applications',
        'Consider legal remedies for undue delays'
      ]
    }
  },
  {
    id: 'tax-005',
    title: 'Manufacturing Industries Ltd. vs. Inland Revenue Department',
    referenceNumber: 'TAX-2023-005',
    dateFiled: '2023-05-12',
    dateDecided: '2023-11-08',
    court: 'Supreme Court of Nepal',
    category: 'VAT Cases',
    practiceArea: 'taxation-law',
    teaser: 'Manufacturing sector VAT input credit calculation dispute',
    parties: 'Manufacturing Industries Ltd. (Appellant) vs. Inland Revenue Department (Respondent)',
    summary: 'A manufacturing company disputed the IRD\'s method of calculating VAT input credits for production inputs. The case involved complex issues of input-output ratio calculations and their impact on manufacturing sector competitiveness.',
    keyPoints: [
      'VAT input credit calculations',
      'Manufacturing input-output ratios',
      'Sector-specific tax treatment'
    ],
    outcome: 'Supreme Court established new guidelines for manufacturing VAT calculations',
    fullContent: {
      background: 'Manufacturing Industries challenged the IRD\'s restrictive interpretation...',
      legalArguments: [
        'VAT Act provisions on input credits',
        'Manufacturing industry specific considerations',
        'Proportionality in tax assessments'
      ],
      judgment: 'The Supreme Court recognized the need for manufacturing-friendly VAT policies...',
      analysis: 'This landmark decision reshapes VAT treatment for manufacturing sector...',
      implications: [
        'Favorable VAT treatment for manufacturers',
        'Clearer input credit calculation methods',
        'Enhanced industrial sector competitiveness'
      ],
      precedents: [
        'Industrial Association vs. IRD (2018)',
        'Nepal Manufacturers vs. Revenue (2020)'
      ],
      strategicInsights: [
        'Detailed production process documentation',
        'Regular VAT compliance reviews',
        'Proactive engagement with tax authorities'
      ]
    }
  },
  {
    id: 'tax-006',
    title: 'Multinational Corporation vs. Department of Revenue',
    referenceNumber: 'TAX-2023-006',
    dateFiled: '2023-06-18',
    dateDecided: '2023-12-15',
    court: 'Tax Court',
    category: 'Income Tax Cases',
    practiceArea: 'taxation-law',
    teaser: 'Transfer pricing adjustment and double taxation relief',
    parties: 'Multinational Corporation (Taxpayer) vs. Department of Revenue (Tax Authority)',
    summary: 'A multinational corporation contested transfer pricing adjustments and sought double taxation relief under international tax treaties. The case involved complex issues of arm\'s length pricing and treaty interpretation.',
    keyPoints: [
      'Transfer pricing adjustments',
      'Double taxation avoidance treaties',
      'Arm\'s length pricing principles'
    ],
    outcome: 'Partial adjustment accepted, double taxation relief granted',
    fullContent: {
      background: 'The corporation faced transfer pricing adjustments on inter-company transactions...',
      legalArguments: [
        'OECD transfer pricing guidelines',
        'Double taxation avoidance treaty provisions',
        'Comparable transaction analysis'
      ],
      judgment: 'The court applied international best practices in transfer pricing...',
      analysis: 'This decision aligns Nepal\'s transfer pricing regime with global standards...',
      implications: [
        'Clearer transfer pricing guidelines',
        'Enhanced treaty interpretation framework',
        'Improved international tax compliance'
      ],
      precedents: [
        'International Bank vs. IRD (2019)',
        'Global Tech vs. Revenue Department (2021)'
      ],
      strategicInsights: [
        'Comprehensive transfer pricing documentation',
        'Regular benchmarking of inter-company transactions',
        'Proactive treaty benefit planning'
      ]
    }
  }
];

export interface CaseCategoryFilterOption {
  id: string;
  name: string;
  icon: string;
  count: number;
}

function guessCategoryIcon(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  if (lower.includes("insurance")) return "Shield";
  if (lower.includes("banking")) return "Landmark";
  if (lower.includes("intellectual") || lower.includes("property")) return "Copyright";
  if (lower.includes("corporate")) return "Building2";
  if (lower.includes("international") || lower.includes("export")) return "Globe";
  if (lower.includes("vat")) return "Receipt";
  if (lower.includes("income")) return "Calculator";
  return "Scale";
}

/** Category chips for the case list, scoped to the cases passed in (e.g. one practice area). */
export function buildCaseFilterCategories(
  areaName: string,
  cases: Case[]
): CaseCategoryFilterOption[] {
  const allCount = cases.length;
  if (allCount === 0) {
    return [{ id: "all", name: `All ${areaName} Cases`, icon: "Scale", count: 0 }];
  }

  const counts = new Map<string, number>();
  for (const c of cases) {
    counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  }

  const rows = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return [
    { id: "all", name: `All ${areaName} Cases`, icon: "Scale", count: allCount },
    ...rows.map(([name, count]) => ({
      id: slugify(name),
      name,
      icon: guessCategoryIcon(name),
      count,
    })),
  ];
}
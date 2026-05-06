// Mock data for Laws & Summaries pages

export interface ActItem {
  slug: string;
  titleEn: string;
  titleNe: string;
  category: 'Tax' | 'Company' | 'Labor' | 'Financial' | 'Criminal' | 'Civil';
  year: string;
  updated: string;
  premium?: boolean;
}

export type LawSortKey = 'alpha' | 'recent';

export interface LawSortOption {
  key: LawSortKey;
  label: string;
}

export const acts: ActItem[] = [
  { slug: 'income-tax-act-2058', titleEn: 'Income Tax Act, 2058 (2002)', titleNe: 'आयकर ऐन, २०५८', category: 'Tax', year: '2058', updated: '2025-12-10', premium: true },
  { slug: 'value-added-tax-act-2052', titleEn: 'Value Added Tax Act, 2052 (1996)', titleNe: 'मूल्य अभिवृद्धि कर ऐन, २०५२', category: 'Tax', year: '2052', updated: '2025-09-02' },
  { slug: 'companies-act-2063', titleEn: 'Companies Act, 2063 (2006)', titleNe: 'कम्पनी ऐन, २०६३', category: 'Company', year: '2063', updated: '2025-11-21', premium: true },
  { slug: 'labour-act-2074', titleEn: 'Labour Act, 2074 (2017)', titleNe: 'श्रम ऐन, २०७४', category: 'Labor', year: '2074', updated: '2025-08-14' },
  { slug: 'banks-financial-institutions-act-2073', titleEn: 'Banks and Financial Institutions Act, 2073', titleNe: 'बैंक तथा वित्तीय संस्था ऐन, २०७३', category: 'Financial', year: '2073', updated: '2025-07-30' },
  { slug: 'national-penal-code-2074', titleEn: 'National Penal (Code) Act, 2074', titleNe: 'राष्ट्रिय फौजदारी (संहिता) ऐन, २०७४', category: 'Criminal', year: '2074', updated: '2025-06-11' },
  { slug: 'civil-code-2074', titleEn: 'Muluki Civil Code, 2074', titleNe: 'मुलुकी देवानी संहिता, २०७४', category: 'Civil', year: '2074', updated: '2025-04-02' },
  { slug: 'industrial-enterprises-act-2076', titleEn: 'Industrial Enterprises Act, 2076', titleNe: 'औद्योगिक व्यवसाय ऐन, २०७६', category: 'Company', year: '2076', updated: '2025-03-17' },
];

export const lawSortOptions: LawSortOption[] = [
  { key: 'alpha', label: 'Alphabetical' },
  { key: 'recent', label: 'Recently Updated' },
];

export interface LawDetailTab {
  id: 'content' | 'amendments' | 'cases';
  label: string;
  labelNe: string;
}

export interface LawDetailSection {
  id: string;
  label: string;
  labelNe: string;
  title: string;
  titleNe: string;
  paragraphs: {
    en: string[];
    ne: string[];
  };
}

export interface LawDetailCallout {
  title: string;
  titleNe: string;
  body: {
    en: string;
    ne: string;
  };
}

export interface LawDetailContent {
  tabs: LawDetailTab[];
  sections: LawDetailSection[];
  callout: LawDetailCallout;
  amendments: string[];
  relatedCases: string[];
}

const withActTitle = (text: string, act: ActItem) =>
  text.replaceAll('{actTitleEn}', act.titleEn).replaceAll('{actTitleNe}', act.titleNe);

/** When the API returns `detail_json`, use it for the law reader; otherwise return null (caller uses `getLawDetailContent`). */
export function parseLawDetailFromApi(raw: unknown): LawDetailContent | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const tabs = o.tabs;
  const sections = o.sections;
  const callout = o.callout;
  const amendments = o.amendments;
  const relatedCases = o.relatedCases;
  if (!Array.isArray(tabs) || !Array.isArray(sections) || !callout || typeof callout !== 'object') return null;
  if (!Array.isArray(amendments) || !Array.isArray(relatedCases)) return null;

  const normTabs: LawDetailTab[] = [];
  const seenTabIds = new Set<string>();
  for (const t of tabs) {
    if (!t || typeof t !== 'object') return null;
    const row = t as Record<string, unknown>;
    const id = row.id;
    const label = row.label;
    const labelNe = row.labelNe;
    if (id !== 'content' && id !== 'amendments' && id !== 'cases') return null;
    if (typeof label !== 'string' || typeof labelNe !== 'string') return null;
    if (seenTabIds.has(id)) return null;
    seenTabIds.add(id);
    normTabs.push({ id: id as LawDetailTab['id'], label, labelNe });
  }
  if (!normTabs.some((t) => t.id === 'content')) return null;

  const normSections: LawDetailSection[] = [];
  for (const s of sections) {
    if (!s || typeof s !== 'object') return null;
    const row = s as Record<string, unknown>;
    const id = row.id;
    const label = row.label;
    const labelNe = row.labelNe;
    const title = row.title;
    const titleNe = row.titleNe;
    const paragraphs = row.paragraphs;
    if (
      typeof id !== 'string' ||
      typeof label !== 'string' ||
      typeof labelNe !== 'string' ||
      typeof title !== 'string' ||
      typeof titleNe !== 'string' ||
      !paragraphs ||
      typeof paragraphs !== 'object'
    ) {
      return null;
    }
    const p = paragraphs as Record<string, unknown>;
    const en = p.en;
    const ne = p.ne;
    if (!Array.isArray(en) || !Array.isArray(ne)) return null;
    if (!en.every((x) => typeof x === 'string') || !ne.every((x) => typeof x === 'string')) return null;
    normSections.push({
      id,
      label,
      labelNe,
      title,
      titleNe,
      paragraphs: { en: en as string[], ne: ne as string[] },
    });
  }
  if (normSections.length === 0) return null;

  const c = callout as Record<string, unknown>;
  const cTitle = c.title;
  const cTitleNe = c.titleNe;
  const body = c.body;
  if (typeof cTitle !== 'string' || typeof cTitleNe !== 'string' || !body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const ben = b.en;
  const bne = b.ne;
  if (typeof ben !== 'string' || typeof bne !== 'string') return null;

  if (!amendments.every((x) => typeof x === 'string') || !relatedCases.every((x) => typeof x === 'string')) {
    return null;
  }

  return {
    tabs: normTabs,
    sections: normSections,
    callout: { title: cTitle, titleNe: cTitleNe, body: { en: ben, ne: bne } },
    amendments: amendments as string[],
    relatedCases: relatedCases as string[],
  };
}

export const getLawDetailContent = (act: ActItem): LawDetailContent => {
  const sections: LawDetailSection[] = [
    {
      id: 'preamble',
      label: 'Preamble',
      labelNe: 'प्रस्तावना',
      title: 'Preamble',
      titleNe: 'प्रस्तावना',
      paragraphs: {
        en: [
          'Whereas it is expedient to make timely provisions in respect of income tax to manage the revenues required for economic development of the country and to make the process of collecting revenue effective by amending and consolidating the laws relating to income tax.',
        ],
        ne: [
          'देशको आर्थिक विकासका लागि आवश्यक राजस्व व्यवस्थापन गर्न र आय सम्बन्धी कानूनलाई संशोधन र एकीकरण गरी राजस्व असुली प्रक्रियालाई प्रभावकारी बनाउन समयानुकूल व्यवस्था गर्न यो ऐन बनाइएको छ।',
        ],
      },
    },
    {
      id: 'ch-1',
      label: 'Chapter 1 — Preliminary',
      labelNe: 'अध्याय १ — प्रारम्भिक',
      title: 'Chapter 1 — Preliminary',
      titleNe: 'अध्याय १ — प्रारम्भिक',
      paragraphs: {
        en: [
          '1. Short title and commencement:',
          '(1) This Act may be cited as the {actTitleEn}.',
          '(2) This Act shall come into force on such date as the Government of Nepal may, by a notification published in the Nepal Gazette, appoint.',
          '2. Definitions: In this Act, unless the subject or the context otherwise requires, terms are interpreted according to the definitions set out in this chapter.',
        ],
        ne: [
          '१. संक्षिप्त नाम र प्रारम्भ:',
          '(१) यस ऐनलाई {actTitleNe} भनिनेछ।',
          '(२) नेपाल सरकारले नेपाल राजपत्रमा सूचना प्रकाशित गरी तोकेको मितिबाट यो ऐन लागू हुनेछ।',
          '२. परिभाषा: विषय वा सन्दर्भले अर्को अर्थ नलागेमा यस अध्यायमा उल्लिखित परिभाषाहरू लागू हुनेछन्।',
        ],
      },
    },
    {
      id: 'ch-2',
      label: 'Chapter 2 — Tax Base',
      labelNe: 'अध्याय २ — कर आधार',
      title: 'Chapter 2 — Tax Base',
      titleNe: 'अध्याय २ — कर आधार',
      paragraphs: {
        en: [
          "The taxable income of a person for an income year shall be the total of that person's assessable income for the year from each employment, business, and investment less the total amount of deductions allowed under this Act.",
          'This chapter prescribes the scope of taxable amounts and determines how each income stream is recognized for assessment.',
        ],
        ne: [
          'कुनै व्यक्तिको आय वर्षको करयोग्य आय भनेको रोजगारी, व्यवसाय तथा लगानीबाट प्राप्त मूल्यांकनयोग्य आयको जम्मा रकमबाट यस ऐन बमोजिम कट्टी हुने रकम घटाई बाँकी रहने रकम हुनेछ।',
          'यस अध्यायमा करयोग्य रकमको दायरा र आयको मान्यताको आधार निर्धारण गरिएको छ।',
        ],
      },
    },
    {
      id: 'ch-3',
      label: 'Chapter 3 — Computation',
      labelNe: 'अध्याय ३ — गणना',
      title: 'Chapter 3 — Computation',
      titleNe: 'अध्याय ३ — गणना',
      paragraphs: {
        en: [
          'Tax liability shall be computed after applying allowed deductions, applicable rates, and lawful credits in the prescribed order.',
        ],
        ne: ['कट्टीयोग्य रकम, लागू दर र कानुनबमोजिम उपलब्ध कर छुट क्रमशः लागू गरी कर दायित्व गणना गरिनेछ।'],
      },
    },
    {
      id: 'ch-4',
      label: 'Chapter 4 — Withholding',
      labelNe: 'अध्याय ४ — स्रोतमा कट्टा',
      title: 'Chapter 4 — Withholding',
      titleNe: 'अध्याय ४ — स्रोतमा कट्टा',
      paragraphs: {
        en: [
          'Withholding agents shall deduct tax at source on prescribed payments including rent, employment income, and contract payments.',
        ],
        ne: ['निर्धारित भुक्तानीहरू (भाडा, रोजगारी आय, ठेक्का भुक्तानी आदि) मा स्रोतमा कर कट्टा गर्नुपर्नेछ।'],
      },
    },
    {
      id: 'ch-5',
      label: 'Chapter 5 — Returns & Assessment',
      labelNe: 'अध्याय ५ — विवरण तथा मूल्यांकन',
      title: 'Chapter 5 — Returns & Assessment',
      titleNe: 'अध्याय ५ — विवरण तथा मूल्यांकन',
      paragraphs: {
        en: [
          'Taxpayers shall file returns within statutory timelines, and the competent authority may assess and reassess according to this Act.',
        ],
        ne: ['करदाताले कानुनबमोजिम तोकिएको समयमा विवरण पेश गर्नुपर्नेछ र सम्बन्धित निकायले मूल्यांकन/पुनर्मूल्यांकन गर्न सक्नेछ।'],
      },
    },
  ];

  return {
    tabs: [
      { id: 'content', label: 'Content', labelNe: 'सामग्री' },
      { id: 'amendments', label: 'Amendments', labelNe: 'संशोधनहरू' },
      { id: 'cases', label: 'Related Cases', labelNe: 'सम्बन्धित मुद्दाहरू' },
    ],
    sections: sections.map((section) => ({
      ...section,
      paragraphs: {
        en: section.paragraphs.en.map((line) => withActTitle(line, act)),
        ne: section.paragraphs.ne.map((line) => withActTitle(line, act)),
      },
    })),
    callout: {
      title: 'Important Provision',
      titleNe: 'महत्वपूर्ण व्यवस्था',
      body: {
        en: 'Sections 87 and 88 require withholding agents to deduct tax at source on prescribed payments. Refer to Chapter 4 for details.',
        ne: 'दफा ८७ र ८८ अनुसार स्रोतमा कर कट्टा गर्ने निकायले तोकिएका भुक्तानीमा कर कट्टा गर्नुपर्छ। विस्तृत विवरण अध्याय ४ मा हेर्नुहोस्।',
      },
    },
    amendments: [
      `Recent amendment notices related to ${act.titleEn} are listed here as they are published.`,
      'Notification metadata (date, gazette number, and effective date) is rendered dynamically from the law record.',
    ],
    relatedCases: [
      `Judicial precedents linked to ${act.titleEn} appear in this section.`,
      'Each case item can include citation, court, bench, date, and a short holding summary.',
    ],
  };
};

export interface SummaryCategory {
  slug: string;
  name: string;
  count: number;
  color: string; // hsl class for pill bg
}

export const summaryCategories: SummaryCategory[] = [
  { slug: 'income-tax-rates', name: 'Income Tax Rates', count: 12, color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  { slug: 'advance-tax-rates', name: 'Advance Tax Rates', count: 5, color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
  { slug: 'tds-rates', name: 'TDS Rates', count: 8, color: 'bg-purple-500/10 text-purple-700 border-purple-300' },
  { slug: 'vat', name: 'VAT', count: 9, color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' },
  { slug: 'salary-tax', name: 'Salary Tax', count: 4, color: 'bg-pink-500/10 text-pink-700 border-pink-300' },
  { slug: 'companies-act', name: 'Companies Act', count: 6, color: 'bg-indigo-500/10 text-indigo-700 border-indigo-300' },
  { slug: 'auditing', name: 'Auditing', count: 3, color: 'bg-cyan-500/10 text-cyan-700 border-cyan-300' },
  { slug: 'excise-duty', name: 'Excise Duty', count: 2, color: 'bg-orange-500/10 text-orange-700 border-orange-300' },
  { slug: 'custom-duty', name: 'Custom Duty', count: 4, color: 'bg-rose-500/10 text-rose-700 border-rose-300' },
];

export interface SummaryItem {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  posted: string;
  views: number;
  upvotes: number;
  downvotes: number;
  preview: string;
  premium?: boolean;
}

export const summaries: SummaryItem[] = [
  {
    slug: 'advance-tax-rates',
    title: 'Advance Tax Rates (FY 2081/82)',
    category: 'Advance Tax Rates',
    categorySlug: 'advance-tax-rates',
    posted: '2025-08-12',
    views: 4321,
    upvotes: 142,
    downvotes: 4,
    preview:
      'Advance tax is paid in three installments during a fiscal year. Threshold and installment rates differ based on estimated taxable income.',
  },
  {
    slug: 'income-tax-rates-2078-79',
    title: 'Income Tax Rates (FY 2078–79)',
    category: 'Income Tax Rates',
    categorySlug: 'income-tax-rates',
    posted: '2025-04-22',
    views: 9821,
    upvotes: 312,
    downvotes: 9,
    preview:
      'Slab-wise personal income tax rates for natural persons (individuals/couples) for the fiscal year 2078/79.',
    premium: true,
  },
  {
    slug: 'tds-on-rent',
    title: 'TDS on House Rent — Sec. 88',
    category: 'TDS Rates',
    categorySlug: 'tds-rates',
    posted: '2025-06-30',
    views: 2107,
    upvotes: 89,
    downvotes: 2,
    preview:
      'Tax deducted at source on rent payments to natural persons and entities. Rates and exemptions explained.',
  },
  {
    slug: 'zero-vat',
    title: '0% मू.अ.कर (Zero-Rated VAT)',
    category: 'VAT',
    categorySlug: 'vat',
    posted: '2025-02-19',
    views: 5544,
    upvotes: 201,
    downvotes: 6,
    preview:
      'List of goods and services subject to 0% VAT under Schedule 2 of the VAT Act including exports.',
    premium: true,
  },
];

/**
 * Canonical help article categories. Values are stored on each article and must
 * match exactly for public page FAQs (see /api/pricing-page/ faq_category, etc.).
 */
export const HELP_ARTICLE_CATEGORY_OPTIONS = [
  { value: 'General', label: 'General', blurb: 'Shown on the public /help page.' },
  { value: 'Pricing', label: 'Pricing', blurb: 'Shown as FAQs on /pricing (must match Pricing page FAQ category in admin).' },
  { value: 'Resources', label: 'Resources', blurb: 'Shown as FAQs on /resources (FAQs tab).' },
  { value: 'Blog', label: 'Blog', blurb: 'Shown as FAQs at the bottom of /blog.' },
  { value: 'About', label: 'About', blurb: 'Shown as FAQs on /about.' },
  { value: 'Contact', label: 'Contact', blurb: 'Shown as FAQs on /contact.' },
  { value: 'Summaries', label: 'Summaries', blurb: 'Shown as FAQs on /summaries.' },
  { value: 'Laws', label: 'Laws', blurb: 'Shown as FAQs on /laws.' },
  { value: 'Procedures', label: 'Procedures', blurb: 'Shown as FAQs on /procedures.' },
  { value: 'Getting started', label: 'Getting started', blurb: 'Staff guides; visible on /help only.' },
  { value: 'Billing', label: 'Billing', blurb: 'Staff guides; visible on /help only.' },
  { value: 'CMS', label: 'CMS', blurb: 'Staff guides; visible on /help only.' },
  { value: 'Tips', label: 'Tips', blurb: 'Staff guides; visible on /help only.' },
] as const;

const PREDEFINED = new Set(HELP_ARTICLE_CATEGORY_OPTIONS.map((o) => o.value));

const PREDEFINED_ORDER = new Map(HELP_ARTICLE_CATEGORY_OPTIONS.map((o, i) => [o.value, i]));

/** Values for the admin category Select (predefined + any legacy category on the current article). */
export function helpArticleCategorySelectItems(currentCategory?: string | null): { value: string; label: string }[] {
  const base = HELP_ARTICLE_CATEGORY_OPTIONS.map(({ value, label }) => ({ value, label }));
  const c = (currentCategory ?? '').trim();
  if (c && !PREDEFINED.has(c)) {
    base.push({ value: c, label: `${c} (custom)` });
  }
  return base;
}

/** Sorted category list for admin filters: predefined order first, then other labels from the dataset. */
export function mergeHelpArticleCategoriesForFilter(articles: { category: string }[]): string[] {
  const extras = new Set<string>();
  for (const a of articles) {
    const t = (a.category ?? '').trim();
    if (t && !PREDEFINED.has(t)) extras.add(t);
  }
  const ordered = HELP_ARTICLE_CATEGORY_OPTIONS.map((o) => o.value);
  const rest = [...extras].sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

export function helpArticleCategoryBlurb(value: string): string | undefined {
  return HELP_ARTICLE_CATEGORY_OPTIONS.find((o) => o.value === value)?.blurb;
}

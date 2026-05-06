import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const cards = [
  {
    to: '/admin/legal/practice-areas',
    title: 'Practice areas',
    description: 'Overview text, tags, service cards, and sort order for each practice-area URL.',
  },
  {
    to: '/admin/legal/legal-case-categories',
    title: 'Legal case categories',
    description: 'Taxonomy for case records (slug, name, color, order); each case links to one category.',
  },
  {
    to: '/admin/legal/legal-cases',
    title: 'Legal cases',
    description: 'Case metadata, teaser, and structured full content fields; link rows to a practice area slug.',
  },
  {
    to: '/admin/legal/summary-categories',
    title: 'Summary categories',
    description: 'Taxonomy for the summaries library (slug, label, color, order).',
  },
  {
    to: '/admin/legal/summaries',
    title: 'Summaries',
    description: 'Long-form summaries with category, premium flag, and engagement counters.',
  },
  {
    to: '/admin/legal/act-categories',
    title: 'Act categories',
    description: 'Taxonomy for acts and laws (slug, name, color, order); each act links to one category.',
  },
  {
    to: '/admin/legal/acts',
    title: 'Acts',
    description: 'Acts and laws catalog (bilingual titles, category, premium). Slug is the primary key.',
  },
  {
    to: '/admin/legal/procedure-categories',
    title: 'Procedure categories',
    description: 'Taxonomy for procedures (slug, name, color, order); each procedure links to one category.',
  },
  {
    to: '/admin/legal/procedures',
    title: 'Procedures',
    description: 'Step-by-step procedures with nested steps (order + description).',
  },
];

const LegalOverview = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Use the sections below to edit content that was previously only manageable in Django admin. Structured fields map
      to the same JSON stored by the API.
    </p>
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c) => (
        <Link key={c.to} to={c.to} className="block rounded-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">{c.title}</CardTitle>
              <CardDescription>{c.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm font-medium text-primary-onBg">Open →</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  </div>
);

export default LegalOverview;

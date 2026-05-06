import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Eye, ThumbsUp, ThumbsDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPublicNotices, type NoticePublicApi } from '@/lib/api';

function postedLabel(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

const Notices = () => {
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('All');
  const [issuer, setIssuer] = useState('All');

  const { data: notices = [], isLoading, isError } = useQuery({
    queryKey: ['public-notices'],
    queryFn: () => fetchPublicNotices(),
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const n of notices) {
      if (Array.isArray(n.tags)) {
        for (const t of n.tags) {
          if (t) s.add(t);
        }
      }
    }
    return ['All', ...[...s].sort((a, b) => a.localeCompare(b))];
  }, [notices]);

  const allIssuers = useMemo(() => {
    const s = new Set<string>();
    for (const n of notices) {
      if (n.issued_by) s.add(n.issued_by);
    }
    return ['All', ...[...s].sort((a, b) => a.localeCompare(b))];
  }, [notices]);

  const filtered = useMemo(() => {
    return notices.filter((n) => {
      const ql = q.toLowerCase();
      const matchesQ =
        !q.trim() ||
        n.title.toLowerCase().includes(ql) ||
        (n.title_ne && n.title_ne.toLowerCase().includes(ql)) ||
        (n.excerpt && n.excerpt.toLowerCase().includes(ql)) ||
        (n.excerpt_ne && n.excerpt_ne.toLowerCase().includes(ql));
      const matchesTag = tag === 'All' || (Array.isArray(n.tags) && n.tags.includes(tag));
      const matchesIssuer = issuer === 'All' || n.issued_by === issuer;
      return matchesQ && matchesTag && matchesIssuer;
    });
  }, [notices, q, tag, issuer]);

  const tagCount = (t: string) => (t === 'All' ? notices.length : notices.filter((n) => n.tags?.includes(t)).length);
  const issuerCount = (i: string) =>
    i === 'All' ? notices.length : notices.filter((n) => n.issued_by === i).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <section className="bg-[#0a1628] text-white pt-28 pb-12 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-7xl">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide uppercase">Notices</h1>
          <p className="text-white/85 mt-3 text-sm md:text-base max-w-2xl leading-relaxed">
            Latest official notices, circulars and directives.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 flex-1 max-w-7xl grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type here to search notices..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-card border-border/80 shadow-sm"
            />
          </div>

          {isLoading && <p className="text-sm text-muted-foreground py-8">Loading notices…</p>}
          {isError && <p className="text-sm text-destructive py-8">Could not load notices.</p>}

          {!isLoading &&
            filtered.map((n) => (
              <NoticeCard key={n.id} notice={n} />
            ))}

          {!isLoading && !isError && filtered.length === 0 && (
            <p className="text-center py-16 text-muted-foreground">No notices found.</p>
          )}
        </div>

        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-8">
          <FilterBlock title="Tags" items={allTags} active={tag} onSelect={setTag} countFn={tagCount} />
          <FilterBlock title="Issued By" items={allIssuers} active={issuer} onSelect={setIssuer} countFn={issuerCount} />
        </aside>
      </section>
      <Footer />
    </div>
  );
};

function FilterBlock({
  title,
  items,
  active,
  onSelect,
  countFn,
}: {
  title: string;
  items: string[];
  active: string;
  onSelect: (v: string) => void;
  countFn: (v: string) => number;
}) {
  return (
    <div>
      <h3 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide">{title}</h3>
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 text-sm border-b border-border/60 last:border-0 transition-colors text-left',
              active === item ? 'bg-emerald-600 text-white' : 'hover:bg-muted/60 text-foreground',
            )}
          >
            <span className="truncate pr-2">{item}</span>
            <span
              className={cn(
                'inline-flex min-w-[1.75rem] h-7 items-center justify-center rounded-full text-xs font-semibold px-2 shrink-0',
                active === item ? 'bg-amber-400 text-[#0a1628]' : 'text-muted-foreground',
              )}
            >
              {countFn(item)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NoticeCard({ notice }: { notice: NoticePublicApi }) {
  return (
    <Link to={`/notices/${notice.slug}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    <Card className="p-5 rounded-xl border border-border/80 shadow-sm hover:shadow-md transition-shadow bg-card h-full cursor-pointer">
      <h3 className="font-semibold text-[#0a1628] dark:text-foreground leading-snug">{notice.title}</h3>
      {notice.excerpt ? <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{notice.excerpt}</p> : null}
      <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" /> {notice.upvotes}
        </span>
        <span className="inline-flex items-center gap-1">
          <ThumbsDown className="h-3.5 w-3.5 text-rose-600" /> {notice.downvotes}
        </span>
        {Array.isArray(notice.tags) &&
          notice.tags.map((t) => (
            <Badge key={t} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-md">
              {t}
            </Badge>
          ))}
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" /> Posted {postedLabel(notice.created_at)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" /> {notice.view_count.toLocaleString()} views
        </span>
      </div>
    </Card>
    </Link>
  );
}

export default Notices;

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit } from 'lucide-react';
import { RecordViewDialog } from '@/components/admin/RecordViewDialog';
import { useToast } from '@/hooks/use-toast';
import {
  deleteAdminLegalCase,
  fetchAdminLegalCaseCategories,
  fetchAdminLegalCases,
  fetchAdminPracticeAreas,
  patchAdminLegalCase,
  postAdminLegalCase,
  type LegalCaseAdminApi,
  type PracticeAreaAdminApi,
} from '@/lib/api';
import { legalCasesForPracticeAreaQueryKey, practiceAreasQueryKey } from '@/lib/practiceAreasQuery';
import { slugify } from '@/lib/slugify';

const CATEGORY_SELECT_EMPTY = '__none__';

const FULL_CONTENT_KEYS = new Set([
  'background',
  'legal_arguments',
  'legalArguments',
  'judgment',
  'analysis',
  'implications',
  'precedents',
  'strategic_insights',
  'strategicInsights',
  'key_points',
  'keyPoints',
]);

type LegalCaseFullContentForm = {
  background: string;
  legalArguments: string[];
  judgment: string;
  analysis: string;
  implications: string[];
  precedents: string[];
  strategicInsights: string[];
  keyPoints: string[];
};

function emptyFullContent(): LegalCaseFullContentForm {
  return {
    background: '',
    legalArguments: [],
    judgment: '',
    analysis: '',
    implications: [],
    precedents: [],
    strategicInsights: [],
    keyPoints: [],
  };
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function parseFullContentFromRow(
  fc: Record<string, unknown> | undefined | null
): { fields: LegalCaseFullContentForm; extra: Record<string, unknown> } {
  const raw =
    fc && typeof fc === 'object' && !Array.isArray(fc) ? { ...(fc as Record<string, unknown>) } : {};
  const fields: LegalCaseFullContentForm = {
    background: String(raw.background ?? ''),
    legalArguments: toStringArray(raw.legal_arguments ?? raw.legalArguments),
    judgment: String(raw.judgment ?? ''),
    analysis: String(raw.analysis ?? ''),
    implications: toStringArray(raw.implications),
    precedents: toStringArray(raw.precedents),
    strategicInsights: toStringArray(raw.strategic_insights ?? raw.strategicInsights),
    keyPoints: toStringArray(raw.key_points ?? raw.keyPoints),
  };
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!FULL_CONTENT_KEYS.has(k)) extra[k] = v;
  }
  return { fields, extra };
}

function buildFullContentPayload(fields: LegalCaseFullContentForm, extra: Record<string, unknown>): Record<string, unknown> {
  return {
    ...extra,
    background: fields.background,
    legal_arguments: fields.legalArguments,
    judgment: fields.judgment,
    analysis: fields.analysis,
    implications: fields.implications,
    precedents: fields.precedents,
    strategic_insights: fields.strategicInsights,
    key_points: fields.keyPoints,
  };
}

function HtmlListField({
  label,
  hint,
  items,
  onChange,
  rows = 3,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (next: string[]) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {items.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Textarea
              rows={rows}
              className="flex-1 min-w-0 text-sm font-mono"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

const emptyForm = () => ({
  slug: '',
  title: '',
  reference_number: '',
  date_filed: new Date().toISOString().slice(0, 10),
  date_decided: '' as string,
  court: '',
  /** LegalCaseCategory id (UUID). */
  category: '',
  practice_area: '',
  teaser: '',
  parties: '',
  summary: '',
  outcome: '',
  fullContent: emptyFullContent(),
  fullContentExtra: {} as Record<string, unknown>,
});

type FormState = ReturnType<typeof emptyForm>;

function rowToForm(row: LegalCaseAdminApi): FormState {
  const { fields, extra } = parseFullContentFromRow(row.full_content);
  return {
    slug: row.slug,
    title: row.title,
    reference_number: row.reference_number,
    date_filed: row.date_filed,
    date_decided: row.date_decided ?? '',
    court: row.court,
    category: typeof row.category === 'string' ? row.category : '',
    practice_area: row.practice_area,
    teaser: row.teaser ?? '',
    parties: row.parties ?? '',
    summary: row.summary ?? '',
    outcome: row.outcome ?? '',
    fullContent: fields,
    fullContentExtra: extra,
  };
}

const AdminLegalCases = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: areas = [] } = useQuery({
    queryKey: ['admin-practice-areas'],
    queryFn: fetchAdminPracticeAreas,
  });
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['admin-legal-cases'],
    queryFn: fetchAdminLegalCases,
  });
  const { data: caseCategories = [] } = useQuery({
    queryKey: ['admin-legal-case-categories'],
    queryFn: fetchAdminLegalCaseCategories,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<LegalCaseAdminApi | null>(null);
  const slugEditedManuallyRef = useRef(false);

  const areaSlugs = useMemo(() => areas.map((a: PracticeAreaAdminApi) => a.slug).sort(), [areas]);

  const sortedCaseCategories = useMemo(
    () => [...caseCategories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [caseCategories],
  );

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-legal-cases'] });
    void qc.invalidateQueries({ queryKey: ['admin-legal-case-categories'] });
    void qc.invalidateQueries({ queryKey: ['legal-cases'] });
    for (const slug of areaSlugs) {
      void qc.invalidateQueries({ queryKey: legalCasesForPracticeAreaQueryKey(slug) });
    }
    void qc.invalidateQueries({ queryKey: practiceAreasQueryKey });
  };

  const buildPayload = (): Partial<LegalCaseAdminApi> => ({
    slug: form.slug.trim(),
    title: form.title.trim(),
    reference_number: form.reference_number.trim(),
    date_filed: form.date_filed,
    date_decided: form.date_decided.trim() || null,
    court: form.court.trim(),
    category: form.category.trim(),
    practice_area: form.practice_area.trim(),
    teaser: form.teaser,
    parties: form.parties,
    summary: form.summary,
    outcome: form.outcome,
    full_content: buildFullContentPayload(form.fullContent, form.fullContentExtra),
  });

  const createMut = useMutation({
    mutationFn: () => postAdminLegalCase(buildPayload()),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      slugEditedManuallyRef.current = false;
      setForm(emptyForm());
      toast({ title: 'Case created' });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('missing id');
      return patchAdminLegalCase(editingId, buildPayload());
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      slugEditedManuallyRef.current = false;
      toast({ title: 'Saved' });
    },
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminLegalCase,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const savePending = createMut.isPending || patchMut.isPending;

  const handleSave = () => {
    if (!form.slug.trim() || !form.title.trim() || !form.practice_area.trim() || !form.category.trim()) {
      toast({ title: 'Slug, title, practice area, and category are required', variant: 'destructive' });
      return;
    }
    if (editingId) patchMut.mutate();
    else createMut.mutate();
  };

  const setFc = (patch: Partial<LegalCaseFullContentForm>) => {
    setForm((f) => ({ ...f, fullContent: { ...f.fullContent, ...patch } }));
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  if (isError) return <p className="text-sm text-destructive py-6">Could not load cases.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Legal cases</h2>
          <p className="text-sm text-muted-foreground">Extended case copy is edited in structured fields; other keys on full_content are preserved when you save.</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            slugEditedManuallyRef.current = false;
            const first = areaSlugs[0] ?? '';
            setForm({
              ...emptyForm(),
              practice_area: first,
              category: sortedCaseCategories[0]?.id ?? '',
            });
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Practice area</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Filed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No rows
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.slug}</TableCell>
                <TableCell className="max-w-[200px] truncate font-medium" title={r.title}>
                  {r.title}
                </TableCell>
                <TableCell className="text-sm">{r.practice_area}</TableCell>
                <TableCell className="text-sm">{r.category_name ?? r.category}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{r.date_filed}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1 flex-wrap">
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setViewRow(r)}>
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingId(r.id);
                        slugEditedManuallyRef.current = false;
                        setForm(rowToForm(r));
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit case' : 'New case'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => {
                      if (!editingId && !slugEditedManuallyRef.current) {
                        return { ...f, title, slug: slugify(title) };
                      }
                      return { ...f, title };
                    });
                  }}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    slugEditedManuallyRef.current = true;
                    setForm((f) => ({ ...f, slug: e.target.value }));
                  }}
                  disabled={!!editingId}
                />
              </div>
              <div>
                <Label>Practice area (slug)</Label>
                {areaSlugs.length > 0 ? (
                  <Select
                    value={form.practice_area || areaSlugs[0]}
                    onValueChange={(v) => setForm((f) => ({ ...f, practice_area: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select slug" />
                    </SelectTrigger>
                    <SelectContent>
                      {areaSlugs.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.practice_area}
                    onChange={(e) => setForm((f) => ({ ...f, practice_area: e.target.value }))}
                    placeholder="Create a practice area first, or type slug"
                  />
                )}
              </div>
              <div>
                <Label>Reference number</Label>
                <Input value={form.reference_number} onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))} />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category.trim() ? form.category : CATEGORY_SELECT_EMPTY}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v === CATEGORY_SELECT_EMPTY ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CATEGORY_SELECT_EMPTY}>Select category…</SelectItem>
                    {sortedCaseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sortedCaseCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Create categories under{' '}
                    <Link className="text-primary underline" to="/admin/legal/legal-case-categories">
                      Case categories
                    </Link>{' '}
                    first.
                  </p>
                )}
              </div>
              <div>
                <Label>Date filed</Label>
                <Input type="date" value={form.date_filed} onChange={(e) => setForm((f) => ({ ...f, date_filed: e.target.value }))} />
              </div>
              <div>
                <Label>Date decided (optional)</Label>
                <Input type="date" value={form.date_decided} onChange={(e) => setForm((f) => ({ ...f, date_decided: e.target.value }))} />
              </div>
              <div>
                <Label>Court</Label>
                <Input value={form.court} onChange={(e) => setForm((f) => ({ ...f, court: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Teaser</Label>
              <Textarea rows={2} value={form.teaser} onChange={(e) => setForm((f) => ({ ...f, teaser: e.target.value }))} />
            </div>
            <div>
              <Label>Parties</Label>
              <Textarea rows={2} value={form.parties} onChange={(e) => setForm((f) => ({ ...f, parties: e.target.value }))} />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea rows={3} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
            </div>
            <div>
              <Label>Outcome</Label>
              <Textarea rows={2} value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} />
            </div>

            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2">Full content</h3>
              <p className="text-xs text-muted-foreground mb-3">HTML is supported where the public case page renders rich text.</p>
              <div className="space-y-4">
                <div>
                  <Label>Background</Label>
                  <Textarea rows={4} value={form.fullContent.background} onChange={(e) => setFc({ background: e.target.value })} />
                </div>
                <HtmlListField
                  label="Legal arguments"
                  hint="Each entry is one argument block (often HTML)."
                  items={form.fullContent.legalArguments}
                  onChange={(legalArguments) => setFc({ legalArguments })}
                  rows={4}
                />
                <div>
                  <Label>Judgment</Label>
                  <Textarea rows={3} value={form.fullContent.judgment} onChange={(e) => setFc({ judgment: e.target.value })} />
                </div>
                <div>
                  <Label>Analysis</Label>
                  <Textarea rows={3} value={form.fullContent.analysis} onChange={(e) => setFc({ analysis: e.target.value })} />
                </div>
                <HtmlListField label="Implications" items={form.fullContent.implications} onChange={(implications) => setFc({ implications })} />
                <HtmlListField label="Precedents" items={form.fullContent.precedents} onChange={(precedents) => setFc({ precedents })} />
                <HtmlListField
                  label="Strategic insights"
                  items={form.fullContent.strategicInsights}
                  onChange={(strategicInsights) => setFc({ strategicInsights })}
                />
                <HtmlListField
                  label="Key points"
                  hint="Shown as key legal points in case previews where supported."
                  items={form.fullContent.keyPoints}
                  onChange={(keyPoints) => setFc({ keyPoints })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={savePending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={savePending}>
              {editingId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordViewDialog
        open={viewRow !== null}
        onOpenChange={(open) => {
          if (!open) setViewRow(null);
        }}
        title={viewRow ? `Legal case: ${viewRow.slug}` : 'Details'}
        value={viewRow}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete case?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deleteMut.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminLegalCases;

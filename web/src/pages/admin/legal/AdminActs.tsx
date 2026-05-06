import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  deleteAdminAct,
  fetchAdminActCategories,
  fetchAdminActs,
  patchAdminAct,
  postAdminAct,
  type ActAdminApi,
} from '@/lib/api';
import { slugify } from '@/lib/slugify';
import { parseLawDetailFromApi, type LawDetailContent } from '@/data/lawsAndSummaries';

const CATEGORY_SELECT_EMPTY = '__none__';

function autoActSlug(titleEn: string, titleNe: string): string {
  const fromEn = slugify(titleEn);
  if (fromEn) return fromEn;
  const fromNe = slugify(titleNe);
  if (fromNe) return fromNe;
  return `act-${Date.now().toString(36)}`;
}

type DetailTabForm = { id: 'content' | 'amendments' | 'cases'; label: string; labelNe: string };
type DetailSectionForm = {
  id: string;
  label: string;
  labelNe: string;
  title: string;
  titleNe: string;
  paragraphsEn: string;
  paragraphsNe: string;
};

type DetailFormState = {
  tabs: DetailTabForm[];
  sections: DetailSectionForm[];
  calloutTitle: string;
  calloutTitleNe: string;
  calloutBodyEn: string;
  calloutBodyNe: string;
  amendmentsText: string;
  relatedCasesText: string;
};

function splitParagraphBlocks(text: string): string[] {
  return text
    .split(/\n(?:\s*\n)+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function emptyDetailForm(): DetailFormState {
  return {
    tabs: [
      { id: 'content', label: 'Content', labelNe: 'सामग्री' },
      { id: 'amendments', label: 'Amendments', labelNe: 'संशोधनहरू' },
      { id: 'cases', label: 'Related Cases', labelNe: 'सम्बन्धित मुद्दाहरू' },
    ],
    sections: [
      {
        id: '',
        label: '',
        labelNe: '',
        title: '',
        titleNe: '',
        paragraphsEn: '',
        paragraphsNe: '',
      },
    ],
    calloutTitle: '',
    calloutTitleNe: '',
    calloutBodyEn: '',
    calloutBodyNe: '',
    amendmentsText: '',
    relatedCasesText: '',
  };
}

function lawDetailToForm(c: LawDetailContent): DetailFormState {
  return {
    tabs: c.tabs.map((t) => ({ id: t.id, label: t.label, labelNe: t.labelNe })),
    sections: c.sections.map((s) => ({
      id: s.id,
      label: s.label,
      labelNe: s.labelNe,
      title: s.title,
      titleNe: s.titleNe,
      paragraphsEn: s.paragraphs.en.join('\n\n'),
      paragraphsNe: s.paragraphs.ne.join('\n\n'),
    })),
    calloutTitle: c.callout.title,
    calloutTitleNe: c.callout.titleNe,
    calloutBodyEn: c.callout.body.en,
    calloutBodyNe: c.callout.body.ne,
    amendmentsText: c.amendments.join('\n'),
    relatedCasesText: c.relatedCases.join('\n'),
  };
}

/** Returns a reader-safe payload, or `null` when the form should clear / omit custom detail. */
function buildDetailJsonObject(d: DetailFormState): object | null {
  const sectionsPayload = d.sections
    .filter((s) => s.id.trim().length > 0)
    .map((s) => ({
      id: s.id.trim(),
      label: s.label,
      labelNe: s.labelNe,
      title: s.title,
      titleNe: s.titleNe,
      paragraphs: {
        en: splitParagraphBlocks(s.paragraphsEn),
        ne: splitParagraphBlocks(s.paragraphsNe),
      },
    }));
  if (sectionsPayload.length === 0) return null;

  const tabsPayload = d.tabs.map((t) => ({ id: t.id, label: t.label, labelNe: t.labelNe }));
  const amendments = linesToList(d.amendmentsText);
  const relatedCases = linesToList(d.relatedCasesText);
  const obj = {
    tabs: tabsPayload,
    sections: sectionsPayload,
    callout: {
      title: d.calloutTitle,
      titleNe: d.calloutTitleNe,
      body: { en: d.calloutBodyEn, ne: d.calloutBodyNe },
    },
    amendments,
    relatedCases,
  };
  if (parseLawDetailFromApi(obj) == null) return null;
  return obj;
}

const emptyForm = () => ({
  slug: '',
  title_en: '',
  title_ne: '',
  /** ActCategory id (UUID). */
  category: '',
  year: '',
  updated: new Date().toISOString().slice(0, 10),
  premium: false,
});

type FormState = ReturnType<typeof emptyForm>;

function rowToForm(row: ActAdminApi): FormState {
  return {
    slug: row.slug,
    title_en: row.title_en,
    title_ne: row.title_ne,
    category: typeof row.category === 'string' ? row.category : '',
    year: row.year,
    updated: row.updated,
    premium: row.premium,
  };
}

const AdminActs = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['admin-acts'],
    queryFn: fetchAdminActs,
  });
  const { data: actCategories = [] } = useQuery({
    queryKey: ['admin-act-categories'],
    queryFn: fetchAdminActCategories,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [detailForm, setDetailForm] = useState<DetailFormState>(() => emptyDetailForm());
  const [detailOmitUnparseable, setDetailOmitUnparseable] = useState(false);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<ActAdminApi | null>(null);

  const slugEditedManuallyRef = useRef(false);
  const detailPreserveOmitRef = useRef(false);
  const detailTouchedRef = useRef(false);

  const sortedActCategories = useMemo(
    () => [...actCategories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [actCategories],
  );

  const loadDetailStateFromRow = (row: ActAdminApi | null) => {
    detailTouchedRef.current = false;
    if (!row) {
      setDetailForm(emptyDetailForm());
      detailPreserveOmitRef.current = false;
      setDetailOmitUnparseable(false);
      return;
    }
    const parsed = parseLawDetailFromApi(row.detail_json);
    if (parsed) {
      setDetailForm(lawDetailToForm(parsed));
      detailPreserveOmitRef.current = false;
      setDetailOmitUnparseable(false);
    } else if (row.detail_json != null) {
      setDetailForm(emptyDetailForm());
      detailPreserveOmitRef.current = true;
      setDetailOmitUnparseable(true);
    } else {
      setDetailForm(emptyDetailForm());
      detailPreserveOmitRef.current = false;
      setDetailOmitUnparseable(false);
    }
  };

  const setDetailFormAndTouch = (updater: (prev: DetailFormState) => DetailFormState) => {
    detailTouchedRef.current = true;
    setDetailForm(updater);
  };

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-acts'] });
    void qc.invalidateQueries({ queryKey: ['admin-act-categories'] });
    void qc.invalidateQueries({ queryKey: ['public-acts'] });
    void qc.invalidateQueries({ queryKey: ['public-act'] });
  };

  const createMut = useMutation({
    mutationFn: () => {
      const body: Parameters<typeof postAdminAct>[0] = {
        slug: form.slug.trim(),
        title_en: form.title_en.trim(),
        title_ne: form.title_ne.trim(),
        category: form.category.trim(),
        year: form.year.trim(),
        updated: form.updated,
        premium: form.premium,
      };
      const detail = buildDetailJsonObject(detailForm);
      if (detail) body.detail_json = detail;
      return postAdminAct(body);
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingSlug(null);
      slugEditedManuallyRef.current = false;
      detailPreserveOmitRef.current = false;
      setDetailOmitUnparseable(false);
      setForm(emptyForm());
      setDetailForm(emptyDetailForm());
      toast({ title: 'Act created' });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () => {
      if (!editingSlug) throw new Error('missing slug');
      const patch: Parameters<typeof patchAdminAct>[1] = {
        title_en: form.title_en.trim(),
        title_ne: form.title_ne.trim(),
        category: form.category.trim(),
        year: form.year.trim(),
        updated: form.updated,
        premium: form.premium,
      };
      if (detailPreserveOmitRef.current && !detailTouchedRef.current) {
        /* leave stored detail_json unchanged */
      } else {
        const detail = buildDetailJsonObject(detailForm);
        patch.detail_json = detail;
      }
      return patchAdminAct(editingSlug, patch);
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingSlug(null);
      slugEditedManuallyRef.current = false;
      detailPreserveOmitRef.current = false;
      setDetailOmitUnparseable(false);
      toast({ title: 'Saved' });
    },
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminAct,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const validateAndSave = () => {
    if (!form.slug.trim() && !editingSlug) {
      toast({ title: 'Slug required', variant: 'destructive' });
      return;
    }
    if (!form.title_en.trim()) {
      toast({ title: 'English title required', variant: 'destructive' });
      return;
    }
    if (!form.category.trim()) {
      toast({ title: 'Category required', variant: 'destructive' });
      return;
    }
    const wantsDetail =
      detailForm.sections.some(
        (s) =>
          s.id.trim() &&
          (s.label.trim() ||
            s.labelNe.trim() ||
            s.title.trim() ||
            s.titleNe.trim() ||
            s.paragraphsEn.trim() ||
            s.paragraphsNe.trim()),
      ) ||
      detailForm.calloutTitle.trim() ||
      detailForm.calloutTitleNe.trim() ||
      detailForm.calloutBodyEn.trim() ||
      detailForm.calloutBodyNe.trim() ||
      detailForm.amendmentsText.trim() ||
      detailForm.relatedCasesText.trim();

    if (wantsDetail) {
      const detail = buildDetailJsonObject(detailForm);
      if (detail == null) {
        toast({
          title: 'Public page detail incomplete',
          description:
            'Add at least one section with an id, keep the Content tab, and use valid tab ids (content, amendments, cases). Separate paragraphs with a blank line.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (editingSlug) patchMut.mutate();
    else createMut.mutate();
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  if (isError) return <p className="text-sm text-destructive py-6">Could not load acts.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Acts</h2>
          <p className="text-sm text-muted-foreground">
            Slug is generated from titles as you type (English preferred, then Nepali Latin characters). You can edit it
            before create; it cannot be changed after create.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSlug(null);
            slugEditedManuallyRef.current = false;
            setForm({ ...emptyForm(), category: sortedActCategories[0]?.id ?? '' });
            loadDetailStateFromRow(null);
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
              <TableHead>Title (EN)</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.slug}>
                <TableCell className="font-mono text-xs max-w-[140px] truncate">{r.slug}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.title_en}</TableCell>
                <TableCell className="text-sm">{r.category_name ?? r.category}</TableCell>
                <TableCell className="text-sm">{r.premium ? 'Yes' : '—'}</TableCell>
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
                        setEditingSlug(r.slug);
                        slugEditedManuallyRef.current = false;
                        setForm(rowToForm(r));
                        loadDetailStateFromRow(r);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteSlug(r.slug)}>
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
            <DialogTitle>{editingSlug ? 'Edit act' : 'New act'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title (English)</Label>
              <Input
                value={form.title_en}
                onChange={(e) => {
                  const title_en = e.target.value;
                  setForm((f) => {
                    let next: FormState = { ...f, title_en };
                    if (!editingSlug && !slugEditedManuallyRef.current) {
                      next = { ...next, slug: autoActSlug(title_en, f.title_ne) };
                    }
                    return next;
                  });
                }}
              />
            </div>
            <div>
              <Label>Title (Nepali)</Label>
              <Input
                value={form.title_ne}
                onChange={(e) => {
                  const title_ne = e.target.value;
                  setForm((f) => {
                    let next: FormState = { ...f, title_ne };
                    if (!editingSlug && !slugEditedManuallyRef.current) {
                      next = { ...next, slug: autoActSlug(f.title_en, title_ne) };
                    }
                    return next;
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
                disabled={!!editingSlug}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category ? form.category : CATEGORY_SELECT_EMPTY}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v === CATEGORY_SELECT_EMPTY ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_SELECT_EMPTY}>Select category…</SelectItem>
                  {sortedActCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sortedActCategories.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Create categories under <Link className="text-primary underline" to="/admin/legal/act-categories">Act categories</Link> first.
                </p>
              )}
            </div>
            <div>
              <Label>Year</Label>
              <Input value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
            </div>
            <div>
              <Label>Updated (date)</Label>
              <Input type="date" value={form.updated} onChange={(e) => setForm((f) => ({ ...f, updated: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.premium} onCheckedChange={(v) => setForm((f) => ({ ...f, premium: v }))} />
              <Label>Premium</Label>
            </div>

            {detailPreserveOmitRef.current && (
              <p className="text-xs text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-2 py-2">
                Stored public detail is in a format this form cannot load. It will be left unchanged unless you edit the
                section below and save.
              </p>
            )}

            <div className="rounded-md border p-3 space-y-4">
              <div>
                <Label className="text-base">Public page detail (optional)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Drives the law reader on the public site. Leave everything blank to use the built-in outline. Paragraphs:
                  separate blocks with a blank line. When editing, clearing all section ids removes custom detail on save
                  (unless the warning above applies).
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tabs</Label>
                <div className="space-y-2">
                  {detailForm.tabs.map((tab, idx) => (
                    <div key={tab.id} className="grid sm:grid-cols-3 gap-2 items-end">
                      <div>
                        <Label className="text-xs text-muted-foreground">Id</Label>
                        <Input className="font-mono text-xs" value={tab.id} disabled />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Label (EN)</Label>
                        <Input
                          value={tab.label}
                          onChange={(e) =>
                            setDetailFormAndTouch((d) => {
                              const tabs = [...d.tabs];
                              tabs[idx] = { ...tabs[idx], label: e.target.value };
                              return { ...d, tabs };
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Label (NE)</Label>
                        <Input
                          value={tab.labelNe}
                          onChange={(e) =>
                            setDetailFormAndTouch((d) => {
                              const tabs = [...d.tabs];
                              tabs[idx] = { ...tabs[idx], labelNe: e.target.value };
                              return { ...d, tabs };
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">Sections</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      setDetailFormAndTouch((d) => ({
                        ...d,
                        sections: [
                          ...d.sections,
                          {
                            id: `section-${d.sections.length + 1}`,
                            label: '',
                            labelNe: '',
                            title: '',
                            titleNe: '',
                            paragraphsEn: '',
                            paragraphsNe: '',
                          },
                        ],
                      }))
                    }
                  >
                    Add section
                  </Button>
                </div>
                <div className="space-y-4">
                  {detailForm.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="rounded-md border bg-muted/30 p-3 space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Section {sIdx + 1}</span>
                        {detailForm.sections.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive"
                            onClick={() =>
                              setDetailFormAndTouch((d) => ({
                                ...d,
                                sections: d.sections.filter((_, i) => i !== sIdx),
                              }))
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Section id</Label>
                          <Input
                            className="font-mono text-xs"
                            value={sec.id}
                            onChange={(e) =>
                              setDetailFormAndTouch((d) => {
                                const sections = [...d.sections];
                                sections[sIdx] = { ...sections[sIdx], id: e.target.value };
                                return { ...d, sections };
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Sidebar label (EN)</Label>
                          <Input
                            value={sec.label}
                            onChange={(e) =>
                              setDetailFormAndTouch((d) => {
                                const sections = [...d.sections];
                                sections[sIdx] = { ...sections[sIdx], label: e.target.value };
                                return { ...d, sections };
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Sidebar label (NE)</Label>
                          <Input
                            value={sec.labelNe}
                            onChange={(e) =>
                              setDetailFormAndTouch((d) => {
                                const sections = [...d.sections];
                                sections[sIdx] = { ...sections[sIdx], labelNe: e.target.value };
                                return { ...d, sections };
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Heading (EN)</Label>
                          <Input
                            value={sec.title}
                            onChange={(e) =>
                              setDetailFormAndTouch((d) => {
                                const sections = [...d.sections];
                                sections[sIdx] = { ...sections[sIdx], title: e.target.value };
                                return { ...d, sections };
                              })
                            }
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Heading (NE)</Label>
                          <Input
                            value={sec.titleNe}
                            onChange={(e) =>
                              setDetailFormAndTouch((d) => {
                                const sections = [...d.sections];
                                sections[sIdx] = { ...sections[sIdx], titleNe: e.target.value };
                                return { ...d, sections };
                              })
                            }
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Paragraphs (EN)</Label>
                          <Textarea
                            rows={4}
                            value={sec.paragraphsEn}
                            onChange={(e) =>
                              setDetailFormAndTouch((d) => {
                                const sections = [...d.sections];
                                sections[sIdx] = { ...sections[sIdx], paragraphsEn: e.target.value };
                                return { ...d, sections };
                              })
                            }
                            placeholder="One or more blocks; separate paragraphs with a blank line."
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Paragraphs (NE)</Label>
                          <Textarea
                            rows={4}
                            value={sec.paragraphsNe}
                            onChange={(e) =>
                              setDetailFormAndTouch((d) => {
                                const sections = [...d.sections];
                                sections[sIdx] = { ...sections[sIdx], paragraphsNe: e.target.value };
                                return { ...d, sections };
                              })
                            }
                            placeholder="One or more blocks; separate paragraphs with a blank line."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Callout</Label>
                  <Input
                    placeholder="Title (EN)"
                    value={detailForm.calloutTitle}
                    onChange={(e) =>
                      setDetailFormAndTouch((d) => ({ ...d, calloutTitle: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Title (NE)"
                    value={detailForm.calloutTitleNe}
                    onChange={(e) =>
                      setDetailFormAndTouch((d) => ({ ...d, calloutTitleNe: e.target.value }))
                    }
                  />
                  <Textarea
                    rows={3}
                    placeholder="Body (EN)"
                    value={detailForm.calloutBodyEn}
                    onChange={(e) =>
                      setDetailFormAndTouch((d) => ({ ...d, calloutBodyEn: e.target.value }))
                    }
                  />
                  <Textarea
                    rows={3}
                    placeholder="Body (NE)"
                    value={detailForm.calloutBodyNe}
                    onChange={(e) =>
                      setDetailFormAndTouch((d) => ({ ...d, calloutBodyNe: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amendments (one per line)</Label>
                  <Textarea
                    rows={6}
                    value={detailForm.amendmentsText}
                    onChange={(e) =>
                      setDetailFormAndTouch((d) => ({ ...d, amendmentsText: e.target.value }))
                    }
                  />
                  <Label className="text-sm font-medium">Related cases (one per line)</Label>
                  <Textarea
                    rows={6}
                    value={detailForm.relatedCasesText}
                    onChange={(e) =>
                      setDetailFormAndTouch((d) => ({ ...d, relatedCasesText: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createMut.isPending || patchMut.isPending}>
              Cancel
            </Button>
            <Button onClick={validateAndSave} disabled={createMut.isPending || patchMut.isPending}>
              {editingSlug ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordViewDialog
        open={viewRow !== null}
        onOpenChange={(open) => {
          if (!open) setViewRow(null);
        }}
        title={viewRow ? `Act: ${viewRow.slug}` : 'Details'}
        value={viewRow}
      />

      <AlertDialog open={!!deleteSlug} onOpenChange={(o) => !o && setDeleteSlug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete act?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteSlug) {
                  deleteMut.mutate(deleteSlug);
                  setDeleteSlug(null);
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

export default AdminActs;

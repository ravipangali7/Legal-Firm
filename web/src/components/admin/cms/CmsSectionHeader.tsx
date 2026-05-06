import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, LayoutGrid, LayoutList, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCmsPageSave } from '@/hooks/useCmsPageSave';

export type CmsViewMode = 'list' | 'grid';

type CmsSectionHeaderProps = {
  title: string;
  description: string;
  viewMode: CmsViewMode;
  onViewModeChange: (mode: CmsViewMode) => void;
  onAdd?: () => void;
  addLabel?: string;
  extraActions?: ReactNode;
  className?: string;
};

export function CmsSectionHeader({
  title,
  description,
  viewMode,
  onViewModeChange,
  onAdd,
  addLabel = 'Add',
  extraActions,
  className,
}: CmsSectionHeaderProps) {
  const { saving, handleSave } = useCmsPageSave();

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => {
              if (v === 'list' || v === 'grid') onViewModeChange(v);
            }}
            variant="outline"
            size="sm"
            className="justify-start"
            aria-label="Listing layout"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-3">
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="gap-1.5 px-3">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </ToggleGroupItem>
          </ToggleGroup>
          {extraActions}
          {onAdd ? (
            <Button type="button" variant="secondary" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1.5" />
              {addLabel}
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CmsThumb({
  src,
  alt,
  className,
}: {
  src: string | undefined;
  alt: string;
  className?: string;
}) {
  const has = Boolean(src && src.trim());
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-muted shrink-0',
        className
      )}
    >
      {has ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-muted-foreground px-1 text-center leading-tight">
          No image
        </div>
      )}
      {has ? <span className="sr-only">{alt}</span> : null}
    </div>
  );
}

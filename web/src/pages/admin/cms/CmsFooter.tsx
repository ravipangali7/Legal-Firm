import { useCms } from '@/store/cmsStore';
import FooterCmsForm from '@/components/admin/cms/FooterCmsForm';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCmsPageSave } from '@/hooks/useCmsPageSave';

const CmsFooter = () => {
  const { footer, updateFooter } = useCms();
  const { saving, handleSave } = useCmsPageSave();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Footer</h2>
        <p className="text-sm text-muted-foreground">
          Tagline, columns, social links, and copyright. The public site footer reads this from the server after you save. Site logo and name in the footer brand area come from Settings → General.
        </p>
      </div>
      <FooterCmsForm footer={footer} onUpdate={updateFooter} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-muted/30 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Saves footer (and syncs any pending homepage edits) to the server so the live footer updates for all visitors.
        </p>
        <Button type="button" className="shrink-0" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : null}
          Save footer
        </Button>
      </div>
    </div>
  );
};

export default CmsFooter;

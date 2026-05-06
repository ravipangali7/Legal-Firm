import { useCms } from '@/store/cmsStore';
import FooterCmsForm from '@/components/admin/cms/FooterCmsForm';

const CmsFooter = () => {
  const { footer, updateFooter } = useCms();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Footer</h2>
        <p className="text-sm text-muted-foreground">
          Tagline, columns, social links, and copyright. Site logo and name in the footer brand area come from Settings → General.
        </p>
      </div>
      <FooterCmsForm footer={footer} onUpdate={updateFooter} />
    </div>
  );
};

export default CmsFooter;

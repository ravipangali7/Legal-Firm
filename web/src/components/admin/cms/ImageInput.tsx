import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { fileToDataUrl } from '@/store/cmsStore';
import { CmsImage } from '@/components/CmsImage';

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  /** Defaults to common raster types; widen for favicons (e.g. include `.ico`). */
  accept?: string;
}

const ImageInput = ({ value, onChange, label = 'Image', accept = 'image/*' }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const onFile = async (f?: File | null) => {
    if (!f) return;
    onChange(await fileToDataUrl(f));
    const el = ref.current;
    if (el) el.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex gap-3 items-start">
        <div className="w-24 h-16 rounded border bg-muted overflow-hidden flex-shrink-0">
          {value ? (
            <CmsImage
              src={value}
              alt=""
              className="w-full h-full object-cover"
              fillEmpty={false}
              fallbackKind="card"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">Upload an image file. It is stored on the server when you save.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => ref.current?.click()}>
              <Upload className="h-3 w-3 mr-1" />
              Choose file
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageInput;

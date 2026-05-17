import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import { seoPlainText } from '@/lib/seo';

export type SeoDescriptionFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
};

/** Rich-text SEO / meta description editor with plain-text character count. */
export function SeoDescriptionField({
  label = 'Meta description',
  value,
  onChange,
  placeholder,
  maxLength = 160,
  hint,
}: SeoDescriptionFieldProps) {
  const plainLen = seoPlainText(value).length;

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight={120}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {plainLen}/{maxLength} characters
        {hint ? ` · ${hint}` : ' (plain text used in search snippets)'}
      </p>
    </div>
  );
}

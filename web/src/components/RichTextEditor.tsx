import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Editor min-height in px (default 200). */
  minHeight?: number;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ align: [] }],
    ['clean'],
  ],
};

const RichTextEditor = ({ value, onChange, placeholder, minHeight = 200 }: RichTextEditorProps) => (
  <div className="rich-text-editor">
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder || 'Write content...'}
    />
    <style>{`
      .rich-text-editor .ql-container { min-height: ${minHeight}px; font-size: 14px; }
      .rich-text-editor .ql-editor { min-height: ${minHeight}px; }
      .rich-text-editor .ql-toolbar { border-radius: 8px 8px 0 0; border-color: hsl(var(--border)); }
      .rich-text-editor .ql-container { border-radius: 0 0 8px 8px; border-color: hsl(var(--border)); }
    `}</style>
  </div>
);

export default RichTextEditor;

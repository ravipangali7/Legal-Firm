import { Label } from '@/components/ui/label';

const MAX_DEPTH = 14;
const LONG_INLINE = 160;

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/_/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced
    .split(' ')
    .map((w) => (w.length <= 2 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

function EmptyValue() {
  return <span className="text-sm text-muted-foreground">—</span>;
}

function ScalarBlock({ value }: { value: string | number | bigint | boolean }) {
  if (typeof value === 'boolean') {
    return <span className="text-sm">{value ? 'Yes' : 'No'}</span>;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return <span className="text-sm tabular-nums">{String(value)}</span>;
  }
  const text = value;
  if (text === '') return <EmptyValue />;
  const multiline = text.includes('\n') || text.length > LONG_INLINE;
  if (multiline) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm max-h-72 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">
        {text}
      </div>
    );
  }
  return <p className="text-sm leading-relaxed break-words">{text}</p>;
}

function ArrayBlock({ items, depth }: { items: unknown[]; depth: number }) {
  if (depth > MAX_DEPTH) return <EmptyValue />;
  if (items.length === 0) return <EmptyValue />;

  const allScalar = items.every(
    (x) => x === null || x === undefined || ['string', 'number', 'boolean', 'bigint'].includes(typeof x)
  );

  if (allScalar) {
    return (
      <ol className="list-decimal list-inside space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={i} className="break-words pl-1">
            {item === null || item === undefined ? (
              <EmptyValue />
            ) : typeof item === 'boolean' ? (
              item ? 'Yes' : 'No'
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="rounded-md border bg-muted/20 p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item {i + 1}</p>
          <ValueBlock value={item} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function ObjectBlock({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  if (depth > MAX_DEPTH) return <EmptyValue />;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) return <EmptyValue />;

  return (
    <div className={depth === 0 ? 'space-y-6' : 'space-y-4 pl-1 border-l-2 border-muted ml-1 pl-3'}>
      {keys.map((key) => (
        <div key={key} className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">{humanizeKey(key)}</Label>
          <ValueBlock value={obj[key]} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function ValueBlock({ value, depth }: { value: unknown; depth: number }) {
  if (depth > MAX_DEPTH) return <EmptyValue />;
  if (value === null || value === undefined) return <EmptyValue />;
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'bigint') {
    return <ScalarBlock value={value} />;
  }
  if (typeof value === 'string') {
    return <ScalarBlock value={value} />;
  }
  if (Array.isArray(value)) {
    return <ArrayBlock items={value} depth={depth} />;
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return <ObjectBlock obj={value as Record<string, unknown>} depth={depth} />;
  }
  return <ScalarBlock value={String(value)} />;
}

export type StructuredRecordViewProps = {
  value: unknown;
};

/** Renders API records as labeled sections (nested objects and arrays supported). No raw JSON. */
export function StructuredRecordView({ value }: StructuredRecordViewProps) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground">No data.</p>;
  }
  return <ValueBlock value={value} depth={0} />;
}

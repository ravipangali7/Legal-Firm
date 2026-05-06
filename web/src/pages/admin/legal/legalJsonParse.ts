/** Parse JSON from admin textareas; throws with a clear message for toast/UI. */

export function parseJsonStringArray(raw: string, fieldLabel: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  let v: unknown;
  try {
    v = JSON.parse(t) as unknown;
  } catch {
    throw new Error(`${fieldLabel}: invalid JSON`);
  }
  if (!Array.isArray(v)) throw new Error(`${fieldLabel}: must be a JSON array`);
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] !== 'string') throw new Error(`${fieldLabel}: item ${i} must be a string`);
  }
  return v as string[];
}

export function parseJsonServiceList(raw: string, fieldLabel: string): unknown[] {
  const t = raw.trim();
  if (!t) return [];
  let v: unknown;
  try {
    v = JSON.parse(t) as unknown;
  } catch {
    throw new Error(`${fieldLabel}: invalid JSON`);
  }
  if (!Array.isArray(v)) throw new Error(`${fieldLabel}: must be a JSON array of objects`);
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] !== 'object' || v[i] === null || Array.isArray(v[i])) {
      throw new Error(`${fieldLabel}: item ${i} must be an object`);
    }
  }
  return v as unknown[];
}

export function parseJsonObject(raw: string, fieldLabel: string): Record<string, unknown> {
  const t = raw.trim();
  if (!t) return {};
  let v: unknown;
  try {
    v = JSON.parse(t) as unknown;
  } catch {
    throw new Error(`${fieldLabel}: invalid JSON`);
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new Error(`${fieldLabel}: must be a JSON object`);
  }
  return v as Record<string, unknown>;
}

export function parseProcedureStepsJson(raw: string, fieldLabel: string): { order: number; description: string }[] {
  const t = raw.trim();
  if (!t) return [];
  let v: unknown;
  try {
    v = JSON.parse(t) as unknown;
  } catch {
    throw new Error(`${fieldLabel}: invalid JSON`);
  }
  if (!Array.isArray(v)) throw new Error(`${fieldLabel}: must be a JSON array`);
  return v.map((row, i) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error(`${fieldLabel}: item ${i} must be an object`);
    }
    const o = row as Record<string, unknown>;
    const order = typeof o.order === 'number' ? o.order : Number(o.order ?? i);
    const description = String(o.description ?? '');
    if (Number.isNaN(order)) throw new Error(`${fieldLabel}: item ${i} has invalid order`);
    return { order, description };
  });
}

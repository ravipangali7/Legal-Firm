import { useState, useEffect } from 'react';
import type { CmsViewMode } from '@/components/admin/cms/CmsSectionHeader';

export function useCmsViewMode(storageKey: string, defaultMode: CmsViewMode = 'list') {
  const [viewMode, setViewMode] = useState<CmsViewMode>(() => {
    if (typeof window === 'undefined') return defaultMode;
    const v = sessionStorage.getItem(storageKey);
    return v === 'grid' || v === 'list' ? v : defaultMode;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, viewMode);
    } catch {
      /* ignore */
    }
  }, [storageKey, viewMode]);

  return { viewMode, setViewMode };
}

import { useState, useCallback } from 'react';
import { useCms } from '@/store/cmsStore';
import { useToast } from '@/hooks/use-toast';

export function useCmsPageSave() {
  const { persistMode, flushRemoteSave } = useCms();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (persistMode !== 'remote') {
      toast({
        title: 'Saved in this browser',
        description: 'Homepage data is not loading from the server, so changes stay in local storage only.',
      });
      return;
    }
    setSaving(true);
    try {
      await flushRemoteSave();
      toast({ title: 'Saved', description: 'Homepage content was updated on the server.' });
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Could not save homepage content.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [persistMode, flushRemoteSave, toast]);

  return { saving, handleSave };
}

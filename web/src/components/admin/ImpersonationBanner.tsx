import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminStore } from '@/store/adminStore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { postAuthStopImpersonate } from '@/lib/api';

const ImpersonationBanner = () => {
  const { impersonation, stopImpersonation } = useAdminStore();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!impersonation.active || !impersonation.user) return null;

  const exit = async () => {
    setBusy(true);
    try {
      await postAuthStopImpersonate();
      await refreshUser({ silent: true });
    } catch {
      /* Demo / offline «impersonation» or already staff — still clear local state */
    } finally {
      stopImpersonation();
      navigate('/admin/users');
      setBusy(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>
            Viewing as <strong>{impersonation.user.name}</strong> ({impersonation.user.role}) ·{' '}
            {impersonation.user.email}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void exit()}
          disabled={busy}
          className="h-7 hover:bg-amber-600/30"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Exit impersonation
        </Button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;

import type { NavigateFunction } from 'react-router-dom';
import type { AdminNotification } from '@/store/adminStore';

/** Navigate to the notification target; if already on that path, change the URL so the user is not stuck on an identical route. */
export function navigateToNotificationTarget(
  navigate: NavigateFunction,
  location: { pathname: string },
  notification: Pick<AdminNotification, 'id' | 'link'>
): void {
  const fallback = '/admin/notifications';
  const raw = notification.link?.trim() || fallback;
  let target: URL;
  try {
    target = new URL(raw.startsWith('http') ? raw : raw, window.location.origin);
  } catch {
    navigate(fallback);
    return;
  }

  const pathNorm = (target.pathname.replace(/\/$/, '') || '/') as string;
  const locNorm = (location.pathname.replace(/\/$/, '') || '/') as string;

  if (pathNorm === locNorm) {
    target.searchParams.set('nf', notification.id);
    navigate(`${target.pathname}${target.search}${target.hash}`);
    return;
  }

  navigate(`${target.pathname}${target.search}${target.hash}`);
}

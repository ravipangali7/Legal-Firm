/** App-wide UI theme in localStorage (public header, portals, admin; DOM sync, cross-tab). */
export const ADMIN_UI_THEME_KEY = 'legalfirm_admin_ui_theme_v1';

export type AdminUiTheme = 'light' | 'dark';

export function getStoredAdminTheme(): AdminUiTheme | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const v = localStorage.getItem(ADMIN_UI_THEME_KEY);
    if (v === 'dark' || v === 'light') return v;
    return null;
  } catch {
    return null;
  }
}

/** Apply stored admin theme to `document.documentElement` (call before first paint). */
export function applyAdminThemeFromStorage(): void {
  if (typeof document === 'undefined') return;
  const v = getStoredAdminTheme();
  const root = document.documentElement;
  if (v === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function persistAdminTheme(theme: AdminUiTheme): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_UI_THEME_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}

function persistThemeFromDom(): void {
  if (typeof document === 'undefined') return;
  persistAdminTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

/** Snapshot for `useSyncExternalStore`: whether `<html>` has the `dark` class. */
export function getAdminThemeIsDarkFromDom(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * Subscribe to admin light/dark changes: `<html class="dark">` mutations (any source),
 * and `storage` updates to {@link ADMIN_UI_THEME_KEY} from other tabs.
 */
export function subscribeAdminThemeFromDom(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const root = document.documentElement;
  const observer = new MutationObserver(() => {
    persistThemeFromDom();
    callback();
  });
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });

  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== ADMIN_UI_THEME_KEY) return;
    applyAdminThemeFromStorage();
    callback();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    observer.disconnect();
    window.removeEventListener('storage', onStorage);
  };
}

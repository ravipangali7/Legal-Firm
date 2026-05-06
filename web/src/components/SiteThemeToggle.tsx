import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  persistAdminTheme,
  subscribeAdminThemeFromDom,
  getAdminThemeIsDarkFromDom,
} from '@/lib/adminTheme';

/** Light/dark toggle for `<html class="dark">`; same storage and sync as the admin header. */
export function SiteThemeToggle({ className }: { className?: string }) {
  const darkMode = useSyncExternalStore(
    subscribeAdminThemeFromDom,
    getAdminThemeIsDarkFromDom,
    () => false
  );

  const toggleDarkMode = () => {
    const root = document.documentElement;
    const nextDark = !root.classList.contains('dark');
    if (nextDark) root.classList.add('dark');
    else root.classList.remove('dark');
    persistAdminTheme(nextDark ? 'dark' : 'light');
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className={cn('text-muted-foreground hover:text-foreground', className)}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

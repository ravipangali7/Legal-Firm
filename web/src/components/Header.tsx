import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CmsImage, CmsAvatarImage } from '@/components/CmsImage';
import { Menu, X, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { userDisplayName, userInitials } from '@/lib/userDisplay';
import { userHomeHref, userHomeTitle } from '@/lib/userHomeRoute';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useCms, type NavItem } from '@/store/cmsStore';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { SiteThemeToggle } from '@/components/SiteThemeToggle';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import defaultBrandLogo from '@/assets/logo-icon.png';

/** Must match `navOrder` default in admin settings and `AppSettings.nav_order` seed. */
const DEFAULT_PUBLIC_NAV_ORDER = [
  'Home',
  'Law',
  'Summary',
  'Procedure',
  'Tax',
  'Knowledge Base',
  'Pricing',
  'About',
  'Professional',
  'Contact',
] as const;

const SUMMARY_NAV_CHILDREN: { label: string; href: string }[] = [
  { label: 'List of Summaries', href: '/summaries' },
];

function canonicalNavItem(label: string): NavItem | null {
  const base = { order: 0, enabled: true as boolean };
  switch (label) {
    case 'Home':
      return { ...base, id: 'canon-home', label: 'Home', href: '/', isDropdown: false, children: [] };
    case 'Law':
    case 'Laws':
      return { ...base, id: 'canon-law', label: label === 'Laws' ? 'Laws' : 'Law', href: '/laws', isDropdown: false, children: [] };
    case 'Summary':
    case 'Summaries':
      return {
        ...base,
        id: 'canon-summaries',
        label: label === 'Summaries' ? 'Summaries' : 'Summary',
        href: '#',
        isDropdown: true,
        children: SUMMARY_NAV_CHILDREN,
      };
    case 'Procedure':
    case 'Procedures':
      return { ...base, id: 'canon-procedures', label: label === 'Procedures' ? 'Procedures' : 'Procedure', href: '/procedures', isDropdown: false, children: [] };
    case 'Tax':
      return { ...base, id: 'canon-tax', label: 'Tax', href: '/practice-areas/taxation-law', isDropdown: false, children: [] };
    case 'Knowledge Base':
      return {
        ...base,
        id: 'canon-knowledge-base',
        label: 'Knowledge Base',
        href: '/knowledge',
        isDropdown: false,
        children: [],
      };
    case 'Tools':
      return { ...base, id: 'canon-tools', label: 'Tools', href: '/tools', isDropdown: false, children: [] };
    case 'Pricing':
      return { ...base, id: 'canon-pricing', label: 'Pricing', href: '/pricing', isDropdown: false, children: [] };
    case 'About':
      return { ...base, id: 'canon-about', label: 'About', href: '/about', isDropdown: false, children: [] };
    case 'Professional':
    case 'Professionals':
      return { ...base, id: 'canon-professionals', label: label === 'Professionals' ? 'Professionals' : 'Professional', href: '/professionals', isDropdown: false, children: [] };
    case 'Contact':
      return { ...base, id: 'canon-contact', label: 'Contact', href: '/contact', isDropdown: false, children: [] };
    default:
      return null;
  }
}

function mergePublicNavItem(cms: NavItem | undefined, label: string): NavItem | null {
  const canon = canonicalNavItem(label);
  if (!canon) return null;
  if (!cms) return canon;
  const children =
    cms.isDropdown && cms.children.length > 0 ? cms.children : canon.children;
  const merged: NavItem = {
    ...canon,
    ...cms,
    children,
    isDropdown: cms.isDropdown,
  };
  if (label === 'Knowledge Base') merged.href = '/knowledge';
  return merged;
}

function sortEnabledNav(items: NavItem[]): NavItem[] {
  return [...items].filter((n) => n.enabled).sort((a, b) => a.order - b.order);
}

const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, logout } = useAuth();
  const { config } = useSiteConfig();
  const { data: homepageData, isSuccess: homepageLoaded } = useQuery(siteHomepageQueryOptions);

  let navItems: NavItem[] = [];
  try {
    const cms = useCms();
    navItems = cms.navItems;
  } catch {
    // Fallback when outside CmsStoreProvider
    const stored = localStorage.getItem('taxlexis_cms_v2');
    if (stored) {
      try { navItems = JSON.parse(stored).navItems || []; } catch {}
    }
  }

  const byLabel = useMemo(() => new Map(navItems.map((n) => [n.label, n])), [navItems]);

  const brandLogoRaw = (config?.site_logo || '').trim();
  const brandName = (config?.site_name || 'TaxLexis').trim() || 'TaxLexis';

  const displayNav = useMemo(() => {
    if (homepageLoaded && homepageData) {
      return sortEnabledNav(mapHomepageApiToSnapshot(homepageData).navItems);
    }
    const raw = config?.nav_order;
    const order: string[] =
      raw && raw.length > 0 ? raw : [...DEFAULT_PUBLIC_NAV_ORDER];
    const out: NavItem[] = [];
    for (const label of order) {
      const merged = mergePublicNavItem(byLabel.get(label), label);
      if (!merged || !merged.enabled) continue;
      out.push(merged);
    }
    return out;
  }, [homepageLoaded, homepageData, config?.nav_order, byLabel]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-500', scrolled ? 'pt-3 sm:pt-4' : 'pt-0')}>
      <div className={cn('mx-auto transition-all duration-500', scrolled ? 'max-w-6xl px-3 sm:px-6' : 'max-w-full px-0')}>
        <div className={cn(
          'flex items-center justify-between gap-2 sm:gap-3 min-w-0 transition-all duration-500',
          scrolled
            ? 'rounded-full border border-white/40 bg-white/75 backdrop-blur-xl shadow-[0_8px_30px_-6px_rgba(15,23,42,0.18)] px-2 sm:px-5 py-2 dark:border-border dark:bg-card/85 dark:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.35)]'
            : 'bg-white/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3 dark:bg-background/95 dark:border-border'
        )}>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <CmsImage
              src={brandLogoRaw}
              alt={brandName}
              className={cn('object-contain transition-all', scrolled ? 'h-9' : 'h-11')}
              fallbackSrc={defaultBrandLogo}
              fallbackKind="brand"
            />
          </Link>

          <nav className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-0.5 sm:gap-1 overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {displayNav.map((item) => {
              const showDropdown = item.isDropdown && item.children.length > 0;
              return showDropdown ? (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger className="px-3 py-1.5 rounded-full text-sm font-medium text-foreground/80 hover:text-primary-onBg hover:bg-secondary transition-colors flex items-center gap-1 outline-none">
                    {item.label} <ChevronDown size={14} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-xl">
                    {item.children.map((child, ci) => (
                      <DropdownMenuItem key={`${item.id}-${ci}-${child.href}`} asChild>
                        <Link to={child.href} className="cursor-pointer">{child.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link key={item.id} to={item.href} className="px-3 py-1.5 rounded-full text-sm font-medium text-foreground/80 hover:text-primary-onBg hover:bg-secondary transition-colors">
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center justify-end gap-1 sm:gap-1.5 shrink-0 min-w-0">
            <SiteThemeToggle className="rounded-full shrink-0" />
            {authLoading ? (
              <div className="h-9 w-9 rounded-full bg-muted/50 animate-pulse shrink-0" aria-hidden />
            ) : user ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 shrink-0"
                  onClick={() => navigate(userHomeHref(user))}
                  title={
                    userDisplayName(user)
                      ? `${userHomeTitle(user)} (${userDisplayName(user)})`
                      : userHomeTitle(user)
                  }
                >
                  <Avatar className="h-8 w-8 ring-2 ring-primary/15">
                    {user.avatar ? <CmsAvatarImage src={user.avatar} alt="" /> : null}
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary-onBg">
                      {userInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full shrink-0"
                  onClick={() => {
                    void logout().catch((e) =>
                      toast({
                        title: 'Could not sign out',
                        description: e instanceof Error ? e.message : 'Try again in a moment.',
                        variant: 'destructive',
                      }),
                    );
                  }}
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Log out
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" className="rounded-full shrink-0" onClick={() => navigate('/login')}>
                Login
              </Button>
            )}
            <Button
              size="sm"
              className="rounded-full shrink-0 bg-accent text-accent-foreground hover:bg-accent-light shadow-gold px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap"
              onClick={() => navigate('/contact')}
            >
              Free Consultation
            </Button>
          </div>

          <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-full text-foreground hover:bg-secondary">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className={cn('lg:hidden mt-2 mx-2 sm:mx-0 rounded-2xl border border-border bg-white/95 backdrop-blur-xl shadow-elegant p-4 space-y-1 animate-in fade-in slide-in-from-top-2 dark:bg-card/95')}>
            {displayNav.map((item) => {
              const showDropdown = item.isDropdown && item.children.length > 0;
              return showDropdown ? (
                <div key={item.id}>
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary">
                    {item.label} <ChevronDown size={14} className={cn('transition-transform', openDropdown === item.id && 'rotate-180')} />
                  </button>
                  {openDropdown === item.id && (
                    <div className="pl-3 space-y-1">
                      {item.children.map((child, ci) => (
                        <Link key={`${item.id}-${ci}-${child.href}`} to={child.href} onClick={() => setOpen(false)} className="block px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:text-primary-onBg">{child.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={item.id} to={item.href} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary">
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-3 mt-2 border-t border-border flex flex-col gap-2">
              <div className="flex items-center justify-end">
                <SiteThemeToggle className="rounded-full" />
              </div>
              {authLoading ? (
                <div className="h-9 w-full rounded-full bg-muted/50 animate-pulse" aria-hidden />
              ) : user ? (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-11 w-11"
                    onClick={() => {
                      navigate(userHomeHref(user));
                      setOpen(false);
                    }}
                    title={
                      userDisplayName(user)
                        ? `${userHomeTitle(user)} (${userDisplayName(user)})`
                        : userHomeTitle(user)
                    }
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {user.avatar ? <CmsAvatarImage src={user.avatar} alt="" /> : null}
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary-onBg">
                        {userInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      void logout()
                        .then(() => setOpen(false))
                        .catch((e) =>
                          toast({
                            title: 'Could not sign out',
                            description: e instanceof Error ? e.message : 'Try again in a moment.',
                            variant: 'destructive',
                          }),
                        );
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => { navigate('/login'); setOpen(false); }}>
                  Login
                </Button>
              )}
              <Button size="sm" className="rounded-full bg-accent text-accent-foreground" onClick={() => { navigate('/contact'); setOpen(false); }}>Free Consultation</Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

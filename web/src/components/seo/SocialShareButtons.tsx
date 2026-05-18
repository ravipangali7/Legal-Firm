import { useState } from 'react';
import { Facebook, Link2, Linkedin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  copyToClipboard,
  facebookShareUrl,
  linkedInShareUrl,
  socialShareApiUrl,
  spaCanonicalUrl,
  type SocialShareKind,
} from '@/lib/seoShare';

type Props = {
  kind: SocialShareKind;
  idOrSlug: string;
  /** SPA path for copy-link, e.g. `/blog/uuid` */
  canonicalPath: string;
  title?: string;
  className?: string;
};

/**
 * Share actions: social networks use the API share URL (OG image from SEO settings / entity).
 * Copy link uses the canonical SPA URL.
 */
export function SocialShareButtons({ kind, idOrSlug, canonicalPath, title, className }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const shareUrl = socialShareApiUrl(kind, idOrSlug);
  const pageUrl = spaCanonicalUrl(canonicalPath);

  const onCopy = async () => {
    const ok = await copyToClipboard(pageUrl);
    toast({
      title: ok ? 'Link copied' : 'Could not copy',
      description: ok ? 'Page URL copied to clipboard.' : undefined,
      variant: ok ? 'default' : 'destructive',
    });
    setOpen(false);
  };

  const onNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || document.title,
          url: shareUrl,
        });
        setOpen(false);
        return;
      } catch {
        /* fall through */
      }
    }
    void onCopy();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={className}>
          <Share2 className="h-4 w-4 mr-2" aria-hidden />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <a href={facebookShareUrl(shareUrl)} target="_blank" rel="noopener noreferrer">
            <Facebook className="h-4 w-4 mr-2" aria-hidden />
            Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={linkedInShareUrl(shareUrl)} target="_blank" rel="noopener noreferrer">
            <Linkedin className="h-4 w-4 mr-2" aria-hidden />
            LinkedIn
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onCopy()}>
          <Link2 className="h-4 w-4 mr-2" aria-hidden />
          Copy page link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onNativeShare()}>
          <Share2 className="h-4 w-4 mr-2" aria-hidden />
          Share…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

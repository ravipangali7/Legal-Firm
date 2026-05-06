import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteConfig } from '@/context/SiteConfigContext';

const Maintenance = () => {
  const { config } = useSiteConfig();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4">
      <Wrench className="h-14 w-14 text-muted-foreground mb-6" aria-hidden />
      <h1 className="text-2xl font-semibold text-center">We&apos;ll be back soon</h1>
      <p className="text-muted-foreground text-center max-w-md mt-2">
        {config?.site_name ?? 'This site'} is temporarily unavailable while we perform maintenance.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link to="/login">Staff login</Link>
      </Button>
    </div>
  );
};

export default Maintenance;

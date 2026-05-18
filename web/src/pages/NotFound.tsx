import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePageSeo } from "@/context/SeoContext";

const NotFound = () => {
  const location = useLocation();

  usePageSeo({
    title: "Page Not Found",
    description: "The page you requested could not be found.",
    pathname: location.pathname,
    noindex: true,
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="eyebrow-label mb-3">Error</p>
        <h1 className="text-5xl font-bold text-primary-onBg mb-3">404</h1>
        <p className="text-lg text-muted-foreground mb-6">This page could not be found.</p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-light transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;

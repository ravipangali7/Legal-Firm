import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import CategoryFilter from "@/components/CategoryFilter";
import CasesList from "@/components/CasesList";
import CaseModal from "@/components/CaseModal";
import { buildCaseFilterCategories, type Case } from "@/data/sampleCases";
import { PRACTICE_AREAS, getPracticeAreaBySlug, type PracticeAreaService } from "@/data/practiceAreas";
import type { PracticeAreaApi } from "@/lib/api";
import { resolveLucideIcon } from "@/lib/lucideIcon";
import {
  legalCasesForPracticeAreaQueryKey,
  loadLegalCasesForPracticeArea,
  loadPracticeAreas,
  practiceAreasQueryKey,
} from "@/lib/practiceAreasQuery";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasLibraryEntitlement } from "@/lib/subscriptionAccess";
import { usePremiumSubscribeToast } from "@/hooks/usePremiumSubscribeToast";

type AreaViewModel = {
  slug: string;
  name: string;
  overview: string;
  tags: string[];
  relatedCasesTitle: string;
  services: PracticeAreaService[];
  Icon: LucideIcon;
};

function normalizeServices(raw: unknown): PracticeAreaService[] {
  if (!Array.isArray(raw)) return [];
  const out: PracticeAreaService[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const title = typeof o.title === "string" ? o.title : "";
    const description = typeof o.description === "string" ? o.description : "";
    const details = Array.isArray(o.details) ? o.details.filter((x): x is string => typeof x === "string") : [];
    const previews = Array.isArray(o.previews)
      ? o.previews
          .filter((p): p is { label: string; value: string } => {
            if (!p || typeof p !== "object") return false;
            const pr = p as Record<string, unknown>;
            return typeof pr.label === "string" && typeof pr.value === "string";
          })
          .map((p) => ({ label: p.label, value: p.value }))
      : [];
    if (!id || !title) continue;
    out.push({ id, title, description, details, previews });
  }
  return out;
}

function areaViewFromApi(row: PracticeAreaApi): AreaViewModel {
  return {
    slug: row.slug,
    name: row.name,
    overview: row.overview ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    relatedCasesTitle: row.related_cases_title?.trim() || `Related ${row.name} Cases`,
    services: normalizeServices(row.services),
    Icon: resolveLucideIcon(row.icon),
  };
}

function areaViewFromSlugWithFallback(slug: string | undefined): AreaViewModel | null {
  const s = getPracticeAreaBySlug(slug);
  if (!s) return null;
  return {
    slug: s.slug,
    name: s.name,
    overview: s.overview,
    tags: s.tags,
    relatedCasesTitle: s.relatedCasesTitle,
    services: s.services,
    Icon: s.icon,
  };
}

const PracticeAreaPage = () => {
  const { areaSlug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const toastPremium = usePremiumSubscribeToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: areasApi,
    isLoading: areasLoading,
    isError: areasError,
  } = useQuery({
    queryKey: practiceAreasQueryKey,
    queryFn: loadPracticeAreas,
    staleTime: 60_000,
    retry: 1,
  });

  const areaFromApi = useMemo(() => {
    if (!areasApi || !areaSlug) return undefined;
    return areasApi.find((a) => a.slug === areaSlug);
  }, [areasApi, areaSlug]);

  const areaVm: AreaViewModel | null = useMemo(() => {
    if (areaFromApi) return areaViewFromApi(areaFromApi);
    if (!areasLoading && (areasError || areasApi == null)) {
      return areaViewFromSlugWithFallback(areaSlug);
    }
    return undefined;
  }, [areaFromApi, areasLoading, areasError, areasApi, areaSlug]);

  const {
    data: cases = [],
    isLoading: casesLoading,
    isError: casesError,
  } = useQuery({
    queryKey: legalCasesForPracticeAreaQueryKey(areaSlug ?? ""),
    queryFn: () => loadLegalCasesForPracticeArea(areaSlug!),
    enabled: Boolean(areaSlug) && Boolean(areaVm),
    staleTime: 60_000,
    retry: 1,
  });

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [activeServiceId, setActiveServiceId] = useState<string>("");

  const caseFilterCategories = useMemo(
    () => buildCaseFilterCategories(areaVm?.name ?? "Cases", cases),
    [areaVm?.name, cases]
  );

  useEffect(() => {
    if (!areaVm?.slug) return;
    setSelectedCategory("all");
  }, [areaVm?.slug]);

  useEffect(() => {
    if (!areaVm) {
      setActiveServiceId("");
      return;
    }
    const param = searchParams.get("service");
    const match = param && areaVm.services.find((s) => s.id === param);
    setActiveServiceId(match ? match.id : areaVm.services[0]?.id ?? "");
  }, [areaVm, searchParams]);

  if (areasLoading && !areaVm) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        Loading practice area…
      </div>
    );
  }

  if (!areaVm) {
    const firstFromApi =
      areasApi && areasApi.length > 0
        ? [...areasApi].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0].slug
        : null;
    const fallbackSlug = firstFromApi ?? PRACTICE_AREAS[0]?.slug ?? "company-law";
    return <Navigate to={`/practice-areas/${fallbackSlug}`} replace />;
  }

  const activeService =
    areaVm.services.find((service) => service.id === activeServiceId) ?? areaVm.services[0];

  const handleCategoryChange = async (category: string) => {
    setFilterLoading(true);
    await new Promise((r) => setTimeout(r, 150));
    setSelectedCategory(category);
    setFilterLoading(false);
  };

  const handleCasePreview = (caseData: Case) => {
    if (!hasLibraryEntitlement(user)) {
      toastPremium(Boolean(user));
      return;
    }
    setSelectedCase(caseData);
    setShowCaseModal(true);
  };

  const handleSubscribe = () => {
    if (authLoading) return;
    setShowCaseModal(false);
    if (!user) {
      const next = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    navigate('/dashboard?tab=wallet');
  };

  const handleLogin = () => {
    setShowCaseModal(false);
    const next = `${location.pathname}${location.search}`;
    navigate(`/login?next=${encodeURIComponent(next)}`);
  };

  const IconComponent = areaVm.Icon;

  return (
    <div className="space-y-8">
      {areasError && (
        <p className="text-sm text-destructive/90 border border-destructive/30 rounded-md p-3 bg-destructive/5">
          Practice area directory could not be loaded from the server. Showing bundled defaults; cases still use the
          API when available.
        </p>
      )}
      {casesError && (
        <p className="text-sm text-destructive/90 border border-destructive/30 rounded-md p-3 bg-destructive/5">
          Cases could not be loaded. Check that the API is running and try again.
        </p>
      )}

      <div className="text-center md:text-left">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <IconComponent className="h-8 w-8 text-primary-onBg" />
          </div>
          <h1 className="section-title">{areaVm.name}</h1>
        </div>

        <p className="text-lg text-muted-foreground max-w-3xl">{areaVm.overview}</p>

        <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
          {areaVm.tags.map((tag) => (
            <span key={tag} className="text-sm bg-accent/20 text-accent-onBg px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h2 className="subsection-title">Our {areaVm.name} Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {areaVm.services.map((service) => {
            const isActive = activeService?.id === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  setActiveServiceId(service.id);
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("service", service.id);
                      return next;
                    },
                    { replace: true }
                  );
                }}
                className={`text-left p-5 rounded-lg border shadow-sm transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card hover:bg-muted/30 card-hover"
                }`}
              >
                <h3 className="font-semibold mb-2">{service.title}</h3>
                <p
                  className={`text-sm leading-relaxed ${
                    isActive ? "text-primary-foreground/90" : "text-muted-foreground"
                  }`}
                >
                  {service.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {activeService && (
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-xl font-semibold">{activeService.title}</h3>
            <p className="text-muted-foreground mt-1">{activeService.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeService.previews.map((preview) => (
              <div key={preview.label} className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{preview.label}</p>
                <p className="font-medium mt-1">{preview.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-semibold mb-2">Detailed Scope</h4>
            <ul className="space-y-2">
              {activeService.details.map((detail) => (
                <li key={detail} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        <h2 className="subsection-title mb-6">{areaVm.relatedCasesTitle}</h2>

        {casesLoading ? (
          <p className="text-sm text-muted-foreground py-8">Loading cases…</p>
        ) : (
          <>
            <CategoryFilter
              categories={caseFilterCategories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              loading={filterLoading}
            />

            <CasesList cases={cases} selectedCategory={selectedCategory} onCasePreview={handleCasePreview} />
          </>
        )}
      </div>

      <CaseModal
        case={selectedCase}
        isOpen={showCaseModal}
        onClose={() => setShowCaseModal(false)}
        onSubscribe={handleSubscribe}
        onLogin={handleLogin}
      />

    </div>
  );
};

export default PracticeAreaPage;

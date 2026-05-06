import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { PRACTICE_AREAS } from "@/data/practiceAreas";
import { practiceAreasQueryKey, loadPracticeAreas } from "@/lib/practiceAreasQuery";

/**
 * `/practice-areas` index: redirect to the first practice area from the API when available,
 * otherwise fall back to bundled defaults so the route still works offline.
 */
const PracticeAreasIndexRedirect = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: practiceAreasQueryKey,
    queryFn: loadPracticeAreas,
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
        Loading practice areas…
      </div>
    );
  }

  const slug =
    !isError && data && data.length > 0
      ? [...data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0].slug
      : PRACTICE_AREAS[0]?.slug ?? "company-law";

  return <Navigate to={`/practice-areas/${slug}`} replace />;
};

export default PracticeAreasIndexRedirect;

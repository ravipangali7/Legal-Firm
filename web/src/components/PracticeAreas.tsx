import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PRACTICE_AREAS } from "@/data/practiceAreas";
import { resolveLucideIcon } from "@/lib/lucideIcon";
import { loadPracticeAreas, practiceAreasQueryKey } from "@/lib/practiceAreasQuery";

const PracticeAreas = () => {
  const { data: areasApi, isLoading, isError } = useQuery({
    queryKey: practiceAreasQueryKey,
    queryFn: loadPracticeAreas,
    staleTime: 60_000,
    retry: 1,
  });

  const apiRows =
    !isError && areasApi && areasApi.length > 0
      ? [...areasApi].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).slice(0, 6)
      : null;

  return (
    <section id="practice" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">Practice Areas</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our experienced legal professionals specialize in diverse practice areas, providing comprehensive
            solutions across Nepal&apos;s legal landscape.
          </p>
        </div>

        {isLoading && !apiRows && (
          <p className="text-center text-sm text-muted-foreground mb-8">Loading practice areas…</p>
        )}
        {isError && (
          <p className="text-center text-xs text-destructive/90 mb-8">Showing default practice areas (API unavailable).</p>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {apiRows
            ? apiRows.map((area) => {
                const Icon = resolveLucideIcon(area.icon);
                const tags = Array.isArray(area.tags) ? area.tags : [];
                return (
                  <div
                    key={area.slug}
                    className="group bg-card rounded-xl p-8 shadow-md hover:shadow-xl border border-border/50 card-hover"
                  >
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-primary/10 group-hover:bg-primary rounded-xl flex items-center justify-center mb-4 transition-all duration-300">
                        <Icon className="w-8 h-8 text-primary-onBg group-hover:text-primary-foreground transition-colors duration-300" />
                      </div>
                      <h3 className="text-xl font-bold text-card-foreground mb-3 group-hover:text-primary-onBg transition-colors">
                        {area.name}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">{area.overview}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-primary-onBg mb-3">Key Areas:</h4>
                      {tags.slice(0, 3).map((type) => (
                        <div key={type} className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-accent rounded-full" />
                          <span className="text-sm text-muted-foreground">{type}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-border/50">
                      <Link
                        to={`/practice-areas/${area.slug}`}
                        className="text-primary-onBg font-semibold text-sm hover:text-primary-onBg/80 transition-colors"
                      >
                        Learn More â†’
                      </Link>
                    </div>
                  </div>
                );
              })
            : PRACTICE_AREAS.slice(0, 6).map((area) => {
                const Icon = area.icon;
                return (
                  <div
                    key={area.slug}
                    className="group bg-card rounded-xl p-8 shadow-md hover:shadow-xl border border-border/50 card-hover"
                  >
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-primary/10 group-hover:bg-primary rounded-xl flex items-center justify-center mb-4 transition-all duration-300">
                        <Icon className="w-8 h-8 text-primary-onBg group-hover:text-primary-foreground transition-colors duration-300" />
                      </div>
                      <h3 className="text-xl font-bold text-card-foreground mb-3 group-hover:text-primary-onBg transition-colors">
                        {area.name}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">{area.overview}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-primary-onBg mb-3">Key Areas:</h4>
                      {area.tags.slice(0, 3).map((type) => (
                        <div key={type} className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-accent rounded-full" />
                          <span className="text-sm text-muted-foreground">{type}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-border/50">
                      <Link
                        to={`/practice-areas/${area.slug}`}
                        className="text-primary-onBg font-semibold text-sm hover:text-primary-onBg/80 transition-colors"
                      >
                        Learn More â†’
                      </Link>
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="text-center mt-12 p-8 bg-primary/5 rounded-2xl border border-primary/10">
          <h3 className="text-2xl font-bold text-primary-onBg mb-4">Need Legal Consultation?</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Our expert legal team is ready to provide personalized advice for your specific situation. Schedule a
            consultation to discuss your legal needs.
          </p>
          <button type="button" className="btn-primary">
            Schedule Free Consultation
          </button>
        </div>
      </div>
    </section>
  );
};

export default PracticeAreas;

import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PRACTICE_AREAS } from "@/data/practiceAreas";
import { resolveLucideIcon } from "@/lib/lucideIcon";
import { loadPracticeAreas, practiceAreasQueryKey } from "@/lib/practiceAreasQuery";

interface PracticeAreaSidebarProps {
  onItemClick?: () => void;
}

const PracticeAreaSidebar = ({ onItemClick }: PracticeAreaSidebarProps) => {
  const { data: areasApi, isLoading, isError } = useQuery({
    queryKey: practiceAreasQueryKey,
    queryFn: loadPracticeAreas,
    staleTime: 60_000,
    retry: 1,
  });

  const apiRows =
    !isError && areasApi && areasApi.length > 0
      ? [...areasApi].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : null;

  return (
    <div className="bg-card rounded-lg p-6 shadow-md h-fit lg:sticky lg:top-8">
      <h2 className="text-xl font-bold text-primary-onBg mb-6">Practice Areas</h2>

      {isLoading && !apiRows && (
        <p className="text-sm text-muted-foreground mb-4">Loading menu…</p>
      )}
      {isError && <p className="text-xs text-destructive/90 mb-4">Using offline menu.</p>}

      <nav className="space-y-2">
        {apiRows
          ? apiRows.map((area) => {
              const Icon = resolveLucideIcon(area.icon);
              const path = `/practice-areas/${area.slug}`;
              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                    }`
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{area.name}</span>
                </NavLink>
              );
            })
          : PRACTICE_AREAS.map((area) => {
              const Icon = area.icon;
              const path = `/practice-areas/${area.slug}`;
              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                    }`
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{area.name}</span>
                </NavLink>
              );
            })}
      </nav>
    </div>
  );
};

export default PracticeAreaSidebar;

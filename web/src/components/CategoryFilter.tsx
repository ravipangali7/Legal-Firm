import { useState } from 'react';
import { 
  Scale, 
  Shield, 
  Landmark, 
  Copyright, 
  Building2, 
  Globe, 
  Receipt, 
  Calculator,
  Loader2,
  X 
} from 'lucide-react';
import type { CaseCategoryFilterOption } from '@/data/sampleCases';

const iconMap = {
  Scale,
  Shield,
  Landmark,
  Copyright,
  Building2,
  Globe,
  Receipt,
  Calculator,
};

interface CategoryFilterProps {
  categories: CaseCategoryFilterOption[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  loading?: boolean;
}

const CategoryFilter = ({
  categories,
  selectedCategory,
  onCategoryChange,
  loading = false,
}: CategoryFilterProps) => {
  const [showAll, setShowAll] = useState(false);

  const visibleCategories = showAll ? categories : categories.slice(0, 6);

  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-3 mb-4">
        {visibleCategories.map((category) => {
          const IconComponent = iconMap[category.icon as keyof typeof iconMap] || Scale;
          const isActive = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              disabled={loading}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {loading && isActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconComponent className="h-4 w-4" />
              )}
              <span className="text-sm whitespace-nowrap">
                {category.name}
              </span>
              {category.count > 0 && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-bold
                  ${isActive 
                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                    : 'bg-primary/10 text-primary-onBg'
                  }
                `}>
                  {category.count}
                </span>
              )}
            </button>
          );
        })}
        
        {categories.length > 6 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary-onBg transition-all duration-200"
          >
            {showAll ? (
              <>
                <X className="h-4 w-4" />
                <span className="text-sm">Show Less</span>
              </>
            ) : (
              <span className="text-sm">+{categories.length - 6} More</span>
            )}
          </button>
        )}
      </div>
      
      {selectedCategory !== 'all' && (
        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
          <span className="text-sm text-muted-foreground">
            Showing cases for: <strong>{categories.find(c => c.id === selectedCategory)?.name}</strong>
          </span>
          <button
            onClick={() => onCategoryChange('all')}
            className="text-sm text-primary-onBg hover:text-primary-onBg/80 font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
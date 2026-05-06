import { useState, useMemo, useEffect } from 'react';
import { Search, SortAsc, SortDesc, Filter, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CaseCard from './CaseCard';
import { Case } from '@/data/sampleCases';
import { slugify } from '@/lib/slugify';

interface CasesListProps {
  cases: Case[];
  selectedCategory: string;
  onCasePreview: (caseData: Case) => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'relevance' | 'reference';
type ViewMode = 'grid' | 'list';

const CasesList = ({ cases, selectedCategory, onCasePreview }: CasesListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  
  const casesPerPage = 12;

  // Filter and sort cases
  const filteredAndSortedCases = useMemo(() => {
    const filtered = cases.filter((caseItem) => {
      if (selectedCategory !== "all") {
        if (slugify(caseItem.category) !== selectedCategory) return false;
      }
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return caseItem.title.toLowerCase().includes(searchLower) ||
               caseItem.referenceNumber.toLowerCase().includes(searchLower) ||
               caseItem.teaser.toLowerCase().includes(searchLower) ||
               caseItem.court.toLowerCase().includes(searchLower);
      }
      
      return true;
    });

    // Sort cases (copy so we do not mutate the filtered array)
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.dateFiled).getTime() - new Date(a.dateFiled).getTime();
        case 'date-asc':
          return new Date(a.dateFiled).getTime() - new Date(b.dateFiled).getTime();
        case 'reference':
          return a.referenceNumber.localeCompare(b.referenceNumber);
        case 'relevance':
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return sorted;
  }, [cases, selectedCategory, searchTerm, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCases.length / casesPerPage);
  const startIndex = (currentPage - 1) * casesPerPage;
  const paginatedCases = filteredAndSortedCases.slice(startIndex, startIndex + casesPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm]);

  return (
    <div>
      {/* Search and Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cases by title, reference, court..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Latest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="relevance">By Relevance</SelectItem>
                <SelectItem value="reference">By Reference</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {startIndex + 1}-{Math.min(startIndex + casesPerPage, filteredAndSortedCases.length)} of {filteredAndSortedCases.length} cases
          </span>
          
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-primary-onBg hover:text-primary-onBg/80 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Cases Grid/List */}
      {paginatedCases.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No cases found</h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? "Try adjusting your search terms or filters" 
              : "No cases available for the selected category"
            }
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
            : "space-y-4"
        }>
          {paginatedCases.map((caseItem) => (
            <CaseCard
              key={caseItem.id}
              case={caseItem}
              onPreview={onCasePreview}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="w-10"
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default CasesList;
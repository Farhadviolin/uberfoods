import { HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { clsx } from 'clsx';
import './Pagination.css';

export type PaginationSize = 'sm' | 'md' | 'lg';

export interface PaginationProps extends HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: PaginationSize;
  showFirstLast?: boolean;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
  showPageSizeSelector?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  showTotal?: boolean;
  totalItems?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  size = 'md',
  showFirstLast = true,
  showPageNumbers = true,
  maxPageNumbers = 7,
  showPageSizeSelector = false,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  showTotal = false,
  totalItems,
  className,
  ...props
}: PaginationProps) {
  const getPageNumbers = () => {
    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxPageNumbers / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxPageNumbers - 1);

    if (end - start < maxPageNumbers - 1) {
      start = Math.max(1, end - maxPageNumbers + 1);
    }

    const pages: (number | string)[] = [];
    
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  const pages = getPageNumbers();

  return (
    <div className={clsx('pagination', `pagination--${size}`, className)} {...props}>
      {showTotal && totalItems !== undefined && (
        <div className="pagination-total">
          Total: {totalItems}
        </div>
      )}
      
      <div className="pagination-controls">
        {showFirstLast && (
          <button
            className="pagination-button pagination-button--first"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
            type="button"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
        
        <button
          className="pagination-button pagination-button--prev"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          type="button"
        >
          <ChevronLeft size={16} />
        </button>

        {showPageNumbers && (
          <div className="pagination-numbers">
            {pages.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = pageNum === currentPage;

              return (
                <motion.button
                  key={pageNum}
                  className={clsx('pagination-button', 'pagination-button--number', {
                    'pagination-button--active': isActive,
                  })}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={isActive}
                  whileHover={{ scale: isActive ? 1 : 1.05 }}
                  whileTap={{ scale: isActive ? 1 : 0.95 }}
                  aria-label={`Page ${pageNum}`}
                  aria-current={isActive ? 'page' : undefined}
                  type="button"
                >
                  {pageNum}
                </motion.button>
              );
            })}
          </div>
        )}

        <button
          className="pagination-button pagination-button--next"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          type="button"
        >
          <ChevronRight size={16} />
        </button>

        {showFirstLast && (
          <button
            className="pagination-button pagination-button--last"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
            type="button"
          >
            <ChevronsRight size={16} />
          </button>
        )}
      </div>

      {showPageSizeSelector && pageSize && onPageSizeChange && (
        <div className="pagination-page-size">
          <label className="pagination-page-size-label">
            Show:
            <select
              className="pagination-page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}


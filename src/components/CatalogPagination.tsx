import {ChevronLeft, ChevronRight} from 'lucide-react';
import {paginationWindow} from '@/lib/pagination';

type Props = {page: number; totalPages: number; onSelect: (next: number) => void};

export function CatalogPagination({page, totalPages, onSelect}: Props) {
  if (totalPages <= 1) return null;
  const {pages, previousGroup, nextGroup} = paginationWindow(totalPages, page);
  return (
    <nav className="pagination catalog-pagination" aria-label="صفحات المنتجات" dir="rtl">
      {pages.map((number, index) => {
        const previous = pages[index - 1];
        const missing = previous !== undefined && number - previous > 1;
        const target = previous !== undefined && number !== totalPages ? previousGroup : nextGroup;
        return (
          <div className="catalog-page-segment" key={number}>
            {missing && (
              <button
                type="button"
                className="page-more"
                onClick={() => onSelect(target ?? Math.max(1, number - 1))}
                aria-label={number === totalPages ? 'المزيد: عرض الصفحات التالية' : 'عرض الصفحات السابقة'}
                title={number === totalPages ? 'المزيد من الصفحات' : 'الصفحات السابقة'}
              >
                {number === totalPages ? <>المزيد <ChevronLeft size={15}/></> : <><ChevronRight size={15}/> السابق</>}
              </button>
            )}
            <button
              type="button"
              className={'page-number' + (number === page ? ' selected' : '')}
              onClick={() => onSelect(number)}
              aria-label={'صفحة ' + number}
              aria-current={number === page ? 'page' : undefined}
            >{number}</button>
          </div>
        );
      })}
    </nav>
  );
}

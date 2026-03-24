/**
 * PILIER 1 - RÉACTIVITÉ & FLUIDITÉ
 * Hook pour la virtualisation de listes avec TanStack Virtual
 * Permet d'afficher 5000+ éléments sans ralentissement
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface UseVirtualListOptions {
  itemCount: number;
  estimateSize?: (index: number) => number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
}

/**
 * Hook pour virtualiser une liste
 * 
 * @example
 * const { virtualizer, totalSize, virtualItems } = useVirtualList({
 *   itemCount: patients.length,
 *   estimateSize: () => 80, // Hauteur estimée de chaque item
 * });
 * 
 * return (
 *   <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
 *     <div style={{ height: `${totalSize}px`, position: 'relative' }}>
 *       {virtualItems.map((virtualRow) => {
 *         const patient = patients[virtualRow.index];
 *         return (
 *           <div
 *             key={virtualRow.key}
 *             style={{
 *               position: 'absolute',
 *               top: 0,
 *               left: 0,
 *               width: '100%',
 *               height: `${virtualRow.size}px`,
 *               transform: `translateY(${virtualRow.start}px)`,
 *             }}
 *           >
 *             <PatientCard patient={patient} />
 *           </div>
 *         );
 *       })}
 *     </div>
 *   </div>
 * );
 */
export function useVirtualList({
  itemCount,
  estimateSize = () => 80,
  overscan = 5,
}: UseVirtualListOptions) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan, // Nombre d'éléments à pré-rendre en dehors de la vue
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return {
    parentRef,
    virtualizer,
    virtualItems,
    totalSize,
  };
}

/**
 * Hook pour virtualiser une grille (2D)
 * Utile pour des cartes de patients disposées en grille
 */
export function useVirtualGrid({
  rowCount,
  columnCount,
  estimateRowSize = () => 200,
  estimateColumnSize = () => 300,
  overscan = 3,
}: {
  rowCount: number;
  columnCount: number;
  estimateRowSize?: (index: number) => number;
  estimateColumnSize?: (index: number) => number;
  overscan?: number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateRowSize,
    overscan,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columnCount,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateColumnSize,
    overscan,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const totalWidth = columnVirtualizer.getTotalSize();

  return {
    parentRef,
    rowVirtualizer,
    columnVirtualizer,
    virtualRows,
    virtualColumns,
    totalHeight,
    totalWidth,
  };
}

/**
 * Hook pour smooth scrolling vers un élément
 */
export function useScrollToIndex(virtualizer: ReturnType<typeof useVirtualizer>) {
  const scrollToIndex = (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => {
    virtualizer.scrollToIndex(index, {
      align: options?.align || 'start',
      behavior: 'smooth',
    });
  };

  return { scrollToIndex };
}

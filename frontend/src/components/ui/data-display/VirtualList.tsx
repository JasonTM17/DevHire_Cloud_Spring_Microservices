"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";

/**
 * Computes the visible range of items to render in a virtualized list.
 *
 * @param listLength - Total number of items in the list
 * @param itemHeight - Fixed height of each item in pixels
 * @param viewportHeight - Height of the visible viewport in pixels
 * @param scrollTop - Current scroll offset from the top in pixels
 * @param buffer - Number of extra items to render above/below the visible area
 * @returns Object with startIndex, endIndex, and offsetTop for positioning
 */
export function computeVisibleRange(
  listLength: number,
  itemHeight: number,
  viewportHeight: number,
  scrollTop: number,
  buffer: number
): { startIndex: number; endIndex: number; offsetTop: number } {
  if (listLength <= 0 || itemHeight <= 0 || viewportHeight <= 0) {
    return { startIndex: 0, endIndex: 0, offsetTop: 0 };
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    listLength - 1,
    Math.ceil((scrollTop + viewportHeight) / itemHeight) + buffer
  );
  const offsetTop = startIndex * itemHeight;

  return { startIndex, endIndex, offsetTop };
}

type VirtualListProps<T> = {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  buffer?: number;
  className?: string;
  "data-testid"?: string;
};

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  buffer = 5,
  className = "",
  "data-testid": testId,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      setScrollTop(el.scrollTop);
      setViewportHeight(el.clientHeight);
    }
  }, []);

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (node) {
        setViewportHeight(node.clientHeight);
        setScrollTop(node.scrollTop);
      }
    },
    []
  );

  const totalHeight = items.length * itemHeight;
  const { startIndex, endIndex, offsetTop } = computeVisibleRange(
    items.length,
    itemHeight,
    viewportHeight,
    scrollTop,
    buffer
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={handleRef}
      className={`dh-virtual-list ${className}`}
      onScroll={handleScroll}
      data-testid={testId}
    >
      <div
        className="dh-virtual-list__spacer"
        style={{ height: `${totalHeight}px` }}
      >
        <div
          className="dh-virtual-list__content"
          style={{ transform: `translateY(${offsetTop}px)` }}
        >
          {visibleItems.map((item, i) => {
            const actualIndex = startIndex + i;
            return (
              <div
                key={actualIndex}
                className="dh-virtual-list__item"
                style={{ height: `${itemHeight}px` }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

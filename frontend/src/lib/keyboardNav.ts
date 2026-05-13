/**
 * Compute the next focused index in a list given a keyboard event key.
 *
 * Supported keys:
 * - ArrowDown: move down (min of currentIndex + 1, n - 1)
 * - ArrowUp: move up (max of currentIndex - 1, 0)
 * - Home: jump to first item (0)
 * - End: jump to last item (n - 1)
 * - Any other key: return currentIndex unchanged
 *
 * Pure function — no side effects.
 *
 * @param n - Total number of items in the list (must be >= 1)
 * @param currentIndex - Currently focused index
 * @param key - The keyboard event key string
 * @returns The new index after applying the key action
 */
export function nextIndex(n: number, currentIndex: number, key: string): number {
  switch (key) {
    case "ArrowDown":
      return Math.min(currentIndex + 1, n - 1);
    case "ArrowUp":
      return Math.max(currentIndex - 1, 0);
    case "Home":
      return 0;
    case "End":
      return n - 1;
    default:
      return currentIndex;
  }
}

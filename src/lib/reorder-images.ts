/** Move an image to another position without mutating the original array. */
export function reorderImages<T>(images: readonly T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= images.length || to >= images.length || from === to) return [...images];
  const sorted = [...images];
  const [item] = sorted.splice(from, 1);
  sorted.splice(to, 0, item);
  return sorted;
}

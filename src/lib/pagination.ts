/** Compact, predictable pagination: always show the first and last page. */
export function paginationWindow(totalPages: number, selectedPage: number) {
  const total = Math.max(0, Math.floor(Number(totalPages) || 0));
  const current = Math.min(Math.max(1, Math.floor(Number(selectedPage) || 1)), Math.max(1, total));
  if (total <= 4) {
    return {pages: Array.from({length: total}, (_, i) => i + 1), previousGroup: null, nextGroup: null};
  }
  // Two interior pages per group, plus page 1 and the final page.
  const start = current <= 3 ? 2 : current >= total - 2
    ? Math.max(2, total - 2)
    : 2 + 2 * Math.floor((current - 2) / 2);
  const end = Math.min(total - 1, start + 1);
  return {
    pages: [...new Set([1, ...Array.from({length: end - start + 1}, (_, i) => start + i), total])],
    previousGroup: start > 2 ? Math.max(2, start - 2) : null,
    nextGroup: end < total - 1 ? end + 1 : null,
  };
}

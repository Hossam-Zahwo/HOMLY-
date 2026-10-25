import type {Product, Variant} from './commerce';
import {availableStock} from './commerce';

export type BudgetItem = {p: Product; v: Variant};

/**
 * Select every published, visible product priced at or below the limit.
 * A grouped product gets one eligible variant (prefer in-stock, then cheapest).
 * Separately listed variants remain individual cards. The original catalog is
 * not mutated, and prices are compared in piasters to include exactly 500 EGP.
 * In-stock cards are always shown before out-of-stock cards; the original
 * ordering is preserved within each group.
 */
export function budgetProducts(products: Product[], limitEgp = 500): BudgetItem[] {
  const ceiling = Math.round(Math.max(0, Math.min(500, Number(limitEgp) || 500)) * 100);
  return products.flatMap(p => {
    if (p.status !== 'published') return [];
    const eligible = p.variants.filter(v =>
      v.status === 'published' && Number.isFinite(v.price_minor) &&
      v.price_minor > 0 && v.price_minor <= ceiling
    );
    if (p.display_mode === 'separate_variants') {
      return eligible.filter(v => v.is_listed).map(v => ({p, v}));
    }
    const chosen = [...eligible].sort((a, b) =>
      Number(availableStock(b) > 0) - Number(availableStock(a) > 0) ||
      a.price_minor - b.price_minor
    )[0];
    return chosen ? [{p, v: chosen}] : [];
  }).sort((a, b) => Number(availableStock(b.v) > 0) - Number(availableStock(a.v) > 0));
}

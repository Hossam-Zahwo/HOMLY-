/**
 * Rotate automatically selected homepage cards once per visit. The same seed
 * always produces the same cards/order, so a re-render or catalog refresh does
 * not cause cards to jump. Manual editorial picks never call this helper.
 * Available products always stay ahead of out-of-stock products.
 */
export type RotatableHomeCard = {
  v: { id: string; stock_on_hand: number; stock_reserved: number };
};

function hashString(value: string): number {
  let valueHash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    valueHash = Math.imul(valueHash ^ value.charCodeAt(i), 16777619);
  }
  return valueHash >>> 0;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed;
  for (let i = result.length - 1; i > 0; i--) {
    // Mulberry32: deterministic per visit & section, independent of rendering.
    state = (state + 0x6d2b79f5) >>> 0;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    const random = ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(random * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function rotateHomeCards<T extends RotatableHomeCard>(items: T[], visitSeed: number, sectionId: string): T[] {
  if (!visitSeed || items.length < 2) return items;
  const available = items.filter(({v}) => v.stock_on_hand > v.stock_reserved);
  const unavailable = items.filter(({v}) => v.stock_on_hand <= v.stock_reserved);
  const sectionSeed = hashString(`${visitSeed}:${sectionId}`);
  return [...shuffle(available, sectionSeed), ...shuffle(unavailable, sectionSeed ^ 0x9e3779b9)];
}

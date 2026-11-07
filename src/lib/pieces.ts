/** Desglose de piezas de Diseño gráfico: posts (base), stories y carruseles. */
export const PIECES = [
  { key: "posts", label: "Posts", single: "Post" },
  { key: "stories", label: "Stories", single: "Story" },
  { key: "carousels", label: "Carruseles", single: "Carrusel" },
] as const;

export type PieceKey = (typeof PIECES)[number]["key"];
export type Breakdown = Partial<Record<PieceKey, { qty: number; price: number }>>;

export const pieceLabel = (key: string | null | undefined) =>
  PIECES.find((p) => p.key === key)?.label ?? "";

export function isDesignService(name: string | null | undefined) {
  return (name ?? "").toLowerCase().includes("diseño gr");
}

export function parseBreakdown(value: unknown): Breakdown | null {
  if (!value || typeof value !== "object") return null;
  const out: Breakdown = {};
  for (const p of PIECES) {
    const v = (value as Record<string, { qty?: unknown; price?: unknown }>)[p.key];
    if (v) out[p.key] = { qty: Math.max(0, Math.round(Number(v.qty) || 0)), price: Number(v.price) || 0 };
  }
  return Object.keys(out).length ? out : null;
}

export function breakdownTotals(b: Breakdown | null) {
  let qty = 0;
  let cost = 0;
  for (const p of PIECES) {
    const v = b?.[p.key];
    if (v) {
      qty += v.qty;
      cost += v.qty * v.price;
    }
  }
  return { qty, cost };
}

/** Existing untyped design quantities/prices represent posts, not new empty fields. */
export function initialAssignmentBreakdown(value: unknown, quantity: unknown, cost: unknown): Breakdown | null {
  const parsed = parseBreakdown(value);
  if (parsed) return parsed;
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  return qty > 0 ? { posts: { qty, price: (Number(cost) || 0) / qty } } : null;
}

/** Untyped historical work was recorded before stories/carousels were introduced. */
export function accountingPiece(piece: string | null | undefined): string {
  return piece || "posts";
}

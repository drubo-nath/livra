/** Format whole-taka amounts: 1450 → "৳1,450" */
export function formatBDT(n: number) {
  return `৳${n.toLocaleString("en-US")}`;
}

/** Free delivery on all orders. */
export const FREE_SHIPPING_THRESHOLD = 0;
export const SHIPPING_FEE = 0;

export function shippingFeeFor(_subtotal: number) {
  return 0;
}

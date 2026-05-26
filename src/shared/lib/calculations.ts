import {
  DISCOUNT_NONE,
  DISCOUNT_TYPE,
  type DiscountTypeValue,
  isDiscountType,
} from "@app/shared/config/invoice-status";
import {
  addCents,
  applyPercent,
  asCents,
  type Cents,
  clampNonNegative,
  multiplyCentsByQuantity,
  subtractCents,
  sumCents,
} from "@app/shared/types/money";

export interface DiscountInput {
  type: DiscountTypeValue;
  value: number;
}

interface LineItem {
  quantity: number;
  unitPrice: Cents;
}

export interface TotalsResult {
  subtotal: Cents;
  discountAmount: Cents;
  taxAmount: Cents;
  total: Cents;
}

export function calculateSubtotal(items: LineItem[]): Cents {
  return sumCents(items.map((item) => multiplyCentsByQuantity(item.unitPrice, item.quantity)));
}

export function calculateTotals(
  items: LineItem[],
  discount?: DiscountInput | null,
  taxRate?: number
): TotalsResult {
  const subtotal = calculateSubtotal(items);

  let discountAmount: Cents = asCents(0);

  if (discount && discount.value > 0) {
    if (discount.type === DISCOUNT_TYPE.PERCENTAGE) {
      discountAmount = applyPercent(subtotal, discount.value);
    } else {
      discountAmount = asCents(discount.value);
    }
  }

  const afterDiscount = clampNonNegative(subtractCents(subtotal, discountAmount));
  const taxAmount = taxRate ? applyPercent(afterDiscount, taxRate) : asCents(0);
  const total = addCents(afterDiscount, taxAmount);

  return { subtotal, discountAmount, taxAmount, total };
}

export function buildDiscountInput(
  discountType: string | null | undefined,
  discountValue: number | null | undefined
): DiscountInput | null {
  if (!discountType || discountType === DISCOUNT_NONE || !discountValue || discountValue <= 0) {
    return null;
  }

  if (!isDiscountType(discountType)) {
    return null;
  }

  return { type: discountType, value: discountValue };
}

export function isMoneyLimitExceeded(totals: TotalsResult, limit: number): boolean {
  return (
    totals.subtotal > limit ||
    totals.discountAmount > limit ||
    totals.taxAmount > limit ||
    totals.total > limit
  );
}

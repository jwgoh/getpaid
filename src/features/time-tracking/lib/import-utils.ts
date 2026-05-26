import { TIME_TRACKING } from "@app/shared/config/config";
import type { InvoiceFormInput } from "@app/shared/schemas";
import { asCents, type Cents, toDollars } from "@app/shared/types/money";

import type { ImportedGroup } from "../api";
import { RATE_SOURCE, type RateSource } from "../constants";

export function formatHours(seconds: number): string {
  const hours = seconds / TIME_TRACKING.SECONDS_PER_HOUR;

  return `${hours.toFixed(2)}h`;
}

export function formatAmount(cents: Cents | null): string {
  if (cents === null) {
    return "";
  }

  return `$${toDollars(cents).toFixed(2)}`;
}

export function buildDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();

  start.setDate(start.getDate() - TIME_TRACKING.DEFAULT_DATE_RANGE_DAYS);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export function resolveItemRate(
  rateSource: RateSource,
  providerRateCents: Cents | null,
  getpaidRateCents: Cents,
  customRateCents: Cents
): Cents {
  switch (rateSource) {
    case RATE_SOURCE.PROVIDER:
      return providerRateCents ?? getpaidRateCents;
    case RATE_SOURCE.GETPAID:
      return getpaidRateCents || providerRateCents || asCents(0);
    case RATE_SOURCE.CUSTOM:
      return customRateCents;
  }
}

export function mapImportedGroups(
  groups: ImportedGroup[]
): NonNullable<InvoiceFormInput["itemGroups"]> {
  return groups.map((g) => ({
    title: g.title,
    items: g.items.map((item) => ({
      title: item.title,
      description: item.description || undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  }));
}

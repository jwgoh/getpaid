import { describe, expect, it } from "vitest";

import { DISCOUNT_TYPE } from "@app/shared/config/invoice-status";

import { createInvoiceSchema, discountSchema, updateInvoiceSchema } from "./invoice";
import { SCHEMA_LIMITS } from "./limits";
import { lineItemSchema } from "./line-item";

const validItem = {
  title: "Consulting",
  quantity: 1,
  unitPrice: 10_000,
};

function buildCreatePayload(overrides: Record<string, unknown> = {}) {
  return {
    clientId: "client-1",
    dueDate: "2026-06-01",
    items: [validItem],
    ...overrides,
  };
}

describe("lineItemSchema — per-line product ceiling", () => {
  it("accepts a line item at the maximum quantity and unit price", () => {
    const result = lineItemSchema.safeParse({
      title: "Max line",
      quantity: SCHEMA_LIMITS.QUANTITY_MAX,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a quantity above QUANTITY_MAX", () => {
    const result = lineItemSchema.safeParse({
      title: "Too many",
      quantity: SCHEMA_LIMITS.QUANTITY_MAX + 1,
      unitPrice: 1,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("too_big");
      expect(result.error.issues[0].path).toEqual(["quantity"]);
    }
  });

  it("rejects a unit price above MONEY_MAX_LINE_ITEM_CENTS", () => {
    const result = lineItemSchema.safeParse({
      title: "Too expensive",
      quantity: 1,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS + 1,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("too_big");
      expect(result.error.issues[0].path).toEqual(["unitPrice"]);
    }
  });

  it("keeps the per-line product within MONEY_MAX_CENTS at the maximum bounds", () => {
    expect(
      SCHEMA_LIMITS.QUANTITY_MAX * SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS
    ).toBeLessThanOrEqual(SCHEMA_LIMITS.MONEY_MAX_CENTS);
  });
});

describe("discountSchema — percentage ceiling (QA-004)", () => {
  it("accepts a percentage discount of 100", () => {
    const result = discountSchema.safeParse({
      type: DISCOUNT_TYPE.PERCENTAGE,
      value: SCHEMA_LIMITS.MAX_DISCOUNT_PERCENT,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a percentage discount above 100", () => {
    const result = discountSchema.safeParse({
      type: DISCOUNT_TYPE.PERCENTAGE,
      value: SCHEMA_LIMITS.MAX_DISCOUNT_PERCENT + 1,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["value"]);
      expect(result.error.issues[0].message).toMatch(/percentage discount cannot exceed/i);
    }
  });

  it("rejects a 2.1-billion-percent discount", () => {
    const result = discountSchema.safeParse({
      type: DISCOUNT_TYPE.PERCENTAGE,
      value: SCHEMA_LIMITS.MONEY_MAX_CENTS,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["value"]);
      expect(result.error.issues[0].message).toMatch(/percentage discount cannot exceed/i);
    }
  });

  it("accepts a fixed discount up to MONEY_MAX_CENTS", () => {
    const result = discountSchema.safeParse({
      type: DISCOUNT_TYPE.FIXED,
      value: SCHEMA_LIMITS.MONEY_MAX_CENTS,
    });

    expect(result.success).toBe(true);
  });
});

describe("createInvoiceSchema — aggregate total ceiling (QA-001)", () => {
  it("accepts a normal invoice", () => {
    const result = createInvoiceSchema.safeParse(buildCreatePayload());

    expect(result.success).toBe(true);
  });

  it("rejects an invoice whose summed line items overflow MONEY_MAX_CENTS", () => {
    const maxLine = {
      title: "Max line",
      quantity: SCHEMA_LIMITS.QUANTITY_MAX,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
    };
    const result = createInvoiceSchema.safeParse(buildCreatePayload({ items: [maxLine, maxLine] }));

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["items"]);
      expect(result.error.issues[0].message).toMatch(/invoice total is too large/i);
    }
  });

  it("rejects an invoice whose grouped items overflow MONEY_MAX_CENTS", () => {
    const maxLine = {
      title: "Max line",
      quantity: SCHEMA_LIMITS.QUANTITY_MAX,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
    };
    const result = createInvoiceSchema.safeParse(
      buildCreatePayload({
        items: [maxLine],
        itemGroups: [{ title: "Group", items: [maxLine] }],
      })
    );

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["items"]);
      expect(result.error.issues[0].message).toMatch(/invoice total is too large/i);
    }
  });

  it("rejects an invoice whose total overflows MONEY_MAX_CENTS via tax", () => {
    const maxLine = {
      title: "Near-max line",
      quantity: SCHEMA_LIMITS.QUANTITY_MAX,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
    };
    const result = createInvoiceSchema.safeParse(
      buildCreatePayload({ items: [maxLine], taxRate: 100 })
    );

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["items"]);
      expect(result.error.issues[0].message).toMatch(/invoice total is too large/i);
    }
  });
});

describe("updateInvoiceSchema — aggregate total ceiling (QA-001)", () => {
  it("accepts a partial update without items", () => {
    const result = updateInvoiceSchema.safeParse({ taxRate: 10 });

    expect(result.success).toBe(true);
  });

  it("rejects an item update whose summed line items overflow MONEY_MAX_CENTS", () => {
    const maxLine = {
      title: "Max line",
      quantity: SCHEMA_LIMITS.QUANTITY_MAX,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
    };
    const result = updateInvoiceSchema.safeParse({
      items: [maxLine, maxLine],
      itemGroups: [],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["items"]);
      expect(result.error.issues[0].message).toMatch(/invoice total is too large/i);
    }
  });

  it("rejects an items-absent update whose grouped items overflow MONEY_MAX_CENTS", () => {
    const maxLine = {
      title: "Max line",
      quantity: SCHEMA_LIMITS.QUANTITY_MAX,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
    };
    const result = updateInvoiceSchema.safeParse({
      items: [],
      itemGroups: [{ title: "Group", items: [maxLine, maxLine] }],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["items"]);
      expect(result.error.issues[0].message).toMatch(/invoice total is too large/i);
    }
  });

  it("accepts an items-only update that overflows only once a persisted tax rate applies (the service guard is authoritative)", () => {
    const maxLine = {
      title: "Max line",
      quantity: SCHEMA_LIMITS.QUANTITY_MAX,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
    };
    const result = updateInvoiceSchema.safeParse({
      items: [maxLine],
      itemGroups: [],
    });

    expect(result.success).toBe(true);
  });
});

describe("updateInvoiceSchema — items/itemGroups all-or-nothing (PROD-004)", () => {
  const validItemInput = {
    title: "Consulting",
    quantity: 1,
    unitPrice: 10_000,
  };

  it("accepts a body with both items and itemGroups present", () => {
    const result = updateInvoiceSchema.safeParse({
      items: [validItemInput],
      itemGroups: [{ title: "Group", items: [validItemInput] }],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a body with both items and itemGroups as empty arrays", () => {
    const result = updateInvoiceSchema.safeParse({ items: [], itemGroups: [] });

    expect(result.success).toBe(true);
  });

  it("accepts a body with neither items nor itemGroups", () => {
    const result = updateInvoiceSchema.safeParse({ taxRate: 5 });

    expect(result.success).toBe(true);
  });

  it("rejects a body with itemGroups but no items", () => {
    const result = updateInvoiceSchema.safeParse({
      itemGroups: [{ title: "Group", items: [validItemInput] }],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["items"]);
      expect(result.error.issues[0].message).toMatch(/must be provided together/i);
    }
  });

  it("rejects a body with items but no itemGroups", () => {
    const result = updateInvoiceSchema.safeParse({ items: [validItemInput] });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["itemGroups"]);
      expect(result.error.issues[0].message).toMatch(/must be provided together/i);
    }
  });
});

describe("createInvoiceSchema — date validity (QA-002)", () => {
  it("rejects an unparseable dueDate", () => {
    const result = createInvoiceSchema.safeParse(buildCreatePayload({ dueDate: "garbage" }));

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["dueDate"]);
      expect(result.error.issues[0].message).toMatch(/invalid date/i);
    }
  });

  it("rejects an out-of-range calendar dueDate", () => {
    const result = createInvoiceSchema.safeParse(buildCreatePayload({ dueDate: "2026-13-45" }));

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("custom");
      expect(result.error.issues[0].path).toEqual(["dueDate"]);
      expect(result.error.issues[0].message).toMatch(/invalid date/i);
    }
  });
});

describe("createInvoiceSchema — item array caps (QA-007)", () => {
  it("accepts an invoice at the item-count cap", () => {
    const items = Array.from({ length: SCHEMA_LIMITS.INVOICE_ITEMS_MAX }, () => validItem);
    const result = createInvoiceSchema.safeParse(buildCreatePayload({ items }));

    expect(result.success).toBe(true);
  });

  it("rejects an invoice above the item-count cap", () => {
    const items = Array.from({ length: SCHEMA_LIMITS.INVOICE_ITEMS_MAX + 1 }, () => validItem);
    const result = createInvoiceSchema.safeParse(buildCreatePayload({ items }));

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("too_big");
      expect(result.error.issues[0].path).toEqual(["items"]);
    }
  });

  it("rejects an invoice above the item-group cap", () => {
    const itemGroups = Array.from({ length: SCHEMA_LIMITS.INVOICE_ITEM_GROUPS_MAX + 1 }, () => ({
      title: "Group",
      items: [validItem],
    }));
    const result = createInvoiceSchema.safeParse(
      buildCreatePayload({ items: [validItem], itemGroups })
    );

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe("too_big");
      expect(result.error.issues[0].path).toEqual(["itemGroups"]);
    }
  });
});

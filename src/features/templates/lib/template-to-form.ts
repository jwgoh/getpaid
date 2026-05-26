import type { Template, TemplateFormData } from "@app/shared/schemas";
import { asCents, toDollars } from "@app/shared/types/money";

export function mapTemplateToFormData(template: Template): TemplateFormData {
  return {
    name: template.name,
    description: template.description || "",
    currency: template.currency,
    discountType: template.discountType || "",
    discountValue:
      template.discountType === "FIXED"
        ? toDollars(asCents(template.discountValue))
        : template.discountValue,
    taxRate: template.taxRate,
    notes: template.notes || "",
    dueDays: template.dueDays,
    items: template.items.map((item) => ({
      title: item.title,
      description: item.description || "",
      quantity: item.quantity,
      unitPrice: toDollars(item.unitPrice),
    })),
    itemGroups: template.itemGroups?.map((group) => ({
      title: group.title,
      items: group.items.map((item) => ({
        title: item.title,
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: toDollars(item.unitPrice),
      })),
    })),
  };
}

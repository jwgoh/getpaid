-- AddCheckConstraint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_total_non_negative_check" CHECK ("total" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subtotal_non_negative_check" CHECK ("subtotal" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_taxAmount_non_negative_check" CHECK ("taxAmount" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_discountAmount_non_negative_check" CHECK ("discountAmount" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paidAmount_non_negative_check" CHECK ("paidAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_quantity_positive_check" CHECK ("quantity" > 0);
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_unitPrice_non_negative_check" CHECK ("unitPrice" >= 0);

-- AddCheckConstraint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive_check" CHECK ("amount" > 0);

-- AddCheckConstraint
ALTER TABLE "InvoiceTemplateItem" ADD CONSTRAINT "InvoiceTemplateItem_quantity_positive_check" CHECK ("quantity" > 0);
ALTER TABLE "InvoiceTemplateItem" ADD CONSTRAINT "InvoiceTemplateItem_unitPrice_non_negative_check" CHECK ("unitPrice" >= 0);

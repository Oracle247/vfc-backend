import { z } from "zod";

export const invoiceItemSchema = z.object({
    description: z.string(),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Unit price must be at least 0"),
});

export const invoiceDepartmentSchema = z.object({
    departmentName: z.string(),
    bankName: z.string(),
    accountName: z.string(),
    accountNumber: z.string(),
    items: z.array(invoiceItemSchema),
});

export const invoiceSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    currency: z.string().optional(),
    departments: z.array(invoiceDepartmentSchema),
});

export const recordPaymentSchema = z.object({
    amount: z.number().positive("Payment amount must be greater than zero"),
    receiptUrl: z.string().url("Must be a valid URL").optional(),
    note: z.string().max(500).optional(),
});

export type IInvoice = z.infer<typeof invoiceSchema>;
export type IRecordPayment = z.infer<typeof recordPaymentSchema>;

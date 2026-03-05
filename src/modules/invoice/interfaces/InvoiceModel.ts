export interface IInvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  receiptUrl?: string;
  note?: string;
  recordedById: string;
  paidAt: Date;
  createdAt: Date;
}

export interface IInvoiceSummary {
  totalAmount: number;
  totalPaid: number;
  remainingBalance: number;
  paymentProgressPercentage: number;
}

import { WithUserId } from './../../../types/index';
import { Prisma, InvoiceStatus } from "@prisma/client";
import prisma from "../../../core/databases/prisma";
import { paginate } from "../../../core/utils/paginate";
import { IInvoice } from "../schema/invoice.schema";

type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: {
    departments: {
      include: {
        items: true;
      };
    };
    createdBy: true;
    markedPaidBy: true;
    approvedBy: true;
    payments: {
      include: {
        recordedBy: true;
      };
    };
  };
}>;

function computePaymentSummary(totalAmount: number, payments: { amount: number }[]) {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = totalAmount - totalPaid;
  const paymentProgressPercentage = totalAmount > 0
    ? Math.round((totalPaid / totalAmount) * 100)
    : 0;

  return { totalAmount, totalPaid, remainingBalance, paymentProgressPercentage };
}

export class InvoiceService {

  async createInvoice(data: WithUserId<IInvoice>): Promise<InvoiceWithDetails> {

    if (!data.departments.length) {
      throw new Error("Invoice must contain at least one department");
    }

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          title: data.title,
          description: data.description,
          currency: data.currency ?? "NGN",
          status: InvoiceStatus.CREATED,
          createdById: data.userId,
        },
      });

      let totalAmount = 0;

      for (const dept of data.departments) {
        if (!dept.items.length) {
          throw new Error(
            `Department "${dept.departmentName}" must have at least one item`
          );
        }

        const department = await tx.invoiceDepartment.create({
          data: {
            invoiceId: invoice.id,
            departmentName: dept.departmentName,
            bankName: dept.bankName,
            accountName: dept.accountName,
            accountNumber: dept.accountNumber,
          },
        });

        const itemsData = dept.items.map((item) => ({
          invoiceDepartmentId: department.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        }));

        await tx.invoiceItem.createMany({ data: itemsData });

        totalAmount += itemsData.reduce((sum, item) => sum + item.totalPrice, 0);
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { totalAmount },
      });

      //TODO: send notification to ADMIN/VP for approval

      return tx.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: {
          departments: { include: { items: true } },
          createdBy: true,
          markedPaidBy: true,
          approvedBy: true,
          payments: { include: { recordedBy: true } },
        },
      });
    });
  }

  async getInvoices(page = 1, limit = 10) {
    return paginate(prisma.invoice, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        departments: true,
        payments: true,
      },
    });
  }

  async getInvoiceById(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        departments: { include: { items: true } },
        createdBy: true,
        markedPaidBy: true,
        approvedBy: true,
        payments: {
          include: { recordedBy: true },
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!invoice) throw new Error("Invoice not found");

    return {
      ...invoice,
      paymentSummary: computePaymentSummary(invoice.totalAmount, invoice.payments),
    };
  }

  async recordPayment(data: {
    invoiceId: string;
    userId: string;
    amount: number;
    receiptUrl?: string;
    note?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { payments: true },
      });

      if (!invoice) throw new Error("Invoice not found");

      if (invoice.status !== InvoiceStatus.APPROVED && invoice.status !== InvoiceStatus.PARTIALLY_PAID) {
        throw new Error("Invoice must be approved before payments can be recorded");
      }

      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = invoice.totalAmount - totalPaid;

      if (data.amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      if (data.amount > remainingBalance) {
        throw new Error(`Payment amount (${data.amount}) exceeds remaining balance (${remainingBalance})`);
      }

      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId: data.invoiceId,
          amount: data.amount,
          receiptUrl: data.receiptUrl,
          note: data.note,
          recordedById: data.userId,
        },
        include: {
          recordedBy: true,
        },
      });

      const newTotalPaid = totalPaid + data.amount;
      const isFullyPaid = newTotalPaid >= invoice.totalAmount;

      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          ...(isFullyPaid && {
            markedPaidById: data.userId,
            paidAt: new Date(),
          }),
        },
      });

      return payment;
    });
  }

  async getPaymentsByInvoiceId(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) throw new Error("Invoice not found");

    const payments = await prisma.invoicePayment.findMany({
      where: { invoiceId },
      include: { recordedBy: true },
      orderBy: { paidAt: "desc" },
    });

    return {
      payments,
      summary: computePaymentSummary(invoice.totalAmount, payments),
    };
  }

  async markAsPaid({
    invoiceId,
    userId,
  }: {
    invoiceId: string;
    userId: string;
  }) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = invoice.totalAmount - totalPaid;

    if (remainingBalance <= 0) {
      throw new Error("Invoice is already fully paid");
    }

    return this.recordPayment({
      invoiceId,
      userId,
      amount: remainingBalance,
      note: "Full payment / remaining balance",
    });
  }

  async approveInvoice({
    invoiceId,
    userId,
  }: {
    invoiceId: string;
    userId: string;
  }) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found");

    if (invoice.status !== InvoiceStatus.CREATED) {
      throw new Error("Only invoices with CREATED status can be approved");
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    //TODO: send notification to creator about approval
  }


  async updateInvoice(
    invoiceId: string,
    data: Partial<{ title: string; description: string }>
  ) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found");

    if (invoice.status !== InvoiceStatus.CREATED) {
      throw new Error("Only created invoices can be updated");
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data,
    });
  }

  async deleteInvoice(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found");

    if (invoice.status !== InvoiceStatus.CREATED) {
      throw new Error("Only created invoices can be deleted");
    }

    return prisma.invoice.delete({
      where: { id: invoiceId },
    });
  }
}

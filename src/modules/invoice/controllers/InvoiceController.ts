import { Request, Response, NextFunction } from "express";
import { InvoiceService } from "../services/InvoiceService";
import { StatusCodes } from "http-status-codes";
import { successResponse } from "../../../core/utils/responses.utils";

export class InvoiceController {
  private invoiceService = new InvoiceService();

  public createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const result = await this.invoiceService.createInvoice({ ...req.body, userId });
      successResponse(res, "Invoice created successfully", StatusCodes.CREATED, result);
    } catch (err) {
      next(err);
    }
  };

  public getInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await this.invoiceService.getInvoices(page, limit);
      successResponse(res, "Invoices fetched successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  public getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.invoiceService.getInvoiceById(id);
      successResponse(res, "Invoice fetched successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  public approveInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await this.invoiceService.approveInvoice({ invoiceId: id, userId });
      successResponse(res, "Invoice approved successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  public recordPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await this.invoiceService.recordPayment({
        invoiceId: id,
        userId,
        amount: req.body.amount,
        receiptUrl: req.body.receiptUrl,
        note: req.body.note,
      });
      successResponse(res, "Payment recorded successfully", StatusCodes.CREATED, result);
    } catch (err) {
      next(err);
    }
  };

  public getPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.invoiceService.getPaymentsByInvoiceId(id);
      successResponse(res, "Payments fetched successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  public markAsPaid = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await this.invoiceService.markAsPaid({ invoiceId: id, userId });
      successResponse(res, "Invoice marked as paid successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  public updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.invoiceService.updateInvoice(id, req.body);
      successResponse(res, "Invoice updated successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  public deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.invoiceService.deleteInvoice(id);
      successResponse(res, "Invoice deleted successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };
}

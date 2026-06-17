import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { DepartmentLateTimeService } from "../services/DepartmentLateTimeService";
import { successResponse } from "../../../core/utils/responses.utils";
import { logDevError } from "../../../core/utils";

export class DepartmentLateTimeController {
  private service = new DepartmentLateTimeService();

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listForServiceDay(req.params.serviceDayId);
      successResponse(res, "Department late times fetched", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public upsert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
        return;
      }
      const result = await this.service.upsert(
        req.params.serviceDayId,
        req.params.departmentId,
        req.body,
        req.user,
      );
      successResponse(res, "Department late time saved", StatusCodes.OK, result);
    } catch (err: unknown) {
      logDevError(err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.startsWith("Forbidden")) {
        res.status(StatusCodes.FORBIDDEN).json({ message: msg });
        return;
      }
      if (msg.endsWith("not found")) {
        res.status(StatusCodes.NOT_FOUND).json({ message: msg });
        return;
      }
      next(err);
    }
  };

  public remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
        return;
      }
      const result = await this.service.remove(
        req.params.serviceDayId,
        req.params.departmentId,
        req.user,
      );
      successResponse(res, "Department late time cleared", StatusCodes.OK, result);
    } catch (err: unknown) {
      logDevError(err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.startsWith("Forbidden")) {
        res.status(StatusCodes.FORBIDDEN).json({ message: msg });
        return;
      }
      if (msg.endsWith("not found")) {
        res.status(StatusCodes.NOT_FOUND).json({ message: msg });
        return;
      }
      next(err);
    }
  };
}

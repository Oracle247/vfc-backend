import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { ServiceDayVariationService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";
import { logDevError } from "../../../core/utils";

export class ServiceDayVariationController {
  private service = new ServiceDayVariationService();

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await this.service.list(req.params.serviceDayId);
      successResponse(res, "Variations fetched", StatusCodes.OK, rows);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await this.service.create(req.params.serviceDayId, req.body);
      successResponse(res, "Variation created", StatusCodes.CREATED, row);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await this.service.update(
        req.params.serviceDayId,
        req.params.variationId,
        req.body,
      );
      successResponse(res, "Variation updated", StatusCodes.OK, row);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.remove(req.params.serviceDayId, req.params.variationId);
      successResponse(res, "Variation deleted", StatusCodes.OK);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };
}

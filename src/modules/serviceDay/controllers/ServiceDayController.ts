import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { ServiceDayService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";
import { logDevError } from "../../../core/utils";

export class ServiceDayController {
  private service = new ServiceDayService();

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.create(req.body);
      successResponse(res, "Service day created", StatusCodes.CREATED, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.list();
      successResponse(res, "Service days fetched", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getById(req.params.id);
      successResponse(res, "Service day fetched", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.update(req.params.id, req.body);
      successResponse(res, "Service day updated", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.remove(req.params.id);
      successResponse(res, "Service day deleted", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };
}

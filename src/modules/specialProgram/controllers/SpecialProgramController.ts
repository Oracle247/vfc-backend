import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { SpecialProgramService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";
import { logDevError } from "../../../core/utils";

export class SpecialProgramController {
  private service = new SpecialProgramService();

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, date, services } = req.body;
      const result = await this.service.create({
        name,
        date: date ? new Date(date) : null,
        services,
      });
      successResponse(res, "Special program created", StatusCodes.CREATED, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.list();
      successResponse(res, "Special programs fetched", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getById(req.params.id);
      successResponse(res, "Special program fetched", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, date, services } = req.body;
      const result = await this.service.update(req.params.id, {
        name,
        date: date === undefined ? undefined : date === null ? null : new Date(date),
        services,
      });
      successResponse(res, "Special program updated", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.remove(req.params.id);
      successResponse(res, "Special program deleted", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };
}

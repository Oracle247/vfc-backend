import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { SettingsService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";
import { logDevError } from "../../../core/utils";

export class SettingsController {
  private settingsService = new SettingsService();

  public getChurchSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.settingsService.getChurchSettings();
      successResponse(res, "Church settings fetched successfully", StatusCodes.OK, settings);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public updateChurchSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.settingsService.updateChurchSettings(req.body);
      successResponse(res, "Church settings updated successfully", StatusCodes.OK, settings);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };
}

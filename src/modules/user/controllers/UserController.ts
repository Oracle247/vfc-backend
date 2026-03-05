import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { UserService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";

export class UserController {
  private userService = new UserService();

  public getFilteredUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, churchStatus, membershipType, role, search } = req.query;
      const result = await this.userService.getFilteredUsers({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        churchStatus: churchStatus as any,
        membershipType: membershipType as any,
        role: role as any,
        search: search as string,
      });
      successResponse(res, "Users fetched successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  public updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.updateUser(req.params.id, req.body);
      successResponse(res, "User updated successfully", StatusCodes.OK, user);
    } catch (err) {
      next(err);
    }
  };

  public updateChurchJourney = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.updateChurchJourney(req.params.id, req.body);
      successResponse(res, "Church journey updated successfully", StatusCodes.OK, user);
    } catch (err) {
      next(err);
    }
  };

  public setPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.setPassword(req.params.id, req.body.password);
      successResponse(res, "Password set successfully", StatusCodes.OK, user);
    } catch (err) {
      next(err);
    }
  };

  public bulkImport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) return next(new Error("File not uploaded"));
      const result = await this.userService.bulkImportFromExcel(file.path);
      successResponse(res, "Members imported successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  public getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.getAllUsers();
      successResponse(res, "Users fetched successfully", StatusCodes.OK, users);
    } catch (err) {
      next(err);
    }
  }

  public getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getUserById(req.params.id);
      if (!user) return next(new Error("User not found"));
      successResponse(res, "User fetched successfully", StatusCodes.OK, user);
    } catch (err) {
      next(err);
    }
  }

  public getUserByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.query;
      const user = await this.userService.getUserByName(name as string);
      if (!user) return next(new Error("User not found"));
      successResponse(res, "User fetched successfully", StatusCodes.OK, user);
    } catch (err) {
      next(err);
    }
  }

  public getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.getUser(req?.user?.id || "");
      if (!user) return next(new Error("User not found"));
      successResponse(res, "User fetched successfully", StatusCodes.OK, user);
    } catch (err) {
      next(err);
    }
  }

  public analyzeExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) return next(new Error("File not uploaded"));
      const analysisResult = await this.userService.analyzeExpenses(file.path);
      successResponse(res, "Expenses analyzed successfully", StatusCodes.OK, analysisResult);
    } catch (err) {
      next(err);
    }
  }

  public deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deletedUser = await this.userService.deleteUser(req.params.id);
      successResponse(res, "User deleted successfully", StatusCodes.OK, deletedUser);
    } catch (err) {
      next(err);
    }
  }
}

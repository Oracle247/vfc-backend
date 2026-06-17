import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { DepartmentService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";
import { logDevError } from "../../../core/utils";

export class DepartmentController {
  private departmentService = new DepartmentService();

  public createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.createDepartment(req.body);
      successResponse(res, "Department created successfully", StatusCodes.CREATED, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public getAllDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const departments = await this.departmentService.getAllDepartments(page, limit);
      successResponse(res, "Departments fetched successfully", StatusCodes.OK, departments);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public getDepartmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.getDepartmentById(req.params.id);
      successResponse(res, "Department fetched successfully", StatusCodes.OK, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.updateDepartment(req.params.id, req.body);
      successResponse(res, "Department updated successfully", StatusCodes.OK, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.departmentService.deleteDepartment(req.params.id);
      successResponse(res, "Department deleted successfully", StatusCodes.OK);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public assignHead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.assignHead(req.params.id, req.body.userId);
      successResponse(res, "Department head assigned successfully", StatusCodes.OK, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public removeHead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.removeHead(req.params.id);
      successResponse(res, "Department head removed successfully", StatusCodes.OK, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public addMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.addMembers(req.params.id, req.body.userIds);
      successResponse(res, "Members added successfully", StatusCodes.OK, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public removeMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.removeMembers(req.params.id, req.body.userIds);
      successResponse(res, "Members removed successfully", StatusCodes.OK, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public addAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.addAssistants(req.params.id, req.body.userIds);
      successResponse(res, "Assistants added", StatusCodes.OK, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public removeAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = await this.departmentService.removeAssistants(req.params.id, req.body.userIds);
      successResponse(res, "Assistants removed", StatusCodes.OK, department);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public listPositions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await this.departmentService.listPositions(req.params.id);
      successResponse(res, "Positions fetched", StatusCodes.OK, rows);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public assignPosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await this.departmentService.assignPosition(
        req.params.id,
        req.body.userId,
        req.body.positionId,
      );
      successResponse(res, "Position assigned", StatusCodes.OK, row);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public removePosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.departmentService.removePosition(
        req.params.id,
        req.params.userId,
        req.params.positionId,
      );
      successResponse(res, "Position removed", StatusCodes.OK);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  public bulkImport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) return next(new Error("File not uploaded"));
      const result = await this.departmentService.bulkCreateFromExcel(file.path);
      successResponse(res, "Departments imported successfully", StatusCodes.OK, result);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };
}

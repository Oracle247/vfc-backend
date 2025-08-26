import { Request, Response, NextFunction } from "express";
import { AttendanceService } from "../services/AttendanceService";
import { StatusCodes } from "http-status-codes";
import { successResponse } from "../../../core/utils/responses.utils";

export class AttendanceController {
  private attendanceService = new AttendanceService();

  /**
   * Start a new attendance session (e.g., "Sunday Service")
   */
  public startSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceName, date } = req.body;
      console.log({ body: req.body })
      const result = await this.attendanceService.startSession(serviceName, new Date(date));
      successResponse(res, "Attendance session started successfully", StatusCodes.CREATED, result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Mark attendance for a user
   */
  public markAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, userId } = req.body;
      const result = await this.attendanceService.markAttendance(sessionId, userId);
      successResponse(res, "Attendance marked successfully", StatusCodes.CREATED, result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get all sessions (with pagination)
   */
  public getAllSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.attendanceService.getAllSessions(page, limit);
      successResponse(res, "Attendance sessions fetched successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get single session details (with attendees)
   */
  public getSessionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.attendanceService.getSessionById(id);
      successResponse(res, "Attendance session fetched successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Update a session (serviceName/date)
   */
  public updateSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.attendanceService.updateSession(id, req.body);
      successResponse(res, "Attendance session updated successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Delete a session
   */
  public deleteSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.attendanceService.deleteSession(id);
      successResponse(res, "Attendance session deleted successfully", StatusCodes.OK, result);
    } catch (err) {
      next(err);
    }
  };
}

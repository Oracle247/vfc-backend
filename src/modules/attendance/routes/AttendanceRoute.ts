import { Request, Response, NextFunction, Router } from 'express';
import { AttendanceController } from '../controllers/AttendanceController';
import { Routes } from "../../../core/routes/interfaces";
import { authenticate, authorize } from '../../../core/middlewares/AuthMiddleware';
import { UserRole } from '@prisma/client';
import {
  CreateAttendanceSessionSchema,
  UpdateAttendanceSessionSchema,
  MarkAttendanceSchema,
  BulkMarkAttendanceSchema
} from '../schema/attendance.schema';
import { validate } from '../../../core/middlewares';

class AttendanceRoute implements Routes {
  public path = '/attendance';
  public router = Router();
  public attendanceController = new AttendanceController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.all(`${this.path}*`, (req: Request, res: Response, next: NextFunction) => {
      next();
    });

    // Start a new attendance session
    this.router.post(`${this.path}/session`,
      authenticate,
      authorize(UserRole.ADMIN, UserRole.WORKER),
      validate(CreateAttendanceSessionSchema),
      this.attendanceController.startSession
    );

    // Mark a user's attendance
    this.router.post(`${this.path}/mark`,
      authenticate,
      authorize(UserRole.ADMIN, UserRole.WORKER),
      validate(MarkAttendanceSchema),
      this.attendanceController.markAttendance
    );

    // Bulk mark attendance for multiple users
    this.router.post(`${this.path}/mark-bulk`,
      authenticate,
      authorize(UserRole.ADMIN, UserRole.WORKER),
      validate(BulkMarkAttendanceSchema),
      this.attendanceController.bulkMarkAttendance
    );

    // Analytics endpoints (must be before /session/:id to avoid conflict)
    this.router.get(`${this.path}/analytics/summary`,
      authenticate,
      this.attendanceController.getAttendanceSummary
    );

    this.router.get(`${this.path}/analytics/top-members`,
      authenticate,
      this.attendanceController.getTopMembers
    );

    this.router.get(`${this.path}/analytics/member-history/:userId`,
      authenticate,
      this.attendanceController.getMemberAttendanceHistory
    );

    this.router.get(`${this.path}/analytics/trend`,
      authenticate,
      this.attendanceController.getAttendanceTrend
    );

    this.router.get(`${this.path}/analytics/rate`,
      authenticate,
      this.attendanceController.getAttendanceRate
    );

    // Get all sessions (with pagination)
    this.router.get(`${this.path}/sessions`,
      authenticate,
      this.attendanceController.getAllSessions
    );

    // Get single session by ID
    this.router.get(`${this.path}/session/:id`,
      authenticate,
      this.attendanceController.getSessionById
    );

    // Update a session
    this.router.put(`${this.path}/session/:id`,
      authenticate,
      authorize(UserRole.ADMIN),
      validate(UpdateAttendanceSessionSchema),
      this.attendanceController.updateSession
    );

    // Delete a session
    this.router.delete(`${this.path}/session/:id`,
      authenticate,
      authorize(UserRole.ADMIN),
      this.attendanceController.deleteSession
    );
  }
}

export { AttendanceRoute };

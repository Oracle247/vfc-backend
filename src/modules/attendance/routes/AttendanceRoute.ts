import { Request, Response, NextFunction, Router } from 'express';
import { AttendanceController } from '../controllers/AttendanceController';
import { Routes } from "../../../core/routes/interfaces";
import { authenticate, authorize } from '../../../core/middlewares/AuthMiddleware';
import { UserRole } from '@prisma/client';
import {
  CreateAttendanceSessionSchema,
  UpdateAttendanceSessionSchema,
  MarkAttendanceSchema
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
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      validate(CreateAttendanceSessionSchema),
      this.attendanceController.startSession
    );

    // Mark a user's attendance
    this.router.post(`${this.path}/mark`,
      authenticate,
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      validate(MarkAttendanceSchema),
      this.attendanceController.markAttendance
    );

    // Get all sessions (with pagination) for a branch
    this.router.get(`${this.path}/sessions`,
      authenticate,
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      this.attendanceController.getAllSessions
    );

    // Get single session by ID
    this.router.get(`${this.path}/session/:id`,
      authenticate,
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      this.attendanceController.getSessionById
    );

    // Update a session
    this.router.put(`${this.path}/session/:id`,
      authenticate,
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      validate(UpdateAttendanceSessionSchema),
      this.attendanceController.updateSession
    );

    // Delete a session
    this.router.delete(`${this.path}/session/:id`,
      authenticate,
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      this.attendanceController.deleteSession
    );
  }
}

export { AttendanceRoute };

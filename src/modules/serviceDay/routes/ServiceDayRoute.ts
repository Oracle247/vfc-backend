import { Request, Response, NextFunction, Router } from "express";
import { UserRole } from "@prisma/client";
import { ServiceDayController, DepartmentLateTimeController } from "../controllers";
import { Routes } from "../../../core/routes/interfaces";
import { authenticate, authorize } from "../../../core/middlewares/AuthMiddleware";
import { validate } from "../../../core/middlewares";
import {
  CreateServiceDaySchema,
  UpdateServiceDaySchema,
  UpsertDeptLateTimeSchema,
} from "../schema/serviceDay.schema";

class ServiceDayRoute implements Routes {
  public path = "/service-days";
  public router = Router();
  public controller = new ServiceDayController();
  public lateTimeController = new DepartmentLateTimeController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.all(`${this.path}*`, (req: Request, res: Response, next: NextFunction) => {
      next();
    });

    this.router.get(`${this.path}`,
      authenticate,
      this.controller.list,
    );

    this.router.get(`${this.path}/:id`,
      authenticate,
      this.controller.getById,
    );

    this.router.post(`${this.path}`,
      authenticate,
      authorize(UserRole.ADMIN),
      validate(CreateServiceDaySchema),
      this.controller.create,
    );

    this.router.put(`${this.path}/:id`,
      authenticate,
      authorize(UserRole.ADMIN),
      validate(UpdateServiceDaySchema),
      this.controller.update,
    );

    this.router.delete(`${this.path}/:id`,
      authenticate,
      authorize(UserRole.ADMIN),
      this.controller.remove,
    );

    // Per-(ServiceDay × Department) late-time overrides. Write access is
    // gated inside the controller (ADMIN or head/assistant of the dept) since
    // the role middleware can't see the department context.
    this.router.get(`${this.path}/:serviceDayId/department-late-times`,
      authenticate,
      this.lateTimeController.list,
    );

    this.router.put(`${this.path}/:serviceDayId/department-late-times/:departmentId`,
      authenticate,
      validate(UpsertDeptLateTimeSchema),
      this.lateTimeController.upsert,
    );

    this.router.delete(`${this.path}/:serviceDayId/department-late-times/:departmentId`,
      authenticate,
      this.lateTimeController.remove,
    );
  }
}

export { ServiceDayRoute };

import { Request, Response, NextFunction, Router } from "express";
import { StatusCodes } from "http-status-codes";
import prisma from "../../../core/databases/prisma";
import { Routes } from "../../../core/routes/interfaces";
import { authenticate } from "../../../core/middlewares/AuthMiddleware";
import { successResponse } from "../../../core/utils/responses.utils";
import { logDevError } from "../../../core/utils";

/**
 * Read-only catalog of Positions and Permissions. Admin UI uses these to
 * populate pickers (assign a position to a user in a dept) without us
 * hardcoding the list on the frontend. Authenticated users only — the data
 * isn't sensitive but also isn't anonymous.
 */
class RbacRoute implements Routes {
  public path = "";
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/positions", authenticate, this.listPositions);
    this.router.get("/permissions", authenticate, this.listPermissions);
  }

  private listPositions = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await prisma.position.findMany({
        include: {
          permissions: { include: { permission: { select: { key: true, label: true } } } },
        },
        orderBy: { name: "asc" },
      });
      // Flatten the join so the client gets `position.permissions: string[]`
      // (keys) — easier to consume than the nested PositionPermission rows.
      const shaped = rows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        permissions: p.permissions.map((pp) => pp.permission.key),
      }));
      successResponse(res, "Positions fetched", StatusCodes.OK, shaped);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };

  private listPermissions = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await prisma.permission.findMany({ orderBy: { key: "asc" } });
      successResponse(res, "Permissions fetched", StatusCodes.OK, rows);
    } catch (err) {
      logDevError(err);
      next(err);
    }
  };
}

export { RbacRoute };

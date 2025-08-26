
import { Request, Response, NextFunction, Router } from 'express';
import { UserController } from '../controllers';
import { Routes } from "../../../core/routes/interfaces";
import { authenticate, authorize } from '../../../core/middlewares/AuthMiddleware';
import { UserRole } from '@prisma/client';

class UserRoute implements Routes {
  public path = '/user';
  public router = Router();
  public userController = new UserController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.all(`${this.path}*`, (req: Request, res: Response, next: NextFunction) => {
      next()
    })

    this.router.get(`${this.path}`,
      authenticate,
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      this.userController.getAllUsers
    );

    this.router.get(`${this.path}/:id`,
      authenticate,
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      this.userController.getUserById
    );

    this.router.get(`${this.path}/:id`,
      authenticate,
      this.userController.getUser
    );

    // this.router.post(`${this.path}/`, this.userController.createUser);

    // this.router.put(`${this.path}/:id`, this.userController.updateUser);

    this.router.delete(`${this.path}/:id`,
      authenticate,
      authorize([UserRole.EXECUTIVE, UserRole.ADMIN]),
      this.userController.deleteUser
    );
  }
}

export { UserRoute };


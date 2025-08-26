
import { Request, Response, NextFunction, Router } from 'express';
import { AuthController } from '../controllers';
import { Routes } from "../../../core/routes/interfaces";
import { ChangePasswordSchema, LoginSchema, RegisterSchema, ResetPasswordSchema, VerifyTokenSchema } from '../schema/auth.schema';
import { validate } from '../../../core/middlewares';

class AuthRoute implements Routes {
    public path = '/auth';
    public router = Router();
    public userController = new AuthController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.all(`${this.path}*`, (req: Request, res: Response, next: NextFunction) => {
            next()
        })

        this.router.post(`${this.path}/register`, validate(RegisterSchema), this.userController.register);

        this.router.post(`${this.path}/login`, validate(LoginSchema), this.userController.login);

        this.router.post(`${this.path}/change-password`, validate(ChangePasswordSchema), this.userController.changePassword);

        this.router.post(`${this.path}/reset-password`, validate(ResetPasswordSchema), this.userController.resetPassword);

        this.router.post(`${this.path}/verify-token`, validate(VerifyTokenSchema), this.userController.verifyToken);

    }
}

export { AuthRoute };


import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";

export class AuthController {
    private authService;
    constructor() {
        this.authService = new AuthService();
    }

    public register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.register({ ...req.body });
            successResponse(res, "User registered successfully", StatusCodes.CREATED, result);
        } catch (err) {
            next(err);
        }
    }

    public login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.authService.login(req.body.email, req.body.password);
            successResponse(res, "Login successful", StatusCodes.OK, { ...data });
        } catch (err) {
            next(err);
        }
    }

    public changePassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id;
            const result = await this.authService.changePassword(userId, req.body.oldPassword, req.body.newPassword);
            successResponse(res, "Password changed successfully", StatusCodes.OK, result);
        } catch (err) {
            next(err);
        }
    }

    public resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.forgotPassword(req.body.email);
            successResponse(res, "Password reset successfully", StatusCodes.OK, result);
        } catch (err) {
            next(err);
        }
    }

    public verifyToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) throw new Error("No token provided");
            const decoded = await this.authService.verifyToken(token);
            successResponse(res, "Token verified successfully", StatusCodes.OK, decoded);
        } catch (err) {
            next(err);
        }
    }
}

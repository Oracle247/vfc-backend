import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthService, InviteService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";
import { logDevError } from "../../../core/utils";

export class AuthController {
    private authService;
    private inviteService;
    constructor() {
        this.authService = new AuthService();
        this.inviteService = new InviteService();
    }

    /** Public: validate an invite token and return basic user info. */
    public getSetupToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.inviteService.lookupToken(req.params.token);
            successResponse(res, "Token valid", StatusCodes.OK, result);
        } catch (err) {
            logDevError(err);
            next(err);
        }
    }

    /** Public: accept an invite token + new password. Marks token used. */
    public acceptSetupToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { password } = req.body;
            const result = await this.inviteService.accept(req.params.token, password);
            successResponse(res, "Password set", StatusCodes.OK, result);
        } catch (err) {
            logDevError(err);
            next(err);
        }
    }

    public register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.register({ ...req.body });
            successResponse(res, "User registered successfully", StatusCodes.CREATED, result);
        } catch (err) {
            logDevError(err);
            next(err);
        }
    }

    public login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("Login successful, sending response with data:", req.body);
            const data = await this.authService.login(req.body.email, req.body.password);
            successResponse(res, "Login successful", StatusCodes.OK, { ...data });
        } catch (err) {
            logDevError(err);
            next(err);
        }
    }

    public changePassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user.id;
            const result = await this.authService.changePassword(userId, req.body.oldPassword, req.body.newPassword);
            successResponse(res, "Password changed successfully", StatusCodes.OK, result);
        } catch (err) {
            logDevError(err);
            next(err);
        }
    }

    public resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.authService.forgotPassword(req.body.email);
            successResponse(res, "Password reset successfully", StatusCodes.OK, result);
        } catch (err) {
            logDevError(err);
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
            logDevError(err);
            next(err);
        }
    }
}

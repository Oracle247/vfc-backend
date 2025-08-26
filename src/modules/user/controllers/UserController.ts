import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { UserService } from "../services";
import { successResponse } from "../../../core/utils/responses.utils";

export class UserController {
  private userService = new UserService();

  // async createUser(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const { email, password, role } = req.body;
  //     const newUser = await this.userService.createUser(email, password, role as Role);
  //     successResponse(res, "User created successfully", StatusCodes.CREATED, newUser);
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await this.userService.getAllUsers();
      successResponse(res, "Users fetched successfully", StatusCodes.OK, users);
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.userService.getUserById(req.params.id);
      if (!user) return next(new Error("User not found"));
      successResponse(res, "User fetched successfully", StatusCodes.OK, user);
    } catch (err) {
      next(err);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.userService.getUser(req?.user?.id || "");
      if (!user) return next(new Error("User not found"));
      successResponse(res, "User fetched successfully", StatusCodes.OK, user);
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedUser = await this.userService.deleteUser(req.params.id);
      successResponse(res, "User deleted successfully", StatusCodes.OK, deletedUser);
    } catch (err) {
      next(err);
    }
  }
}

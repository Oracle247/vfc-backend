/* eslint-disable @typescript-eslint/no-empty-interface */
import { Request as ExpressRequest } from "express";
import { IUser } from "../../modules/user/models/UserModel";

// Extend the Request interface to include the user property when the middleware is used
declare module "express-serve-static-core" {
  interface User extends IUser { }
  interface Request {
    user?: Partial<User>;
  }
}

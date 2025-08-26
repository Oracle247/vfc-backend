import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

export const validate = (
  schema: ZodType<any, any>,
  property: "body" | "params" | "query" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req[property]);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};

import { Response } from "express";

export const successResponse = (res: Response, message: string, statusCode = 200, data: any = []) => {
  return res.status(statusCode).json({ status: true, message, data })
}
export const errorResponse = (res: Response, message = 'Something went wrong', statusCode = 500, error: any = {}) => {
  return res.status(statusCode).json({ status: false, message, error })
}

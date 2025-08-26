import { Response } from "express";
import { logger } from "./logger";

const sendResponse = (res: Response, statusCode: number, msg: any, data?: any) => {
    const responseObject = {
        statusCode,
        msg,
        data
    }

    logger.info(JSON.stringify(responseObject))

    return res.status(statusCode)
        .json({
            msg: msg?.message || msg,
            data
        })
}

export { sendResponse }
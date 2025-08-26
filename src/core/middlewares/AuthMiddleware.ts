import { UserRole } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
        req.user = { id: decoded.userId, role: decoded.role };

        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
}

export function authorize(roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!req.user || !roles.includes(req.user.role)) {
                res.status(403).json({ message: "You do not have permission for this" });
                return;
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

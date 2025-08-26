import { z } from "zod";

/**
 * Schema for creating a new attendance session
 * (e.g., "Sunday Service" on 2025-08-18)
 */
export const CreateAttendanceSessionSchema = z.object({
    serviceName: z.string().min(1, "Service name is required"),
    date: z.string().datetime({ message: "Invalid date format" }),
});

/**
 * Schema for updating an attendance session
 */
export const UpdateAttendanceSessionSchema = z
    .object({
        serviceName: z.string().min(1).optional(),
        date: z.string().datetime().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

/**
 * Schema for marking attendance (user joins a session)
 */
export const MarkAttendanceSchema = z.object({
    sessionId: z.string().cuid("Invalid session ID"),
    userId: z.string().cuid("Invalid user ID"),
});

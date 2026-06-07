import { ChurchStatus, Gender, MembershipType } from "@prisma/client";
import { z } from "zod";

/**
 * A single service within a session. `closesAt` is when this service stops
 * accepting check-ins (the boundary into the next service). The last service
 * may omit `closesAt`. `preServiceTime`, when set, is the worker-specific
 * cutoff and must be <= serviceTime.
 */
const SessionServiceInput = z
    .object({
        order: z.number().int().positive(),
        serviceTime: z.string().datetime(),
        preServiceTime: z.string().datetime().nullable().optional(),
        closesAt: z.string().datetime().nullable().optional(),
    })
    .refine(
        (s) =>
            !s.preServiceTime ||
            new Date(s.preServiceTime).getTime() <= new Date(s.serviceTime).getTime(),
        { message: "preServiceTime must be earlier than or equal to serviceTime", path: ["preServiceTime"] },
    )
    .refine(
        (s) =>
            !s.closesAt ||
            new Date(s.closesAt).getTime() >= new Date(s.serviceTime).getTime(),
        { message: "closesAt must be later than or equal to serviceTime", path: ["closesAt"] },
    );

const validateServicesArray = (services: Array<{ order: number }>) => {
    // orders must be strictly increasing (1, 2, 3 ...) — simplest sanity check.
    for (let i = 0; i < services.length; i++) {
        if (services[i].order !== i + 1) return false;
    }
    return true;
};

/**
 * Schema for creating a new attendance session.
 *
 * `services` is required and lists every service in the session. A single-service
 * session has one row with order=1. Multi-service has N rows ordered 1..N.
 */
export const CreateAttendanceSessionSchema = z.object({
    serviceName: z.string().min(1, "Service name is required"),
    startedAt: z.string().datetime({ message: "Invalid date format" }),
    date: z.string().datetime().optional(),
    services: z
        .array(SessionServiceInput)
        .min(1, "At least one service is required")
        .refine(validateServicesArray, {
            message: "Service `order` values must be 1, 2, 3 ... without gaps",
            path: ["services"],
        }),
});

/**
 * Schema for updating an attendance session.
 * When `services` is provided, it replaces ALL existing services for the session.
 */
export const UpdateAttendanceSessionSchema = z
    .object({
        serviceName: z.string().min(1).optional(),
        startedAt: z.string().datetime().optional(),
        date: z.string().datetime().optional(),
        services: z
            .array(SessionServiceInput)
            .min(1)
            .refine(validateServicesArray, {
                message: "Service `order` values must be 1, 2, 3 ... without gaps",
                path: ["services"],
            })
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

/**
 * Schema for the query params accepted by the session-detail and PDF endpoints.
 * Multi-value filters use comma-separated strings to match the rest of the API.
 */
export const SessionFilterQuerySchema = z.object({
    departmentIds: z.string().optional(),
    gender: z.nativeEnum(Gender).optional(),
    membershipType: z.nativeEnum(MembershipType).optional(),
    churchStatus: z.nativeEnum(ChurchStatus).optional(),
    lateComers: z
        .union([z.literal("true"), z.literal("false")])
        .optional(),
    serviceOrder: z.coerce.number().int().positive().optional(),
});

/**
 * Schema for marking attendance (user joins a session).
 * `serviceOrder` is an optional admin override; when absent, backend infers
 * the service from `markedAt` vs the session's configured cutoffs.
 */
export const MarkAttendanceSchema = z.object({
    sessionId: z.string().cuid("Invalid session ID"),
    userId: z.string().cuid("Invalid user ID"),
    markedAt: z.string().datetime({ message: "Invalid date format" }).optional(),
    serviceOrder: z.number().int().positive().optional(),
});

/**
 * Schema for editing a single attendance record (admin: change markedAt and/or
 * move the row to a different service in a multi-service session).
 */
export const UpdateAttendanceSchema = z
    .object({
        markedAt: z.string().datetime({ message: "Invalid markedAt format" }).optional(),
        serviceOrder: z.number().int().positive().optional(),
    })
    .refine((data) => data.markedAt !== undefined || data.serviceOrder !== undefined, {
        message: "At least one field must be provided",
    });

/**
 * Schema for bulk marking attendance (multiple users at once)
 */
export const BulkMarkAttendanceSchema = z.object({
    sessionId: z.string().cuid("Invalid session ID"),
    userIds: z.array(z.string().cuid("Invalid user ID")).min(1, "At least one user ID is required"),
});

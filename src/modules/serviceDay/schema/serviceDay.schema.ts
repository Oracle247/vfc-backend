import { z } from "zod";

const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const ServiceTemplateInput = z
    .object({
        order: z.number().int().positive(),
        serviceTime: z.string().regex(TIME_HHMM, "Use HH:mm 24-hour time"),
        preServiceTime: z.string().regex(TIME_HHMM).nullable().optional(),
        closesAt: z.string().regex(TIME_HHMM).nullable().optional(),
    })
    .refine(
        (s) => !s.preServiceTime || s.preServiceTime <= s.serviceTime,
        { message: "preServiceTime must be <= serviceTime", path: ["preServiceTime"] },
    )
    .refine(
        (s) => !s.closesAt || s.closesAt >= s.serviceTime,
        { message: "closesAt must be >= serviceTime", path: ["closesAt"] },
    );

const validateOrdersContiguous = (rows: Array<{ order: number }>) =>
    rows.every((r, i) => r.order === i + 1);

export const Weekday = z.enum([
    "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
]);

export const CreateServiceDaySchema = z.object({
    name: z.string().min(1),
    weekday: Weekday,
    services: z
        .array(ServiceTemplateInput)
        .min(1, "At least one service is required")
        .refine(validateOrdersContiguous, {
            message: "Service `order` values must be 1, 2, 3 ... without gaps",
            path: ["services"],
        }),
});

export const UpsertDeptLateTimeSchema = z.object({
    lateTime: z.string().regex(TIME_HHMM, "Use HH:mm 24-hour time"),
});

export const CreateVariationSchema = z.object({
    name: z.string().min(1),
    services: z
        .array(ServiceTemplateInput)
        .min(1, "At least one service is required")
        .refine(validateOrdersContiguous, {
            message: "Service `order` values must be 1, 2, 3 ... without gaps",
            path: ["services"],
        }),
});

export const UpdateVariationSchema = z
    .object({
        name: z.string().min(1).optional(),
        services: z
            .array(ServiceTemplateInput)
            .min(1)
            .refine(validateOrdersContiguous, {
                message: "Service `order` values must be 1, 2, 3 ... without gaps",
                path: ["services"],
            })
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

export const UpdateServiceDaySchema = z
    .object({
        name: z.string().min(1).optional(),
        weekday: Weekday.optional(),
        services: z
            .array(ServiceTemplateInput)
            .min(1)
            .refine(validateOrdersContiguous, {
                message: "Service `order` values must be 1, 2, 3 ... without gaps",
                path: ["services"],
            })
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

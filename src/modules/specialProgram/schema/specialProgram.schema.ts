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

export const CreateSpecialProgramSchema = z.object({
    name: z.string().min(1),
    date: z.string().datetime().nullable().optional(),
    services: z
        .array(ServiceTemplateInput)
        .min(1, "At least one service is required")
        .refine(validateOrdersContiguous, {
            message: "Service `order` values must be 1, 2, 3 ... without gaps",
            path: ["services"],
        }),
});

export const UpdateSpecialProgramSchema = z
    .object({
        name: z.string().min(1).optional(),
        date: z.string().datetime().nullable().optional(),
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

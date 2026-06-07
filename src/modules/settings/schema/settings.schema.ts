import { z } from "zod";

export const UpdateChurchSettingsSchema = z
    .object({
        name: z.string().min(1).optional(),
        logoUrl: z.string().url().nullable().optional(),
        address: z.string().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

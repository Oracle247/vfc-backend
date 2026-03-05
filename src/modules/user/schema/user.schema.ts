import { z } from "zod";

export const UpdateUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().min(1).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    address: z.string().min(1).optional(),
    dateOfBirth: z.string().datetime().optional(),
    matricNumber: z.string().optional(),
    department: z.string().optional(),
    level: z.string().optional(),
    faculty: z.string().optional(),
    nationality: z.string().optional(),
    stateOfOrigin: z.string().optional(),
    emergencyContact: z.string().optional(),
  }).refine(data => Object.values(data).some(v => v !== undefined), {
    message: "At least one field must be provided",
  }),
});

export const UpdateChurchJourneySchema = z.object({
  body: z.object({
    churchStatus: z.enum(["FIRST_TIMER", "VISITOR", "MEMBER"]).optional(),
    membershipType: z.enum(["NON_WORKER", "WORKER"]).optional(),
    workerType: z.enum(["REGULAR", "EXECUTIVE"]).optional(),
    role: z.enum(["MEMBER", "WORKER", "ADMIN"]).optional(),
  }).refine(data => Object.values(data).some(v => v !== undefined), {
    message: "At least one field must be provided",
  }),
});

export const SetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

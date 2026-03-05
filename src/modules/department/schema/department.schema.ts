import { z } from "zod";

export const CreateDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Department name is required"),
    description: z.string().optional(),
  }),
});

export const UpdateDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  }).refine(data => data.name || data.description, {
    message: "At least one field (name or description) must be provided",
  }),
});

export const AssignHeadSchema = z.object({
  body: z.object({
    userId: z.string().cuid("Invalid user ID"),
  }),
});

export const AssignMembersSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().cuid("Invalid user ID")).min(1, "At least one user ID is required"),
  }),
});

export const RemoveMembersSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().cuid("Invalid user ID")).min(1, "At least one user ID is required"),
  }),
});
